import Phaser from 'phaser';
import { toast } from 'sonner';

export interface DoorConfig {
  id: string;
  roomFrom: string;
  roomTo: string;
  x: number;
  y: number;
  isLocked: boolean;
  unlockRequirement: string; // objective id that unlocks this door
  doorSprite?: Phaser.GameObjects.Rectangle;
  lockIcon?: Phaser.GameObjects.Text;
}

export class DoorProgressionSystem {
  private scene: Phaser.Scene;
  private doors: Map<string, DoorConfig> = new Map();
  private doorSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeDoorConfigs();
    this.setupEventListeners();
  }
  
  private initializeDoorConfigs(): void {
    // Level 1: Docking Bay -> Corridor 1 (unlocked by default - starting area)
    this.doors.set('door_docking_bay_corridor_1', {
      id: 'door_docking_bay_corridor_1',
      roomFrom: 'docking_bay',
      roomTo: 'corridor_1',
      x: 0,
      y: 0,
      isLocked: false,
      unlockRequirement: ''
    });
    
    this.doors.set('door_corridor_1_docking_bay', {
      id: 'door_corridor_1_docking_bay',
      roomFrom: 'corridor_1',
      roomTo: 'docking_bay',
      x: 0,
      y: 0,
      isLocked: false,
      unlockRequirement: ''
    });
    
    // Level 2: Corridor 1 -> Corridor 2 (unlock after collecting repair tools)
    this.doors.set('door_corridor_1_corridor_2', {
      id: 'door_corridor_1_corridor_2',
      roomFrom: 'corridor_1',
      roomTo: 'corridor_2',
      x: 0,
      y: 0,
      isLocked: true,
      unlockRequirement: 'repair_tools'
    });
    
    this.doors.set('door_corridor_2_corridor_1', {
      id: 'door_corridor_2_corridor_1',
      roomFrom: 'corridor_2',
      roomTo: 'corridor_1',
      x: 0,
      y: 0,
      isLocked: true,
      unlockRequirement: 'repair_tools'
    });
    
    // Level 3: Corridor 2 -> Engineering (unlock after repairing life support)
    this.doors.set('door_corridor_2_engineering', {
      id: 'door_corridor_2_engineering',
      roomFrom: 'corridor_2',
      roomTo: 'engineering',
      x: 0,
      y: 0,
      isLocked: true,
      unlockRequirement: 'life_support'
    });
    
    this.doors.set('door_engineering_corridor_2', {
      id: 'door_engineering_corridor_2',
      roomFrom: 'engineering',
      roomTo: 'corridor_2',
      x: 0,
      y: 0,
      isLocked: true,
      unlockRequirement: 'life_support'
    });
    
    // Level 4: Cantina -> Crew Quarters (unlock when all objectives complete)
    this.doors.set('door_cantina_crew_quarters', {
      id: 'door_cantina_crew_quarters',
      roomFrom: 'cantina',
      roomTo: 'crew_quarters',
      x: 0,
      y: 0,
      isLocked: true,
      unlockRequirement: 'all_objectives'
    });
    
    this.doors.set('door_crew_quarters_cantina', {
      id: 'door_crew_quarters_cantina',
      roomFrom: 'crew_quarters',
      roomTo: 'cantina',
      x: 0,
      y: 0,
      isLocked: true,
      unlockRequirement: 'all_objectives'
    });
    
    console.log('[DoorProgressionSystem] Initialized with', this.doors.size, 'doors');
  }
  
  private setupEventListeners(): void {
    // Listen for collection objective completion
    this.scene.events.on('collectionItemCollected', (data: any) => {
      if (data.isComplete) {
        console.log('[DoorProgressionSystem] Collection objective completed:', data.objectiveName);
        this.checkDoorUnlocks(data.itemType);
      }
    });
    
    // Listen for repair objective completion
    this.scene.events.on('repairObjectiveCompleted', (objective: any) => {
      console.log('[DoorProgressionSystem] Repair objective completed:', objective.id);
      this.checkDoorUnlocks(objective.id);
    });
    
    // Listen for all objectives complete
    this.scene.events.on('allObjectivesComplete', () => {
      console.log('[DoorProgressionSystem] All objectives complete!');
      this.checkDoorUnlocks('all_objectives');
    });
  }
  
  registerDoor(doorId: string, x: number, y: number, sprite: Phaser.GameObjects.Rectangle): void {
    const doorConfig = this.doors.get(doorId);
    if (doorConfig) {
      doorConfig.x = x;
      doorConfig.y = y;
      doorConfig.doorSprite = sprite;
      this.doorSprites.set(doorId, sprite);
      
      // Add lock visual if door is locked
      if (doorConfig.isLocked) {
        this.addLockVisual(doorConfig);
      }
      
      console.log(`[DoorProgressionSystem] Registered door: ${doorId} at (${x}, ${y}), locked: ${doorConfig.isLocked}`);
    }
  }
  
  private addLockVisual(door: DoorConfig): void {
    if (!door.doorSprite) return;
    
    // Create lock icon
    const lockIcon = this.scene.add.text(door.x, door.y, '🔒', {
      fontSize: '28px'
    });
    lockIcon.setOrigin(0.5);
    lockIcon.setDepth(15);
    
    // Pulse animation
    this.scene.tweens.add({
      targets: lockIcon,
      scale: { from: 1, to: 1.2 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
    
    door.lockIcon = lockIcon;
    
    // Update door appearance for locked state
    door.doorSprite.setFillStyle(0x660000); // Dark red for locked
    door.doorSprite.setStrokeStyle(3, 0xff0000); // Red border
  }
  
  private removeLockVisual(door: DoorConfig): void {
    if (door.lockIcon) {
      door.lockIcon.destroy();
      door.lockIcon = undefined;
    }
    
    // Update door appearance for unlocked state
    if (door.doorSprite) {
      door.doorSprite.setFillStyle(0x0066cc); // Blue for unlocked
      door.doorSprite.setStrokeStyle(3, 0x00aaff);
    }
  }
  
  private checkDoorUnlocks(requirementMet: string): void {
    // Track which doors to unlock
    const doorsToUnlock: string[] = [];
    
    this.doors.forEach((door, doorId) => {
      if (door.isLocked && door.unlockRequirement === requirementMet) {
        doorsToUnlock.push(doorId);
      }
    });
    
    // Unlock all matching doors (including bidirectional pairs)
    doorsToUnlock.forEach(doorId => {
      this.unlockDoor(doorId);
    });
  }
  
  unlockDoor(doorId: string): void {
    const door = this.doors.get(doorId);
    if (!door || !door.isLocked) return;
    
    door.isLocked = false;
    this.removeLockVisual(door);
    
    // Play unlock animation
    if (door.doorSprite) {
      this.scene.tweens.add({
        targets: door.doorSprite,
        scale: { from: 1, to: 1.3 },
        alpha: { from: 0.8, to: 1 },
        duration: 500,
        yoyo: true,
        ease: 'Back.easeOut'
      });
      
      // Unlock particles
      const particles = this.scene.add.particles(door.x, door.y, 'particle', {
        color: [0x00ff00, 0xffff00],
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        speed: { min: 100, max: 200 },
        angle: { min: 0, max: 360 },
        lifespan: 1000,
        quantity: 20,
        gravityY: -100
      });
      particles.setDepth(50);
      
      setTimeout(() => particles.destroy(), 1500);
    }
    
    // Save progress
    this.saveDoorProgress();
    
    // Show notification
    toast.success('🔓 Door Unlocked!', {
      description: `Access to ${door.roomTo} granted`,
      duration: 3000
    });
    
    // Play sound
    if (this.scene.sound) {
      this.scene.sound.play('powerup', { volume: 0.4 });
    }
    
    console.log(`[DoorProgressionSystem] Door unlocked: ${doorId}`);
    
    // Emit event for UI updates
    this.scene.events.emit('doorUnlocked', {
      doorId,
      roomFrom: door.roomFrom,
      roomTo: door.roomTo
    });
  }
  
  isDoorLocked(doorId: string): boolean {
    const door = this.doors.get(doorId);
    return door ? door.isLocked : false;
  }
  
  canPassThroughDoor(roomFrom: string, roomTo: string): boolean {
    // Check all doors between these rooms
    for (const door of Array.from(this.doors.values())) {
      if ((door.roomFrom === roomFrom && door.roomTo === roomTo) ||
          (door.roomFrom === roomTo && door.roomTo === roomFrom)) {
        return !door.isLocked;
      }
    }
    return true; // If no door found, allow passage
  }
  
  private saveDoorProgress(): void {
    const progress: Record<string, boolean> = {};
    this.doors.forEach((door, id) => {
      progress[id] = door.isLocked;
    });
    
    try {
      localStorage.setItem('minigame_door_progress', JSON.stringify(progress));
      console.log('[DoorProgressionSystem] Door progress saved');
    } catch (error) {
      console.error('[DoorProgressionSystem] Failed to save door progress:', error);
    }
  }
  
  loadDoorProgress(): void {
    try {
      const saved = localStorage.getItem('minigame_door_progress');
      if (saved) {
        const progress: Record<string, boolean> = JSON.parse(saved);
        
        Object.entries(progress).forEach(([doorId, isLocked]) => {
          const door = this.doors.get(doorId);
          if (door) {
            door.isLocked = isLocked;
            
            // Update visual if door sprite exists
            if (door.doorSprite) {
              if (isLocked) {
                this.addLockVisual(door);
              } else {
                this.removeLockVisual(door);
              }
            }
          }
        });
        
        console.log('[DoorProgressionSystem] Door progress loaded');
      }
    } catch (error) {
      console.error('[DoorProgressionSystem] Failed to load door progress:', error);
    }
  }
  
  getAllDoorStatus(): Array<{ doorId: string; isLocked: boolean; requirement: string }> {
    return Array.from(this.doors.values()).map(door => ({
      doorId: door.id,
      isLocked: door.isLocked,
      requirement: door.unlockRequirement
    }));
  }
  
  resetProgress(): void {
    // Reset all doors to initial state
    this.initializeDoorConfigs();
    this.saveDoorProgress();
    
    // Update visuals
    this.doors.forEach(door => {
      if (door.doorSprite) {
        if (door.isLocked) {
          this.addLockVisual(door);
        } else {
          this.removeLockVisual(door);
        }
      }
    });
    
    console.log('[DoorProgressionSystem] Progress reset');
  }
  
  destroy(): void {
    this.scene.events.off('collectionItemCollected');
    this.scene.events.off('repairObjectiveCompleted');
    this.scene.events.off('allObjectivesComplete');
    
    this.doors.forEach(door => {
      if (door.lockIcon) {
        door.lockIcon.destroy();
      }
    });
    
    this.doors.clear();
    this.doorSprites.clear();
  }
}
