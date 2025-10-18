import Phaser from 'phaser';

/**
 * VisualEffectsSystem - Handles all visual effects for the mini-game
 * Including particles, lighting, animations, and environmental effects
 */
export class VisualEffectsSystem {
  private scene: Phaser.Scene;
  private particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  private lightLayer!: Phaser.GameObjects.Layer;
  private ambientLights: Phaser.GameObjects.Light[] = [];
  private animatedObjects: Map<string, Phaser.Tweens.Tween> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializeLighting();
    this.initializeParticles();
  }
  
  private initializeLighting(): void {
    // Create a light layer for dynamic lighting
    this.lightLayer = this.scene.add.layer();
    this.lightLayer.setDepth(999);
    
    // Enable lights system
    this.scene.lights.enable();
    this.scene.lights.setAmbientColor(0x222233);
  }
  
  private initializeParticles(): void {
    // Create particle emitters for different effects
    
    // Spark particles for terminals and machinery
    const sparkEmitter = this.scene.add.particles(0, 0, 'particle_spark', {
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      quantity: 2,
      frequency: 100,
      alpha: { start: 0.8, end: 0 }
    });
    sparkEmitter.stop();
    this.particleEmitters.set('spark', sparkEmitter);
    
    // Steam particles for vents
    const steamEmitter = this.scene.add.particles(0, 0, 'particle_steam', {
      speed: { min: 20, max: 40 },
      scale: { start: 0.5, end: 1.5 },
      blendMode: 'NORMAL',
      lifespan: 2000,
      quantity: 1,
      frequency: 200,
      alpha: { start: 0.4, end: 0 },
      angle: { min: -30, max: 30 },
      gravityY: -50
    });
    steamEmitter.stop();
    this.particleEmitters.set('steam', steamEmitter);
    
    // Dust particles for atmosphere
    const dustEmitter = this.scene.add.particles(0, 0, 'particle_dust', {
      speed: { min: 5, max: 15 },
      scale: { start: 0.8, end: 1.2 },
      blendMode: 'NORMAL',
      lifespan: 5000,
      quantity: 1,
      frequency: 500,
      alpha: { start: 0.3, end: 0 },
      x: { min: -400, max: 400 },
      y: { min: -300, max: 300 }
    });
    this.particleEmitters.set('dust', dustEmitter);
    
    // Glow particles for collectibles
    const glowEmitter = this.scene.add.particles(0, 0, 'particle_glow', {
      speed: { min: 10, max: 30 },
      scale: { start: 0.8, end: 0.2 },
      blendMode: 'ADD',
      lifespan: 1000,
      quantity: 1,
      frequency: 100,
      alpha: { start: 0.6, end: 0 },
      tint: 0xffaa00
    });
    glowEmitter.stop();
    this.particleEmitters.set('glow', glowEmitter);
  }
  
  /**
   * Create animated floor tiles with subtle glow patterns
   */
  public createAnimatedFloor(x: number, y: number, width: number, height: number, roomType: string): void {
    const tileSize = 64;
    const tilesX = Math.floor(width / tileSize);
    const tilesY = Math.floor(height / tileSize);
    
    for (let tx = 0; tx < tilesX; tx++) {
      for (let ty = 0; ty < tilesY; ty++) {
        const tileX = x + tx * tileSize + tileSize / 2;
        const tileY = y + ty * tileSize + tileSize / 2;
        
        // Use different tile variations
        const tileVariant = Math.floor(Math.random() * 4);
        const tile = this.scene.add.sprite(tileX, tileY, `floor_tile_${tileVariant}`);
        tile.setDepth(0);
        tile.setPipeline('Light2D');
        
        // Add subtle animation to certain tiles
        if (Math.random() < 0.1) {
          this.scene.tweens.add({
            targets: tile,
            alpha: { from: 0.8, to: 1 },
            duration: 2000 + Math.random() * 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
          });
        }
      }
    }
  }
  
  /**
   * Add room-specific lighting
   */
  public addRoomLighting(room: any): void {
    switch (room.type) {
      case 'docking':
        // Bright overhead lights
        this.addLight(room.x + room.width / 2, room.y + 100, 200, 0xffcc00, 1.5);
        this.addLight(room.x + room.width / 2, room.y + room.height - 100, 200, 0xffcc00, 1.5);
        break;
        
      case 'market':
        // Colorful market stall lights
        for (let i = 0; i < 4; i++) {
          const lightX = room.x + 150 + i * 120;
          const lightY = room.y + 150;
          const colors = [0xff9900, 0x00ff99, 0x9900ff, 0xffff00];
          this.addLight(lightX, lightY, 100, colors[i], 1.2);
        }
        break;
        
      case 'cantina':
        // Moody bar lighting
        this.addLight(room.x + room.width / 2, room.y + 100, 150, 0xff6600, 0.8);
        // Table lights
        for (let i = 0; i < 4; i++) {
          const tableX = room.x + 150 + (i % 2) * 300;
          const tableY = room.y + 200 + Math.floor(i / 2) * 150;
          this.addLight(tableX, tableY, 80, 0xffaa00, 0.6);
        }
        break;
        
      case 'engineering':
        // Industrial lighting with flicker
        for (let i = 0; i < 3; i++) {
          const lightX = room.x + 200 + i * 200;
          const lightY = room.y + room.height / 2;
          const light = this.addLight(lightX, lightY, 120, 0x00aaff, 1);
          // Add flicker effect
          this.createFlickerEffect(light);
        }
        break;
        
      case 'cargo':
        // Dim warehouse lighting
        this.addLight(room.x + room.width / 2, room.y + room.height / 2, 250, 0x888888, 0.6);
        break;
        
      case 'corridor':
        // Emergency lighting strips
        for (let i = 0; i < 3; i++) {
          const lightX = room.x + (room.width / 3) * (i + 0.5);
          const lightY = room.y + room.height / 2;
          this.addLight(lightX, lightY, 80, 0xff9900, 0.7);
        }
        break;
    }
  }
  
  /**
   * Add a dynamic light source
   */
  public addLight(x: number, y: number, radius: number, color: number, intensity: number): Phaser.GameObjects.Light {
    const light = this.scene.lights.addLight(x, y, radius, color, intensity);
    this.ambientLights.push(light);
    return light;
  }
  
  /**
   * Create a flickering light effect
   */
  private createFlickerEffect(light: Phaser.GameObjects.Light): void {
    const originalIntensity = light.intensity;
    this.scene.tweens.add({
      targets: light,
      intensity: { from: originalIntensity, to: originalIntensity * 0.6 },
      duration: 100 + Math.random() * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Stepped',
      repeatDelay: Math.random() * 2000
    });
  }
  
  /**
   * Add steam effect to vents
   */
  public addSteamVent(x: number, y: number): void {
    const steamEmitter = this.particleEmitters.get('steam');
    if (steamEmitter) {
      steamEmitter.setPosition(x, y);
      steamEmitter.start();
    }
  }
  
  /**
   * Add spark effect to machinery
   */
  public addSparkEffect(x: number, y: number): void {
    const sparkEmitter = this.particleEmitters.get('spark');
    if (sparkEmitter) {
      const emitterInstance = sparkEmitter.setPosition(x, y);
      emitterInstance.start();
      
      // Stop after a short burst
      this.scene.time.delayedCall(500, () => {
        emitterInstance.stop();
      });
    }
  }
  
  /**
   * Create collectible pickup effect
   */
  public createPickupEffect(x: number, y: number, type: 'credit' | 'health'): void {
    // Create expanding circle effect
    const circle = this.scene.add.circle(x, y, 10, type === 'credit' ? 0xffff00 : 0xff0000, 0.6);
    circle.setDepth(100);
    
    this.scene.tweens.add({
      targets: circle,
      scale: { from: 1, to: 3 },
      alpha: { from: 0.6, to: 0 },
      duration: 500,
      ease: 'Cubic.out',
      onComplete: () => circle.destroy()
    });
    
    // Add particle burst
    const glowEmitter = this.particleEmitters.get('glow');
    if (glowEmitter) {
      glowEmitter.setPosition(x, y);
      glowEmitter.explode(10);
    }
  }
  
  /**
   * Create interaction indicator animation
   */
  public createInteractionIndicator(target: Phaser.GameObjects.Sprite, type: string): Phaser.GameObjects.Sprite {
    const indicator = this.scene.add.sprite(
      target.x, 
      target.y - 30, 
      `indicator_${type}`
    );
    indicator.setDepth(target.depth + 1);
    
    // Bobbing animation
    this.scene.tweens.add({
      targets: indicator,
      y: indicator.y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
    
    // Pulse effect
    this.scene.tweens.add({
      targets: indicator,
      scale: { from: 1, to: 1.2 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
    
    return indicator;
  }
  
  /**
   * Create door opening animation
   */
  public animateDoorOpen(door: Phaser.GameObjects.Rectangle, callback?: () => void): void {
    // Split door animation
    this.scene.tweens.add({
      targets: door,
      scaleX: 0.1,
      duration: 500,
      ease: 'Power2',
      onComplete: callback
    });
    
    // Add opening sound effect placeholder
    // this.scene.sound.play('door_open');
  }
  
  /**
   * Create character walking animation
   */
  public createWalkingAnimation(sprite: Phaser.GameObjects.Sprite, direction: string): void {
    // Simple bobbing effect for walking
    const originalY = sprite.y;
    
    if (this.animatedObjects.has(`walk_${sprite.getData('id')}`)) {
      return; // Already animating
    }
    
    const walkTween = this.scene.tweens.add({
      targets: sprite,
      y: originalY - 2,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Linear'
    });
    
    this.animatedObjects.set(`walk_${sprite.getData('id')}`, walkTween);
  }
  
  /**
   * Stop character walking animation
   */
  public stopWalkingAnimation(sprite: Phaser.GameObjects.Sprite): void {
    const walkKey = `walk_${sprite.getData('id')}`;
    const walkTween = this.animatedObjects.get(walkKey);
    
    if (walkTween) {
      walkTween.stop();
      this.animatedObjects.delete(walkKey);
      // Reset to original position
      sprite.y = Math.round(sprite.y);
    }
  }
  
  /**
   * Create teleport effect for fast travel
   */
  public createTeleportEffect(x: number, y: number, isArrival: boolean): void {
    // Create particle spiral
    const particles = this.scene.add.particles(x, y, 'particle_glow', {
      speed: { min: 100, max: 200 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      quantity: 20,
      alpha: { start: 1, end: 0 },
      tint: 0x00ffff,
      angle: { min: 0, max: 360 },
      rotate: { min: 0, max: 360 }
    });
    
    if (isArrival) {
      particles.setScale(0);
      this.scene.tweens.add({
        targets: particles,
        scale: 1,
        duration: 500,
        ease: 'Back.out'
      });
    } else {
      this.scene.tweens.add({
        targets: particles,
        scale: 0,
        duration: 500,
        ease: 'Back.in'
      });
    }
    
    // Clean up after animation
    this.scene.time.delayedCall(1500, () => {
      particles.destroy();
    });
  }
  
  /**
   * Create environmental atmosphere
   */
  public createAtmosphere(width: number, height: number): void {
    // Add floating dust particles throughout the station
    const dustEmitter = this.particleEmitters.get('dust');
    if (dustEmitter) {
      dustEmitter.setPosition(width / 2, height / 2);
      dustEmitter.start();
    }
  }
  
  /**
   * Create damage feedback effect
   */
  public createDamageEffect(target: Phaser.GameObjects.Sprite): void {
    // Flash red
    this.scene.tweens.add({
      targets: target,
      tint: { from: 0xffffff, to: 0xff0000 },
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        target.clearTint();
      }
    });
    
    // Shake effect
    const originalX = target.x;
    this.scene.tweens.add({
      targets: target,
      x: { from: originalX - 5, to: originalX + 5 },
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        target.x = originalX;
      }
    });
  }
  
  /**
   * Clean up all effects
   */
  public destroy(): void {
    // Stop all particle emitters
    this.particleEmitters.forEach(emitter => emitter.destroy());
    this.particleEmitters.clear();
    
    // Stop all animations
    this.animatedObjects.forEach(tween => tween.stop());
    this.animatedObjects.clear();
    
    // Remove lights
    this.ambientLights.forEach(light => this.scene.lights.removeLight(light));
    this.ambientLights = [];
  }
}