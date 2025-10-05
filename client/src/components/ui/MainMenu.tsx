// Main Menu Component
// Game menu with save/load functionality

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../lib/stores/auth/useAuthStore';
import { gameApi, SaveSlot } from '../../services/gameApi';
import { collectGameState, restoreGameState } from '../../utils/saveGame';
import { useGame } from '../../lib/stores/ui/useGame';
import { useSettings } from '../../lib/stores/ui/useSettings';
import { Controls } from '../../lib/controls';
import { 
  Save, 
  FolderOpen, 
  Plus, 
  Settings, 
  LogOut, 
  User, 
  PlayCircle,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

const CONTROL_LABELS: Record<string, string> = {
  forward: "Move Forward",
  backward: "Move Backward",
  left: "Move Left",
  right: "Move Right",
  up: "Move Up",
  down: "Move Down",
  shoot: "Fire Lasers",
  land: "Land on Planet",
  info: "Planet Info",
  menu: "Menu",
  center: "Center Camera",
};

export const MainMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'main' | 'saves' | 'settings'>('main');
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<'graphics' | 'controls' | 'keybinds' | null>('graphics');
  const [editingKeybind, setEditingKeybind] = useState<string | null>(null);
  
  const { user, isGuest, logout } = useAuthStore();
  const { phase } = useGame();
  const {
    sensitivity,
    invertY,
    keybinds,
    setSensitivity,
    setInvertY,
    updateKeybind,
    resetToDefaults,
    miningEffectsIntensity,
    enableScreenShake,
    enableVisualEffects,
    setMiningEffectsIntensity,
    setEnableScreenShake,
    setEnableVisualEffects,
  } = useSettings();
  
  // Load saves when panel opens
  useEffect(() => {
    if (activePanel === 'saves' && !isGuest) {
      loadSaves();
    }
  }, [activePanel, isGuest]);
  
  // Toggle menu with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'playing') {
        setIsOpen(!isOpen);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, phase]);
  
  // Keybind editing
  useEffect(() => {
    if (!editingKeybind) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.code;

      if (key === "Escape") {
        setEditingKeybind(null);
        return;
      }

      const currentKeys = keybinds[editingKeybind] || [];
      if (!currentKeys.includes(key)) {
        updateKeybind(editingKeybind, [...currentKeys, key]);
      }
      setEditingKeybind(null);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [editingKeybind, keybinds, updateKeybind]);
  
  // Load saves from server
  const loadSaves = async () => {
    if (isGuest) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const data = await gameApi.listSaves();
      setSaves(data.saves);
      setAvailableSlots(data.availableSlots);
    } catch (err: any) {
      setError('Failed to load saves');
      console.error('Load saves error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Continue with latest save
  const handleContinue = async () => {
    if (isGuest) {
      setError('Guest mode: Saving is disabled');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const gameState = await gameApi.getLatestSave();
      if (gameState) {
        await restoreGameState(gameState);
        setIsOpen(false);
      } else {
        setError('No saves found');
      }
    } catch (err: any) {
      setError('Failed to load save');
      console.error('Continue error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load specific save
  const handleLoadSave = async (slot: number) => {
    if (isGuest) {
      setError('Guest mode: Loading is disabled');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const gameState = await gameApi.loadGame(slot);
      await restoreGameState(gameState);
      setIsOpen(false);
    } catch (err: any) {
      setError('Failed to load save');
      console.error('Load save error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save to slot
  const handleSaveGame = async (slot: number, saveName?: string) => {
    if (isGuest) {
      setError('Guest mode: Please create an account to save your progress');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const gameState = collectGameState();
      if (saveName) {
        gameState.metadata.saveName = saveName;
      }
      
      await gameApi.saveGame(slot, gameState);
      await loadSaves(); // Reload saves list
      setError(''); // Clear any errors
    } catch (err: any) {
      setError('Failed to save game');
      console.error('Save error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete save
  const handleDeleteSave = async (slot: number) => {
    if (isGuest) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await gameApi.deleteSave(slot);
      await loadSaves();
      setShowDeleteConfirm(null);
    } catch (err: any) {
      setError('Failed to delete save');
      console.error('Delete error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Export save
  const handleExportSave = async (slot: number) => {
    if (isGuest) return;
    
    try {
      const json = await gameApi.exportSave(slot);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar-plunder-save-${slot}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to export save');
      console.error('Export error:', err);
    }
  };
  
  // Import save
  const handleImportSave = async (slot: number) => {
    if (isGuest) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        await gameApi.importSave(slot, text);
        await loadSaves();
      } catch (err: any) {
        setError('Failed to import save');
        console.error('Import error:', err);
      }
    };
    
    input.click();
  };
  
  // Handle logout
  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };
  
  // Format play time
  const formatPlayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  // Keybind management
  const handleKeybindClick = (action: string) => {
    setEditingKeybind(action);
  };

  const handleRemoveKey = (action: string, keyToRemove: string) => {
    const currentKeys = keybinds[action] || [];
    const newKeys = currentKeys.filter((k) => k !== keyToRemove);
    if (newKeys.length > 0) {
      updateKeybind(action, newKeys);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setEditingKeybind(null);
  };
  
  const toggleSection = (section: 'graphics' | 'controls' | 'keybinds') => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
        }}
        className="fixed top-4 right-4 p-2 bg-slate-900/80 border border-orange-600/30 rounded-lg text-orange-400 hover:bg-slate-800 transition-all z-40"
        title="Menu (ESC)"
      >
        <Settings className="w-6 h-6" />
      </button>
    );
  }
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-2xl bg-slate-900/95 border border-orange-600/30 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-orange-400">Game Menu</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {user && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                <User className="w-4 h-4" />
                <span>{user.username || user.email}</span>
                {isGuest && <span className="text-amber-400">(Guest)</span>}
              </div>
            )}
          </div>
          
          {/* Error message */}
          {error && (
            <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/30">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
          
          {/* Navigation tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActivePanel('main')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                activePanel === 'main'
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Main
            </button>
            <button
              onClick={() => setActivePanel('saves')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                activePanel === 'saves'
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Saves
            </button>
            <button
              onClick={() => setActivePanel('settings')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                activePanel === 'settings'
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Settings
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {activePanel === 'main' && (
              <div className="space-y-3">
                <button
                  onClick={handleContinue}
                  disabled={isGuest || isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" />
                  Continue
                </button>
                
                <button
                  onClick={() => setActivePanel('saves')}
                  className="w-full py-3 px-4 bg-slate-800/50 text-gray-300 font-medium rounded-lg border border-slate-600 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-5 h-5" />
                  Load Game
                </button>
                
                <button
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="w-full py-3 px-4 bg-slate-800/50 text-gray-300 font-medium rounded-lg border border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
                >
                  Resume
                </button>
              </div>
            )}
            
            {activePanel === 'saves' && (
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
                  </div>
                ) : isGuest ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-400" />
                    <p>Guest mode: Saving is disabled</p>
                    <p className="text-sm mt-1">Create an account to save your progress</p>
                  </div>
                ) : (
                  <>
                    {/* Quick save button */}
                    <button
                      onClick={() => handleSaveGame(saves[0]?.slot || availableSlots[0] || 1)}
                      disabled={isLoading}
                      className="w-full py-2 px-4 bg-green-600/20 text-green-400 font-medium rounded-lg border border-green-600/30 hover:bg-green-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Quick Save
                    </button>
                    
                    {/* Save slots */}
                    <div className="grid gap-2">
                      {[1, 2, 3].map((slot) => {
                        const save = saves.find((s) => s.slot === slot);
                        const isEmpty = !save;
                        
                        return (
                          <div
                            key={slot}
                            className="bg-slate-800/50 border border-slate-600 rounded-lg p-3"
                          >
                            {save ? (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-white">{save.saveName}</p>
                                    <p className="text-sm text-gray-400">
                                      {save.location} • {formatPlayTime(save.playTime)} • {save.credits} credits
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(save.updatedAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleLoadSave(slot)}
                                      className="p-2 text-cyan-400 hover:bg-slate-700 rounded"
                                      title="Load"
                                    >
                                      <FolderOpen className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleSaveGame(slot)}
                                      className="p-2 text-green-400 hover:bg-slate-700 rounded"
                                      title="Overwrite"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleExportSave(slot)}
                                      className="p-2 text-blue-400 hover:bg-slate-700 rounded"
                                      title="Export"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteConfirm(slot)}
                                      className="p-2 text-red-400 hover:bg-slate-700 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                
                                {showDeleteConfirm === slot && (
                                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                                    <p className="text-sm text-red-400 mb-2">Delete this save?</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleDeleteSave(slot)}
                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="px-3 py-1 bg-slate-700 text-gray-300 text-sm rounded hover:bg-slate-600"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <p className="text-gray-500">Empty Slot {slot}</p>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleSaveGame(slot, `Save ${slot}`)}
                                    className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded border border-green-600/30 hover:bg-green-600/30 flex items-center gap-1"
                                  >
                                    <Plus className="w-4 h-4" />
                                    New Save
                                  </button>
                                  <button
                                    onClick={() => handleImportSave(slot)}
                                    className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded border border-blue-600/30 hover:bg-blue-600/30 flex items-center gap-1"
                                  >
                                    <Upload className="w-4 h-4" />
                                    Import
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {activePanel === 'settings' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {/* Account Section */}
                <div className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-3">Account</h3>
                  {user ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">
                        Email: <span className="text-white">{user.email}</span>
                      </p>
                      {user.username && (
                        <p className="text-sm text-gray-400">
                          Username: <span className="text-white">{user.username}</span>
                        </p>
                      )}
                      <button
                        onClick={handleLogout}
                        className="mt-3 px-4 py-2 bg-red-600/20 text-red-400 rounded border border-red-600/30 hover:bg-red-600/30 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-400">Playing as guest</p>
                  )}
                </div>
                
                {/* Graphics & Game Settings */}
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('graphics')}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-white">⚙️ Graphics & Game Settings</h3>
                    {expandedSection === 'graphics' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  
                  {expandedSection === 'graphics' && (
                    <div className="p-4 space-y-4 border-t border-slate-600">
                      {/* Mouse Sensitivity */}
                      <div className="space-y-2">
                        <Label htmlFor="sensitivity" className="text-cyan-300 font-semibold">
                          Mouse Sensitivity: {(sensitivity * 1000).toFixed(1)}
                        </Label>
                        <Slider
                          id="sensitivity"
                          min={0.0002}
                          max={0.005}
                          step={0.0001}
                          value={[sensitivity]}
                          onValueChange={([value]) => setSensitivity(value)}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-400">
                          Adjust how quickly the camera responds to mouse movement
                        </p>
                      </div>

                      {/* Invert Y-Axis */}
                      <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
                        <div className="space-y-0.5">
                          <Label htmlFor="invert-y" className="text-cyan-300 font-semibold">
                            Invert Y-Axis
                          </Label>
                          <p className="text-xs text-gray-400">
                            Reverse vertical mouse look direction
                          </p>
                        </div>
                        <Switch
                          id="invert-y"
                          checked={invertY}
                          onCheckedChange={setInvertY}
                        />
                      </div>

                      {/* Mining Effects Section */}
                      <div className="space-y-3 border-t border-cyan-700/50 pt-3">
                        <h4 className="text-cyan-300 font-semibold text-sm uppercase">
                          ⛏️ Mining Effects
                        </h4>
                        
                        {/* Effects Intensity */}
                        <div className="space-y-2">
                          <Label htmlFor="mining-intensity" className="text-cyan-300 font-semibold">
                            Mining Effects Intensity: {Math.round((miningEffectsIntensity ?? 1) * 100)}%
                          </Label>
                          <Slider
                            id="mining-intensity"
                            min={0}
                            max={1}
                            step={0.1}
                            value={[miningEffectsIntensity ?? 1]}
                            onValueChange={([value]) => setMiningEffectsIntensity?.(value)}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-400">
                            Adjust the overall intensity of mining feedback effects
                          </p>
                        </div>
                        
                        {/* Screen Shake */}
                        <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
                          <div className="space-y-0.5">
                            <Label htmlFor="screen-shake" className="text-cyan-300 font-semibold">
                              Screen Shake
                            </Label>
                            <p className="text-xs text-gray-400">
                              Camera shake when mining resources
                            </p>
                          </div>
                          <Switch
                            id="screen-shake"
                            checked={enableScreenShake ?? true}
                            onCheckedChange={setEnableScreenShake}
                          />
                        </div>
                        
                        {/* Visual Effects */}
                        <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
                          <div className="space-y-0.5">
                            <Label htmlFor="visual-effects" className="text-cyan-300 font-semibold">
                              Visual Effects
                            </Label>
                            <p className="text-xs text-gray-400">
                              Flash, vignette, and color effects during mining
                            </p>
                          </div>
                          <Switch
                            id="visual-effects"
                            checked={enableVisualEffects ?? true}
                            onCheckedChange={setEnableVisualEffects}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Controls Help */}
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('controls')}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-white">🎮 Controls Guide</h3>
                    {expandedSection === 'controls' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  
                  {expandedSection === 'controls' && (
                    <div className="p-4 space-y-4 border-t border-slate-600">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-cyan-300 font-semibold text-sm uppercase border-b border-cyan-700 pb-1">
                            Ship Movement
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-300">Move Forward</span>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">W</kbd>
                            </div>
                            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-300">Move Backward</span>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">S</kbd>
                            </div>
                            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-300">Move Left</span>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">A</kbd>
                            </div>
                            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-300">Move Right</span>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">D</kbd>
                            </div>
                            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-300">Move Up</span>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">Q</kbd>
                            </div>
                            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-300">Move Down</span>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">E</kbd>
                            </div>
                            <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-300">Look Around</span>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono">Mouse</kbd>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-cyan-300 font-semibold text-sm uppercase border-b border-cyan-700 pb-1">
                            Navigation & Actions
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="bg-gray-800/50 p-2 rounded">
                              <div className="text-gray-300 mb-1">Select Planet:</div>
                              <div className="text-xs text-cyan-400">Click planet on minimap (bottom-left)</div>
                            </div>
                            <div className="bg-gray-800/50 p-2 rounded">
                              <div className="text-gray-300 mb-1">Engage Autopilot:</div>
                              <div className="text-xs text-cyan-400">Click "Engage Autopilot" after selecting planet</div>
                            </div>
                            <div className="bg-gray-800/50 p-2 rounded">
                              <div className="text-gray-300 mb-1">Land on Planet:</div>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono text-xs">L</kbd>
                              <div className="text-xs text-yellow-400 mt-1">Must be close to selected planet</div>
                            </div>
                            <div className="bg-gray-800/50 p-2 rounded">
                              <div className="text-gray-300 mb-1">Fire Lasers:</div>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono text-xs">Space</kbd>
                            </div>
                            <div className="bg-gray-800/50 p-2 rounded">
                              <div className="text-gray-300 mb-1">Toggle Menu:</div>
                              <kbd className="px-2 py-1 bg-gray-700 text-white rounded font-mono text-xs">ESC</kbd>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-900/30 border border-blue-400/30 rounded p-4">
                        <h4 className="text-blue-300 font-semibold text-sm mb-2">💡 QUICK TIPS</h4>
                        <ul className="text-xs text-gray-300 space-y-1">
                          <li>• Use autopilot for long-distance travel between planets</li>
                          <li>• Monitor your fuel levels - refuel when needed</li>
                          <li>• Mine resources on planet surfaces to earn credits and crypto</li>
                          <li>• Keep your ship systems repaired for optimal performance</li>
                          <li>• Double-tap W to activate warp speed (requires fuel or upgrade)</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Keybindings */}
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('keybinds')}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
                  >
                    <h3 className="text-lg font-medium text-white">⌨️ Custom Keybindings</h3>
                    {expandedSection === 'keybinds' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  
                  {expandedSection === 'keybinds' && (
                    <div className="p-4 space-y-3 border-t border-slate-600">
                      <div className="space-y-2">
                        {Object.entries(Controls).map(([key, value]) => {
                          const action = value as string;
                          const keys = keybinds[action] || [];
                          const isEditing = editingKeybind === action;

                          return (
                            <div
                              key={action}
                              className="flex justify-between items-center bg-gray-800/50 p-2 rounded"
                            >
                              <span className="text-gray-300">
                                {CONTROL_LABELS[action] || action}
                              </span>
                              <div className="flex gap-2 items-center">
                                {keys.map((keyCode) => (
                                  <div
                                    key={keyCode}
                                    className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded"
                                  >
                                    <kbd className="text-white font-mono text-sm">
                                      {keyCode.replace("Key", "").replace("Arrow", "")}
                                    </kbd>
                                    <button
                                      onClick={() => handleRemoveKey(action, keyCode)}
                                      className="text-red-400 hover:text-red-300 text-xs ml-1"
                                      title="Remove key"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                {isEditing ? (
                                  <div className="px-3 py-1 bg-yellow-600 text-black rounded font-mono text-sm animate-pulse">
                                    Press key...
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleKeybindClick(action)}
                                    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs"
                                  >
                                    + Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Click "+ Add" to bind a new key. Press ESC to cancel.
                      </p>
                      
                      {/* Reset Button */}
                      <div className="flex justify-end pt-4 border-t border-gray-700">
                        <Button
                          onClick={handleReset}
                          variant="outline"
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600"
                        >
                          Reset to Defaults
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};