import Phaser from 'phaser';
import { StationRoom, StationLayout } from './StationLayout';
import { NPCDialogueSystem } from './NPCDialogueSystem';
import { NPCMissionSystem } from './NPCMissionSystem';
import { SmugglingSystem, SmugglingMission, ContrabandType } from './SmugglingSystem';
import { CrewManagementSystem, CrewTask } from './CrewManagementSystem';

/**
 * MainGameScene - Enhanced station exploration with multiple rooms and areas
 */
export class MainGameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  private npcs!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private interactables!: Phaser.Physics.Arcade.StaticGroup;
  private doors!: Phaser.Physics.Arcade.Group;
  private roomFloors!: Phaser.GameObjects.Group;
  private roomLabels!: Phaser.GameObjects.Group;
  private exploredRooms: Set<string> = new Set();
  private currentRoom: string = 'docking_bay';
  
  // Station rooms
  private stationRooms: Map<string, StationRoom> = new Map();
  
  // Dialogue and Mission systems
  private dialogueSystem!: NPCDialogueSystem;
  private missionSystem!: NPCMissionSystem;
  private activeNPCInteraction: string | null = null;
  
  // Smuggling and Crew systems
  private smugglingSystem!: SmugglingSystem;
  private crewManagementSystem!: CrewManagementSystem;
  private securityPatrols!: Phaser.Physics.Arcade.Group;
  
  // Touch controls
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isDragging: boolean = false;
  private virtualJoystick?: Phaser.GameObjects.Graphics;
  private joystickBase?: Phaser.GameObjects.Graphics;
  private joystickThumb?: Phaser.GameObjects.Graphics;
  
  // Touch-to-move pathfinding
  private pathfindingTarget?: Phaser.Math.Vector2;
  private pathfindingLine?: Phaser.GameObjects.Graphics;
  private moveTarget?: Phaser.GameObjects.Sprite;
  
  // Camera controls
  private isZooming: boolean = false;
  private lastPinchDistance: number = 0;
  
  // Visual effects
  private lightingLayer!: Phaser.GameObjects.Graphics;
  private particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  private glowEffects: Map<Phaser.GameObjects.Sprite, Phaser.Tweens.Tween> = new Map();
  
  // Animation state
  private playerDirection: string = 'down';
  private isMoving: boolean = false;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  create(): void {
    console.log('[MainGameScene] Creating enhanced station world...');
    
    // Set world bounds for large station
    this.physics.world.setBounds(0, 0, 3200, 2400);
    
    // Initialize dialogue and mission systems
    this.dialogueSystem = new NPCDialogueSystem(this);
    this.missionSystem = new NPCMissionSystem(this);
    
    // Initialize smuggling and crew systems
    this.smugglingSystem = new SmugglingSystem(this);
    this.crewManagementSystem = new CrewManagementSystem(this);
    
    // Initialize groups first
    this.roomFloors = this.add.group();
    this.roomLabels = this.add.group();
    this.walls = this.physics.add.staticGroup();
    this.doors = this.physics.add.group();
    
    // Create station layout
    this.createStationLayout();
    
    // Create station environment
    this.createStationEnvironment();
    
    // Create lighting layer
    this.createLightingSystem();
    
    // Create player with animations
    this.createPlayer();
    
    // Create NPCs in different areas
    this.createNPCs();
    
    // Create smuggling elements
    this.createSmugglingElements();
    
    // Create collectibles
    this.createCollectibles();
    
    // Create particle effects
    this.createParticleEffects();
    
    // Set up camera
    this.setupCamera();
    
    // Set up controls
    this.setupControls();
    
    // Set up collisions
    this.setupCollisions();
    
    // Set up system event listeners
    this.setupSystemEvents();
    
    // Emit mini-map update
    this.updateMiniMap();
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private createStationLayout(): void {
    // Define station rooms with their properties
    this.stationRooms.set('docking_bay', {
      name: 'Docking Bay',
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      color: 0x2a2a3e,
      type: 'docking',
      connected: ['corridor_1']
    });
    
    this.stationRooms.set('corridor_1', {
      name: 'Main Corridor',
      x: 800,
      y: 200,
      width: 400,
      height: 200,
      color: 0x1f1f2e,
      type: 'corridor',
      connected: ['docking_bay', 'market', 'cantina', 'corridor_2']
    });
    
    this.stationRooms.set('market', {
      name: 'Market District',
      x: 1200,
      y: 0,
      width: 600,
      height: 600,
      color: 0x3a2a4e,
      type: 'market',
      connected: ['corridor_1']
    });
    
    this.stationRooms.set('cantina', {
      name: 'Rusty Anchor Cantina',
      x: 1200,
      y: 600,
      width: 600,
      height: 400,
      color: 0x4a2a2e,
      type: 'cantina',
      connected: ['corridor_1', 'crew_quarters']
    });
    
    this.stationRooms.set('corridor_2', {
      name: 'Lower Corridor',
      x: 800,
      y: 600,
      width: 400,
      height: 200,
      color: 0x1f1f2e,
      type: 'corridor',
      connected: ['corridor_1', 'cargo_hold', 'engineering']
    });
    
    this.stationRooms.set('crew_quarters', {
      name: 'Crew Quarters',
      x: 1800,
      y: 600,
      width: 600,
      height: 600,
      color: 0x2e3a4e,
      type: 'quarters',
      connected: ['cantina']
    });
    
    this.stationRooms.set('cargo_hold', {
      name: 'Cargo Hold',
      x: 200,
      y: 800,
      width: 600,
      height: 600,
      color: 0x3e3a2e,
      type: 'cargo',
      connected: ['corridor_2']
    });
    
    this.stationRooms.set('engineering', {
      name: 'Engineering',
      x: 1200,
      y: 1000,
      width: 800,
      height: 600,
      color: 0x4e3a3e,
      type: 'engineering',
      connected: ['corridor_2']
    });
  }

  private createStationEnvironment(): void {
    // Create room floors and walls
    this.stationRooms.forEach((room, roomId) => {
      // Create floor with room-specific texture
      this.createRoomFloor(room, roomId);
      
      // Create room walls
      this.createRoomWalls(room, roomId);
      
      // Create room label
      this.createRoomLabel(room);
      
      // Add room-specific decorations
      this.decorateRoom(room, roomId);
    });
    
    // Create doors between connected rooms
    this.createDoors();
    
    // Create interactive terminals in specific rooms
    this.createTerminals();
  }

  private createRoomFloor(room: StationRoom, roomId: string): void {
    // Create tiled floor for the room
    const tileSize = 64;
    const tilesX = Math.floor(room.width / tileSize);
    const tilesY = Math.floor(room.height / tileSize);
    
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const tileX = room.x + x * tileSize + tileSize / 2;
        const tileY = room.y + y * tileSize + tileSize / 2;
        
        // Create floor tile with room-specific color variation
        const floorTile = this.add.rectangle(
          tileX, tileY, tileSize - 2, tileSize - 2,
          room.color, 0.8
        );
        floorTile.setDepth(0);
        floorTile.setData('roomId', roomId);
        
        // Add subtle grid lines
        const gridLine = this.add.rectangle(
          tileX, tileY, tileSize, tileSize
        );
        gridLine.setStrokeStyle(1, 0x111111, 0.3);
        gridLine.setDepth(1);
        
        this.roomFloors.add(floorTile);
      }
    }
  }

  private createRoomWalls(room: StationRoom, roomId: string): void {
    const wallThickness = 32;
    
    // Top wall
    for (let x = room.x; x < room.x + room.width; x += wallThickness) {
      const wall = this.walls.create(x + wallThickness/2, room.y + wallThickness/2, 'wall_tile');
      wall.setDisplaySize(wallThickness, wallThickness);
      wall.refreshBody();
    }
    
    // Bottom wall
    for (let x = room.x; x < room.x + room.width; x += wallThickness) {
      const wall = this.walls.create(x + wallThickness/2, room.y + room.height - wallThickness/2, 'wall_tile');
      wall.setDisplaySize(wallThickness, wallThickness);
      wall.refreshBody();
    }
    
    // Left wall
    for (let y = room.y; y < room.y + room.height; y += wallThickness) {
      const wall = this.walls.create(room.x + wallThickness/2, y + wallThickness/2, 'wall_tile');
      wall.setDisplaySize(wallThickness, wallThickness);
      wall.refreshBody();
    }
    
    // Right wall
    for (let y = room.y; y < room.y + room.height; y += wallThickness) {
      const wall = this.walls.create(room.x + room.width - wallThickness/2, y + wallThickness/2, 'wall_tile');
      wall.setDisplaySize(wallThickness, wallThickness);
      wall.refreshBody();
    }
  }

  private createRoomLabel(room: StationRoom): void {
    const label = this.add.text(
      room.x + room.width / 2,
      room.y + 50,
      room.name.toUpperCase(),
      {
        fontSize: '24px',
        color: '#ff9900',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);
    label.setDepth(5);
    label.setAlpha(0.7);
    this.roomLabels.add(label);
  }

  private decorateRoom(room: StationRoom, roomId: string): void {
    // Add room-specific decorations based on type
    switch (room.type) {
      case 'docking':
        // Add docking clamps
        for (let i = 0; i < 3; i++) {
          const clamp = this.add.rectangle(
            room.x + 100 + i * 200,
            room.y + room.height - 100,
            80, 40,
            0xffaa00, 0.6
          );
          clamp.setStrokeStyle(2, 0xff6600);
          clamp.setDepth(2);
        }
        break;
        
      case 'market':
        // Add market stalls
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 2; j++) {
            const stall = this.add.rectangle(
              room.x + 150 + i * 120,
              room.y + 150 + j * 200,
              80, 60,
              0x664422, 0.8
            );
            stall.setStrokeStyle(2, 0x996633);
            stall.setDepth(2);
          }
        }
        break;
        
      case 'cantina':
        // Add bar counter
        const bar = this.add.rectangle(
          room.x + room.width / 2,
          room.y + 100,
          room.width - 100, 40,
          0x332211, 0.9
        );
        bar.setStrokeStyle(2, 0x663311);
        bar.setDepth(2);
        
        // Add tables
        for (let i = 0; i < 4; i++) {
          const table = this.add.circle(
            room.x + 150 + (i % 2) * 300,
            room.y + 200 + Math.floor(i / 2) * 150,
            30,
            0x442211, 0.8
          );
          table.setStrokeStyle(2, 0x663311);
          table.setDepth(2);
        }
        break;
        
      case 'engineering':
        // Add machinery
        for (let i = 0; i < 3; i++) {
          const machine = this.add.rectangle(
            room.x + 200 + i * 200,
            room.y + room.height / 2,
            120, 180,
            0x334455, 0.8
          );
          machine.setStrokeStyle(3, 0x556677);
          machine.setDepth(2);
        }
        break;
        
      case 'cargo':
        // Add cargo crates
        for (let i = 0; i < 6; i++) {
          const crate = this.add.rectangle(
            room.x + 150 + (i % 3) * 150,
            room.y + 200 + Math.floor(i / 3) * 150,
            60, 60,
            0x554433, 0.9
          );
          crate.setStrokeStyle(2, 0x776644);
          crate.setDepth(2);
          crate.setAngle(Math.random() * 10 - 5);
        }
        break;
    }
  }

  private createDoors(): void {
    // Create doors between connected rooms
    this.stationRooms.forEach((room, roomId) => {
      room.connected?.forEach(connectedId => {
        const connectedRoom = this.stationRooms.get(connectedId);
        if (!connectedRoom) return;
        
        // Calculate door position (simplified - center of shared wall)
        let doorX = 0;
        let doorY = 0;
        
        // Horizontal connection
        if (room.x + room.width === connectedRoom.x) {
          doorX = room.x + room.width;
          doorY = Math.max(room.y, connectedRoom.y) + 100;
        } else if (connectedRoom.x + connectedRoom.width === room.x) {
          doorX = room.x;
          doorY = Math.max(room.y, connectedRoom.y) + 100;
        }
        
        // Vertical connection
        if (room.y + room.height === connectedRoom.y) {
          doorX = Math.max(room.x, connectedRoom.x) + 100;
          doorY = room.y + room.height;
        } else if (connectedRoom.y + connectedRoom.height === room.y) {
          doorX = Math.max(room.x, connectedRoom.x) + 100;
          doorY = room.y;
        }
        
        if (doorX > 0 && doorY > 0 && !this.doorExists(doorX, doorY)) {
          const door = this.add.rectangle(doorX, doorY, 60, 80, 0x0066cc, 0.8);
          door.setStrokeStyle(3, 0x00aaff);
          door.setDepth(3);
          door.setData('roomFrom', roomId);
          door.setData('roomTo', connectedId);
          
          // Add door glow animation
          this.tweens.add({
            targets: door,
            alpha: { from: 0.5, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
          });
        }
      });
    });
  }

  private doorExists(x: number, y: number): boolean {
    // Check if a door already exists at this position
    let exists = false;
    this.doors.children.entries.forEach(door => {
      const d = door as Phaser.GameObjects.Rectangle;
      if (Math.abs(d.x - x) < 50 && Math.abs(d.y - y) < 50) {
        exists = true;
      }
    });
    return exists;
  }

  private createTerminals(): void {
    // Create interactive terminals
    this.interactables = this.physics.add.staticGroup();
    
    // Market terminal
    const marketRoom = this.stationRooms.get('market');
    if (marketRoom) {
      const terminal = this.interactables.create(
        marketRoom.x + marketRoom.width / 2,
        marketRoom.y + marketRoom.height / 2,
        'terminal'
      );
      terminal.setScale(1.5);
      terminal.setData('type', 'market');
      this.addGlowEffect(terminal);
    }
    
    // Engineering terminal
    const engRoom = this.stationRooms.get('engineering');
    if (engRoom) {
      const terminal = this.interactables.create(
        engRoom.x + 150,
        engRoom.y + 150,
        'terminal'
      );
      terminal.setScale(1.5);
      terminal.setData('type', 'engineering');
      this.addGlowEffect(terminal);
    }
    
    // Docking bay terminal
    const dockingRoom = this.stationRooms.get('docking_bay');
    if (dockingRoom) {
      const terminal = this.interactables.create(
        dockingRoom.x + dockingRoom.width - 150,
        dockingRoom.y + 150,
        'terminal'
      );
      terminal.setScale(1.5);
      terminal.setData('type', 'missions');
      this.addGlowEffect(terminal);
    }
  }

  private addGlowEffect(sprite: Phaser.Physics.Arcade.Sprite): void {
    // Create glow effect around interactive objects
    const glow = this.add.rectangle(
      sprite.x, sprite.y,
      sprite.displayWidth + 20,
      sprite.displayHeight + 20
    );
    glow.setStrokeStyle(3, 0x00ffff, 0);
    glow.setDepth(sprite.depth - 1);
    
    // Animate glow on proximity
    sprite.setData('glow', glow);
  }

  private createLightingSystem(): void {
    // Create lighting layer for atmospheric effect
    this.lightingLayer = this.add.graphics();
    this.lightingLayer.setDepth(99);
    this.lightingLayer.setBlendMode(Phaser.BlendModes.MULTIPLY);
    
    // Update lighting based on explored rooms
    this.updateLighting();
  }

  private updateLighting(): void {
    this.lightingLayer.clear();
    
    // Draw darkness over unexplored areas
    this.stationRooms.forEach((room, roomId) => {
      if (!this.exploredRooms.has(roomId)) {
        this.lightingLayer.fillStyle(0x000000, 0.7);
        this.lightingLayer.fillRect(room.x, room.y, room.width, room.height);
      } else {
        // Lighter shade for explored rooms
        this.lightingLayer.fillStyle(0x000000, 0.2);
        this.lightingLayer.fillRect(room.x, room.y, room.width, room.height);
      }
    });
    
    // Add light circle around player
    if (this.player) {
      const gradient = this.lightingLayer.createRadialGradient(
        this.player.x, this.player.y, 0,
        this.player.x, this.player.y, 200
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      this.lightingLayer.fillStyle(gradient as any);
      this.lightingLayer.fillCircle(this.player.x, this.player.y, 200);
    }
  }

  private createParticleEffects(): void {
    // Create steam vents in engineering
    const engRoom = this.stationRooms.get('engineering');
    if (engRoom) {
      for (let i = 0; i < 3; i++) {
        this.createSteamVent(
          engRoom.x + 200 + i * 200,
          engRoom.y + 100
        );
      }
    }
    
    // Create sparks in docking bay
    const dockingRoom = this.stationRooms.get('docking_bay');
    if (dockingRoom) {
      this.createSparks(
        dockingRoom.x + dockingRoom.width / 2,
        dockingRoom.y + 200
      );
    }
  }

  private createSteamVent(x: number, y: number): void {
    // Create particle emitter for steam
    const particles = this.add.particles(x, y, 'particle', {
      color: [0xffffff, 0xcccccc, 0x888888],
      scale: { start: 0.5, end: 1.5 },
      alpha: { start: 0.6, end: 0 },
      speed: { min: 50, max: 100 },
      angle: { min: -110, max: -70 },
      lifespan: 2000,
      frequency: 100,
      quantity: 2
    });
    particles.setDepth(50);
  }

  private createSparks(x: number, y: number): void {
    // Create particle emitter for sparks
    const particles = this.add.particles(x, y, 'particle', {
      color: [0xffff00, 0xffaa00, 0xff6600],
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0.2 },
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      lifespan: 500,
      frequency: 500,
      quantity: 3,
      gravityY: 200
    });
    particles.setDepth(50);
  }

  private createPlayer(): void {
    // Create player in docking bay
    const startRoom = this.stationRooms.get('docking_bay');
    const startX = startRoom ? startRoom.x + startRoom.width / 2 : 400;
    const startY = startRoom ? startRoom.y + startRoom.height / 2 : 300;
    
    this.player = this.physics.add.sprite(startX, startY, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setScale(1.5);
    
    // Create player animations
    this.createPlayerAnimations();
    
    // Play idle animation
    this.player.play('player_idle_down');
    
    // Mark starting room as explored
    this.exploredRooms.add('docking_bay');
    
    // Get player data from registry
    const playerData = this.registry.get('playerData');
    if (playerData) {
      console.log('[MainGameScene] Player data loaded:', playerData);
    }
  }

  private createPlayerAnimations(): void {
    // Create walking animations (using color changes for now)
    const animConfig = {
      frameRate: 10,
      repeat: -1
    };
    
    // For now, we'll use simple scale animations to indicate movement
    // In a real game, you'd have sprite sheets with proper animations
    this.anims.create({
      key: 'player_idle_down',
      frames: [{ key: 'player', frame: 0 }],
      ...animConfig
    });
    
    this.anims.create({
      key: 'player_walk_down',
      frames: [{ key: 'player', frame: 0 }],
      ...animConfig
    });
    
    this.anims.create({
      key: 'player_walk_up',
      frames: [{ key: 'player', frame: 0 }],
      ...animConfig
    });
    
    this.anims.create({
      key: 'player_walk_left',
      frames: [{ key: 'player', frame: 0 }],
      ...animConfig
    });
    
    this.anims.create({
      key: 'player_walk_right',
      frames: [{ key: 'player', frame: 0 }],
      ...animConfig
    });
  }

  private createSmugglingElements(): void {
    // Initialize security patrol group
    this.securityPatrols = this.physics.add.group();
    
    // Create security checkpoints in corridors
    const corridor1 = this.stationRooms.get('corridor_1');
    if (corridor1) {
      this.smugglingSystem.createSecurityCheckpoint(
        'corridor_1',
        corridor1.x + corridor1.width / 2,
        corridor1.y + corridor1.height / 2
      );
    }
    
    const corridor2 = this.stationRooms.get('corridor_2');
    if (corridor2) {
      this.smugglingSystem.createSecurityCheckpoint(
        'corridor_2',
        corridor2.x + corridor2.width / 2,
        corridor2.y + corridor2.height / 2
      );
    }
    
    // Create security patrols in key areas
    this.createSecurityPatrols();
    
    // Create stealth zones
    this.createStealthZones();
    
    // Add contraband pickup NPCs
    this.addSmugglingNPCs();
  }
  
  private createSecurityPatrols(): void {
    // Patrol in docking bay
    const dockingBay = this.stationRooms.get('docking_bay');
    if (dockingBay) {
      const path = [
        new Phaser.Math.Vector2(dockingBay.x + 100, dockingBay.y + 100),
        new Phaser.Math.Vector2(dockingBay.x + dockingBay.width - 100, dockingBay.y + 100),
        new Phaser.Math.Vector2(dockingBay.x + dockingBay.width - 100, dockingBay.y + dockingBay.height - 100),
        new Phaser.Math.Vector2(dockingBay.x + 100, dockingBay.y + dockingBay.height - 100)
      ];
      const patrol = this.smugglingSystem.createSecurityPatrol(
        dockingBay.x + 100,
        dockingBay.y + 100,
        path
      );
      this.securityPatrols.add(patrol.sprite);
    }
    
    // Patrol in market
    const market = this.stationRooms.get('market');
    if (market) {
      const path = [
        new Phaser.Math.Vector2(market.x + 200, market.y + 200),
        new Phaser.Math.Vector2(market.x + market.width - 200, market.y + 200),
        new Phaser.Math.Vector2(market.x + market.width - 200, market.y + market.height - 200),
        new Phaser.Math.Vector2(market.x + 200, market.y + market.height - 200)
      ];
      const patrol = this.smugglingSystem.createSecurityPatrol(
        market.x + 200,
        market.y + 200,
        path
      );
      this.securityPatrols.add(patrol.sprite);
    }
    
    // Patrol in engineering
    const engineering = this.stationRooms.get('engineering');
    if (engineering) {
      const path = [
        new Phaser.Math.Vector2(engineering.x + 150, engineering.y + 150),
        new Phaser.Math.Vector2(engineering.x + engineering.width - 150, engineering.y + 150),
        new Phaser.Math.Vector2(engineering.x + engineering.width - 150, engineering.y + engineering.height - 150),
        new Phaser.Math.Vector2(engineering.x + 150, engineering.y + engineering.height - 150)
      ];
      const patrol = this.smugglingSystem.createSecurityPatrol(
        engineering.x + 150,
        engineering.y + 150,
        path
      );
      this.securityPatrols.add(patrol.sprite);
    }
  }
  
  private createStealthZones(): void {
    // Shadow zones in cargo hold
    const cargoHold = this.stationRooms.get('cargo_hold');
    if (cargoHold) {
      // Behind crates
      this.smugglingSystem.createStealthZone(
        cargoHold.x + 50,
        cargoHold.y + 100,
        100,
        400,
        'shadow'
      );
      
      // Maintenance vent
      this.smugglingSystem.createStealthZone(
        cargoHold.x + cargoHold.width - 150,
        cargoHold.y + cargoHold.height - 200,
        100,
        100,
        'vent'
      );
    }
    
    // Crowd zone in cantina
    const cantina = this.stationRooms.get('cantina');
    if (cantina) {
      this.smugglingSystem.createStealthZone(
        cantina.x + 100,
        cantina.y + 200,
        400,
        200,
        'crowd'
      );
    }
    
    // Maintenance tunnels in engineering
    const engineering = this.stationRooms.get('engineering');
    if (engineering) {
      this.smugglingSystem.createStealthZone(
        engineering.x + 50,
        engineering.y + 50,
        150,
        engineering.height - 100,
        'maintenance'
      );
    }
  }
  
  private addSmugglingNPCs(): void {
    // Add shady dealer in cargo hold
    const cargoHold = this.stationRooms.get('cargo_hold');
    if (cargoHold) {
      const dealer = this.npcs.create(
        cargoHold.x + cargoHold.width - 200,
        cargoHold.y + 300,
        'npc'
      );
      dealer.setDepth(10);
      dealer.setScale(1.3);
      dealer.setTint(0x666666); // Dark tint for shady character
      dealer.setData('id', 'npc_smuggler');
      dealer.setData('name', 'Shadow Dealer');
      dealer.setData('role', 'smuggler');
      dealer.setData('dialogue', "Got some... special cargo that needs moving. Interested?");
      dealer.setData('room', 'cargo_hold');
    }
    
    // Add informant in cantina
    const cantina = this.stationRooms.get('cantina');
    if (cantina) {
      const informant = this.npcs.create(
        cantina.x + 500,
        cantina.y + 350,
        'npc'
      );
      informant.setDepth(10);
      informant.setScale(1.3);
      informant.setTint(0x996633); // Brown tint
      informant.setData('id', 'npc_informant');
      informant.setData('name', 'Whisper');
      informant.setData('role', 'informant');
      informant.setData('dialogue', "I know when the guards change shifts... for a price.");
      informant.setData('room', 'cantina');
    }
    
    // Add fence in crew quarters
    const crewQuarters = this.stationRooms.get('crew_quarters');
    if (crewQuarters) {
      const fence = this.npcs.create(
        crewQuarters.x + 300,
        crewQuarters.y + 400,
        'npc'
      );
      fence.setDepth(10);
      fence.setScale(1.3);
      fence.setTint(0x9966ff); // Purple tint
      fence.setData('id', 'npc_fence');
      fence.setData('name', 'The Fence');
      fence.setData('role', 'fence');
      fence.setData('dialogue', "I'll take that contraband off your hands... no questions asked.");
      fence.setData('room', 'crew_quarters');
    }
  }

  private createNPCs(): void {
    this.npcs = this.physics.add.group();
    
    // Place NPCs in different rooms
    const npcData = [
      { room: 'market', x: 0.5, y: 0.3, name: 'Merchant', dialogue: "Looking for supplies? Best prices in the sector!" },
      { room: 'market', x: 0.7, y: 0.6, name: 'Trader', dialogue: "The pirates have been disrupting trade routes again." },
      { room: 'cantina', x: 0.3, y: 0.5, name: 'Bartender', dialogue: "What'll it be, spacer?" },
      { room: 'cantina', x: 0.6, y: 0.7, name: 'Patron', dialogue: "I heard there's treasure in the Outer Rim..." },
      { room: 'engineering', x: 0.5, y: 0.5, name: 'Engineer', dialogue: "These old systems need constant maintenance." },
      { room: 'cargo_hold', x: 0.4, y: 0.4, name: 'Dock Worker', dialogue: "Moving cargo all day, every day." },
      { room: 'crew_quarters', x: 0.5, y: 0.5, name: 'Crew Member', dialogue: "Just trying to get some rest between shifts." }
    ];
    
    npcData.forEach((data, index) => {
      const room = this.stationRooms.get(data.room);
      if (room) {
        const npc = this.npcs.create(
          room.x + room.width * data.x,
          room.y + room.height * data.y,
          'npc'
        );
        npc.setDepth(10);
        npc.setScale(1.3);
        npc.setData('id', `npc_${index}`);
        npc.setData('name', data.name);
        npc.setData('dialogue', data.dialogue);
        npc.setData('room', data.room);
        
        // NPC idle animation
        this.tweens.add({
          targets: npc,
          scaleX: npc.scaleX * 1.1,
          scaleY: npc.scaleY * 0.9,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        });
        
        // Simple wandering AI
        this.time.addEvent({
          delay: 3000 + Math.random() * 4000,
          callback: () => this.moveNPCRandomly(npc, room),
          loop: true
        });
      }
    });
  }

  private moveNPCRandomly(npc: Phaser.Physics.Arcade.Sprite, room: StationRoom): void {
    if (!npc.active) return;
    
    // Keep NPC within their room
    const targetX = room.x + 100 + Math.random() * (room.width - 200);
    const targetY = room.y + 100 + Math.random() * (room.height - 200);
    
    const distance = Phaser.Math.Distance.Between(npc.x, npc.y, targetX, targetY);
    const duration = (distance / 50) * 1000;
    
    this.tweens.add({
      targets: npc,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Linear'
    });
  }

  private createCollectibles(): void {
    this.collectibles = this.physics.add.group();
    
    // Scatter collectibles throughout the station
    this.stationRooms.forEach((room, roomId) => {
      // Credits in each room
      const numCredits = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numCredits; i++) {
        const x = room.x + 100 + Math.random() * (room.width - 200);
        const y = room.y + 100 + Math.random() * (room.height - 200);
        
        const credit = this.collectibles.create(x, y, 'credit_chip');
        credit.setDepth(5);
        credit.setScale(1.2);
        credit.setData('value', Phaser.Math.Between(10, 50));
        credit.setData('room', roomId);
        
        // Floating animation
        this.tweens.add({
          targets: credit,
          y: credit.y - 10,
          angle: 360,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        });
      }
      
      // Chance for health pickup in some rooms
      if (Math.random() < 0.3) {
        const x = room.x + room.width / 2;
        const y = room.y + room.height / 2;
        
        const health = this.collectibles.create(x, y, 'health_pickup');
        health.setDepth(5);
        health.setScale(1.3);
        health.setData('type', 'health');
        health.setData('value', 25);
        health.setData('room', roomId);
        
        // Pulsing animation
        this.tweens.add({
          targets: health,
          scale: health.scale * 1.2,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        });
      }
    });
  }

  private setupCamera(): void {
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);
    
    // Set camera bounds
    this.cameras.main.setBounds(0, 0, 3200, 2400);
    
    // Add camera shake on certain events
    this.events.on('explosion', () => {
      this.cameras.main.shake(200, 0.01);
    });
  }

  private setupControls(): void {
    // Keyboard controls for testing on desktop
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    }
    
    // Touch controls
    this.setupTouchControls();
    
    // Pinch to zoom
    this.setupPinchZoom();
    
    // Touch-to-move pathfinding
    this.setupTouchToMove();
  }

  private setupTouchControls(): void {
    // Virtual joystick for movement
    const baseRadius = 60;
    const thumbRadius = 30;
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if double-tap for touch-to-move
      if (pointer.event.detail === 2) {
        this.handleTouchToMove(pointer);
        return;
      }
      
      // Check if tapping on an interactable
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      // Check for NPC interaction
      let interacted = false;
      this.npcs.children.entries.forEach(npc => {
        const sprite = npc as Phaser.Physics.Arcade.Sprite;
        if (Phaser.Geom.Rectangle.Contains(sprite.getBounds(), worldPoint.x, worldPoint.y)) {
          this.interactWithNPC(sprite);
          interacted = true;
        }
      });
      
      // Check for terminal interaction
      if (!interacted) {
        this.interactables.children.entries.forEach(terminal => {
          const sprite = terminal as Phaser.Physics.Arcade.Sprite;
          if (Phaser.Geom.Rectangle.Contains(sprite.getBounds(), worldPoint.x, worldPoint.y)) {
            this.interactWithTerminal(sprite);
            interacted = true;
          }
        });
      }
      
      // Start joystick control if not interacting
      if (!interacted && !this.virtualJoystick) {
        this.touchStartX = pointer.x;
        this.touchStartY = pointer.y;
        this.isDragging = true;
        
        // Create joystick visuals
        this.joystickBase = this.add.graphics();
        this.joystickBase.fillStyle(0x444444, 0.3);
        this.joystickBase.fillCircle(pointer.x, pointer.y, baseRadius);
        this.joystickBase.lineStyle(2, 0xffaa00, 0.5);
        this.joystickBase.strokeCircle(pointer.x, pointer.y, baseRadius);
        this.joystickBase.setScrollFactor(0);
        this.joystickBase.setDepth(100);
        
        this.joystickThumb = this.add.graphics();
        this.joystickThumb.fillStyle(0xffaa00, 0.6);
        this.joystickThumb.fillCircle(pointer.x, pointer.y, thumbRadius);
        this.joystickThumb.setScrollFactor(0);
        this.joystickThumb.setDepth(101);
      }
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && this.joystickThumb) {
        // Update joystick thumb position
        const dx = pointer.x - this.touchStartX;
        const dy = pointer.y - this.touchStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 60;
        
        let thumbX = pointer.x;
        let thumbY = pointer.y;
        
        if (distance > maxDistance) {
          const angle = Math.atan2(dy, dx);
          thumbX = this.touchStartX + Math.cos(angle) * maxDistance;
          thumbY = this.touchStartY + Math.sin(angle) * maxDistance;
        }
        
        this.joystickThumb.clear();
        this.joystickThumb.fillStyle(0xffaa00, 0.6);
        this.joystickThumb.fillCircle(thumbX, thumbY, 30);
      }
    });
    
    this.input.on('pointerup', () => {
      this.isDragging = false;
      
      // Remove joystick visuals
      if (this.joystickBase) {
        this.joystickBase.destroy();
        this.joystickBase = undefined;
      }
      if (this.joystickThumb) {
        this.joystickThumb.destroy();
        this.joystickThumb = undefined;
      }
      
      // Stop player movement if not using touch-to-move
      if (!this.pathfindingTarget) {
        this.player.setVelocity(0, 0);
      }
    });
  }

  private setupTouchToMove(): void {
    // Create move target indicator
    this.moveTarget = this.add.sprite(-100, -100, 'target');
    this.moveTarget.setDepth(15);
    this.moveTarget.setVisible(false);
    this.moveTarget.setScale(0.5);
    
    // Animate target
    this.tweens.add({
      targets: this.moveTarget,
      scale: 0.7,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    
    // Create pathfinding line
    this.pathfindingLine = this.add.graphics();
    this.pathfindingLine.setDepth(14);
  }

  private handleTouchToMove(pointer: Phaser.Input.Pointer): void {
    // Convert screen coordinates to world coordinates
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    // Set pathfinding target
    this.pathfindingTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
    
    // Show move target
    if (this.moveTarget) {
      this.moveTarget.setPosition(worldPoint.x, worldPoint.y);
      this.moveTarget.setVisible(true);
      
      // Hide after reaching
      this.time.delayedCall(3000, () => {
        if (this.moveTarget) {
          this.moveTarget.setVisible(false);
        }
      });
    }
    
    // Draw path line
    this.updatePathfindingLine();
  }

  private updatePathfindingLine(): void {
    if (!this.pathfindingLine || !this.pathfindingTarget) return;
    
    this.pathfindingLine.clear();
    this.pathfindingLine.lineStyle(2, 0x00ff00, 0.3);
    this.pathfindingLine.lineBetween(
      this.player.x,
      this.player.y,
      this.pathfindingTarget.x,
      this.pathfindingTarget.y
    );
    
    // Draw dots along the path
    const distance = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.pathfindingTarget.x, this.pathfindingTarget.y
    );
    
    const numDots = Math.floor(distance / 30);
    for (let i = 1; i <= numDots; i++) {
      const t = i / (numDots + 1);
      const dotX = Phaser.Math.Linear(this.player.x, this.pathfindingTarget.x, t);
      const dotY = Phaser.Math.Linear(this.player.y, this.pathfindingTarget.y, t);
      this.pathfindingLine.fillStyle(0x00ff00, 0.5);
      this.pathfindingLine.fillCircle(dotX, dotY, 3);
    }
  }

  private setupPinchZoom(): void {
    let initialDistance = 0;
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.input.pointer2.isDown) {
        const currentDistance = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          this.input.pointer2.x, this.input.pointer2.y
        );
        
        if (!this.isZooming) {
          initialDistance = currentDistance;
          this.isZooming = true;
          this.lastPinchDistance = currentDistance;
        } else {
          const delta = currentDistance - this.lastPinchDistance;
          const zoomChange = delta * 0.01;
          const newZoom = Phaser.Math.Clamp(
            this.cameras.main.zoom + zoomChange,
            0.5,
            2.5
          );
          this.cameras.main.setZoom(newZoom);
          this.lastPinchDistance = currentDistance;
        }
      }
    });
    
    this.input.on('pointerup', () => {
      if (!this.input.pointer2.isDown) {
        this.isZooming = false;
      }
    });
  }

  private setupCollisions(): void {
    // Player collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.npcs, this.walls);
    this.physics.add.collider(this.npcs, this.npcs);
    
    // Collectible overlaps
    this.physics.add.overlap(this.player, this.collectibles, (player, collectible) => {
      this.collectItem(collectible as Phaser.Physics.Arcade.Sprite);
    });
    
    // Interactable proximity check
    this.physics.add.overlap(this.player, this.interactables, (player, interactable) => {
      this.highlightInteractable(interactable as Phaser.Physics.Arcade.Sprite);
    }, undefined, this);
  }

  private highlightInteractable(interactable: Phaser.Physics.Arcade.Sprite): void {
    const glow = interactable.getData('glow');
    if (glow && glow instanceof Phaser.GameObjects.Rectangle) {
      // Make glow visible when near
      glow.setStrokeStyle(3, 0x00ffff, 1);
    }
  }

  private collectItem(item: Phaser.Physics.Arcade.Sprite): void {
    const type = item.getData('type');
    const value = item.getData('value');
    const room = item.getData('room');
    
    if (type === 'health') {
      this.events.emit('healthCollected', value);
      console.log(`[MainGameScene] Collected health: +${value}`);
    } else {
      this.events.emit('creditsCollected', value);
      console.log(`[MainGameScene] Collected credits: +${value} in ${room}`);
    }
    
    // Visual feedback with particles
    this.createCollectionParticles(item.x, item.y, type === 'health' ? 0x00ff00 : 0xffaa00);
    
    // Destroy item
    item.destroy();
  }

  private createCollectionParticles(x: number, y: number, color: number): void {
    // Create burst of particles when collecting item
    const particles = this.add.particles(x, y, 'particle', {
      color: [color],
      scale: { start: 0.5, end: 0 },
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      lifespan: 500,
      quantity: 10
    });
    
    particles.setDepth(51);
    particles.explode();
    
    this.time.delayedCall(600, () => {
      particles.destroy();
    });
  }

  private interactWithNPC(npc: Phaser.Physics.Arcade.Sprite): void {
    const npcId = npc.getData('id');
    const name = npc.getData('name');
    
    // Prevent multiple simultaneous interactions
    if (this.activeNPCInteraction) return;
    this.activeNPCInteraction = npcId;
    
    console.log(`[MainGameScene] Starting dialogue with ${name}`);
    
    // Visual feedback
    this.tweens.add({
      targets: npc,
      scaleX: npc.scaleX * 1.3,
      scaleY: npc.scaleY * 1.3,
      duration: 200,
      yoyo: true,
      ease: 'Power1'
    });
    
    // Face the player
    const angle = Phaser.Math.Angle.Between(npc.x, npc.y, this.player.x, this.player.y);
    npc.setRotation(angle + Math.PI / 2);
    
    // Start dialogue with the NPC using the dialogue system
    this.dialogueSystem.startDialogue(npcId, (text, choices) => {
      this.events.emit('showEnhancedDialogue', {
        npcId,
        npcName: name,
        text,
        choices
      });
    });
    
    // Emit interaction event for mission system
    this.events.emit('npcInteracted', npcId);
  }
  
  private setupSystemEvents(): void {
    // Handle dialogue choice selection from UI
    this.events.on('dialogueChoiceSelected', (choiceId: string) => {
      this.dialogueSystem.selectChoice(choiceId);
    });
    
    // Handle dialogue end
    this.events.on('dialogueEnded', () => {
      this.activeNPCInteraction = null;
    });
    
    // Handle mission acceptance from dialogue
    this.events.on('startNPCMission', (missionId: string, npcId: string) => {
      const accepted = this.missionSystem.acceptMission(missionId);
      if (accepted) {
        // Show quest marker above NPC
        const npc = this.npcs.children.entries.find(
          n => (n as any).getData('id') === npcId
        );
        if (npc) {
          this.createQuestMarker(npc as Phaser.Physics.Arcade.Sprite);
        }
      }
    });
    
    // Handle mission events
    this.events.on('openShop', (npcId: string) => {
      console.log(`[MainGameScene] Opening shop for ${npcId}`);
      // Emit to UI for shop interface
      this.events.emit('showShopInterface', npcId);
    });
    
    // Handle item collection for missions
    this.events.on('itemCollected', (itemId: string, quantity: number) => {
      // Mission system already listening to this event
    });
    
    // Handle location arrival for missions
    this.events.on('roomDiscovered', (roomId: string) => {
      this.events.emit('locationReached', roomId);
    });
    
    // Clean up on scene shutdown
    this.events.once('shutdown', () => {
      this.events.off('dialogueChoiceSelected');
      this.events.off('dialogueEnded');
      this.events.off('startNPCMission');
      this.events.off('openShop');
      this.missionSystem.destroy();
    });
  }
  
  private createQuestMarker(npc: Phaser.Physics.Arcade.Sprite): void {
    // Create a quest indicator above the NPC
    const marker = this.add.text(npc.x, npc.y - 40, '!', {
      fontSize: '24px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    });
    marker.setOrigin(0.5);
    marker.setDepth(15);
    
    // Animate the marker
    this.tweens.add({
      targets: marker,
      y: marker.y - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
    
    // Store marker reference on NPC
    npc.setData('questMarker', marker);
  }

  private interactWithTerminal(terminal: Phaser.Physics.Arcade.Sprite): void {
    const type = terminal.getData('type');
    this.events.emit('terminalInteraction', type);
    console.log(`[MainGameScene] Accessed ${type} terminal`);
    
    // Visual feedback
    this.tweens.add({
      targets: terminal,
      scale: terminal.scale * 1.1,
      duration: 100,
      yoyo: true,
      repeat: 3,
      ease: 'Power1'
    });
    
    // Create access particles
    this.createTerminalParticles(terminal.x, terminal.y);
  }

  private createTerminalParticles(x: number, y: number): void {
    const particles = this.add.particles(x, y, 'particle', {
      color: [0x00ffff, 0x0099ff],
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      speed: { min: 20, max: 80 },
      angle: { min: -30, max: 30 },
      lifespan: 800,
      quantity: 5,
      frequency: 50
    });
    
    particles.setDepth(51);
    
    this.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  private checkCurrentRoom(): void {
    // Determine which room the player is in
    let newRoom: string | null = null;
    
    this.stationRooms.forEach((room, roomId) => {
      if (this.player.x >= room.x && 
          this.player.x <= room.x + room.width &&
          this.player.y >= room.y && 
          this.player.y <= room.y + room.height) {
        newRoom = roomId;
      }
    });
    
    if (newRoom && newRoom !== this.currentRoom) {
      this.currentRoom = newRoom;
      
      // Mark room as explored
      if (!this.exploredRooms.has(newRoom)) {
        this.exploredRooms.add(newRoom);
        this.events.emit('roomDiscovered', newRoom);
        console.log(`[MainGameScene] Discovered: ${this.stationRooms.get(newRoom)?.name}`);
        
        // Update lighting
        this.updateLighting();
        
        // Update mini-map
        this.updateMiniMap();
      }
    }
  }

  private updateMiniMap(): void {
    // Send room data to UI overlay for mini-map update
    const mapData = {
      currentRoom: this.currentRoom,
      exploredRooms: Array.from(this.exploredRooms),
      playerPos: { x: this.player.x, y: this.player.y },
      rooms: Array.from(this.stationRooms.entries()).map(([id, room]) => ({
        id,
        ...room
      }))
    };
    
    this.events.emit('updateMiniMap', mapData);
  }

  update(time: number, delta: number): void {
    // Handle player movement
    const speed = 250;
    let velocityX = 0;
    let velocityY = 0;
    
    // Check for touch-to-move pathfinding
    if (this.pathfindingTarget) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.pathfindingTarget.x, this.pathfindingTarget.y
      );
      
      if (distance > 20) {
        // Move towards target
        const angle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          this.pathfindingTarget.x, this.pathfindingTarget.y
        );
        
        velocityX = Math.cos(angle) * speed;
        velocityY = Math.sin(angle) * speed;
        
        // Update path line
        this.updatePathfindingLine();
      } else {
        // Reached target
        this.pathfindingTarget = undefined;
        if (this.pathfindingLine) {
          this.pathfindingLine.clear();
        }
        if (this.moveTarget) {
          this.moveTarget.setVisible(false);
        }
      }
    }
    
    // Keyboard controls (override pathfinding)
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        velocityX = -speed;
        this.playerDirection = 'left';
        this.pathfindingTarget = undefined;
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        velocityX = speed;
        this.playerDirection = 'right';
        this.pathfindingTarget = undefined;
      }
      
      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        velocityY = -speed;
        this.playerDirection = 'up';
        this.pathfindingTarget = undefined;
      } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
        velocityY = speed;
        this.playerDirection = 'down';
        this.pathfindingTarget = undefined;
      }
    }
    
    // Touch/joystick controls (override pathfinding)
    if (this.isDragging && this.joystickThumb) {
      const dx = (this.input.activePointer.x - this.touchStartX) / 60;
      const dy = (this.input.activePointer.y - this.touchStartY) / 60;
      
      velocityX = dx * speed;
      velocityY = dy * speed;
      
      // Update direction based on movement
      if (Math.abs(dx) > Math.abs(dy)) {
        this.playerDirection = dx > 0 ? 'right' : 'left';
      } else {
        this.playerDirection = dy > 0 ? 'down' : 'up';
      }
      
      this.pathfindingTarget = undefined;
    }
    
    // Apply velocity to player
    this.player.setVelocity(velocityX, velocityY);
    
    // Update animation based on movement
    this.isMoving = Math.abs(velocityX) > 0 || Math.abs(velocityY) > 0;
    
    if (this.isMoving) {
      // Walking animation (scale effect for now)
      this.player.setScale(
        1.5 + Math.sin(this.time.now * 0.01) * 0.05,
        1.5 - Math.sin(this.time.now * 0.01) * 0.05
      );
      
      // Play walk animation
      const animKey = `player_walk_${this.playerDirection}`;
      if (this.player.anims.currentAnim?.key !== animKey) {
        this.player.play(animKey);
      }
    } else {
      // Idle animation
      this.player.setScale(1.5);
      const animKey = `player_idle_${this.playerDirection}`;
      if (this.player.anims.currentAnim?.key !== animKey) {
        this.player.play(animKey);
      }
    }
    
    // Check current room for updates
    this.checkCurrentRoom();
    
    // Update lighting position
    if (this.lightingLayer) {
      this.updateLighting();
    }
    
    // Update interactable glow effects based on distance
    this.interactables.children.entries.forEach(interactable => {
      const sprite = interactable as Phaser.Physics.Arcade.Sprite;
      const glow = sprite.getData('glow');
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        sprite.x, sprite.y
      );
      
      if (glow && glow instanceof Phaser.GameObjects.Rectangle) {
        if (distance < 100) {
          // Show glow when near
          const alpha = 1 - (distance / 100);
          glow.setStrokeStyle(3, 0x00ffff, alpha);
        } else {
          // Hide glow when far
          glow.setStrokeStyle(3, 0x00ffff, 0);
        }
      }
    });
    
    // Update smuggling system
    if (this.smugglingSystem) {
      this.smugglingSystem.update(this.player, delta);
      
      // Update UI with heat and detection levels
      this.events.emit('updateSmugglingStatus', {
        heat: this.smugglingSystem.getHeat(),
        detection: this.smugglingSystem.getDetectionLevel(),
        carrying: this.smugglingSystem.isCarryingContraband(),
        mission: this.smugglingSystem.getActiveMission()
      });
    }
  }
}