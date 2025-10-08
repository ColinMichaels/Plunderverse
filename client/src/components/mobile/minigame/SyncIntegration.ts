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
  }
}