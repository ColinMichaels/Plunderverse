// Save Game Panel Component  
// In-game save menu with multiple slots and management options

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../lib/stores/auth/useAuthStore';
import { gameApi, SaveSlot } from '../../services/gameApi';
import { collectGameState } from '../../utils/saveGame';
import { 
  Save, 
  FolderOpen, 
  Trash2,
  Download,
  Upload,
  AlertCircle,
  Clock,
  MapPin,
  Coins
} from 'lucide-react';

interface SaveGamePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveComplete?: () => void;
}

export const SaveGamePanel: React.FC<SaveGamePanelProps> = ({ 
  isOpen, 
  onClose,
  onSaveComplete 
}) => {
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [saveName, setSaveName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  
  const { isGuest } = useAuthStore();
  
  // Load saves when panel opens
  useEffect(() => {
    if (isOpen && !isGuest) {
      loadSaves();
    }
  }, [isOpen, isGuest]);
  
  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  // Load saves from server
  const loadSaves = async () => {
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
  
  // Quick save (to most recent or first available slot)
  const handleQuickSave = async () => {
    if (isGuest) {
      setError('Guest mode: Please create an account to save');
      return;
    }
    
    const slot = saves.length > 0 
      ? saves.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].slot
      : availableSlots[0] || 1;
    
    await handleSaveGame(slot, 'Quick Save');
  };
  
  // Save to specific slot
  const handleSaveGame = async (slot: number, name?: string) => {
    if (isGuest) {
      setError('Guest mode: Please create an account to save');
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      const gameState = collectGameState();
      gameState.metadata.saveName = name || saveName || `Save ${slot}`;
      
      await gameApi.saveGame(slot, gameState);
      setSuccessMessage('Game saved successfully!');
      await loadSaves();
      setSelectedSlot(null);
      setSaveName('');
      onSaveComplete?.();
    } catch (err: any) {
      setError('Failed to save game');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Delete save
  const handleDeleteSave = async (slot: number) => {
    setIsLoading(true);
    setError('');
    
    try {
      await gameApi.deleteSave(slot);
      setSuccessMessage('Save deleted');
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
    try {
      const json = await gameApi.exportSave(slot);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar-plunder-save-${slot}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage('Save exported successfully');
    } catch (err: any) {
      setError('Failed to export save');
      console.error('Export error:', err);
    }
  };
  
  // Import save
  const handleImportSave = async (slot: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsLoading(true);
      setError('');
      
      try {
        const text = await file.text();
        await gameApi.importSave(slot, text);
        setSuccessMessage('Save imported successfully');
        await loadSaves();
      } catch (err: any) {
        setError('Failed to import save');
        console.error('Import error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    input.click();
  };
  
  // Format play time
  const formatPlayTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  // Format date
  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-3xl bg-slate-900/95 border border-orange-600/30 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-orange-400 flex items-center gap-2">
                <Save className="w-6 h-6" />
                Save Game
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Messages */}
          {error && (
            <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/30">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="px-6 py-3 bg-green-500/10 border-b border-green-500/30">
              <div className="flex items-center gap-2 text-green-400">
                <Save className="w-5 h-5" />
                <span>{successMessage}</span>
              </div>
            </div>
          )}
          
          {/* Content */}
          <div className="p-6">
            {isGuest ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                <h3 className="text-xl font-semibold text-white mb-2">Guest Mode</h3>
                <p className="text-gray-400 mb-6">Create an account to save your progress</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-amber-600"
                >
                  Create Account
                </button>
              </div>
            ) : (
              <>
                {/* Quick Save Button */}
                <button
                  onClick={handleQuickSave}
                  disabled={isSaving || isLoading}
                  className="w-full mb-4 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Quick Save
                    </>
                  )}
                </button>
                
                {/* Save Slots */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[1, 2, 3].map((slot) => {
                      const save = saves.find((s) => s.slot === slot);
                      const isEmpty = !save;
                      const isSelected = selectedSlot === slot;
                      
                      return (
                        <div
                          key={slot}
                          className={`bg-slate-800/50 border rounded-lg p-4 transition-all ${
                            isSelected 
                              ? 'border-orange-500 bg-slate-800' 
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {save ? (
                            <div>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-white text-lg mb-1">
                                    {save.saveName}
                                  </h3>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <div className="flex items-center gap-1 text-gray-400">
                                      <Clock className="w-4 h-4" />
                                      <span>{formatPlayTime(save.playTime)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400">
                                      <MapPin className="w-4 h-4" />
                                      <span>{save.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-400">
                                      <Coins className="w-4 h-4" />
                                      <span>{save.credits} credits</span>
                                    </div>
                                    <div className="text-gray-500 text-xs">
                                      {formatDate(save.updatedAt)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex gap-1 ml-4">
                                  <button
                                    onClick={() => handleSaveGame(slot, save.saveName)}
                                    disabled={isSaving}
                                    className="p-2 text-green-400 hover:bg-slate-700 rounded transition-colors"
                                    title="Overwrite"
                                  >
                                    <Save className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleExportSave(slot)}
                                    className="p-2 text-blue-400 hover:bg-slate-700 rounded transition-colors"
                                    title="Export"
                                  >
                                    <Download className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(slot)}
                                    className="p-2 text-red-400 hover:bg-slate-700 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                              
                              {showDeleteConfirm === slot && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded"
                                >
                                  <p className="text-sm text-red-400 mb-2">
                                    Are you sure you want to delete this save?
                                  </p>
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
                                </motion.div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between">
                                <p className="text-gray-500 font-medium">Empty Slot {slot}</p>
                                <div className="flex gap-2">
                                  {isSelected ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={saveName}
                                        onChange={(e) => setSaveName(e.target.value)}
                                        placeholder="Enter save name..."
                                        className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-500 text-sm"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleSaveGame(slot)}
                                        disabled={isSaving}
                                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedSlot(null);
                                          setSaveName('');
                                        }}
                                        className="px-3 py-1 bg-slate-700 text-gray-300 text-sm rounded hover:bg-slate-600"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setSelectedSlot(slot)}
                                        className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded border border-green-600/30 hover:bg-green-600/30"
                                      >
                                        New Save
                                      </button>
                                      <button
                                        onClick={() => handleImportSave(slot)}
                                        className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded border border-blue-600/30 hover:bg-blue-600/30"
                                      >
                                        <Upload className="w-4 h-4 inline mr-1" />
                                        Import
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};