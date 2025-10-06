import { useEffect, useRef } from 'react';
import MiniGameSyncService from '../services/MiniGameSyncService';
import { toast } from 'sonner';
import { usePlayer } from '../lib/stores/player/usePlayer';
import { useCreditsStore } from '../domain/economy/credits.store';

/**
 * Hook to manage mini-game sync integration
 */
export const useMiniGameSync = () => {
  const syncServiceRef = useRef<MiniGameSyncService | null>(null);

  useEffect(() => {
    // Initialize sync service
    if (!syncServiceRef.current) {
      syncServiceRef.current = MiniGameSyncService.getInstance();
      console.log('[MiniGameSync] Service initialized via hook');
    }

    const syncService = syncServiceRef.current;

    // Listen for sync events
    const handleSyncStatus = (status: string) => {
      switch (status) {
        case 'connected':
          toast.success('Sync connected', { duration: 2000 });
          break;
        case 'offline':
          toast.warning('Sync offline - changes will be saved locally', { duration: 3000 });
          break;
        case 'error':
          toast.error('Sync error - retrying...', { duration: 3000 });
          break;
      }
    };

    syncService.addEventListener('status', handleSyncStatus);

    // Cleanup
    return () => {
      syncService.removeEventListener('status', handleSyncStatus);
    };
  }, []);

  const syncSmugglingMission = (mission: any, outcome: 'success' | 'failure' | 'detected') => {
    if (syncServiceRef.current) {
      syncServiceRef.current.syncSmugglingMission(mission, outcome);
      console.log(`[MiniGameSync] Synced smuggling mission: ${outcome}`);
    }
  };

  const syncDialogueOutcome = (npcId: string, outcomes: any[]) => {
    if (syncServiceRef.current) {
      syncServiceRef.current.syncDialogueOutcome(npcId, outcomes);
      console.log(`[MiniGameSync] Synced dialogue outcomes for NPC: ${npcId}`);
    }
  };

  const syncCrewTask = (crewMemberId: string, task: any, progress: number) => {
    if (syncServiceRef.current) {
      syncServiceRef.current.syncCrewTask(crewMemberId, task, progress);
      console.log(`[MiniGameSync] Synced crew task progress: ${progress}%`);
    }
  };

  const syncMissionProgress = (missionId: string, progress: any) => {
    if (syncServiceRef.current) {
      syncServiceRef.current.syncMissionProgress(missionId, progress);
      console.log(`[MiniGameSync] Synced mission progress for: ${missionId}`);
    }
  };

  const forceSync = () => {
    if (syncServiceRef.current) {
      syncServiceRef.current.forceSync();
      toast.info('Manual sync triggered', { duration: 2000 });
    }
  };

  const getSyncStatus = () => {
    return syncServiceRef.current?.getSyncStatus() || 'offline';
  };

  const getQueueSize = () => {
    return syncServiceRef.current?.getQueueSize() || 0;
  };

  return {
    syncSmugglingMission,
    syncDialogueOutcome,
    syncCrewTask,
    syncMissionProgress,
    forceSync,
    getSyncStatus,
    getQueueSize
  };
};