// Auto-Save Hook
// Handles automatic saving at key points in the game

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../lib/stores/auth/useAuthStore';
import { useLandedState } from '../lib/stores/surface/useLandedState';
import { usePlunderverseMissions } from '../lib/stores/economy/usePlunderverseMissions';
import { useGame } from '../lib/stores/ui/useGame';
import { gameApi } from '../services/gameApi';
import { collectGameState } from '../utils/saveGame';

interface AutoSaveOptions {
  intervalMinutes?: number;
  onSave?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

export const useAutoSave = (options: AutoSaveOptions = {}) => {
  const { intervalMinutes = 5, onSave, onSaveComplete, onSaveError } = options;
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  
  const { isAuthenticated, isGuest } = useAuthStore();
  const { phase } = useGame();
  const { isDocked } = useLandedState();
  const { completedMissionIds } = usePlunderverseMissions();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastDockedRef = useRef(false);
  const lastCompletedMissionsRef = useRef(completedMissionIds.size);
  
  // Auto-save function
  const performAutoSave = async () => {
    if (isGuest || !isAuthenticated || phase !== 'playing') {
      return;
    }
    
    setIsSaving(true);
    setSaveMessage('Auto-saving...');
    onSave?.();
    
    try {
      const gameState = collectGameState();
      gameState.metadata.saveName = `Auto Save - ${new Date().toLocaleTimeString()}`;
      
      // Try to get the most recent save slot or use slot 1
      const saves = await gameApi.listSaves();
      const slot = saves.saves.length > 0 
        ? saves.saves.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].slot
        : 1;
      
      await gameApi.saveGame(slot, gameState);
      
      setLastSaveTime(new Date());
      setSaveMessage('Auto-saved');
      onSaveComplete?.();
      
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error: any) {
      console.error('Auto-save failed:', error);
      setSaveMessage('Auto-save failed');
      onSaveError?.(error);
      
      // Clear error message after 5 seconds
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Trigger auto-save on docking
  useEffect(() => {
    if (isDocked && !lastDockedRef.current) {
      console.log('[AUTO-SAVE] Triggered by docking at station');
      performAutoSave();
    }
    lastDockedRef.current = isDocked;
  }, [isDocked]);
  
  // Trigger auto-save on mission completion
  useEffect(() => {
    if (completedMissionIds.size > lastCompletedMissionsRef.current) {
      console.log('[AUTO-SAVE] Triggered by mission completion');
      performAutoSave();
    }
    lastCompletedMissionsRef.current = completedMissionIds.size;
  }, [completedMissionIds.size]);
  
  // Interval-based auto-save
  useEffect(() => {
    if (isGuest || !isAuthenticated || phase !== 'playing') {
      return;
    }
    
    // Set up interval for periodic auto-saves
    const intervalMs = intervalMinutes * 60 * 1000;
    
    const startInterval = () => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        console.log(`[AUTO-SAVE] Triggered by ${intervalMinutes}-minute interval`);
        performAutoSave();
        startInterval(); // Restart the interval
      }, intervalMs);
    };
    
    startInterval();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isGuest, isAuthenticated, phase, intervalMinutes]);
  
  // Manual save function
  const manualSave = async () => {
    if (isGuest) {
      setSaveMessage('Guest mode: Saving disabled');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    
    await performAutoSave();
  };
  
  return {
    isSaving,
    lastSaveTime,
    saveMessage,
    manualSave,
  };
};

// Save indicator component
export const SaveIndicator: React.FC = () => {
  const { isSaving, saveMessage, lastSaveTime } = useAutoSave();
  
  if (!saveMessage && !isSaving) {
    return null;
  }
  
  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div className={`
        px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-all
        ${isSaving 
          ? 'bg-amber-600/20 border border-amber-600/50 text-amber-400' 
          : saveMessage.includes('failed')
          ? 'bg-red-600/20 border border-red-600/50 text-red-400'
          : 'bg-green-600/20 border border-green-600/50 text-green-400'
        }
      `}>
        <div className="flex items-center gap-2">
          {isSaving && (
            <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          )}
          <span className="text-sm font-medium">{saveMessage}</span>
        </div>
        {lastSaveTime && !isSaving && (
          <div className="text-xs opacity-75 mt-1">
            {lastSaveTime.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};