import Phaser from 'phaser';
import { useHeatSystem } from '../../../lib/stores/player/useHeatSystem';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { useInventoryStore } from '../../../domain/economy/inventory.store';
import { toast } from 'sonner';

export interface ContrabandType {
  id: string;
  name: string;
  dangerLevel: 1 | 2 | 3 | 4 | 5; // 1 = low risk, 5 = extreme risk
  baseValue: number;
  weight: number;
  description: string;
  detectionRadius: number; // How close security needs to be to detect
  icon: string;
  factionPreferences?: {
    outlaws: number; // Multiplier for outlaw buyers
    corporations: number; // Risk multiplier if caught by corps
    independents: number; // Neutral stance
  };
}

export interface SecurityCheckpoint {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scannerLevel: number; // 1-3, higher detects more contraband
  bribeCost: number;
  faction: 'corporations' | 'independents' | 'security';
  isActive: boolean;
}

export interface SecurityPatrol {
  id: string;
  sprite: Phaser.Physics.Arcade.Sprite;
  path: Phaser.Math.Vector2[];
  currentPathIndex: number;
  speed: number;
  detectionRange: number;
  alertLevel: 'normal' | 'suspicious' | 'alert' | 'pursuing';
  faction: 'corporations' | 'independents' | 'security';
  lastSeenPlayer?: Phaser.Math.Vector2;
  suspicionTimer: number;
}

export interface SmugglingMission {
  id: string;
  contraband: ContrabandType;
  quantity: number;
  pickupNPC: string;
  pickupLocation: string;
  dropoffNPC: string;
  dropoffLocation: string;
  timeLimit: number; // in seconds
  baseReward: number;
  bonusReward: number; // For perfect runs
  heatGenerated: number;
  startTime?: number;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  detectionCount: number; // Times detected during run
  perfectRun: boolean;
}

export interface StealthZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'shadow' | 'vent' | 'maintenance' | 'crowd';
  concealmentLevel: number; // 0.0 to 1.0 (fully hidden)
}

export class SmugglingSystem {
  private scene: Phaser.Scene;
  private contrabandTypes: Map<string, ContrabandType>;
  private checkpoints: Map<string, SecurityCheckpoint>;
  private patrols: Map<string, SecurityPatrol>;
  private activeMission: SmugglingMission | null = null;
  private stealthZones: Map<string, StealthZone>;
  private playerHeat: number = 0;
  private maxHeat: number = 100;
  
  // Detection system
  private detectionMeter: number = 0; // 0-100
  private isPlayerHidden: boolean = false;
  private currentStealthZone: StealthZone | null = null;
  private quickTimeEventActive: boolean = false;
  
  // Visual indicators
  private detectionIndicator?: Phaser.GameObjects.Graphics;
  private heatIndicator?: Phaser.GameObjects.Graphics;
  private missionTimer?: Phaser.Time.TimerEvent;
  
  // Contraband tracking
  private carriedContraband: Map<string, number> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.contrabandTypes = new Map();
    this.checkpoints = new Map();
    this.patrols = new Map();
    this.stealthZones = new Map();
    
    this.initializeContrabandTypes();
    this.loadSmugglingProgress();
  }

  private initializeContrabandTypes(): void {
    // Level 1 - Low Risk
    this.contrabandTypes.set('data_chip', {
      id: 'data_chip',
      name: 'Encrypted Data Chip',
      dangerLevel: 1,
      baseValue: 500,
      weight: 0.1,
      description: 'Contains corporate secrets',
      detectionRadius: 100,
      icon: '💾',
      factionPreferences: {
        outlaws: 1.2,
        corporations: 2.0,
        independents: 1.0
      }
    });

    // Level 2 - Moderate Risk
    this.contrabandTypes.set('stim_packs', {
      id: 'stim_packs',
      name: 'Military Stim Packs',
      dangerLevel: 2,
      baseValue: 1000,
      weight: 0.5,
      description: 'Enhanced combat stimulants',
      detectionRadius: 150,
      icon: '💉',
      factionPreferences: {
        outlaws: 1.5,
        corporations: 2.5,
        independents: 1.1
      }
    });

    this.contrabandTypes.set('weapon_parts', {
      id: 'weapon_parts',
      name: 'Restricted Weapon Parts',
      dangerLevel: 2,
      baseValue: 1200,
      weight: 1.0,
      description: 'Components for illegal weapons',
      detectionRadius: 175,
      icon: '🔫',
      factionPreferences: {
        outlaws: 1.6,
        corporations: 3.0,
        independents: 1.2
      }
    });

    // Level 3 - High Risk
    this.contrabandTypes.set('alien_artifact', {
      id: 'alien_artifact',
      name: 'Alien Artifact',
      dangerLevel: 3,
      baseValue: 2500,
      weight: 0.8,
      description: 'Mysterious alien technology',
      detectionRadius: 200,
      icon: '🔮',
      factionPreferences: {
        outlaws: 1.8,
        corporations: 3.5,
        independents: 1.5
      }
    });

    this.contrabandTypes.set('quantum_cores', {
      id: 'quantum_cores',
      name: 'Quantum Drive Cores',
      dangerLevel: 3,
      baseValue: 3000,
      weight: 2.0,
      description: 'Stolen jump drive components',
      detectionRadius: 225,
      icon: '⚛️',
      factionPreferences: {
        outlaws: 2.0,
        corporations: 4.0,
        independents: 1.3
      }
    });

    // Level 4 - Very High Risk
    this.contrabandTypes.set('classified_intel', {
      id: 'classified_intel',
      name: 'Classified Intelligence',
      dangerLevel: 4,
      baseValue: 5000,
      weight: 0.1,
      description: 'Top secret military intel',
      detectionRadius: 250,
      icon: '📁',
      factionPreferences: {
        outlaws: 2.5,
        corporations: 5.0,
        independents: 1.5
      }
    });

    // Level 5 - Extreme Risk
    this.contrabandTypes.set('bioweapon', {
      id: 'bioweapon',
      name: 'Experimental Bioweapon',
      dangerLevel: 5,
      baseValue: 10000,
      weight: 1.5,
      description: 'Extremely dangerous biological agent',
      detectionRadius: 300,
      icon: '☣️',
      factionPreferences: {
        outlaws: 3.0,
        corporations: 10.0,
        independents: 2.0
      }
    });
  }

  public createSecurityCheckpoint(room: string, x: number, y: number): SecurityCheckpoint {
    const checkpoint: SecurityCheckpoint = {
      id: `checkpoint_${room}_${Date.now()}`,
      x,
      y,
      width: 120,
      height: 80,
      scannerLevel: Phaser.Math.Between(1, 3),
      bribeCost: Phaser.Math.Between(500, 2000),
      faction: Phaser.Math.RND.pick(['corporations', 'independents', 'security']),
      isActive: true
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  public createSecurityPatrol(
    x: number, 
    y: number, 
    path: Phaser.Math.Vector2[]
  ): SecurityPatrol {
    // Create patrol sprite
    const patrolSprite = this.scene.physics.add.sprite(x, y, 'security_guard');
    patrolSprite.setTint(0xff3333);
    patrolSprite.setScale(0.8);
    
    const patrol: SecurityPatrol = {
      id: `patrol_${Date.now()}`,
      sprite: patrolSprite,
      path: path,
      currentPathIndex: 0,
      speed: Phaser.Math.Between(50, 100),
      detectionRange: Phaser.Math.Between(100, 150),
      alertLevel: 'normal',
      faction: Phaser.Math.RND.pick(['corporations', 'independents', 'security']),
      suspicionTimer: 0
    };

    this.patrols.set(patrol.id, patrol);
    
    // Add vision cone visual
    this.createVisionCone(patrol);
    
    return patrol;
  }

  private createVisionCone(patrol: SecurityPatrol): void {
    const visionCone = this.scene.add.graphics();
    visionCone.fillStyle(0xffff00, 0.2);
    
    // Update vision cone position with patrol
    this.scene.events.on('update', () => {
      if (!patrol.sprite || !patrol.sprite.active) return;
      
      visionCone.clear();
      visionCone.fillStyle(
        patrol.alertLevel === 'pursuing' ? 0xff0000 : 
        patrol.alertLevel === 'alert' ? 0xff9900 : 
        patrol.alertLevel === 'suspicious' ? 0xffff00 : 0x00ff00, 
        0.2
      );
      
      // Draw cone based on patrol direction
      const angle = Phaser.Math.Angle.Between(
        patrol.sprite.x, patrol.sprite.y,
        patrol.path[patrol.currentPathIndex].x,
        patrol.path[patrol.currentPathIndex].y
      );
      
      const coneAngle = Math.PI / 4; // 45 degree cone
      const points = [
        { x: patrol.sprite.x, y: patrol.sprite.y }
      ];
      
      for (let a = angle - coneAngle; a <= angle + coneAngle; a += 0.1) {
        points.push({
          x: patrol.sprite.x + Math.cos(a) * patrol.detectionRange,
          y: patrol.sprite.y + Math.sin(a) * patrol.detectionRange
        });
      }
      
      visionCone.fillPoints(points, true);
    });
    
    patrol.sprite.setData('visionCone', visionCone);
  }

  public createStealthZone(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    type: 'shadow' | 'vent' | 'maintenance' | 'crowd'
  ): StealthZone {
    const zone: StealthZone = {
      id: `stealth_${type}_${Date.now()}`,
      x,
      y,
      width,
      height,
      type,
      concealmentLevel: type === 'vent' ? 1.0 : 
                       type === 'shadow' ? 0.7 :
                       type === 'maintenance' ? 0.8 :
                       0.5 // crowd
    };

    this.stealthZones.set(zone.id, zone);
    
    // Create visual indicator
    const zoneGraphics = this.scene.add.graphics();
    zoneGraphics.fillStyle(0x0000ff, 0.2);
    zoneGraphics.fillRect(x, y, width, height);
    zoneGraphics.setDepth(2);
    
    return zone;
  }

  public updatePatrols(playerSprite: Phaser.Physics.Arcade.Sprite, delta: number): void {
    this.patrols.forEach(patrol => {
      if (!patrol.sprite || !patrol.sprite.active) return;
      
      // Update patrol movement
      this.updatePatrolMovement(patrol, delta);
      
      // Check for player detection
      this.checkPlayerDetection(patrol, playerSprite);
      
      // Update alert status
      this.updateAlertStatus(patrol, delta);
    });
  }

  private updatePatrolMovement(patrol: SecurityPatrol, delta: number): void {
    if (patrol.alertLevel === 'pursuing' && patrol.lastSeenPlayer) {
      // Move towards last seen player position
      this.scene.physics.moveTo(
        patrol.sprite,
        patrol.lastSeenPlayer.x,
        patrol.lastSeenPlayer.y,
        patrol.speed * 1.5 // Move faster when pursuing
      );
    } else {
      // Follow patrol path
      const target = patrol.path[patrol.currentPathIndex];
      const distance = Phaser.Math.Distance.Between(
        patrol.sprite.x, patrol.sprite.y,
        target.x, target.y
      );
      
      if (distance < 10) {
        // Reached waypoint, move to next
        patrol.currentPathIndex = (patrol.currentPathIndex + 1) % patrol.path.length;
      } else {
        this.scene.physics.moveTo(patrol.sprite, target.x, target.y, patrol.speed);
      }
    }
  }

  private checkPlayerDetection(
    patrol: SecurityPatrol, 
    playerSprite: Phaser.Physics.Arcade.Sprite
  ): void {
    const distance = Phaser.Math.Distance.Between(
      patrol.sprite.x, patrol.sprite.y,
      playerSprite.x, playerSprite.y
    );
    
    // Check if player is in detection range
    if (distance <= patrol.detectionRange) {
      // Check if player is hidden
      if (this.isPlayerHidden) {
        // Reduced detection chance when hidden
        if (Math.random() > this.currentStealthZone?.concealmentLevel!) {
          this.onPlayerDetected(patrol, playerSprite);
        }
      } else if (this.carriedContraband.size > 0) {
        // Check if carrying contraband
        let detectionChance = 0.3; // Base 30% chance
        
        // Increase chance based on contraband danger level
        this.carriedContraband.forEach((quantity, contrabandId) => {
          const contraband = this.contrabandTypes.get(contrabandId);
          if (contraband) {
            detectionChance += contraband.dangerLevel * 0.1;
          }
        });
        
        if (Math.random() < detectionChance) {
          this.onPlayerDetected(patrol, playerSprite);
        }
      }
    }
  }

  private onPlayerDetected(
    patrol: SecurityPatrol, 
    playerSprite: Phaser.Physics.Arcade.Sprite
  ): void {
    patrol.alertLevel = 'suspicious';
    patrol.suspicionTimer = 3000; // 3 seconds of suspicion
    patrol.lastSeenPlayer = new Phaser.Math.Vector2(playerSprite.x, playerSprite.y);
    
    // Increase detection meter
    this.detectionMeter = Math.min(100, this.detectionMeter + 20);
    
    // Alert nearby patrols
    this.alertNearbyPatrols(patrol.sprite.x, patrol.sprite.y, 200);
    
    // Show warning
    this.scene.events.emit('showNotification', {
      text: '⚠️ Security is suspicious!',
      color: 0xffaa00
    });
    
    // If carrying high-level contraband, immediately escalate
    let hasHighLevelContraband = false;
    this.carriedContraband.forEach((quantity, contrabandId) => {
      const contraband = this.contrabandTypes.get(contrabandId);
      if (contraband && contraband.dangerLevel >= 4) {
        hasHighLevelContraband = true;
      }
    });
    
    if (hasHighLevelContraband) {
      this.onPlayerCaught(patrol);
    }
  }

  private onPlayerCaught(patrol: SecurityPatrol): void {
    patrol.alertLevel = 'pursuing';
    this.detectionMeter = 100;
    
    // Increase heat
    this.increaseHeat(10);
    
    // Count detection for mission
    if (this.activeMission) {
      this.activeMission.detectionCount++;
      this.activeMission.perfectRun = false;
    }
    
    // Show bribery option
    this.showBriberyOption(patrol);
  }

  private showBriberyOption(patrol: SecurityPatrol): void {
    const bribeCost = Phaser.Math.Between(1000, 5000);
    
    this.scene.events.emit('showEnhancedDialogue', {
      npcId: patrol.id,
      npcName: 'Security Guard',
      text: `I caught you red-handed! This will cost you... say ${bribeCost} credits to forget what I saw.`,
      choices: [
        {
          id: 'bribe',
          text: `Pay ${bribeCost} credits`,
          next: 'bribed',
          outcomes: [
            { type: 'credits', value: -bribeCost }
          ]
        },
        {
          id: 'run',
          text: 'Try to run!',
          next: 'chase'
        },
        {
          id: 'surrender',
          text: 'Surrender',
          next: 'arrested'
        }
      ]
    });
    
    // Handle choice results
    this.scene.events.once('dialogueChoice', (choiceId: string) => {
      switch (choiceId) {
        case 'bribe':
          this.handleBribery(patrol, bribeCost);
          break;
        case 'run':
          this.handleEscape(patrol);
          break;
        case 'surrender':
          this.handleArrest(patrol);
          break;
      }
    });
  }

  private handleBribery(patrol: SecurityPatrol, cost: number): void {
    const creditsStore = useCreditsStore.getState();
    
    if (creditsStore.credits >= cost) {
      creditsStore.removeCredits(cost);
      patrol.alertLevel = 'normal';
      patrol.lastSeenPlayer = undefined;
      this.detectionMeter = Math.max(0, this.detectionMeter - 50);
      
      toast.success('Bribe successful! The guard looks the other way.');
    } else {
      toast.error('Not enough credits to bribe!');
      this.handleArrest(patrol);
    }
  }

  private handleEscape(patrol: SecurityPatrol): void {
    // Start quick-time event for escape
    this.startEscapeQuickTimeEvent(() => {
      // Success
      patrol.alertLevel = 'alert';
      this.detectionMeter = 50;
      toast.success('You escaped! But security is on high alert.');
    }, () => {
      // Failure
      this.handleArrest(patrol);
    });
  }

  private handleArrest(patrol: SecurityPatrol): void {
    // Confiscate contraband
    const totalValue = this.calculateContrabandValue();
    this.carriedContraband.clear();
    
    // Increase heat significantly
    this.increaseHeat(25);
    
    // Fine the player
    const fine = Math.floor(totalValue * 0.5);
    const creditsStore = useCreditsStore.getState();
    creditsStore.removeCredits(Math.min(fine, creditsStore.credits));
    
    // Fail current mission
    if (this.activeMission) {
      this.activeMission.isFailed = true;
      this.scene.events.emit('missionFailed', this.activeMission);
    }
    
    // Reset patrol
    patrol.alertLevel = 'normal';
    patrol.lastSeenPlayer = undefined;
    this.detectionMeter = 0;
    
    toast.error(`Arrested! Contraband confiscated and fined ${fine} credits.`);
  }

  private startEscapeQuickTimeEvent(
    onSuccess: () => void, 
    onFailure: () => void
  ): void {
    this.quickTimeEventActive = true;
    const requiredKeys = ['W', 'A', 'S', 'D'];
    const sequence: string[] = [];
    
    // Generate random sequence
    for (let i = 0; i < 5; i++) {
      sequence.push(Phaser.Math.RND.pick(requiredKeys));
    }
    
    let currentIndex = 0;
    const timeLimit = 5000; // 5 seconds
    const startTime = Date.now();
    
    // Show QTE UI
    this.scene.events.emit('showQuickTimeEvent', {
      sequence,
      timeLimit
    });
    
    // Listen for key presses
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      
      if (key === sequence[currentIndex]) {
        currentIndex++;
        
        if (currentIndex >= sequence.length) {
          // Success!
          document.removeEventListener('keydown', handleKey);
          this.quickTimeEventActive = false;
          this.scene.events.emit('hideQuickTimeEvent');
          onSuccess();
        } else {
          this.scene.events.emit('updateQuickTimeEvent', { progress: currentIndex });
        }
      } else {
        // Wrong key - fail
        document.removeEventListener('keydown', handleKey);
        this.quickTimeEventActive = false;
        this.scene.events.emit('hideQuickTimeEvent');
        onFailure();
      }
    };
    
    document.addEventListener('keydown', handleKey);
    
    // Time limit check
    this.scene.time.delayedCall(timeLimit, () => {
      if (this.quickTimeEventActive) {
        document.removeEventListener('keydown', handleKey);
        this.quickTimeEventActive = false;
        this.scene.events.emit('hideQuickTimeEvent');
        onFailure();
      }
    });
  }

  private alertNearbyPatrols(x: number, y: number, range: number): void {
    this.patrols.forEach(patrol => {
      const distance = Phaser.Math.Distance.Between(
        patrol.sprite.x, patrol.sprite.y,
        x, y
      );
      
      if (distance <= range && patrol.alertLevel === 'normal') {
        patrol.alertLevel = 'suspicious';
        patrol.suspicionTimer = 2000;
      }
    });
  }

  private updateAlertStatus(patrol: SecurityPatrol, delta: number): void {
    if (patrol.suspicionTimer > 0) {
      patrol.suspicionTimer -= delta;
      
      if (patrol.suspicionTimer <= 0) {
        // Reduce alert level
        if (patrol.alertLevel === 'pursuing') {
          patrol.alertLevel = 'alert';
          patrol.suspicionTimer = 5000;
        } else if (patrol.alertLevel === 'alert') {
          patrol.alertLevel = 'suspicious';
          patrol.suspicionTimer = 3000;
        } else if (patrol.alertLevel === 'suspicious') {
          patrol.alertLevel = 'normal';
          patrol.lastSeenPlayer = undefined;
        }
      }
    }
  }

  public checkStealthZone(playerX: number, playerY: number): void {
    let inZone = false;
    
    this.stealthZones.forEach(zone => {
      if (playerX >= zone.x && playerX <= zone.x + zone.width &&
          playerY >= zone.y && playerY <= zone.y + zone.height) {
        inZone = true;
        this.currentStealthZone = zone;
        this.isPlayerHidden = true;
        
        // Reduce detection meter while hidden
        this.detectionMeter = Math.max(0, this.detectionMeter - 1);
      }
    });
    
    if (!inZone) {
      this.isPlayerHidden = false;
      this.currentStealthZone = null;
    }
  }

  public startSmugglingMission(mission: SmugglingMission): void {
    this.activeMission = mission;
    this.activeMission.isActive = true;
    this.activeMission.startTime = Date.now();
    this.activeMission.detectionCount = 0;
    this.activeMission.perfectRun = true;
    
    // Start mission timer
    this.missionTimer = this.scene.time.addEvent({
      delay: mission.timeLimit * 1000,
      callback: () => this.onMissionTimeout(),
      callbackScope: this
    });
    
    // Show mission briefing
    this.scene.events.emit('showMissionBriefing', mission);
    
    toast.success(`Smuggling mission started: ${mission.contraband.name}`);
  }

  private onMissionTimeout(): void {
    if (this.activeMission && this.activeMission.isActive) {
      this.activeMission.isFailed = true;
      this.activeMission.isActive = false;
      
      // Increase heat for failure
      this.increaseHeat(5);
      
      this.scene.events.emit('missionFailed', this.activeMission);
      toast.error('Mission failed: Time limit exceeded!');
      
      this.activeMission = null;
    }
  }

  public pickupContraband(contrabandId: string, quantity: number): void {
    const current = this.carriedContraband.get(contrabandId) || 0;
    this.carriedContraband.set(contrabandId, current + quantity);
    
    const contraband = this.contrabandTypes.get(contrabandId);
    if (contraband) {
      toast.success(`Picked up ${quantity}x ${contraband.name}`);
      
      // Increase detection radius based on contraband danger
      this.updateDetectionDifficulty();
    }
  }

  public deliverContraband(dropoffNPC: string): boolean {
    if (!this.activeMission || !this.activeMission.isActive) {
      return false;
    }
    
    // Check if at correct dropoff
    if (this.activeMission.dropoffNPC !== dropoffNPC) {
      toast.error('Wrong dropoff location!');
      return false;
    }
    
    // Calculate rewards
    let totalReward = this.activeMission.baseReward;
    
    // Add bonus for perfect run
    if (this.activeMission.perfectRun) {
      totalReward += this.activeMission.bonusReward;
      toast.success('Perfect run bonus!');
    }
    
    // Apply faction multipliers
    const contraband = this.contrabandTypes.get(this.activeMission.contraband.id);
    if (contraband?.factionPreferences) {
      // Assume delivery to outlaws for now
      totalReward *= contraband.factionPreferences.outlaws;
    }
    
    // Give rewards
    const creditsStore = useCreditsStore.getState();
    creditsStore.addCredits(totalReward);
    
    // Clear contraband
    this.carriedContraband.delete(this.activeMission.contraband.id);
    
    // Complete mission
    this.activeMission.isCompleted = true;
    this.activeMission.isActive = false;
    
    // Cancel timer
    if (this.missionTimer) {
      this.missionTimer.destroy();
    }
    
    // Generate heat based on contraband danger
    this.increaseHeat(this.activeMission.heatGenerated);
    
    this.scene.events.emit('missionCompleted', this.activeMission);
    toast.success(`Mission complete! Earned ${totalReward} credits`);
    
    this.activeMission = null;
    return true;
  }

  private updateDetectionDifficulty(): void {
    // Update patrol detection ranges based on carried contraband
    let maxDangerLevel = 0;
    
    this.carriedContraband.forEach((quantity, contrabandId) => {
      const contraband = this.contrabandTypes.get(contrabandId);
      if (contraband) {
        maxDangerLevel = Math.max(maxDangerLevel, contraband.dangerLevel);
      }
    });
    
    // Increase patrol detection ranges
    this.patrols.forEach(patrol => {
      patrol.detectionRange = 100 + (maxDangerLevel * 20);
    });
  }

  private calculateContrabandValue(): number {
    let total = 0;
    
    this.carriedContraband.forEach((quantity, contrabandId) => {
      const contraband = this.contrabandTypes.get(contrabandId);
      if (contraband) {
        total += contraband.baseValue * quantity;
      }
    });
    
    return total;
  }

  public increaseHeat(amount: number): void {
    this.playerHeat = Math.min(this.maxHeat, this.playerHeat + amount);
    
    // Sync with main game heat system
    const heatSystem = useHeatSystem.getState();
    heatSystem.addHeat('smuggling', amount);
    
    // Update UI
    this.scene.events.emit('updateHeat', this.playerHeat);
    
    // Alert more patrols at high heat
    if (this.playerHeat > 75) {
      this.spawnAdditionalPatrols();
    }
  }

  public decreaseHeat(amount: number): void {
    this.playerHeat = Math.max(0, this.playerHeat - amount);
    
    // Sync with main game
    const heatSystem = useHeatSystem.getState();
    heatSystem.reduceHeat(amount);
    
    this.scene.events.emit('updateHeat', this.playerHeat);
  }

  private spawnAdditionalPatrols(): void {
    // Spawn extra patrols when heat is high
    const numPatrols = Math.floor(this.playerHeat / 25);
    
    for (let i = 0; i < numPatrols; i++) {
      const x = Phaser.Math.Between(100, 3000);
      const y = Phaser.Math.Between(100, 2300);
      
      // Create simple patrol path
      const path = [
        new Phaser.Math.Vector2(x, y),
        new Phaser.Math.Vector2(x + 200, y),
        new Phaser.Math.Vector2(x + 200, y + 200),
        new Phaser.Math.Vector2(x, y + 200)
      ];
      
      this.createSecurityPatrol(x, y, path);
    }
    
    toast.warning('Security has been increased due to high heat!');
  }

  private loadSmugglingProgress(): void {
    // Load saved smuggling data
    const savedData = localStorage.getItem('smuggling_progress');
    if (savedData) {
      const data = JSON.parse(savedData);
      this.playerHeat = data.heat || 0;
    }
  }

  public saveSmugglingProgress(): void {
    const data = {
      heat: this.playerHeat,
      completedMissions: []
    };
    localStorage.setItem('smuggling_progress', JSON.stringify(data));
  }

  public update(player: Phaser.Physics.Arcade.Sprite, delta: number): void {
    // Update patrols
    this.updatePatrols(player, delta);
    
    // Check stealth zones
    this.checkStealthZone(player.x, player.y);
    
    // Update detection meter decay
    if (this.detectionMeter > 0 && !this.quickTimeEventActive) {
      this.detectionMeter = Math.max(0, this.detectionMeter - 0.5);
    }
    
    // Update heat decay over time
    if (this.playerHeat > 0 && !this.activeMission) {
      this.playerHeat = Math.max(0, this.playerHeat - 0.01);
    }
  }

  public getHeat(): number {
    return this.playerHeat;
  }

  public getDetectionLevel(): number {
    return this.detectionMeter;
  }

  public isCarryingContraband(): boolean {
    return this.carriedContraband.size > 0;
  }

  public getActiveMission(): SmugglingMission | null {
    return this.activeMission;
  }

  public getCarriedContraband(): Map<string, number> {
    return this.carriedContraband;
  }

  public cleanup(): void {
    // Clean up sprites and graphics
    this.patrols.forEach(patrol => {
      const visionCone = patrol.sprite.getData('visionCone');
      if (visionCone) {
        visionCone.destroy();
      }
      patrol.sprite.destroy();
    });
    
    this.patrols.clear();
    this.checkpoints.clear();
    this.stealthZones.clear();
    
    if (this.missionTimer) {
      this.missionTimer.destroy();
    }
  }
}