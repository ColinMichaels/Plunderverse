import Phaser from 'phaser';

/**
 * MainGameScene - The main gameplay scene for station exploration
 */
export class MainGameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: any;
  private npcs!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private interactables!: Phaser.Physics.Arcade.StaticGroup;
  
  // Touch controls
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isDragging: boolean = false;
  private virtualJoystick?: Phaser.GameObjects.Graphics;
  private joystickBase?: Phaser.GameObjects.Graphics;
  private joystickThumb?: Phaser.GameObjects.Graphics;
  
  // Camera controls
  private isZooming: boolean = false;
  private lastPinchDistance: number = 0;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  create(): void {
    console.log('[MainGameScene] Creating game world...');
    
    // Set world bounds (larger than viewport for exploration)
    this.physics.world.setBounds(0, 0, 2000, 2000);
    
    // Create station floor
    this.createStationEnvironment();
    
    // Create player
    this.createPlayer();
    
    // Create NPCs
    this.createNPCs();
    
    // Create collectibles
    this.createCollectibles();
    
    // Set up camera
    this.setupCamera();
    
    // Set up controls
    this.setupControls();
    
    // Set up collisions
    this.setupCollisions();
    
    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private createStationEnvironment(): void {
    // Create tiled floor
    for (let x = 0; x < 32; x++) {
      for (let y = 0; y < 32; y++) {
        const floorTile = this.add.image(x * 64 + 32, y * 64 + 32, 'floor_tile');
        floorTile.setDepth(0);
      }
    }
    
    // Create walls
    this.walls = this.physics.add.staticGroup();
    
    // Top and bottom walls
    for (let x = 0; x < 32; x++) {
      this.walls.create(x * 64 + 32, 32, 'wall_tile');
      this.walls.create(x * 64 + 32, 31 * 64 + 32, 'wall_tile');
    }
    
    // Left and right walls
    for (let y = 1; y < 31; y++) {
      this.walls.create(32, y * 64 + 32, 'wall_tile');
      this.walls.create(31 * 64 + 32, y * 64 + 32, 'wall_tile');
    }
    
    // Create some interior walls for maze-like exploration
    for (let i = 5; i < 25; i++) {
      if (i !== 15 && i !== 16) { // Leave gaps for passages
        this.walls.create(10 * 64 + 32, i * 64 + 32, 'wall_tile');
        this.walls.create(20 * 64 + 32, i * 64 + 32, 'wall_tile');
      }
    }
    
    // Create interactive terminals
    this.interactables = this.physics.add.staticGroup();
    this.interactables.create(5 * 64, 5 * 64, 'terminal').setScale(1.2);
    this.interactables.create(25 * 64, 5 * 64, 'terminal').setScale(1.2);
    this.interactables.create(15 * 64, 15 * 64, 'terminal').setScale(1.2);
  }

  private createPlayer(): void {
    // Create player at starting position
    this.player = this.physics.add.sprite(16 * 64, 16 * 64, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    
    // Add player animations (simple bounce effect)
    this.tweens.add({
      targets: this.player,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
    
    // Get player data from registry
    const playerData = this.registry.get('playerData');
    if (playerData) {
      console.log('[MainGameScene] Player data loaded:', playerData);
    }
  }

  private createNPCs(): void {
    this.npcs = this.physics.add.group();
    
    // Create a few wandering NPCs
    const npcPositions = [
      { x: 8, y: 8 },
      { x: 24, y: 8 },
      { x: 8, y: 24 },
      { x: 24, y: 24 },
      { x: 16, y: 12 }
    ];
    
    npcPositions.forEach((pos, index) => {
      const npc = this.npcs.create(pos.x * 64, pos.y * 64, 'npc');
      npc.setDepth(10);
      npc.setData('id', `npc_${index}`);
      npc.setData('dialogue', this.getRandomDialogue());
      
      // Simple wandering AI
      this.time.addEvent({
        delay: 2000 + Math.random() * 3000,
        callback: () => this.moveNPCRandomly(npc),
        loop: true
      });
    });
  }

  private moveNPCRandomly(npc: Phaser.Physics.Arcade.Sprite): void {
    if (!npc.active) return;
    
    const directions = [
      { x: -50, y: 0 },
      { x: 50, y: 0 },
      { x: 0, y: -50 },
      { x: 0, y: 50 }
    ];
    
    const dir = Phaser.Math.RND.pick(directions);
    npc.setVelocity(dir.x, dir.y);
    
    // Stop after a short time
    this.time.delayedCall(1000, () => {
      if (npc.active) {
        npc.setVelocity(0, 0);
      }
    });
  }

  private getRandomDialogue(): string {
    const dialogues = [
      "Welcome to Outpost Station 7!",
      "The pirates have been quiet lately...",
      "Looking for work? Check the terminal.",
      "I heard there's treasure in the lower decks.",
      "Stay alert, space is dangerous."
    ];
    return Phaser.Math.RND.pick(dialogues);
  }

  private createCollectibles(): void {
    this.collectibles = this.physics.add.group();
    
    // Scatter credit chips around the station
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(3, 28) * 64;
      const y = Phaser.Math.Between(3, 28) * 64;
      const credit = this.collectibles.create(x, y, 'credit_chip');
      credit.setDepth(5);
      credit.setData('value', Phaser.Math.Between(5, 20));
      
      // Add floating animation
      this.tweens.add({
        targets: credit,
        y: credit.y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    }
    
    // Add a few health pickups
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(3, 28) * 64;
      const y = Phaser.Math.Between(3, 28) * 64;
      const health = this.collectibles.create(x, y, 'health_pickup');
      health.setDepth(5);
      health.setData('type', 'health');
      health.setData('value', 25);
    }
  }

  private setupCamera(): void {
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    
    // Set camera bounds
    this.cameras.main.setBounds(0, 0, 2000, 2000);
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
  }

  private setupTouchControls(): void {
    // Create virtual joystick
    const baseRadius = 50;
    const thumbRadius = 25;
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if tapping on an interactable
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      
      // Check for NPC interaction
      this.npcs.children.entries.forEach(npc => {
        const sprite = npc as Phaser.Physics.Arcade.Sprite;
        if (Phaser.Geom.Rectangle.Contains(sprite.getBounds(), worldPoint.x, worldPoint.y)) {
          this.interactWithNPC(sprite);
          return;
        }
      });
      
      // Check for terminal interaction
      this.interactables.children.entries.forEach(terminal => {
        const sprite = terminal as Phaser.Physics.Arcade.Sprite;
        if (Phaser.Geom.Rectangle.Contains(sprite.getBounds(), worldPoint.x, worldPoint.y)) {
          this.interactWithTerminal(sprite);
          return;
        }
      });
      
      // Start joystick control
      if (!this.virtualJoystick) {
        this.touchStartX = pointer.x;
        this.touchStartY = pointer.y;
        this.isDragging = true;
        
        // Create joystick visuals
        this.joystickBase = this.add.graphics();
        this.joystickBase.fillStyle(0x888888, 0.5);
        this.joystickBase.fillCircle(pointer.x, pointer.y, baseRadius);
        this.joystickBase.setScrollFactor(0);
        this.joystickBase.setDepth(100);
        
        this.joystickThumb = this.add.graphics();
        this.joystickThumb.fillStyle(0x00ffff, 0.8);
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
        const maxDistance = 50;
        
        let thumbX = pointer.x;
        let thumbY = pointer.y;
        
        if (distance > maxDistance) {
          const angle = Math.atan2(dy, dx);
          thumbX = this.touchStartX + Math.cos(angle) * maxDistance;
          thumbY = this.touchStartY + Math.sin(angle) * maxDistance;
        }
        
        this.joystickThumb.clear();
        this.joystickThumb.fillStyle(0x00ffff, 0.8);
        this.joystickThumb.fillCircle(thumbX, thumbY, 25);
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
      
      // Stop player movement
      this.player.setVelocity(0, 0);
    });
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
            2
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
  }

  private collectItem(item: Phaser.Physics.Arcade.Sprite): void {
    const type = item.getData('type');
    const value = item.getData('value');
    
    if (type === 'health') {
      // Emit health collection event
      this.events.emit('healthCollected', value);
      console.log(`[MainGameScene] Collected health: +${value}`);
    } else {
      // Credit chip
      this.events.emit('creditsCollected', value);
      console.log(`[MainGameScene] Collected credits: +${value}`);
    }
    
    // Visual feedback
    this.tweens.add({
      targets: item,
      y: item.y - 50,
      alpha: 0,
      scale: 1.5,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        item.destroy();
      }
    });
  }

  private interactWithNPC(npc: Phaser.Physics.Arcade.Sprite): void {
    const dialogue = npc.getData('dialogue');
    this.events.emit('showDialogue', dialogue);
    console.log(`[MainGameScene] NPC says: "${dialogue}"`);
    
    // Visual feedback
    this.tweens.add({
      targets: npc,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Power1'
    });
  }

  private interactWithTerminal(terminal: Phaser.Physics.Arcade.Sprite): void {
    this.events.emit('terminalInteraction');
    console.log('[MainGameScene] Terminal accessed');
    
    // Visual feedback
    this.tweens.add({
      targets: terminal,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 2,
      ease: 'Power1'
    });
  }

  update(): void {
    // Handle player movement
    const speed = 200;
    let velocityX = 0;
    let velocityY = 0;
    
    // Keyboard controls
    if (this.cursors) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) {
        velocityX = -speed;
      } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
        velocityX = speed;
      }
      
      if (this.cursors.up.isDown || this.wasd.W.isDown) {
        velocityY = -speed;
      } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
        velocityY = speed;
      }
    }
    
    // Touch/joystick controls
    if (this.isDragging && this.joystickThumb) {
      const dx = (this.input.activePointer.x - this.touchStartX) / 50;
      const dy = (this.input.activePointer.y - this.touchStartY) / 50;
      
      velocityX = dx * speed;
      velocityY = dy * speed;
    }
    
    // Apply velocity to player
    this.player.setVelocity(velocityX, velocityY);
    
    // Simple animation based on movement
    if (Math.abs(velocityX) > 0 || Math.abs(velocityY) > 0) {
      this.player.setScale(
        1 + Math.sin(this.time.now * 0.01) * 0.05,
        1 - Math.sin(this.time.now * 0.01) * 0.05
      );
    } else {
      this.player.setScale(1, 1);
    }
  }
}