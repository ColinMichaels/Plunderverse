import { useSettings } from '@/lib/stores/ui/useSettings';
import { useAudio } from '@/lib/stores/ui/useAudio';
import { usePlatform } from '@/lib/stores/ui/usePlatform';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  danger: string;
  success: string;
  panel: string;
  border: string;
}

export function getThemeColors(theme: 'classic' | 'monochrome'): ThemeColors {
  if (theme === 'monochrome') {
    return {
      primary: '#ffffff',
      secondary: '#a3a3a3',
      background: '#000000',
      text: '#ffffff',
      accent: '#d4d4d4',
      danger: '#737373',
      success: '#e5e5e5',
      panel: '#171717',
      border: '#404040',
    };
  }
  
  // Classic theme (cyberpunk orange/cyan)
  return {
    primary: '#06b6d4',
    secondary: '#f97316',
    background: '#000000',
    text: '#ffffff',
    accent: '#8b5cf6',
    danger: '#ef4444',
    success: '#10b981',
    panel: '#1e293b',
    border: '#334155',
  };
}

export function getPhaserThemeColors(theme: 'classic' | 'monochrome') {
  const colors = getThemeColors(theme);
  return {
    primary: parseInt(colors.primary.replace('#', ''), 16),
    secondary: parseInt(colors.secondary.replace('#', ''), 16),
    background: parseInt(colors.background.replace('#', ''), 16),
    text: parseInt(colors.text.replace('#', ''), 16),
    accent: parseInt(colors.accent.replace('#', ''), 16),
    danger: parseInt(colors.danger.replace('#', ''), 16),
    success: parseInt(colors.success.replace('#', ''), 16),
  };
}

export function getGameDimensions(isMobile: boolean) {
  if (isMobile) {
    // Use full viewport dimensions for mobile (9:16 aspect ratio)
    const width = window.innerWidth;
    const height = window.innerHeight;
    return { width, height };
  }
  // Desktop uses standard 800x600
  return { width: 800, height: 600 };
}

export function useMinigameSettings() {
  const settings = useSettings();
  const audio = useAudio();
  const platform = usePlatform();
  
  return {
    theme: settings.uiTheme,
    themeColors: getThemeColors(settings.uiTheme),
    phaserColors: getPhaserThemeColors(settings.uiTheme),
    
    // Audio
    getSfxVolume: () => {
      if (audio.masterMute || audio.sfxMute) return 0;
      return audio.masterVolume * audio.sfxVolume;
    },
    
    getMusicVolume: () => {
      if (audio.masterMute || audio.musicMute) return 0;
      return audio.masterVolume * audio.musicVolume;
    },
    
    // Platform
    isMobile: platform.platformType === 'mobile',
    isTouch: platform.isTouch,
  };
}

export interface TouchButtonConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  action: () => void;
}

export function createTouchButton(
  scene: Phaser.Scene,
  config: TouchButtonConfig,
  colors: ReturnType<typeof getPhaserThemeColors>
): Phaser.GameObjects.Container {
  const container = scene.add.container(config.x, config.y);
  
  // Button background
  const bg = scene.add.rectangle(0, 0, config.width, config.height, colors.primary, 0.3);
  bg.setStrokeStyle(2, colors.primary);
  bg.setInteractive({ useHandCursor: true });
  
  // Button label
  const text = scene.add.text(0, 0, config.label, {
    fontSize: '16px',
    color: '#ffffff',
    fontFamily: 'Arial',
  }).setOrigin(0.5);
  
  container.add([bg, text]);
  
  // Touch events
  bg.on('pointerdown', () => {
    bg.setFillStyle(colors.primary, 0.6);
    config.action();
  });
  
  bg.on('pointerup', () => {
    bg.setFillStyle(colors.primary, 0.3);
  });
  
  bg.on('pointerout', () => {
    bg.setFillStyle(colors.primary, 0.3);
  });
  
  return container;
}
