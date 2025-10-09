import Phaser from 'phaser';
import MiniGameSyncService from '../../../services/MiniGameSyncService';
import { toast } from 'sonner';

export interface RepairObjective {
  id: string;
  name: string;
  description: string;
  systemType: 'life_support' | 'power_relay' | 'navigation_computer' | 'shield_generator';
  location: string;
  x: number;
  y: number;
  isCompleted: boolean;
  progress: number; // 0-100
  requiredInteractions: number; // How many times player needs to interact
  currentInteractions: number;
  repairTime: number; // Time in seconds for each interaction
  icon: string;
}

export class RepairObjectiveSystem {
  private scene: Phaser.Scene;
  private syncService: MiniGameSyncService;
  private repairObjectives: Map<string, RepairObjective>;
  private repairSprites: Map<string, Phaser.GameObjects.Sprite>;
  private activeRepairTimer?: Phaser.Time.TimerEvent;
  private currentRepair: string | null = null;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.syncService = MiniGameSyncService.getInstance();
    this.repairObjectives = new Map();
    this.repairSprites = new Map();
    
    this.initializeRepairObjectives();
    this.loadRepairProgress();
  }
  
  private initializeRepairObjectives(): void {
    // Life Support - Engineering Room
    this.repairObjectives.set('life_support', {
      id: 'life_support',
      name: 'Life Support System',
      description: 'Critical oxygen circulation and atmospheric control',
      systemType: 'life_support',
      location: 'engineering',
      x: 0, // Will be set when creating sprites
      y: 0,
      isCompleted: false,
      progress: 0,
      requiredInteractions: 3,
      currentInteractions: 0,
      repairTime: 2, // 2 seconds per interaction
      icon: '💨'
    });
    
    // Power Relay - Engineering Room
    this.repairObjectives.set('power_relay', {
      id: 'power_relay',
      name: 'Power Relay Station',
      description: 'Main power distribution and energy routing',
      systemType: 'power_relay',
      location: 'engineering',
      x: 0,
      y: 0,
      isCompleted: false,
      progress: 0,
      requiredInteractions: 4,
      currentInteractions: 0,
      repairTime: 2.5,
      icon: '⚡'
    });
    
    // Navigation Computer - Docking Bay
    this.repairObjectives.set('navigation_computer', {
      id: 'navigation_computer',
      name: 'Navigation Computer',
      description: 'Ship trajectory calculation and astrogation system',
      systemType: 'navigation_computer',
      location: 'docking_bay',
      x: 0,
      y: 0,
      isCompleted: false,
      progress: 0,
      requiredInteractions: 3,
      currentInteractions: 0,
      repairTime: 3,
      icon: '🧭'
    });
    
    // Shield Generator - Cargo Hold
    this.repairObjectives.set('shield_generator', {
      id: 'shield_generator',
      name: 'Shield Generator',
      description: 'Defensive energy shield projector array',
      systemType: 'shield_generator',
      location: 'cargo_hold',
      x: 0,
      y: 0,
      isCompleted: false,
      progress: 0,
      requiredInteractions: 5,
      currentInteractions: 0,
      repairTime: 3,
      icon: '🛡️'
    });
  }
  
  createRepairPoints(stationRooms: Map<string, any>, interactables: Phaser.Physics.Arcade.StaticGroup): void {
    console.log('[RepairObjectiveSystem] Creating repair points...');
    
    this.repairObjectives.forEach((objective, id) => {
      const room = stationRooms.get(objective.location);
      if (!room) {
        console.warn(`[RepairObjectiveSystem] Room ${objective.location} not found for objective ${id}`);
        return;
      }
      
      // Position repair points based on location
      let x = room.x + room.width / 2;
      let y = room.y + room.height / 2;
      
      // Offset positions so they don't overlap
      if (id === 'life_support') {
        x = room.x + 200;
        y = room.y + 200;
      } else if (id === 'power_relay') {
        x = room.x + room.width - 200;
        y = room.y + 200;
      } else if (id === 'navigation_computer') {
        x = room.x + 200;
        y = room.y + room.height - 200;
      } else if (id === 'shield_generator') {
        x = room.x + room.width / 2;
        y = room.y + room.height / 2;
      }
      
      // Update objective position
      objective.x = x;
      objective.y = y;
      
      // Create visual sprite
      const sprite = interactables.create(x, y, 'repair_point') as Phaser.GameObjects.Sprite;
      sprite.setScale(1.8);
      sprite.setData('type', 'repair');
      sprite.setData('objectiveId', id);
      sprite.setData('objective', objective);
      
      // Add glow effect
      this.scene.tweens.add({
        targets: sprite,
        alpha: { from: 0.7, to: 1 },
        scale: { from: 1.6, to: 1.8 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
      
      // Add status indicator text
      const statusText = this.scene.add.text(x, y - 60, objective.icon, {
        fontSize: '32px',
        color: objective.isCompleted ? '#00ff00' : '#ffaa00'
      }).setOrigin(0.5).setDepth(15);
      
      // Store references
      this.repairSprites.set(id, sprite);
      sprite.setData('statusText', statusText);
      
      console.log(`[RepairObjectiveSystem] Created repair point: ${objective.name} at (${x}, ${y})`);
    });
  }
  
  interactWithRepairPoint(objectiveId: string): void {
    const objective = this.repairObjectives.get(objectiveId);
    if (!objective) return;
    
    if (objective.isCompleted) {
      this.scene.events.emit('showHint', `${objective.icon} ${objective.name} is already repaired!`);
      return;
    }
    
    if (this.currentRepair) {
      this.scene.events.emit('showHint', 'Already repairing another system...');
      return;
    }
    
    this.startRepair(objectiveId);
  }
  
  private startRepair(objectiveId: string): void {
    const objective = this.repairObjectives.get(objectiveId);
    if (!objective) return;
    
    this.currentRepair = objectiveId;
    
    // Show repair progress
    this.scene.events.emit('showHint', `Repairing ${objective.name}... Hold position!`);
    
    // Visual feedback
    const sprite = this.repairSprites.get(objectiveId);
    if (sprite) {
      sprite.setTint(0x00ff00);
    }
    
    // Start repair timer
    this.activeRepairTimer = this.scene.time.delayedCall(
      objective.repairTime * 1000,
      () => this.completeRepairInteraction(objectiveId),
      [],
      this
    );
  }
  
  cancelRepair(): void {
    if (this.currentRepair) {
      const objective = this.repairObjectives.get(this.currentRepair);
      if (objective) {
        this.scene.events.emit('showHint', `${objective.name} repair cancelled!`);
      }
      
      const sprite = this.repairSprites.get(this.currentRepair);
      if (sprite) {
        sprite.clearTint();
      }
      
      if (this.activeRepairTimer) {
        this.activeRepairTimer.remove();
        this.activeRepairTimer = undefined;
      }
      
      this.currentRepair = null;
    }
  }
  
  private completeRepairInteraction(objectiveId: string): void {
    const objective = this.repairObjectives.get(objectiveId);
    if (!objective) return;
    
    objective.currentInteractions++;
    objective.progress = Math.round((objective.currentInteractions / objective.requiredInteractions) * 100);
    
    // Visual feedback
    const sprite = this.repairSprites.get(objectiveId);
    if (sprite) {
      sprite.clearTint();
      
      // Flash effect
      this.scene.tweens.add({
        targets: sprite,
        alpha: { from: 1, to: 0.3 },
        duration: 200,
        yoyo: true,
        repeat: 2
      });
    }
    
    // Check if fully repaired
    if (objective.currentInteractions >= objective.requiredInteractions) {
      this.completeObjective(objectiveId);
    } else {
      this.scene.events.emit('showHint', 
        `${objective.icon} ${objective.name}: ${objective.progress}% complete`
      );
      toast.success(`Repair Progress: ${objective.progress}%`);
    }
    
    this.currentRepair = null;
    this.saveRepairProgress();
  }
  
  private completeObjective(objectiveId: string): void {
    const objective = this.repairObjectives.get(objectiveId);
    if (!objective) return;
    
    objective.isCompleted = true;
    objective.progress = 100;
    
    // Update visual
    const sprite = this.repairSprites.get(objectiveId);
    if (sprite) {
      sprite.setTint(0x00ff00);
      const statusText = sprite.getData('statusText');
      if (statusText) {
        statusText.setColor('#00ff00');
      }
    }
    
    // Emit completion event
    this.scene.events.emit('repairObjectiveCompleted', objective);
    this.scene.events.emit('showHint', `✅ ${objective.name} repaired successfully!`);
    
    toast.success(`${objective.icon} ${objective.name} Repaired!`, {
      description: 'Ship system restored to full functionality'
    });
    
    console.log(`[RepairObjectiveSystem] Completed: ${objective.name}`);
    this.saveRepairProgress();
    
    // Sync with desktop/React stores
    this.syncRepairCompletion(objectiveId);
  }
  
  private syncRepairCompletion(objectiveId: string): void {
    const objective = this.repairObjectives.get(objectiveId);
    if (!objective) return;
    
    // Map mini-game objectives to ship repair systems
    const systemMapping: Record<string, string> = {
      'life_support': 'hull', // Life support repairs hull
      'power_relay': 'engine', // Power relay repairs engine
      'navigation_computer': 'navigation', // Navigation repairs scanner
      'shield_generator': 'shields' // Shield gen repairs shields
    };
    
    const systemId = systemMapping[objectiveId];
    if (systemId) {
      console.log(`[RepairObjectiveSystem] Syncing repair completion for ${systemId}`);
      // The completion will be detected by the useEffect in ShipRepairPanel
      // which watches for completed repair objectives
    }
  }
  
  private saveRepairProgress(): void {
    const progress: Record<string, any> = {};
    this.repairObjectives.forEach((objective, id) => {
      progress[id] = {
        isCompleted: objective.isCompleted,
        currentInteractions: objective.currentInteractions,
        progress: objective.progress
      };
    });
    
    localStorage.setItem('minigame_repair_progress', JSON.stringify(progress));
  }
  
  private loadRepairProgress(): void {
    try {
      const saved = localStorage.getItem('minigame_repair_progress');
      if (saved) {
        const progress = JSON.parse(saved);
        
        Object.entries(progress).forEach(([id, data]: [string, any]) => {
          const objective = this.repairObjectives.get(id);
          if (objective) {
            objective.isCompleted = data.isCompleted;
            objective.currentInteractions = data.currentInteractions;
            objective.progress = data.progress;
          }
        });
        
        console.log('[RepairObjectiveSystem] Loaded repair progress:', progress);
      }
    } catch (error) {
      console.error('[RepairObjectiveSystem] Error loading repair progress:', error);
    }
  }
  
  getObjective(id: string): RepairObjective | undefined {
    return this.repairObjectives.get(id);
  }
  
  getAllObjectives(): RepairObjective[] {
    return Array.from(this.repairObjectives.values());
  }
  
  getActiveObjectives(): RepairObjective[] {
    return Array.from(this.repairObjectives.values()).filter(obj => !obj.isCompleted);
  }
  
  getCompletedObjectives(): RepairObjective[] {
    return Array.from(this.repairObjectives.values()).filter(obj => obj.isCompleted);
  }
  
  getCurrentRepair(): string | null {
    return this.currentRepair;
  }
  
  destroy(): void {
    this.cancelRepair();
    this.repairObjectives.clear();
    this.repairSprites.clear();
  }
}
