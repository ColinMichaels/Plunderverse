import Phaser from 'phaser';
import MiniGameSyncService from '../../../services/MiniGameSyncService';
import { toast } from 'sonner';

export interface CollectionObjective {
  id: string;
  name: string;
  description: string;
  itemType: 'repair_tools' | 'spare_parts' | 'fuel_cells' | 'medical_supplies';
  requiredCount: number;
  currentCount: number;
  isCompleted: boolean;
  icon: string;
  sprite: string; // Sprite texture key
}

export interface CollectibleItem {
  id: string;
  itemType: string;
  x: number;
  y: number;
  room: string;
  isCollected: boolean;
  sprite?: Phaser.GameObjects.Sprite;
}

export class CollectionObjectiveSystem {
  private scene: Phaser.Scene;
  private syncService: MiniGameSyncService;
  private collectionObjectives: Map<string, CollectionObjective>;
  private collectibleItems: Map<string, CollectibleItem>;
  private collectiblesGroup?: Phaser.Physics.Arcade.StaticGroup;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.syncService = MiniGameSyncService.getInstance();
    this.collectionObjectives = new Map();
    this.collectibleItems = new Map();
    
    this.initializeObjectives();
    this.initializeCollectibleItems();
    this.loadCollectionProgress();
  }
  
  private initializeObjectives(): void {
    // Repair Tools - Need 3 sets scattered around station
    this.collectionObjectives.set('repair_tools', {
      id: 'repair_tools',
      name: 'Repair Tools',
      description: 'Essential tools for ship maintenance and repairs',
      itemType: 'repair_tools',
      requiredCount: 3,
      currentCount: 0,
      isCompleted: false,
      icon: '🔧',
      sprite: 'repair_tools'
    });
    
    // Spare Parts - Need 4 components
    this.collectionObjectives.set('spare_parts', {
      id: 'spare_parts',
      name: 'Spare Parts',
      description: 'Critical replacement components for ship systems',
      itemType: 'spare_parts',
      requiredCount: 4,
      currentCount: 0,
      isCompleted: false,
      icon: '⚙️',
      sprite: 'spare_parts'
    });
    
    // Fuel Cells - Need 3 cells
    this.collectionObjectives.set('fuel_cells', {
      id: 'fuel_cells',
      name: 'Fuel Cells',
      description: 'Energy cells to refuel ship systems',
      itemType: 'fuel_cells',
      requiredCount: 3,
      currentCount: 0,
      isCompleted: false,
      icon: '🔋',
      sprite: 'fuel_cell'
    });
    
    // Medical Supplies - Need 2 kits
    this.collectionObjectives.set('medical_supplies', {
      id: 'medical_supplies',
      name: 'Medical Supplies',
      description: 'Medical kits for crew health maintenance',
      itemType: 'medical_supplies',
      requiredCount: 2,
      currentCount: 0,
      isCompleted: false,
      icon: '💊',
      sprite: 'health_pickup'
    });
  }
  
  private initializeCollectibleItems(): void {
    let itemId = 0;
    
    // Repair Tools (3 items) - scattered in engineering and maintenance areas
    for (let i = 0; i < 3; i++) {
      this.collectibleItems.set(`repair_tools_${i}`, {
        id: `repair_tools_${i}`,
        itemType: 'repair_tools',
        x: 0, // Will be set when creating sprites
        y: 0,
        room: i === 0 ? 'engineering' : i === 1 ? 'maintenance' : 'cargo_hold',
        isCollected: false
      });
    }
    
    // Spare Parts (4 items) - in various rooms
    for (let i = 0; i < 4; i++) {
      this.collectibleItems.set(`spare_parts_${i}`, {
        id: `spare_parts_${i}`,
        itemType: 'spare_parts',
        x: 0,
        y: 0,
        room: i === 0 ? 'engineering' : i === 1 ? 'cargo_hold' : i === 2 ? 'docking_bay' : 'maintenance',
        isCollected: false
      });
    }
    
    // Fuel Cells (3 items)
    for (let i = 0; i < 3; i++) {
      this.collectibleItems.set(`fuel_cells_${i}`, {
        id: `fuel_cells_${i}`,
        itemType: 'fuel_cells',
        x: 0,
        y: 0,
        room: i === 0 ? 'cargo_hold' : i === 1 ? 'engineering' : 'docking_bay',
        isCollected: false
      });
    }
    
    // Medical Supplies (2 items)
    for (let i = 0; i < 2; i++) {
      this.collectibleItems.set(`medical_supplies_${i}`, {
        id: `medical_supplies_${i}`,
        itemType: 'medical_supplies',
        x: 0,
        y: 0,
        room: i === 0 ? 'crew_quarters' : 'medical_bay',
        isCollected: false
      });
    }
  }
  
  createCollectibles(stationRooms: Map<string, any>): Phaser.Physics.Arcade.StaticGroup {
    console.log('[CollectionObjectiveSystem] Creating collectible items...');
    
    this.collectiblesGroup = this.scene.physics.add.staticGroup();
    
    // Track item positions per room to avoid overlaps
    const roomItemCounts = new Map<string, number>();
    
    this.collectibleItems.forEach((item, id) => {
      if (item.isCollected) {
        console.log(`[CollectionObjectiveSystem] Item ${id} already collected, skipping`);
        return;
      }
      
      const room = stationRooms.get(item.room);
      if (!room) {
        console.warn(`[CollectionObjectiveSystem] Room ${item.room} not found for item ${id}`);
        return;
      }
      
      // Get objective to determine sprite
      const objective = this.collectionObjectives.get(item.itemType);
      if (!objective) {
        console.warn(`[CollectionObjectiveSystem] Objective not found for item type ${item.itemType}`);
        return;
      }
      
      // Position items within room, spacing them out
      const roomItemIndex = roomItemCounts.get(item.room) || 0;
      roomItemCounts.set(item.room, roomItemIndex + 1);
      
      // Calculate position with some randomness but avoid walls
      const offsetX = (roomItemIndex % 2) * 150 + 100;
      const offsetY = Math.floor(roomItemIndex / 2) * 120 + 80;
      
      item.x = room.x + offsetX;
      item.y = room.y + offsetY;
      
      // Create sprite
      const sprite = this.collectiblesGroup!.create(item.x, item.y, objective.sprite) as Phaser.GameObjects.Sprite;
      sprite.setData('collectibleId', id);
      sprite.setData('itemType', item.itemType);
      sprite.setScale(1.2);
      sprite.setDepth(10);
      
      // Add glow effect
      const glow = this.scene.add.rectangle(item.x, item.y, 32, 32);
      glow.setStrokeStyle(3, 0xffff00, 0.6);
      glow.setDepth(9);
      sprite.setData('glow', glow);
      
      // Add floating animation
      this.scene.tweens.add({
        targets: sprite,
        y: item.y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Glow pulse animation
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      item.sprite = sprite;
      
      console.log(`[CollectionObjectiveSystem] Created ${item.itemType} at (${item.x}, ${item.y}) in ${item.room}`);
    });
    
    console.log(`[CollectionObjectiveSystem] Created ${this.collectiblesGroup.getChildren().length} collectible items`);
    return this.collectiblesGroup;
  }
  
  collectItem(itemId: string): boolean {
    const item = this.collectibleItems.get(itemId);
    if (!item || item.isCollected) {
      return false;
    }
    
    const objective = this.collectionObjectives.get(item.itemType);
    if (!objective) {
      return false;
    }
    
    // Mark as collected
    item.isCollected = true;
    objective.currentCount++;
    
    // Visual feedback - destroy sprite and glow
    if (item.sprite) {
      const glow = item.sprite.getData('glow');
      if (glow) {
        glow.destroy();
      }
      
      // Collect animation
      this.scene.tweens.add({
        targets: item.sprite,
        scale: 2,
        alpha: 0,
        duration: 300,
        ease: 'Back.easeIn',
        onComplete: () => {
          item.sprite?.destroy();
        }
      });
    }
    
    // Audio feedback
    if (this.scene.sound) {
      this.scene.sound.play('collect', { volume: 0.3 });
    }
    
    // Check if objective is complete
    if (objective.currentCount >= objective.requiredCount) {
      objective.isCompleted = true;
      this.onObjectiveComplete(objective);
    }
    
    // Save progress to localStorage
    this.saveCollectionProgress();
    
    // Emit event for UI updates
    this.scene.events.emit('collectionItemCollected', {
      itemId,
      itemType: item.itemType,
      objectiveName: objective.name,
      progress: `${objective.currentCount}/${objective.requiredCount}`,
      isComplete: objective.isCompleted
    });
    
    // Show toast notification
    toast.success(`Collected ${objective.name}`, {
      description: `${objective.currentCount}/${objective.requiredCount} collected`,
      duration: 2000
    });
    
    console.log(`[CollectionObjectiveSystem] Collected ${itemId}: ${objective.currentCount}/${objective.requiredCount}`);
    
    return true;
  }
  
  private onObjectiveComplete(objective: CollectionObjective): void {
    console.log(`[CollectionObjectiveSystem] Objective completed: ${objective.name}`);
    
    // Show completion notification
    toast.success(`✅ ${objective.name} Complete!`, {
      description: objective.description,
      duration: 3000
    });
    
    // Emit completion event
    this.scene.events.emit('collectionObjectiveCompleted', {
      objectiveId: objective.id,
      objectiveName: objective.name
    });
  }
  
  getObjectives(): CollectionObjective[] {
    return Array.from(this.collectionObjectives.values());
  }
  
  getObjective(id: string): CollectionObjective | undefined {
    return this.collectionObjectives.get(id);
  }
  
  getCollectiblesGroup(): Phaser.Physics.Arcade.StaticGroup | undefined {
    return this.collectiblesGroup;
  }
  
  updateGlowEffects(playerX: number, playerY: number): void {
    this.collectibleItems.forEach(item => {
      if (item.isCollected || !item.sprite) return;
      
      const glow = item.sprite.getData('glow');
      if (!glow) return;
      
      const distance = Phaser.Math.Distance.Between(playerX, playerY, item.x, item.y);
      
      if (distance < 150) {
        const alpha = 1 - (distance / 150);
        glow.setStrokeStyle(3, 0xffff00, alpha * 0.8);
      } else {
        glow.setStrokeStyle(3, 0xffff00, 0.1);
      }
    });
  }
  
  private saveCollectionProgress(): void {
    const progress = {
      objectives: Array.from(this.collectionObjectives.entries()).map(([id, obj]) => ({
        id,
        currentCount: obj.currentCount,
        requiredCount: obj.requiredCount,
        isCompleted: obj.isCompleted
      })),
      items: Array.from(this.collectibleItems.entries()).map(([id, item]) => ({
        id,
        isCollected: item.isCollected
      }))
    };
    
    localStorage.setItem('minigame_collection_progress', JSON.stringify(progress));
    console.log('[CollectionObjectiveSystem] Progress saved to localStorage');
  }
  
  private loadCollectionProgress(): void {
    const saved = localStorage.getItem('minigame_collection_progress');
    if (!saved) {
      console.log('[CollectionObjectiveSystem] No saved progress found');
      return;
    }
    
    try {
      const progress = JSON.parse(saved);
      
      // Restore objectives
      progress.objectives?.forEach((saved: any) => {
        const objective = this.collectionObjectives.get(saved.id);
        if (objective) {
          objective.currentCount = saved.currentCount || 0;
          objective.isCompleted = saved.isCompleted || false;
        }
      });
      
      // Restore items
      progress.items?.forEach((saved: any) => {
        const item = this.collectibleItems.get(saved.id);
        if (item) {
          item.isCollected = saved.isCollected || false;
        }
      });
      
      console.log('[CollectionObjectiveSystem] Progress loaded from localStorage');
    } catch (error) {
      console.error('[CollectionObjectiveSystem] Failed to load progress:', error);
    }
  }
  
  destroy(): void {
    this.collectiblesGroup?.clear(true, true);
    this.collectibleItems.forEach(item => {
      if (item.sprite) {
        const glow = item.sprite.getData('glow');
        glow?.destroy();
        item.sprite.destroy();
      }
    });
  }
}
