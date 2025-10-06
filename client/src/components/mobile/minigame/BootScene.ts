import Phaser from 'phaser';

/**
 * BootScene - Handles initial asset loading for the mini-game
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    console.log('[BootScene] Loading assets...');
    
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Loading text
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading Station Explorer...', {
      fontSize: '20px',
      color: '#00ffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Progress bar background
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 5, 320, 50);
    
    // Progress text
    const percentText = this.add.text(width / 2, height / 2 + 20, '0%', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Asset loading text
    const assetText = this.add.text(width / 2, height / 2 + 60, '', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Update progress bar
    this.load.on('progress', (value: number) => {
      percentText.setText(Math.floor(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0x00ffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 + 5, 300 * value, 30);
    });

    // Update file loading text
    this.load.on('fileprogress', (file: any) => {
      assetText.setText('Loading: ' + file.key);
    });

    // Clean up when complete
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });

    // Load placeholder assets (we'll use generated graphics for now)
    // In a real game, you would load sprites, tilemaps, etc. here
    this.createPlaceholderAssets();
  }

  private createPlaceholderAssets(): void {
    // Create placeholder graphics that we can use in the game
    
    // Create a player sprite placeholder
    const playerGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    playerGraphics.fillStyle(0x00ff00, 1);
    playerGraphics.fillCircle(16, 16, 16);
    playerGraphics.generateTexture('player', 32, 32);
    
    // Create station floor tile
    const floorGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    floorGraphics.fillStyle(0x333344, 1);
    floorGraphics.fillRect(0, 0, 64, 64);
    floorGraphics.lineStyle(1, 0x555566, 1);
    floorGraphics.strokeRect(0, 0, 64, 64);
    floorGraphics.generateTexture('floor_tile', 64, 64);
    
    // Create wall tile
    const wallGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    wallGraphics.fillStyle(0x1a1a2e, 1);
    wallGraphics.fillRect(0, 0, 64, 64);
    wallGraphics.lineStyle(2, 0x0f3460, 1);
    wallGraphics.strokeRect(0, 0, 64, 64);
    wallGraphics.generateTexture('wall_tile', 64, 64);
    
    // Create NPC placeholder
    const npcGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphics.fillStyle(0xffa500, 1);
    npcGraphics.fillCircle(16, 16, 14);
    npcGraphics.generateTexture('npc', 32, 32);
    
    // Create interactive object (terminal)
    const terminalGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    terminalGraphics.fillStyle(0x00aaff, 1);
    terminalGraphics.fillRect(0, 0, 48, 48);
    terminalGraphics.fillStyle(0x003366, 1);
    terminalGraphics.fillRect(8, 8, 32, 24);
    terminalGraphics.generateTexture('terminal', 48, 48);
    
    // Create collectible (credit chip)
    const creditGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    creditGraphics.fillStyle(0xffff00, 1);
    creditGraphics.fillCircle(12, 12, 8);
    creditGraphics.fillStyle(0xffaa00, 1);
    creditGraphics.fillCircle(12, 12, 4);
    creditGraphics.generateTexture('credit_chip', 24, 24);
    
    // Create health pickup
    const healthGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    healthGraphics.fillStyle(0xff0000, 1);
    healthGraphics.fillRect(8, 4, 8, 16);
    healthGraphics.fillRect(4, 8, 16, 8);
    healthGraphics.generateTexture('health_pickup', 24, 24);
    
    // Create particle texture for effects
    const particleGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    particleGraphics.fillStyle(0xffffff, 1);
    particleGraphics.fillCircle(4, 4, 4);
    particleGraphics.generateTexture('particle', 8, 8);
    
    // Create target texture for touch-to-move
    const targetGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    targetGraphics.lineStyle(3, 0x00ff00, 1);
    targetGraphics.strokeCircle(16, 16, 12);
    targetGraphics.strokeCircle(16, 16, 6);
    targetGraphics.fillStyle(0x00ff00, 1);
    targetGraphics.fillCircle(16, 16, 2);
    targetGraphics.generateTexture('target', 32, 32);
    
    console.log('[BootScene] All assets created successfully');
  }

  create(): void {
    console.log('[BootScene] Boot complete, starting main game...');
    
    // Add a brief fade transition
    this.cameras.main.fadeOut(500);
    
    this.time.delayedCall(500, () => {
      // Start the main game scene and UI overlay
      this.scene.start('MainGameScene');
      this.scene.start('UIOverlayScene');
    });
  }
}