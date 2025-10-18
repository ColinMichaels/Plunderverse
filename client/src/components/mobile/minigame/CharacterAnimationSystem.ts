import Phaser from 'phaser';

/**
 * CharacterAnimationSystem - Handles character sprite animations
 */
export class CharacterAnimationSystem {
  private scene: Phaser.Scene;
  private characterStates: Map<string, CharacterState> = new Map();
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * Initialize a character with animations
   */
  public initializeCharacter(
    sprite: Phaser.Physics.Arcade.Sprite,
    characterType: 'player' | 'npc' | 'security',
    npcRole?: string
  ): void {
    // Set character data
    sprite.setData('type', characterType);
    sprite.setData('animState', 'idle');
    sprite.setData('direction', 'down');
    
    // Add glow effect based on type
    if (characterType === 'player') {
      sprite.setPipeline('Light2D');
      this.addPlayerGlow(sprite);
    } else if (characterType === 'npc' && npcRole) {
      sprite.setTexture(`npc_${npcRole}`);
    }
    
    // Initialize state
    this.characterStates.set(sprite.getData('id') || `${characterType}_${Date.now()}`, {
      sprite,
      currentAnimation: 'idle',
      direction: 'down',
      isMoving: false,
      moveSpeed: characterType === 'player' ? 160 : 80
    });
    
    // Start idle animation
    this.playIdleAnimation(sprite);
  }
  
  /**
   * Add glow effect to player
   */
  private addPlayerGlow(sprite: Phaser.Physics.Arcade.Sprite): void {
    // Create glow shadow
    const glow = this.scene.add.sprite(sprite.x, sprite.y, 'player');
    glow.setAlpha(0.3);
    glow.setScale(1.2);
    glow.setTint(0x00ffaa);
    glow.setDepth(sprite.depth - 1);
    
    // Link glow to player movement
    sprite.setData('glow', glow);
    
    // Pulse animation for glow
    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.2, to: 0.4 },
      scale: { from: 1.2, to: 1.4 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }
  
  /**
   * Play idle animation
   */
  private playIdleAnimation(sprite: Phaser.Physics.Arcade.Sprite): void {
    // Gentle breathing effect
    this.scene.tweens.add({
      targets: sprite,
      scaleY: { from: 1, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }
  
  /**
   * Update character movement and animation
   */
  public updateCharacterMovement(
    sprite: Phaser.Physics.Arcade.Sprite,
    velocityX: number,
    velocityY: number
  ): void {
    const id = sprite.getData('id');
    const state = this.characterStates.get(id);
    if (!state) return;
    
    const isMoving = Math.abs(velocityX) > 10 || Math.abs(velocityY) > 10;
    
    // Update direction based on velocity
    if (isMoving) {
      let direction = 'down';
      if (Math.abs(velocityX) > Math.abs(velocityY)) {
        direction = velocityX > 0 ? 'right' : 'left';
      } else {
        direction = velocityY > 0 ? 'down' : 'up';
      }
      
      state.direction = direction;
      sprite.setData('direction', direction);
      
      // Flip sprite horizontally for left/right
      sprite.setFlipX(direction === 'left');
      
      // Start walking animation
      if (!state.isMoving) {
        this.startWalkingAnimation(sprite);
        state.isMoving = true;
      }
      
      // Update rotation slightly based on movement
      const targetRotation = velocityX * 0.0001;
      sprite.setRotation(targetRotation);
    } else {
      // Stop walking animation
      if (state.isMoving) {
        this.stopWalkingAnimation(sprite);
        state.isMoving = false;
      }
      sprite.setRotation(0);
    }
    
    // Update glow position if player
    const glow = sprite.getData('glow');
    if (glow) {
      glow.x = sprite.x;
      glow.y = sprite.y;
      glow.setFlipX(sprite.flipX);
    }
  }
  
  /**
   * Start walking animation
   */
  private startWalkingAnimation(sprite: Phaser.Physics.Arcade.Sprite): void {
    // Stop any existing walk animation
    const walkTween = sprite.getData('walkTween');
    if (walkTween) {
      walkTween.stop();
    }
    
    // Create bobbing effect
    const originalScale = sprite.scaleX;
    const newTween = this.scene.tweens.add({
      targets: sprite,
      scaleX: { from: originalScale * 0.95, to: originalScale * 1.05 },
      scaleY: { from: 1.05, to: 0.95 },
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Linear'
    });
    
    sprite.setData('walkTween', newTween);
    
    // Add footstep particles
    this.createFootstepEffect(sprite);
  }
  
  /**
   * Stop walking animation
   */
  private stopWalkingAnimation(sprite: Phaser.Physics.Arcade.Sprite): void {
    const walkTween = sprite.getData('walkTween');
    if (walkTween) {
      walkTween.stop();
      sprite.setData('walkTween', null);
    }
    
    // Reset scale
    sprite.setScale(1);
    
    // Clear footstep timer
    const footstepTimer = sprite.getData('footstepTimer');
    if (footstepTimer) {
      footstepTimer.destroy();
      sprite.setData('footstepTimer', null);
    }
  }
  
  /**
   * Create footstep particle effect
   */
  private createFootstepEffect(sprite: Phaser.Physics.Arcade.Sprite): void {
    // Clear existing timer
    const existingTimer = sprite.getData('footstepTimer');
    if (existingTimer) {
      existingTimer.destroy();
    }
    
    // Create footstep particles periodically
    const timer = this.scene.time.addEvent({
      delay: 400,
      callback: () => {
        if (sprite.getData('animState') === 'walking') {
          const particle = this.scene.add.circle(
            sprite.x + Phaser.Math.Between(-5, 5),
            sprite.y + 16,
            2,
            0x666666,
            0.3
          );
          particle.setDepth(sprite.depth - 2);
          
          this.scene.tweens.add({
            targets: particle,
            alpha: 0,
            duration: 1000,
            onComplete: () => particle.destroy()
          });
        }
      },
      loop: true
    });
    
    sprite.setData('footstepTimer', timer);
  }
  
  /**
   * Play interaction animation
   */
  public playInteractionAnimation(sprite: Phaser.Physics.Arcade.Sprite): void {
    // Bounce effect
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Back.out'
    });
    
    // Create interaction particles
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const particle = this.scene.add.circle(
        sprite.x,
        sprite.y,
        3,
        0x00ffff,
        0.8
      );
      particle.setDepth(sprite.depth + 1);
      
      this.scene.tweens.add({
        targets: particle,
        x: sprite.x + Math.cos(angle) * 30,
        y: sprite.y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  /**
   * Play damage animation
   */
  public playDamageAnimation(sprite: Phaser.Physics.Arcade.Sprite): void {
    // Flash red
    sprite.setTint(0xff0000);
    
    // Knockback effect
    const knockbackX = Phaser.Math.Between(-10, 10);
    const knockbackY = Phaser.Math.Between(-10, 10);
    
    this.scene.tweens.add({
      targets: sprite,
      x: sprite.x + knockbackX,
      y: sprite.y + knockbackY,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        sprite.clearTint();
      }
    });
    
    // Create damage numbers
    const damageText = this.scene.add.text(
      sprite.x,
      sprite.y - 20,
      '-10',
      {
        fontSize: '16px',
        color: '#ff0000',
        fontFamily: 'Arial',
        stroke: '#000000',
        strokeThickness: 2
      }
    );
    damageText.setDepth(1000);
    
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
  }
  
  /**
   * Create speech bubble for NPCs
   */
  public createSpeechBubble(sprite: Phaser.Physics.Arcade.Sprite, text: string): void {
    const bubble = this.scene.add.container(sprite.x, sprite.y - 40);
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, text.length * 8 + 20, 30, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xffaa00);
    
    // Text
    const bubbleText = this.scene.add.text(0, 0, text, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    bubbleText.setOrigin(0.5);
    
    // Tail
    const tail = this.scene.add.triangle(0, 15, 0, 0, -5, 0, 5, 0, 0x000000, 0.8);
    tail.setStrokeStyle(2, 0xffaa00);
    
    bubble.add([bg, bubbleText, tail]);
    bubble.setDepth(sprite.depth + 100);
    
    // Fade in
    bubble.setAlpha(0);
    this.scene.tweens.add({
      targets: bubble,
      alpha: 1,
      duration: 300,
      ease: 'Power2'
    });
    
    // Auto remove after delay
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: 300,
        onComplete: () => bubble.destroy()
      });
    });
  }
  
  /**
   * Clean up
   */
  public destroy(): void {
    this.characterStates.forEach(state => {
      const walkTween = state.sprite.getData('walkTween');
      if (walkTween) {
        walkTween.stop();
      }
      
      const footstepTimer = state.sprite.getData('footstepTimer');
      if (footstepTimer) {
        footstepTimer.destroy();
      }
      
      const glow = state.sprite.getData('glow');
      if (glow) {
        glow.destroy();
      }
    });
    
    this.characterStates.clear();
  }
}

interface CharacterState {
  sprite: Phaser.Physics.Arcade.Sprite;
  currentAnimation: string;
  direction: string;
  isMoving: boolean;
  moveSpeed: number;
}