// Auto-Save Hook
// Handles automatic saving at key points in the game

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../lib/stores/auth/useAuthStore';
import { useHUDContext } from '../lib/stores/ui/useHUDContext';
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

// Singleton state for auto-save to prevent multiple hooks from creating duplicate saves
let globalSaveState = {
  isSaving: false,
  lastSaveTime: null as Date | null,
  saveMessage: '',
  subscribers: new Set<(state: any) => void>()
};

const updateGlobalSaveState = (updates: Partial<typeof globalSaveState>) => {
  Object.assign(globalSaveState, updates);
  globalSaveState.subscribers.forEach(cb => cb(globalSaveState));
};

// Lightweight hook that ONLY reads the auto-save state
// Does NOT create any timers, listeners, or trigger saves
// This is for display components that need to show save status
export const useAutoSaveState = () => {
  const [localState, setLocalState] = useState({
    isSaving: globalSaveState.isSaving,
    lastSaveTime: globalSaveState.lastSaveTime,
    saveMessage: globalSaveState.saveMessage
  });
  
  // Subscribe to global state changes
  useEffect(() => {
    const subscriber = (state: typeof globalSaveState) => {
      setLocalState({
        isSaving: state.isSaving,
        lastSaveTime: state.lastSaveTime,
        saveMessage: state.saveMessage
      });
    };
    globalSaveState.subscribers.add(subscriber);
    
    return () => {
      globalSaveState.subscribers.delete(subscriber);
    };
  }, []);
  
  return {
    isSaving: localState.isSaving,
    lastSaveTime: localState.lastSaveTime,
    saveMessage: localState.saveMessage
  };
};

// Full hook that manages auto-save logic, timers, and triggers
// Should only be used once in the application (GameUI)
export const useAutoSave = (options: AutoSaveOptions = {}) => {
  const { intervalMinutes = 5, onSave, onSaveComplete, onSaveError } = options;
  
  const [localState, setLocalState] = useState({
    isSaving: globalSaveState.isSaving,
    lastSaveTime: globalSaveState.lastSaveTime,
    saveMessage: globalSaveState.saveMessage
  });
  
  const { isAuthenticated, isGuest } = useAuthStore();
  const { phase } = useGame();
  const { isDocked } = useHUDContext();
  const { completedMissionIds } = usePlunderverseMissions();
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastDockedRef = useRef(false);
  const lastCompletedMissionsRef = useRef(completedMissionIds.size);
  const messageClearTimeoutRef = useRef<NodeJS.Timeout>();
  const isPerformingSaveRef = useRef(false);
  const initialSaveCreatedRef = useRef(false);
  
  // Subscribe to global state changes
  useEffect(() => {
    const subscriber = (state: typeof globalSaveState) => {
      setLocalState({
        isSaving: state.isSaving,
        lastSaveTime: state.lastSaveTime,
        saveMessage: state.saveMessage
      });
    };
    globalSaveState.subscribers.add(subscriber);
    
    return () => {
      globalSaveState.subscribers.delete(subscriber);
    };
  }, []);
  
  // Auto-save function - fully async and non-blocking
  const performAutoSave = useCallback(async () => {
    if (isGuest || !isAuthenticated || phase !== 'playing') {
      return;
    }
    
    // Prevent multiple simultaneous saves
    if (isPerformingSaveRef.current || globalSaveState.isSaving) {
      return;
    }
    
    isPerformingSaveRef.current = true;
    
    // Run the save operation completely asynchronously
    requestAnimationFrame(() => {
      // Use requestIdleCallback if available for even better performance
      const runSave = async () => {
        updateGlobalSaveState({ isSaving: true, saveMessage: 'Saving...' });
        onSave?.();
        
        try {
          // Collect game state in a non-blocking way
          const gameState = await new Promise<any>(resolve => {
            // Use setTimeout to prevent blocking
            setTimeout(() => resolve(collectGameState()), 0);
          });
          
          // Get save slot asynchronously
          const saves = await gameApi.listSaves();
          const slot = saves.saves.length > 0 
            ? saves.saves.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].slot
            : 1;
          
          // Perform the actual save
          await gameApi.saveGame(slot, gameState);
          
          updateGlobalSaveState({ 
            lastSaveTime: new Date(), 
            saveMessage: 'Saved',
            isSaving: false
          });
          onSaveComplete?.();
          
          // Clear message after a short delay
          if (messageClearTimeoutRef.current) {
            clearTimeout(messageClearTimeoutRef.current);
          }
          messageClearTimeoutRef.current = setTimeout(() => {
            updateGlobalSaveState({ saveMessage: '' });
          }, 2000);
        } catch (error: any) {
          console.error('[AUTO-SAVE] Save failed:', error);
          updateGlobalSaveState({ 
            saveMessage: 'Save failed',
            isSaving: false
          });
          onSaveError?.(error);
          
          // Clear error message after longer delay
          if (messageClearTimeoutRef.current) {
            clearTimeout(messageClearTimeoutRef.current);
          }
          messageClearTimeoutRef.current = setTimeout(() => {
            updateGlobalSaveState({ saveMessage: '' });
          }, 4000);
        } finally {
          isPerformingSaveRef.current = false;
        }
      };
      
      // Use requestIdleCallback if available, otherwise use setTimeout
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runSave, { timeout: 2000 });
      } else {
        setTimeout(runSave, 0);
      }
    });
  }, [isGuest, isAuthenticated, phase, onSave, onSaveComplete, onSaveError]);
  
  // Trigger auto-save on docking
  useEffect(() => {
    if (isDocked && !lastDockedRef.current) {
      performAutoSave();
    }
    lastDockedRef.current = isDocked;
  }, [isDocked, performAutoSave]);
  
  // Trigger auto-save on mission completion
  useEffect(() => {
    if (completedMissionIds.size > lastCompletedMissionsRef.current) {
      performAutoSave();
    }
    lastCompletedMissionsRef.current = completedMissionIds.size;
  }, [completedMissionIds.size, performAutoSave]);
  
  // Create initial save when player first starts the game
  useEffect(() => {
    if (phase === 'playing' && !isGuest && isAuthenticated && !initialSaveCreatedRef.current) {
      // Check if any saves exist
      gameApi.listSaves().then(savesData => {
        if (savesData.saves.length === 0) {
          // No saves exist - create initial checkpoint
          console.log('[AUTO-SAVE] Creating initial checkpoint save for new player');
          performAutoSave();
        }
        initialSaveCreatedRef.current = true;
      }).catch(error => {
        console.error('[AUTO-SAVE] Failed to check for existing saves:', error);
        initialSaveCreatedRef.current = true;
      });
    }
  }, [phase, isGuest, isAuthenticated, performAutoSave]);
  
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
        performAutoSave();
        startInterval(); // Restart the interval
      }, intervalMs);
    };
    
    startInterval();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (messageClearTimeoutRef.current) {
        clearTimeout(messageClearTimeoutRef.current);
      }
    };
  }, [isGuest, isAuthenticated, phase, intervalMinutes, performAutoSave]);
  
  // Manual save function
  const manualSave = useCallback(async () => {
    if (isGuest) {
      updateGlobalSaveState({ saveMessage: 'Guest mode: Saving disabled' });
      if (messageClearTimeoutRef.current) {
        clearTimeout(messageClearTimeoutRef.current);
      }
      messageClearTimeoutRef.current = setTimeout(() => {
        updateGlobalSaveState({ saveMessage: '' });
      }, 3000);
      return;
    }
    
    await performAutoSave();
  }, [isGuest, performAutoSave]);
  
  return {
    isSaving: localState.isSaving,
    lastSaveTime: localState.lastSaveTime,
    saveMessage: localState.saveMessage,
    manualSave,
  };
};

// Legacy Save indicator component - keeping for backward compatibility
// Use the new AutoSaveIndicator component instead
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