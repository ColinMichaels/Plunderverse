import MiniGameSyncService from '../../../services/MiniGameSyncService';
import { DialogueOutcome } from './NPCDialogueSystem';
import { SmugglingMission } from './SmugglingSystem';
import { CrewTask } from './CrewManagementSystem';

/**
 * Integration module for syncing mini-game events with main game
 */
export class SyncIntegration {
  private syncService: MiniGameSyncService;
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.syncService = MiniGameSyncService.getInstance();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for game events and sync them
    this.scene.events.on('dialogue_outcome', this.handleDialogueOutcome, this);
    this.scene.events.on('smuggling_complete', this.handleSmugglingComplete, this);
    this.scene.events.on('crewTaskCompleted', this.handleCrewTaskComplete, this);
    this.scene.events.on('mission_progress', this.handleMissionProgress, this);
    this.scene.events.on('credits_earned', this.handleCreditsEarned, this);
    this.scene.events.on('reputation_changed', this.handleReputationChange, this);
    this.scene.events.on('heat_changed', this.handleHeatChange, this);
    this.scene.events.on('item_acquired', this.handleItemAcquired, this);
    this.scene.events.on('allObjectivesComplete', this.handleVictoryComplete, this);
  }

  private handleDialogueOutcome(data: {
    npcId: string;
    outcomes: DialogueOutcome[];
  }): void {
    console.log('[SyncIntegration] Syncing dialogue outcome:', data);
    this.syncService.syncDialogueOutcome(data.npcId, data.outcomes);
  }

  private handleSmugglingComplete(data: {
    mission: SmugglingMission;
    outcome: 'success' | 'failure' | 'detected';
    rewards?: {
      credits: number;
      heat: number;
      reputation?: any;
    };
  }): void {
    console.log('[SyncIntegration] Syncing smuggling mission:', data);
    this.syncService.syncSmugglingMission(data.mission, data.outcome);
  }

  private handleCrewTaskComplete(data: {
    crewMemberId: string;
    task: CrewTask;
    result: 'success' | 'failure';
    rewards?: any;
  }): void {
    console.log('[SyncIntegration] Syncing crew task:', data);
    this.syncService.syncCrewTask(
      data.crewMemberId,
      data.task,
      data.result === 'success' ? 100 : 0
    );
  }

  private handleMissionProgress(data: {
    missionId: string;
    objectiveId?: string;
    progress: number;
    completed: boolean;
  }): void {
    console.log('[SyncIntegration] Syncing mission progress:', data);
    this.syncService.syncMissionProgress(data.missionId, {
      objectiveId: data.objectiveId,
      progress: data.progress,
      completed: data.completed
    });
  }

  private handleCreditsEarned(amount: number): void {
    // Credits are synced automatically through store subscriptions
    console.log('[SyncIntegration] Credits earned:', amount);
  }

  private handleReputationChange(data: {
    faction: string;
    change: number;
    newValue: number;
  }): void {
    // Reputation is synced automatically through store subscriptions
    console.log('[SyncIntegration] Reputation changed:', data);
  }

  private handleHeatChange(data: {
    change: number;
    newValue: number;
    wantedLevel?: number;
  }): void {
    // Heat is synced automatically through store subscriptions
    console.log('[SyncIntegration] Heat changed:', data);
  }

  private handleItemAcquired(data: {
    itemId: string;
    quantity: number;
    source: string;
  }): void {
    // Items are synced automatically through store subscriptions
    console.log('[SyncIntegration] Item acquired:', data);
  }

  private handleVictoryComplete(): void {
    console.log('[SyncIntegration] Mini-game objectives completed! Syncing rewards...');
    
    // Calculate rewards based on completion
    const rewards = {
      credits: 500, // Base reward for completing all objectives
      shipRepairs: {
        hull: 25,    // 25% hull repair
        shields: 25, // 25% shield repair
        fuel: 50     // 50% fuel restore
      },
      items: [
        { id: 'repair_kit', quantity: 2 },
        { id: 'fuel_canister', quantity: 3 }
      ]
    };
    
    // Apply rewards locally first
    this.applyVictoryRewards(rewards);
    
    // Sync victory and rewards to main game
    this.syncService.syncVictoryRewards(rewards);
  }

  private applyVictoryRewards(rewards: any): void {
    const { useShipStatus } = require('@/lib/stores/ship/useShipStatus');
    const { useCreditsStore } = require('@/domain/economy/credits.store');
    
    // Apply credits
    useCreditsStore.getState().earnCredits(rewards.credits);
    console.log(`[SyncIntegration] Awarded ${rewards.credits} credits`);
    
    // Apply ship repairs using the proper methods
    const shipStatus = useShipStatus.getState();
    shipStatus.rechargeShield(rewards.shipRepairs.shields);
    shipStatus.repairHull(rewards.shipRepairs.hull);
    console.log('[SyncIntegration] Applied ship repairs:', rewards.shipRepairs);
    
    // Note: Items would need proper ResourceData objects to add to inventory
    // For now, just log the items (this would need full integration with resource system)
    if (rewards.items && rewards.items.length > 0) {
      console.log('[SyncIntegration] Victory items awarded (inventory integration needed):', rewards.items);
    }
  }

  /**
   * Manually trigger a full sync
   */
  public forceSync(): void {
    this.syncService.forceSync();
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): string {
    return this.syncService.getSyncStatus();
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    this.scene.events.off('dialogue_outcome', this.handleDialogueOutcome, this);
    this.scene.events.off('smuggling_complete', this.handleSmugglingComplete, this);
    this.scene.events.off('crewTaskCompleted', this.handleCrewTaskComplete, this);
    this.scene.events.off('mission_progress', this.handleMissionProgress, this);
    this.scene.events.off('credits_earned', this.handleCreditsEarned, this);
    this.scene.events.off('reputation_changed', this.handleReputationChange, this);
    this.scene.events.off('heat_changed', this.handleHeatChange, this);
    this.scene.events.off('item_acquired', this.handleItemAcquired, this);
    this.scene.events.off('allObjectivesComplete', this.handleVictoryComplete, this);
  }
}