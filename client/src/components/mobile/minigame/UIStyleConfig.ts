/**
 * UIStyleConfig - Glassmorphism UI styling configuration for the mini-game
 */

// Type definitions
export type MissionType = 'delivery' | 'combat' | 'exploration' | 'smuggling';

export interface Mission {
  type: MissionType;
  title: string;
  progress: number;
  reward: number;
  active?: boolean;
}

export const UIStyles = {
  // Color palette
  colors: {
    primary: 0xffaa00,      // Amber/Orange
    primaryLight: 0xffcc33,
    primaryDark: 0xff8800,
    secondary: 0x00aaff,    // Cyan
    secondaryLight: 0x00ccff,
    secondaryDark: 0x0088cc,
    success: 0x00ff88,
    warning: 0xffaa00,
    danger: 0xff4444,
    dark: 0x1a1a2e,
    light: 0xffffff,
    glass: 0x000000,
    glassOpacity: 0.7
  },
  
  // Text styles
  text: {
    title: {
      fontSize: '24px',
      color: '#ffaa00',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 3,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 5,
        stroke: true,
        fill: true
      }
    },
    subtitle: {
      fontSize: '18px',
      color: '#ffcc33',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 2
    },
    body: {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    },
    button: {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#ff8800',
      strokeThickness: 1
    },
    value: {
      fontSize: '16px',
      color: '#00ffcc',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 1
    }
  },
  
  // Panel configurations
  panels: {
    dialogue: {
      padding: 20,
      cornerRadius: 15,
      borderWidth: 2,
      glowIntensity: 0.5
    },
    hud: {
      padding: 10,
      cornerRadius: 10,
      borderWidth: 1,
      glowIntensity: 0.3
    },
    mission: {
      padding: 15,
      cornerRadius: 12,
      borderWidth: 2,
      glowIntensity: 0.4
    }
  }
};

/**
 * Create glassmorphism panel background
 */
export function createGlassPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  config: typeof UIStyles.panels.dialogue = UIStyles.panels.dialogue
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  
  // Create blur background
  const bgGraphics = scene.add.graphics();
  
  // Glass effect - dark background with transparency
  bgGraphics.fillStyle(UIStyles.colors.glass, UIStyles.colors.glassOpacity);
  bgGraphics.fillRoundedRect(-width/2, -height/2, width, height, config.cornerRadius);
  
  // Inner glow
  bgGraphics.lineStyle(1, UIStyles.colors.primary, 0.3);
  bgGraphics.strokeRoundedRect(-width/2 + 2, -height/2 + 2, width - 4, height - 4, config.cornerRadius - 2);
  
  // Outer border
  bgGraphics.lineStyle(config.borderWidth, UIStyles.colors.primary, config.glowIntensity);
  bgGraphics.strokeRoundedRect(-width/2, -height/2, width, height, config.cornerRadius);
  
  // Add subtle gradient overlay
  const gradient = scene.add.graphics();
  gradient.fillGradientStyle(
    UIStyles.colors.primary, UIStyles.colors.primary, 
    UIStyles.colors.glass, UIStyles.colors.glass,
    0.1, 0.0, 0.0, 0.0
  );
  gradient.fillRoundedRect(-width/2, -height/2, width, height/3, config.cornerRadius);
  
  container.add([bgGraphics, gradient]);
  
  return container;
}

/**
 * Create animated button with glassmorphism
 */
export function createGlassButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  onClick: () => void
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y);
  button.setSize(width, height);
  button.setInteractive();
  
  // Background
  const bg = scene.add.graphics();
  bg.fillStyle(UIStyles.colors.glass, 0.5);
  bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
  bg.lineStyle(2, UIStyles.colors.primary, 0.8);
  bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
  
  // Button text
  const buttonText = scene.add.text(0, 0, text, UIStyles.text.button);
  buttonText.setOrigin(0.5);
  
  button.add([bg, buttonText]);
  
  // Hover effect
  button.on('pointerover', () => {
    scene.tweens.add({
      targets: button,
      scale: 1.05,
      duration: 200,
      ease: 'Power2'
    });
    bg.clear();
    bg.fillStyle(UIStyles.colors.primary, 0.3);
    bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
    bg.lineStyle(2, UIStyles.colors.primaryLight, 1);
    bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
  });
  
  button.on('pointerout', () => {
    scene.tweens.add({
      targets: button,
      scale: 1,
      duration: 200,
      ease: 'Power2'
    });
    bg.clear();
    bg.fillStyle(UIStyles.colors.glass, 0.5);
    bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
    bg.lineStyle(2, UIStyles.colors.primary, 0.8);
    bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
  });
  
  button.on('pointerdown', onClick);
  
  return button;
}

/**
 * Create animated progress bar
 */
export function createProgressBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number = 0
): { container: Phaser.GameObjects.Container, updateProgress: (value: number) => void } {
  const container = scene.add.container(x, y);
  
  // Background
  const bgBar = scene.add.graphics();
  bgBar.fillStyle(UIStyles.colors.glass, 0.5);
  bgBar.fillRoundedRect(-width/2, -height/2, width, height, height/2);
  bgBar.lineStyle(1, UIStyles.colors.primary, 0.5);
  bgBar.strokeRoundedRect(-width/2, -height/2, width, height, height/2);
  
  // Progress fill
  const fillBar = scene.add.graphics();
  const updateProgress = (value: number) => {
    fillBar.clear();
    if (value > 0) {
      const fillWidth = Math.max(height, width * Math.min(1, value));
      
      // Gradient fill based on progress
      let color = UIStyles.colors.success;
      if (value < 0.3) color = UIStyles.colors.danger;
      else if (value < 0.6) color = UIStyles.colors.warning;
      
      fillBar.fillStyle(color, 0.9);
      fillBar.fillRoundedRect(-width/2 + 2, -height/2 + 2, fillWidth - 4, height - 4, (height-4)/2);
      
      // Glow effect
      fillBar.lineStyle(1, color, 0.5);
      fillBar.strokeRoundedRect(-width/2 + 2, -height/2 + 2, fillWidth - 4, height - 4, (height-4)/2);
    }
  };
  
  updateProgress(progress);
  container.add([bgBar, fillBar]);
  
  return { container, updateProgress };
}

/**
 * Create notification toast
 */
export function createNotification(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  duration: number = 3000
): void {
  const colors = {
    info: UIStyles.colors.secondary,
    success: UIStyles.colors.success,
    warning: UIStyles.colors.warning,
    error: UIStyles.colors.danger
  };
  
  const container = scene.add.container(x, y);
  
  // Calculate text width
  const tempText = scene.add.text(0, 0, text, UIStyles.text.body);
  const textWidth = tempText.width;
  tempText.destroy();
  
  const width = textWidth + 40;
  const height = 40;
  
  // Background
  const bg = scene.add.graphics();
  bg.fillStyle(UIStyles.colors.glass, 0.8);
  bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
  bg.lineStyle(2, colors[type], 0.8);
  bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
  
  // Icon based on type
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  const icon = scene.add.text(-width/2 + 15, 0, icons[type], {
    fontSize: '20px'
  });
  icon.setOrigin(0.5);
  
  // Message text
  const message = scene.add.text(10, 0, text, UIStyles.text.body);
  message.setOrigin(0.5);
  
  container.add([bg, icon, message]);
  container.setAlpha(0);
  container.setScale(0.8);
  
  // Animate in
  scene.tweens.add({
    targets: container,
    alpha: 1,
    scale: 1,
    y: y + 10,
    duration: 300,
    ease: 'Back.out'
  });
  
  // Auto dismiss
  scene.time.delayedCall(duration, () => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      scale: 0.8,
      y: y - 10,
      duration: 300,
      ease: 'Back.in',
      onComplete: () => container.destroy()
    });
  });
}

/**
 * Create animated mission card
 */
export function createMissionCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  mission: Mission
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const width = 280;
  const height = 100;
  
  // Glass panel background
  const panel = createGlassPanel(scene, 0, 0, width, height, UIStyles.panels.mission);
  container.add(panel);
  
  // Mission type badge
  const badgeColors: Record<MissionType, number> = {
    delivery: UIStyles.colors.secondary,
    combat: UIStyles.colors.danger,
    exploration: UIStyles.colors.success,
    smuggling: UIStyles.colors.warning
  };
  
  const badge = scene.add.graphics();
  badge.fillStyle(badgeColors[mission.type], 0.8);
  badge.fillRoundedRect(-width/2 + 10, -height/2 + 10, 60, 20, 5);
  
  const typeText = scene.add.text(-width/2 + 40, -height/2 + 20, mission.type.toUpperCase(), {
    fontSize: '10px',
    color: '#ffffff',
    fontFamily: 'Arial'
  });
  typeText.setOrigin(0.5);
  
  // Mission title
  const title = scene.add.text(-width/2 + 80, -height/2 + 25, mission.title, UIStyles.text.subtitle);
  title.setOrigin(0, 0.5);
  
  // Progress bar
  const progressBar = createProgressBar(scene, 0, height/2 - 20, width - 40, 8, mission.progress);
  
  // Reward display
  const rewardText = scene.add.text(width/2 - 20, height/2 - 20, `💰 ${mission.reward}`, UIStyles.text.value);
  rewardText.setOrigin(1, 0.5);
  
  container.add([badge, typeText, title, progressBar.container, rewardText]);
  
  // Pulse animation for active missions
  if (mission.active) {
    scene.tweens.add({
      targets: container,
      scale: { from: 1, to: 1.02 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }
  
  return container;
}