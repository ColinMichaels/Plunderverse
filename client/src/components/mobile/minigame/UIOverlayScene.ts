import Phaser from 'phaser';

/**
 * UIOverlayScene - HUD and UI elements overlay for the mini-game
 */
export class UIOverlayScene extends Phaser.Scene {
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private creditsText!: Phaser.GameObjects.Text;
  private dialogueBox!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private notificationText!: Phaser.GameObjects.Text;
  
  private currentHealth: number = 100;
  private maxHealth: number = 100;
  private currentCredits: number = 0;

  constructor() {
    super({ key: 'UIOverlayScene' });
  }

  create(): void {
    console.log('[UIOverlayScene] Creating UI overlay...');
    
    // Get initial player data from registry
    const playerData = this.registry.get('playerData');
    if (playerData) {
      this.currentCredits = playerData.credits || 0;
    }
    
    // Create HUD elements
    this.createHealthBar();
    this.createCreditsDisplay();
    this.createDialogueBox();
    this.createNotificationArea();
    this.createMiniMap();
    
    // Listen for game events from MainGameScene
    const mainScene = this.scene.get('MainGameScene');
    
    mainScene.events.on('creditsCollected', (amount: number) => {
      this.addCredits(amount);
    });
    
    mainScene.events.on('healthCollected', (amount: number) => {
      this.addHealth(amount);
    });
    
    mainScene.events.on('showDialogue', (text: string) => {
      this.showDialogue(text);
    });
    
    mainScene.events.on('terminalInteraction', () => {
      this.showTerminalMenu();
    });
    
    // Listen for registry updates (from React)
    this.registry.events.on('changedata-playerData', (parent: any, value: any) => {
      if (value && value.credits !== undefined) {
        this.currentCredits = value.credits;
        this.updateCreditsDisplay();
      }
    });
  }

  private createHealthBar(): void {
    const x = 20;
    const y = 20;
    const width = 200;
    const height = 20;
    
    // Health bar background
    this.add.rectangle(x, y, width + 4, height + 4, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x00ffff);
    
    // Health bar fill
    this.healthBar = this.add.graphics();
    this.updateHealthBar();
    
    // Health text
    this.healthText = this.add.text(x + width / 2, y + height / 2, `${this.currentHealth}/${this.maxHealth}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Health icon
    this.add.text(x - 5, y + height / 2, '❤️', {
      fontSize: '16px'
    }).setOrigin(1, 0.5);
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    
    const x = 22;
    const y = 22;
    const width = 196;
    const height = 16;
    
    // Calculate health percentage
    const healthPercent = this.currentHealth / this.maxHealth;
    const fillWidth = width * healthPercent;
    
    // Choose color based on health level
    let color = 0x00ff00; // Green
    if (healthPercent < 0.3) {
      color = 0xff0000; // Red
    } else if (healthPercent < 0.6) {
      color = 0xffaa00; // Orange
    }
    
    // Draw health bar
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(x, y, fillWidth, height);
    
    // Update health text
    if (this.healthText) {
      this.healthText.setText(`${Math.round(this.currentHealth)}/${this.maxHealth}`);
    }
  }

  private createCreditsDisplay(): void {
    const x = this.cameras.main.width - 20;
    const y = 20;
    
    // Credits background
    this.add.rectangle(x - 100, y, 180, 30, 0x000000, 0.7)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0xffaa00);
    
    // Credits icon
    this.add.text(x - 170, y + 15, '💰', {
      fontSize: '16px'
    }).setOrigin(0.5);
    
    // Credits text
    this.creditsText = this.add.text(x - 100, y + 15, `Credits: ${this.currentCredits.toLocaleString()}`, {
      fontSize: '16px',
      color: '#ffaa00',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
  }

  private updateCreditsDisplay(): void {
    if (this.creditsText) {
      this.creditsText.setText(`Credits: ${this.currentCredits.toLocaleString()}`);
    }
  }

  private createDialogueBox(): void {
    const width = this.cameras.main.width - 40;
    const height = 120;
    const x = this.cameras.main.width / 2;
    const y = this.cameras.main.height - height / 2 - 20;
    
    // Create dialogue container (initially hidden)
    this.dialogueBox = this.add.container(x, y);
    
    // Background
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.9)
      .setStrokeStyle(3, 0x00ffff);
    
    // Text
    this.dialogueText = this.add.text(0, 0, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center',
      wordWrap: { width: width - 40 }
    }).setOrigin(0.5);
    
    // Close button
    const closeBtn = this.add.text(width / 2 - 20, -height / 2 + 20, '✖', {
      fontSize: '20px',
      color: '#ff0000'
    }).setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => this.hideDialogue());
    
    this.dialogueBox.add([bg, this.dialogueText, closeBtn]);
    this.dialogueBox.setVisible(false);
  }

  private showDialogue(text: string): void {
    this.dialogueText.setText(text);
    this.dialogueBox.setVisible(true);
    
    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      this.hideDialogue();
    });
  }

  private hideDialogue(): void {
    this.dialogueBox.setVisible(false);
  }

  private createNotificationArea(): void {
    const x = this.cameras.main.width / 2;
    const y = 100;
    
    this.notificationText = this.add.text(x, y, '', {
      fontSize: '20px',
      color: '#00ffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
  }

  private showNotification(text: string, color: string = '#00ffff'): void {
    this.notificationText.setText(text);
    this.notificationText.setColor(color);
    
    // Animate notification
    this.tweens.add({
      targets: this.notificationText,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: 'Back.out',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: this.notificationText,
            alpha: 0,
            duration: 300
          });
        });
      }
    });
  }

  private createMiniMap(): void {
    const size = 150;
    const x = this.cameras.main.width - 20;
    const y = this.cameras.main.height - 20;
    
    // Mini-map background
    const mapBg = this.add.rectangle(x - size, y - size, size, size, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x00ffff);
    
    // Mini-map title
    this.add.text(x - size / 2, y - size - 5, 'STATION MAP', {
      fontSize: '10px',
      color: '#00ffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5, 1);
    
    // Simple map dots (placeholder)
    const mapGraphics = this.add.graphics();
    mapGraphics.fillStyle(0x00ff00, 1);
    mapGraphics.fillCircle(x - size / 2, y - size / 2, 3); // Player position
    
    // Add some static points of interest
    mapGraphics.fillStyle(0xffaa00, 0.5);
    mapGraphics.fillCircle(x - size * 0.3, y - size * 0.3, 2);
    mapGraphics.fillCircle(x - size * 0.7, y - size * 0.3, 2);
    mapGraphics.fillCircle(x - size * 0.5, y - size * 0.5, 2);
  }

  private showTerminalMenu(): void {
    const options = [
      '📋 View Missions',
      '🛒 Trade Goods',
      '⚙️ Upgrade Ship',
      '💾 Save Game',
      '❌ Close'
    ];
    
    const menu = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    
    // Menu background
    const bg = this.add.rectangle(0, 0, 300, 250, 0x001122, 0.95)
      .setStrokeStyle(3, 0x00aaff);
    
    menu.add(bg);
    
    // Menu title
    const title = this.add.text(0, -100, '🖥️ TERMINAL ACCESS', {
      fontSize: '20px',
      color: '#00aaff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    menu.add(title);
    
    // Menu options
    options.forEach((option, index) => {
      const y = -50 + (index * 35);
      const optionText = this.add.text(0, y, option, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0.5)
        .setInteractive()
        .on('pointerover', () => optionText.setColor('#00ffff'))
        .on('pointerout', () => optionText.setColor('#ffffff'))
        .on('pointerdown', () => {
          this.handleTerminalOption(index);
          menu.destroy();
        });
      
      menu.add(optionText);
    });
  }

  private handleTerminalOption(index: number): void {
    switch (index) {
      case 0:
        this.showNotification('📋 Mission Board: No new missions available', '#ffaa00');
        break;
      case 1:
        this.showNotification('🛒 Trading: Feature coming soon!', '#00ff00');
        break;
      case 2:
        this.showNotification('⚙️ Upgrades: Visit the main station', '#00aaff');
        break;
      case 3:
        this.showNotification('💾 Game Saved!', '#00ff00');
        // Here you would emit an event to save the game
        this.events.emit('saveGame');
        break;
      case 4:
        // Close - do nothing
        break;
    }
  }

  private addCredits(amount: number): void {
    this.currentCredits += amount;
    this.updateCreditsDisplay();
    this.showNotification(`+${amount} Credits!`, '#ffaa00');
    
    // Emit event to update React state
    this.events.emit('creditsUpdated', this.currentCredits);
  }

  private addHealth(amount: number): void {
    this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
    this.updateHealthBar();
    this.showNotification(`+${amount} Health!`, '#00ff00');
  }
}