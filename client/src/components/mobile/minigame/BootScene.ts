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
    // Create enhanced graphics with better visuals for the game
    
    // Create animated player sprite with glow effect
    const playerGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    // Outer glow
    for (let i = 3; i >= 0; i--) {
      playerGraphics.fillStyle(0x00ffaa, 0.1 * (4 - i));
      playerGraphics.fillCircle(16, 16, 16 + i * 2);
    }
    // Main body
    playerGraphics.fillStyle(0x00ff99, 1);
    playerGraphics.fillCircle(16, 16, 14);
    // Inner highlight
    playerGraphics.fillStyle(0x66ffcc, 0.8);
    playerGraphics.fillCircle(14, 14, 8);
    // Eye/visor
    playerGraphics.fillStyle(0x003333, 1);
    playerGraphics.fillRect(10, 12, 12, 4);
    playerGraphics.generateTexture('player', 32, 32);
    
    // Create multiple floor tile variations with sci-fi patterns
    for (let i = 0; i < 4; i++) {
      const floorGraphics = this.make.graphics({ x: 0, y: 0 }, false);
      // Base color with variation
      const baseColor = [0x2a2a3e, 0x3a2a4e, 0x2e3a4e, 0x3e3a2e][i];
      floorGraphics.fillStyle(baseColor, 1);
      floorGraphics.fillRect(0, 0, 64, 64);
      
      // Grid pattern
      floorGraphics.lineStyle(1, 0xff9900, 0.2);
      for (let j = 0; j < 64; j += 16) {
        floorGraphics.lineBetween(j, 0, j, 64);
        floorGraphics.lineBetween(0, j, 64, j);
      }
      
      // Corner lights
      floorGraphics.fillStyle(0xff9900, 0.5);
      floorGraphics.fillCircle(4, 4, 2);
      floorGraphics.fillCircle(60, 4, 2);
      floorGraphics.fillCircle(4, 60, 2);
      floorGraphics.fillCircle(60, 60, 2);
      
      // Edge highlight
      floorGraphics.lineStyle(1, 0x666688, 0.5);
      floorGraphics.strokeRect(0, 0, 64, 64);
      
      floorGraphics.generateTexture(`floor_tile_${i}`, 64, 64);
    }
    // Also keep a default floor_tile for compatibility
    const defaultFloor = this.make.graphics({ x: 0, y: 0 }, false);
    defaultFloor.fillStyle(0x2a2a3e, 1);
    defaultFloor.fillRect(0, 0, 64, 64);
    defaultFloor.lineStyle(1, 0xff9900, 0.2);
    for (let j = 0; j < 64; j += 16) {
      defaultFloor.lineBetween(j, 0, j, 64);
      defaultFloor.lineBetween(0, j, 64, j);
    }
    defaultFloor.generateTexture('floor_tile', 64, 64);
    
    // Create detailed wall tiles with tech panels
    const wallGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    wallGraphics.fillStyle(0x1a1a2e, 1);
    wallGraphics.fillRect(0, 0, 64, 64);
    // Panel lines
    wallGraphics.lineStyle(2, 0x0f3460, 1);
    wallGraphics.strokeRect(0, 0, 64, 64);
    wallGraphics.strokeRect(8, 8, 48, 48);
    // Tech details
    wallGraphics.fillStyle(0xff9900, 0.6);
    wallGraphics.fillRect(12, 12, 8, 2);
    wallGraphics.fillRect(24, 12, 8, 2);
    wallGraphics.fillRect(36, 12, 8, 2);
    // Vent grille
    for (let i = 0; i < 5; i++) {
      wallGraphics.fillStyle(0x0a1a2a, 0.8);
      wallGraphics.fillRect(12, 24 + i * 6, 40, 2);
    }
    wallGraphics.generateTexture('wall_tile', 64, 64);
    
    // Create distinct NPC sprites for different roles
    const npcTypes = [
      { color: 0xffa500, name: 'npc_merchant' }, // Orange - Merchant
      { color: 0x00aaff, name: 'npc_engineer' }, // Blue - Engineer  
      { color: 0xff6600, name: 'npc_bartender' }, // Dark orange - Bartender
      { color: 0x9966ff, name: 'npc_dockworker' }, // Purple - Dock worker
      { color: 0x66ff66, name: 'npc_crew' } // Green - Crew
    ];
    
    npcTypes.forEach((npcType) => {
      const npcGraphics = this.make.graphics({ x: 0, y: 0 }, false);
      // Outer glow
      npcGraphics.fillStyle(npcType.color, 0.3);
      npcGraphics.fillCircle(16, 16, 18);
      // Body
      npcGraphics.fillStyle(npcType.color, 1);
      npcGraphics.fillCircle(16, 16, 14);
      // Uniform detail
      npcGraphics.fillStyle(0x000000, 0.5);
      npcGraphics.fillRect(10, 14, 12, 8);
      // Badge/emblem
      npcGraphics.fillStyle(0xffaa00, 0.8);
      npcGraphics.fillRect(11, 15, 3, 3);
      npcGraphics.generateTexture(npcType.name, 32, 32);
    });
    
    // Keep generic npc texture for compatibility
    const npcGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphics.fillStyle(0xffa500, 0.3);
    npcGraphics.fillCircle(16, 16, 18);
    npcGraphics.fillStyle(0xffa500, 1);
    npcGraphics.fillCircle(16, 16, 14);
    npcGraphics.generateTexture('npc', 32, 32);
    
    // Create high-tech terminal with animated display
    const terminalGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    // Base
    terminalGraphics.fillStyle(0x222244, 1);
    terminalGraphics.fillRect(0, 0, 48, 48);
    // Frame
    terminalGraphics.lineStyle(2, 0x00aaff, 1);
    terminalGraphics.strokeRect(2, 2, 44, 44);
    // Screen
    terminalGraphics.fillStyle(0x001133, 1);
    terminalGraphics.fillRect(6, 6, 36, 28);
    // Holographic effect
    terminalGraphics.fillStyle(0x00ffff, 0.4);
    terminalGraphics.fillRect(6, 6, 36, 28);
    // Display lines
    for (let i = 0; i < 4; i++) {
      terminalGraphics.fillStyle(0x00ff00, 0.8 - i * 0.2);
      terminalGraphics.fillRect(8, 8 + i * 6, 32 - i * 4, 2);
    }
    // Status lights
    terminalGraphics.fillStyle(0x00ff00, 1);
    terminalGraphics.fillCircle(12, 40, 2);
    terminalGraphics.fillStyle(0xffaa00, 1);
    terminalGraphics.fillCircle(24, 40, 2);
    terminalGraphics.fillStyle(0xff0000, 0.5);
    terminalGraphics.fillCircle(36, 40, 2);
    terminalGraphics.generateTexture('terminal', 48, 48);
    
    // Create glowing credit chip collectible
    const creditGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    // Outer glow animation base
    creditGraphics.fillStyle(0xffff00, 0.2);
    creditGraphics.fillCircle(12, 12, 12);
    creditGraphics.fillStyle(0xffff00, 0.4);
    creditGraphics.fillCircle(12, 12, 10);
    // Main chip
    creditGraphics.fillStyle(0xffdd00, 1);
    creditGraphics.fillCircle(12, 12, 8);
    // Inner design
    creditGraphics.fillStyle(0xff9900, 1);
    creditGraphics.fillCircle(12, 12, 5);
    // Credit symbol
    creditGraphics.fillStyle(0xffffff, 1);
    creditGraphics.fillRect(10, 9, 4, 1);
    creditGraphics.fillRect(10, 11, 4, 1);
    creditGraphics.fillRect(10, 13, 4, 1);
    creditGraphics.fillRect(11, 8, 1, 7);
    creditGraphics.generateTexture('credit_chip', 24, 24);
    
    // Create medical kit with cross and glow
    const healthGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    // Glow
    healthGraphics.fillStyle(0xff0000, 0.3);
    healthGraphics.fillCircle(12, 12, 12);
    // Base
    healthGraphics.fillStyle(0xffffff, 1);
    healthGraphics.fillRect(4, 4, 16, 16);
    // Red cross
    healthGraphics.fillStyle(0xff0000, 1);
    healthGraphics.fillRect(10, 6, 4, 12);
    healthGraphics.fillRect(6, 10, 12, 4);
    healthGraphics.generateTexture('health_pickup', 24, 24);
    
    // Create multiple particle textures for different effects
    const particleTypes = [
      { name: 'particle', color: 0xffffff, size: 4 }, // Keep default
      { name: 'particle_spark', color: 0xffaa00, size: 4 },
      { name: 'particle_smoke', color: 0x666666, size: 8 },
      { name: 'particle_steam', color: 0xcccccc, size: 6 },
      { name: 'particle_dust', color: 0x886644, size: 3 },
      { name: 'particle_glow', color: 0x00ffff, size: 5 }
    ];
    
    particleTypes.forEach(pType => {
      const particleGraphics = this.make.graphics({ x: 0, y: 0 }, false);
      particleGraphics.fillStyle(pType.color, 0.8);
      particleGraphics.fillCircle(pType.size, pType.size, pType.size);
      particleGraphics.fillStyle(pType.color, 0.4);
      particleGraphics.fillCircle(pType.size, pType.size, pType.size * 1.5);
      particleGraphics.generateTexture(pType.name, pType.size * 3, pType.size * 3);
    });
    
    // Create animated target indicator for touch movement
    const targetGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    // Outer rings with glow
    targetGraphics.lineStyle(2, 0x00ff00, 0.3);
    targetGraphics.strokeCircle(16, 16, 14);
    targetGraphics.lineStyle(3, 0x00ff00, 0.6);
    targetGraphics.strokeCircle(16, 16, 10);
    targetGraphics.lineStyle(2, 0x00ff00, 1);
    targetGraphics.strokeCircle(16, 16, 6);
    // Center dot
    targetGraphics.fillStyle(0x00ff00, 1);
    targetGraphics.fillCircle(16, 16, 3);
    targetGraphics.fillStyle(0xffffff, 0.8);
    targetGraphics.fillCircle(16, 16, 1);
    targetGraphics.generateTexture('target', 32, 32);
    
    // Create door texture
    const doorGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    doorGraphics.fillStyle(0x0066cc, 1);
    doorGraphics.fillRect(0, 0, 60, 80);
    // Door panels
    doorGraphics.fillStyle(0x004499, 1);
    doorGraphics.fillRect(5, 5, 25, 35);
    doorGraphics.fillRect(30, 5, 25, 35);
    doorGraphics.fillRect(5, 40, 25, 35);
    doorGraphics.fillRect(30, 40, 25, 35);
    // Access panel
    doorGraphics.fillStyle(0x00aaff, 0.8);
    doorGraphics.fillRect(20, 35, 20, 10);
    // Status lights
    doorGraphics.fillStyle(0x00ff00, 1);
    doorGraphics.fillCircle(10, 10, 2);
    doorGraphics.fillCircle(50, 10, 2);
    doorGraphics.generateTexture('door', 60, 80);
    
    // Create security patrol sprite
    const securityGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    securityGraphics.fillStyle(0xff0000, 0.3);
    securityGraphics.fillCircle(16, 16, 18);
    securityGraphics.fillStyle(0xcc0000, 1);
    securityGraphics.fillCircle(16, 16, 14);
    // Helmet visor
    securityGraphics.fillStyle(0x000000, 0.8);
    securityGraphics.fillRect(8, 10, 16, 6);
    // Badge
    securityGraphics.fillStyle(0xffaa00, 1);
    securityGraphics.fillRect(12, 18, 8, 6);
    securityGraphics.generateTexture('security', 32, 32);
    
    // Create interaction indicator icons
    const indicatorTypes = [
      { name: 'indicator_talk', color: 0x00aaff },
      { name: 'indicator_quest', color: 0xffaa00 },
      { name: 'indicator_shop', color: 0x66ff66 },
      { name: 'indicator_warning', color: 0xff6666 }
    ];
    
    indicatorTypes.forEach(indicator => {
      const indicatorGraphics = this.make.graphics({ x: 0, y: 0 }, false);
      // Background bubble with glow
      indicatorGraphics.fillStyle(indicator.color, 0.2);
      indicatorGraphics.fillCircle(12, 12, 12);
      indicatorGraphics.fillStyle(indicator.color, 0.4);
      indicatorGraphics.fillCircle(12, 12, 10);
      indicatorGraphics.fillStyle(indicator.color, 0.9);
      indicatorGraphics.fillCircle(12, 12, 8);
      // Symbol in center
      indicatorGraphics.fillStyle(0xffffff, 1);
      if (indicator.name === 'indicator_talk') {
        indicatorGraphics.fillRect(8, 10, 8, 6);
        indicatorGraphics.fillPolygon([6, 16, 10, 16, 8, 20]);
      } else if (indicator.name === 'indicator_quest') {
        indicatorGraphics.fillRect(11, 7, 2, 8);
        indicatorGraphics.fillCircle(12, 17, 1.5);
      } else if (indicator.name === 'indicator_shop') {
        indicatorGraphics.fillRect(8, 10, 8, 1);
        indicatorGraphics.fillRect(9, 11, 6, 5);
      } else {
        indicatorGraphics.fillPolygon([12, 7, 8, 15, 16, 15]);
        indicatorGraphics.fillCircle(12, 17, 1);
      }
      indicatorGraphics.generateTexture(indicator.name, 24, 24);
    });
    
    console.log('[BootScene] Enhanced assets created successfully');
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