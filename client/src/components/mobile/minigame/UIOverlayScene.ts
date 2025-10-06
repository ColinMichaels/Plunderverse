import Phaser from 'phaser';
import { DialogueChoice } from './NPCDialogueSystem';
import { NPCMission } from './NPCMissionSystem';

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
  
  // Enhanced dialogue system
  private enhancedDialogueBox!: Phaser.GameObjects.Container;
  private npcNameText!: Phaser.GameObjects.Text;
  private dialogueChoices: Phaser.GameObjects.Container[] = [];
  private currentChoices: DialogueChoice[] = [];
  
  // Mission tracking
  private missionTracker!: Phaser.GameObjects.Container;
  private activeMissions: NPCMission[] = [];
  private missionTexts: Phaser.GameObjects.Text[] = [];
  
  // Reputation display
  private reputationDisplay!: Phaser.GameObjects.Container;
  private repTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  
  private currentHealth: number = 100;
  private maxHealth: number = 100;
  private currentCredits: number = 0;
  private miniMapGraphics?: Phaser.GameObjects.Graphics;
  private playerIndicator?: Phaser.GameObjects.Graphics;

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
    this.createEnhancedDialogueBox();
    this.createMissionTracker();
    this.createReputationDisplay();
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
    
    // Enhanced dialogue events
    mainScene.events.on('showEnhancedDialogue', (data: any) => {
      this.showEnhancedDialogue(data);
    });
    
    // Mission events
    mainScene.events.on('missionAccepted', (mission: NPCMission) => {
      this.addMissionToTracker(mission);
    });
    
    mainScene.events.on('missionProgress', (missionId: string, progress: number) => {
      this.updateMissionProgress(missionId, progress);
    });
    
    mainScene.events.on('missionCompleted', (mission: NPCMission) => {
      this.removeMissionFromTracker(mission.id);
      this.showNotification(`Mission Complete: ${mission.title}!`, 0x00ff00);
    });
    
    mainScene.events.on('missionFailed', (mission: NPCMission) => {
      this.removeMissionFromTracker(mission.id);
      this.showNotification(`Mission Failed: ${mission.title}`, 0xff0000);
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
  
  private createEnhancedDialogueBox(): void {
    const width = this.cameras.main.width - 40;
    const height = 180;
    const x = this.cameras.main.width / 2;
    const y = this.cameras.main.height - height / 2 - 20;
    
    // Create enhanced dialogue container
    this.enhancedDialogueBox = this.add.container(x, y);
    
    // Background with gradient
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.95);
    bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
    bg.lineStyle(3, 0x00ffff, 1);
    bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
    
    // NPC Name
    this.npcNameText = this.add.text(-width/2 + 20, -height/2 + 10, '', {
      fontSize: '20px',
      color: '#00ffff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    });
    
    // Dialogue text
    const dialogueText = this.add.text(0, -30, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'left',
      wordWrap: { width: width - 60 }
    }).setOrigin(0.5);
    
    this.enhancedDialogueBox.add([bg, this.npcNameText, dialogueText]);
    this.enhancedDialogueBox.setVisible(false);
    
    // Store reference to dialogue text
    this.enhancedDialogueBox.setData('dialogueText', dialogueText);
  }
  
  private showEnhancedDialogue(data: any): void {
    const { npcId, npcName, text, choices } = data;
    
    // Hide simple dialogue box
    if (this.dialogueBox) {
      this.dialogueBox.setVisible(false);
    }
    
    // Show enhanced dialogue
    this.enhancedDialogueBox.setVisible(true);
    
    // Update NPC name
    this.npcNameText.setText(npcName);
    
    // Update dialogue text
    const dialogueText = this.enhancedDialogueBox.getData('dialogueText');
    if (dialogueText) {
      dialogueText.setText(text);
    }
    
    // Clear existing choices
    this.dialogueChoices.forEach(choice => choice.destroy());
    this.dialogueChoices = [];
    this.currentChoices = choices || [];
    
    // Create choice buttons
    if (choices && choices.length > 0) {
      const choiceStartY = 40;
      const choiceSpacing = 35;
      
      choices.forEach((choice: DialogueChoice, index: number) => {
        const choiceContainer = this.createChoiceButton(
          0,
          choiceStartY + index * choiceSpacing,
          choice
        );
        this.enhancedDialogueBox.add(choiceContainer);
        this.dialogueChoices.push(choiceContainer);
      });
    } else {
      // No choices - add continue button
      const continueBtn = this.createContinueButton(0, 60);
      this.enhancedDialogueBox.add(continueBtn);
      this.dialogueChoices.push(continueBtn);
    }
  }
  
  private createChoiceButton(x: number, y: number, choice: DialogueChoice): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = this.cameras.main.width - 80;
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x003366, 0.8);
    bg.fillRoundedRect(-width/2, -15, width, 30, 5);
    bg.lineStyle(2, 0x0099ff, 1);
    bg.strokeRoundedRect(-width/2, -15, width, 30, 5);
    
    // Choice text
    const text = this.add.text(0, 0, `${choice.text}`, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Make interactive
    bg.setInteractive(new Phaser.Geom.Rectangle(-width/2, -15, width, 30), Phaser.Geom.Rectangle.Contains);
    
    bg.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x0066cc, 0.9);
      bg.fillRoundedRect(-width/2, -15, width, 30, 5);
      bg.lineStyle(2, 0x00ffff, 1);
      bg.strokeRoundedRect(-width/2, -15, width, 30, 5);
      text.setColor('#00ffff');
    });
    
    bg.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x003366, 0.8);
      bg.fillRoundedRect(-width/2, -15, width, 30, 5);
      bg.lineStyle(2, 0x0099ff, 1);
      bg.strokeRoundedRect(-width/2, -15, width, 30, 5);
      text.setColor('#ffffff');
    });
    
    bg.on('pointerdown', () => {
      this.selectDialogueChoice(choice.id);
    });
    
    container.add([bg, text]);
    return container;
  }
  
  private createContinueButton(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const width = 120;
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x006600, 0.8);
    bg.fillRoundedRect(-width/2, -15, width, 30, 5);
    bg.lineStyle(2, 0x00ff00, 1);
    bg.strokeRoundedRect(-width/2, -15, width, 30, 5);
    
    // Text
    const text = this.add.text(0, 0, 'Continue', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5);
    
    // Make interactive
    bg.setInteractive(new Phaser.Geom.Rectangle(-width/2, -15, width, 30), Phaser.Geom.Rectangle.Contains);
    
    bg.on('pointerdown', () => {
      this.hideEnhancedDialogue();
    });
    
    container.add([bg, text]);
    return container;
  }
  
  private selectDialogueChoice(choiceId: string): void {
    // Send choice to main scene
    const mainScene = this.scene.get('MainGameScene');
    mainScene.events.emit('dialogueChoiceSelected', choiceId);
  }
  
  private hideEnhancedDialogue(): void {
    this.enhancedDialogueBox.setVisible(false);
    this.dialogueChoices.forEach(choice => choice.destroy());
    this.dialogueChoices = [];
    
    // Notify main scene
    const mainScene = this.scene.get('MainGameScene');
    mainScene.events.emit('dialogueEnded');
  }
  
  private createMissionTracker(): void {
    const x = 20;
    const y = 60;
    const width = 250;
    const maxHeight = 200;
    
    this.missionTracker = this.add.container(x, y);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, width, maxHeight, 5);
    bg.lineStyle(2, 0xffaa00, 0.8);
    bg.strokeRoundedRect(0, 0, width, maxHeight, 5);
    
    // Title
    const title = this.add.text(width / 2, 10, 'Active Missions', {
      fontSize: '16px',
      color: '#ffaa00',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    
    this.missionTracker.add([bg, title]);
    this.missionTracker.setVisible(false);
  }
  
  private addMissionToTracker(mission: NPCMission): void {
    if (!this.activeMissions.find(m => m.id === mission.id)) {
      this.activeMissions.push(mission);
      this.updateMissionDisplay();
    }
  }
  
  private updateMissionDisplay(): void {
    // Clear existing mission texts
    this.missionTexts.forEach(text => text.destroy());
    this.missionTexts = [];
    
    if (this.activeMissions.length === 0) {
      this.missionTracker.setVisible(false);
      return;
    }
    
    this.missionTracker.setVisible(true);
    
    // Display each mission
    const startY = 35;
    const spacing = 40;
    
    this.activeMissions.forEach((mission, index) => {
      const missionText = this.add.text(10, startY + index * spacing, 
        `• ${mission.title}\n  ${mission.objectives.filter(o => !o.isCompleted).length} objectives remaining`, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: 230 }
      });
      
      // Progress bar
      const progressBar = this.add.graphics();
      const barY = startY + index * spacing + 25;
      progressBar.fillStyle(0x333333, 1);
      progressBar.fillRect(10, barY, 230, 5);
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(10, barY, 230 * (mission.progress / 100), 5);
      
      this.missionTracker.add([missionText, progressBar]);
      this.missionTexts.push(missionText);
    });
  }
  
  private updateMissionProgress(missionId: string, progress: number): void {
    const mission = this.activeMissions.find(m => m.id === missionId);
    if (mission) {
      mission.progress = progress;
      this.updateMissionDisplay();
    }
  }
  
  private removeMissionFromTracker(missionId: string): void {
    this.activeMissions = this.activeMissions.filter(m => m.id !== missionId);
    this.updateMissionDisplay();
  }
  
  private createReputationDisplay(): void {
    const x = this.cameras.main.width - 150;
    const y = 60;
    
    this.reputationDisplay = this.add.container(x, y);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, 130, 100, 5);
    bg.lineStyle(2, 0x9966ff, 0.8);
    bg.strokeRoundedRect(0, 0, 130, 100, 5);
    
    // Title
    const title = this.add.text(65, 5, 'Reputation', {
      fontSize: '14px',
      color: '#9966ff',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);
    
    // Faction reputations
    const factions = ['Corp', 'Indie', 'Outlaw'];
    const colors = ['#0099ff', '#00ff99', '#ff6600'];
    
    factions.forEach((faction, index) => {
      const y = 25 + index * 22;
      const text = this.add.text(10, y, `${faction}: 0`, {
        fontSize: '12px',
        color: colors[index],
        fontFamily: 'Arial'
      });
      this.repTexts.set(faction, text);
    });
    
    this.reputationDisplay.add([bg, title, ...Array.from(this.repTexts.values())]);
  }
  
  private showNotification(message: string, color: number = 0xffffff): void {
    if (!this.notificationText) return;
    
    this.notificationText.setText(message);
    this.notificationText.setColor(`#${color.toString(16).padStart(6, '0')}`);
    this.notificationText.setVisible(true);
    
    // Fade out after 3 seconds
    this.tweens.add({
      targets: this.notificationText,
      alpha: 0,
      duration: 1000,
      delay: 2000,
      onComplete: () => {
        this.notificationText.setVisible(false);
        this.notificationText.setAlpha(1);
      }
    });
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


  private createMiniMap(): void {
    const mapSize = 180;
    const x = this.cameras.main.width - 20;
    const y = this.cameras.main.height - 20;
    
    // Mini-map background
    const mapBg = this.add.rectangle(x - mapSize, y - mapSize, mapSize, mapSize, 0x000000, 0.8)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffaa00);
    mapBg.setDepth(90);
    
    // Mini-map title
    const mapTitle = this.add.text(x - mapSize / 2, y - mapSize - 5, 'STATION MAP', {
      fontSize: '12px',
      color: '#ffaa00',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 1);
    mapTitle.setDepth(91);
    
    // Create map graphics container
    this.miniMapGraphics = this.add.graphics();
    this.miniMapGraphics.setDepth(92);
    
    // Create player indicator
    this.playerIndicator = this.add.graphics();
    this.playerIndicator.setDepth(93);
    
    // Store map position for updates
    this.mapX = x - mapSize;
    this.mapY = y - mapSize;
    this.mapSize = mapSize;
    
    // Listen for map updates from MainGameScene
    const mainScene = this.scene.get('MainGameScene');
    mainScene.events.on('updateMiniMap', (mapData: any) => {
      this.updateMiniMapDisplay(mapData);
    });
    
    mainScene.events.on('roomDiscovered', (roomName: string) => {
      this.showNotification(`New Area Discovered: ${roomName}`, '#00ffff');
    });
  }
  
  private mapX: number = 0;
  private mapY: number = 0;
  private mapSize: number = 0;
  
  private updateMiniMapDisplay(mapData: any): void {
    if (!this.miniMapGraphics || !this.playerIndicator) return;
    
    this.miniMapGraphics.clear();
    this.playerIndicator.clear();
    
    // Calculate scale to fit station in mini-map
    const stationWidth = 3200;
    const stationHeight = 2400;
    const scale = Math.min(this.mapSize / stationWidth, this.mapSize / stationHeight) * 0.9;
    
    // Draw rooms
    if (mapData.rooms) {
      mapData.rooms.forEach((room: any) => {
        const roomX = this.mapX + (room.x * scale) + 10;
        const roomY = this.mapY + (room.y * scale) + 10;
        const roomWidth = room.width * scale;
        const roomHeight = room.height * scale;
        
        // Check if room is explored
        const isExplored = mapData.exploredRooms.includes(room.id);
        const isCurrent = mapData.currentRoom === room.id;
        
        if (isExplored) {
          // Draw explored room
          this.miniMapGraphics.fillStyle(isCurrent ? 0xffaa00 : 0x334455, isCurrent ? 0.6 : 0.4);
          this.miniMapGraphics.fillRect(roomX, roomY, roomWidth, roomHeight);
          this.miniMapGraphics.lineStyle(1, isCurrent ? 0xffaa00 : 0x556677, 0.8);
          this.miniMapGraphics.strokeRect(roomX, roomY, roomWidth, roomHeight);
        } else {
          // Draw unexplored room (darker)
          this.miniMapGraphics.fillStyle(0x111111, 0.2);
          this.miniMapGraphics.fillRect(roomX, roomY, roomWidth, roomHeight);
        }
      });
    }
    
    // Draw player position
    if (mapData.playerPos) {
      const playerX = this.mapX + (mapData.playerPos.x * scale) + 10;
      const playerY = this.mapY + (mapData.playerPos.y * scale) + 10;
      
      // Pulsing player dot
      this.playerIndicator.fillStyle(0x00ff00, 1);
      this.playerIndicator.fillCircle(playerX, playerY, 3);
      this.playerIndicator.lineStyle(1, 0x00ff00, 0.5);
      this.playerIndicator.strokeCircle(playerX, playerY, 6);
    }
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