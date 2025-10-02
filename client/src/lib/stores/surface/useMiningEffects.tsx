import { create } from 'zustand';
import { ResourceData } from '../../planetData';
import * as THREE from 'three';

interface ScreenShakeConfig {
  intensity: number;
  duration: number;
  frequency: number;
  pattern: 'standard' | 'heavy' | 'light' | 'pulse' | 'random';
}

interface MiningEffectsState {
  // Screen shake
  isShaking: boolean;
  shakeConfig: ScreenShakeConfig | null;
  shakeStartTime: number;
  originalCameraPosition: THREE.Vector3 | null;
  
  // Audio effects
  audioContext: AudioContext | null;
  gainNode: GainNode | null;
  
  // Settings
  effectsIntensity: number; // 0-1, overall intensity multiplier
  screenShakeEnabled: boolean;
  visualEffectsEnabled: boolean;
  
  // Actions
  triggerMiningImpact: (resource: ResourceData, progress: number) => void;
  startScreenShake: (config: ScreenShakeConfig) => void;
  stopScreenShake: () => void;
  updateScreenShake: (camera: THREE.Camera, deltaTime: number) => void;
  
  // Dynamic audio
  playMiningSound: (resource: ResourceData, progress: number) => void;
  initAudioContext: () => void;
  
  // Settings
  setEffectsIntensity: (intensity: number) => void;
  setScreenShakeEnabled: (enabled: boolean) => void;
  setVisualEffectsEnabled: (enabled: boolean) => void;
}

export const useMiningEffects = create<MiningEffectsState>((set, get) => ({
  // Screen shake state
  isShaking: false,
  shakeConfig: null,
  shakeStartTime: 0,
  originalCameraPosition: null,
  
  // Audio state
  audioContext: null,
  gainNode: null,
  
  // Settings
  effectsIntensity: 1.0,
  screenShakeEnabled: true,
  visualEffectsEnabled: true,
  
  triggerMiningImpact: (resource, progress) => {
    const state = get();
    
    // Import settings dynamically to avoid circular dependencies
    const settingsStore = (window as any).settingsStore;
    const screenShakeEnabled = settingsStore?.enableScreenShake ?? state.screenShakeEnabled;
    const effectsIntensity = settingsStore?.miningEffectsIntensity ?? state.effectsIntensity;
    
    // Calculate shake intensity based on resource and progress
    let baseIntensity = 0.1;
    let duration = 200;
    let frequency = 15;
    let pattern: ScreenShakeConfig['pattern'] = 'standard';
    
    // Resource complexity affects base intensity
    const complexityMultiplier = Math.min(2.0, resource.complexity / 10);
    baseIntensity *= complexityMultiplier;
    
    // Progress milestones
    const milestones = [0.25, 0.5, 0.75, 1.0];
    const isMilestone = milestones.some(m => Math.abs(progress - m) < 0.01);
    
    if (isMilestone) {
      baseIntensity *= 2.0;
      duration = 400;
      
      if (progress >= 1.0) {
        baseIntensity *= 1.5;
        duration = 600;
        pattern = 'heavy';
      }
    }
    
    // Resource type specific patterns
    const resourceType = resource.type.toLowerCase();
    
    if (resourceType.includes('metal') || resourceType.includes('iron')) {
      pattern = 'heavy';
      frequency = 20;
      baseIntensity *= 1.2;
    } else if (resourceType.includes('crystal') || resourceType.includes('gem')) {
      pattern = 'pulse';
      frequency = 25;
      baseIntensity *= 0.8;
    } else if (resourceType.includes('liquid') || resourceType.includes('gas')) {
      pattern = 'light';
      frequency = 10;
      baseIntensity *= 0.6;
    } else if (resource.rarity === 'legendary') {
      pattern = 'random';
      frequency = 30;
      baseIntensity *= 1.5;
      duration *= 1.5;
    }
    
    // Apply overall intensity setting from user preferences
    baseIntensity *= effectsIntensity;
    
    if (screenShakeEnabled && baseIntensity > 0) {
      get().startScreenShake({
        intensity: baseIntensity,
        duration,
        frequency,
        pattern
      });
    }
    
    // Trigger dynamic audio
    get().playMiningSound(resource, progress);
  },
  
  startScreenShake: (config) => {
    set({
      isShaking: true,
      shakeConfig: config,
      shakeStartTime: Date.now()
    });
  },
  
  stopScreenShake: () => {
    set({
      isShaking: false,
      shakeConfig: null,
      originalCameraPosition: null
    });
  },
  
  updateScreenShake: (camera, deltaTime) => {
    const state = get();
    
    if (!state.isShaking || !state.shakeConfig) return;
    
    // Store original camera position
    if (!state.originalCameraPosition) {
      set({ originalCameraPosition: camera.position.clone() });
    }
    
    const elapsed = Date.now() - state.shakeStartTime;
    const { intensity, duration, frequency, pattern } = state.shakeConfig;
    
    if (elapsed > duration) {
      // Smoothly return to original position
      if (state.originalCameraPosition) {
        camera.position.lerp(state.originalCameraPosition, deltaTime * 5);
        
        // Check if close enough to original position
        if (camera.position.distanceTo(state.originalCameraPosition) < 0.01) {
          camera.position.copy(state.originalCameraPosition);
          get().stopScreenShake();
        }
      }
      return;
    }
    
    // Calculate shake progress (0-1)
    const progress = elapsed / duration;
    const fadeOut = 1 - progress; // Fade out over time
    
    // Generate shake offset based on pattern
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;
    
    const time = elapsed * 0.001 * frequency;
    
    switch (pattern) {
      case 'heavy':
        // Strong, sharp movements
        offsetX = Math.sin(time) * intensity * fadeOut;
        offsetY = Math.sin(time * 1.3) * intensity * fadeOut * 0.7;
        offsetZ = Math.cos(time * 0.8) * intensity * fadeOut * 0.3;
        break;
        
      case 'light':
        // Gentle wobble
        offsetX = Math.sin(time) * intensity * fadeOut * 0.5;
        offsetY = Math.cos(time * 1.1) * intensity * fadeOut * 0.3;
        break;
        
      case 'pulse':
        // Rhythmic pulse
        const pulse = Math.sin(time) > 0 ? 1 : 0;
        offsetX = pulse * Math.random() * intensity * fadeOut * 0.8;
        offsetY = pulse * Math.random() * intensity * fadeOut * 0.5;
        break;
        
      case 'random':
        // Chaotic shake for legendary resources
        offsetX = (Math.random() - 0.5) * intensity * fadeOut * 2;
        offsetY = (Math.random() - 0.5) * intensity * fadeOut * 1.5;
        offsetZ = (Math.random() - 0.5) * intensity * fadeOut;
        break;
        
      case 'standard':
      default:
        // Default circular shake
        offsetX = Math.sin(time) * intensity * fadeOut;
        offsetY = Math.cos(time * 1.2) * intensity * fadeOut * 0.8;
        offsetZ = Math.sin(time * 0.7) * intensity * fadeOut * 0.4;
    }
    
    // Apply shake to camera
    if (state.originalCameraPosition) {
      camera.position.x = state.originalCameraPosition.x + offsetX;
      camera.position.y = state.originalCameraPosition.y + offsetY;
      camera.position.z = state.originalCameraPosition.z + offsetZ;
    }
  },
  
  initAudioContext: () => {
    const state = get();
    if (state.audioContext) return;
    
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = context.createGain();
    gainNode.connect(context.destination);
    
    set({
      audioContext: context,
      gainNode
    });
  },
  
  playMiningSound: (resource, progress) => {
    const state = get();
    const audioStore = (window as any).audioStore || {};
    
    // Get the existing hit sound
    const hitSound = audioStore.hitSound;
    if (!hitSound) return;
    
    // Initialize audio context if needed
    if (!state.audioContext) {
      get().initAudioContext();
    }
    
    const audioContext = get().audioContext;
    if (!audioContext) return;
    
    // Clone and modify the sound based on resource type
    const soundClone = hitSound.cloneNode() as HTMLAudioElement;
    
    // Calculate pitch and volume variations
    let pitch = 1.0;
    let volume = 0.5;
    
    // Progress-based pitch variation (higher pitch as progress increases)
    pitch += progress * 0.3;
    
    // Resource type specific variations
    const resourceType = resource.type.toLowerCase();
    
    if (resourceType.includes('metal') || resourceType.includes('iron')) {
      // Metallic clang - lower pitch, sharper attack
      pitch *= 0.8;
      volume = 0.6;
    } else if (resourceType.includes('crystal') || resourceType.includes('gem')) {
      // Crystal chime - higher pitch, resonant
      pitch *= 1.4;
      volume = 0.4;
    } else if (resourceType.includes('rock') || resourceType.includes('stone')) {
      // Rock crunch - lower pitch, louder
      pitch *= 0.6;
      volume = 0.7;
    } else if (resourceType.includes('liquid')) {
      // Splash - mid pitch with variation
      pitch *= 0.9 + (Math.random() * 0.2);
      volume = 0.5;
    }
    
    // Hardness affects volume
    const hardnessMultiplier = Math.min(1.5, resource.complexity / 15);
    volume *= hardnessMultiplier;
    
    // Rarity affects both
    if (resource.rarity === 'legendary') {
      pitch *= 1.2;
      volume *= 1.2;
      
      // Play a second layered sound for richness
      setTimeout(() => {
        const layeredSound = hitSound.cloneNode() as HTMLAudioElement;
        layeredSound.volume = volume * 0.4 * state.effectsIntensity;
        layeredSound.playbackRate = pitch * 0.8;
        layeredSound.play().catch(() => {});
      }, 50);
    } else if (resource.rarity === 'rare') {
      volume *= 1.1;
    }
    
    // Apply final volume with intensity setting
    soundClone.volume = Math.min(1.0, volume * state.effectsIntensity);
    soundClone.playbackRate = pitch;
    
    // Add slight randomization for variety
    soundClone.playbackRate += (Math.random() - 0.5) * 0.1;
    
    // Play the sound
    soundClone.play().catch(error => {
      console.log('Mining sound play prevented:', error);
    });
    
    // Store reference for the audio system
    (window as any).audioStore = {
      ...audioStore,
      lastMiningSoundTime: Date.now()
    };
  },
  
  setEffectsIntensity: (intensity) => {
    set({ effectsIntensity: Math.max(0, Math.min(1, intensity)) });
  },
  
  setScreenShakeEnabled: (enabled) => {
    set({ screenShakeEnabled: enabled });
    if (!enabled) {
      get().stopScreenShake();
    }
  },
  
  setVisualEffectsEnabled: (enabled) => {
    set({ visualEffectsEnabled: enabled });
  }
}));