import { create } from "zustand";
import { AUDIO_CONFIG } from "../../audioConfig";
import { useMusicPlayer } from "./useMusicPlayer";
import { useEnhancedMusicPlayer } from "./useEnhancedMusicPlayer";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  ambientMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  laserSound: HTMLAudioElement | null;
  thrusterSound: HTMLAudioElement | null;
  
  // Mute controls
  isMuted: boolean; // Legacy support
  masterMute: boolean; // Controls everything
  musicMute: boolean; // Controls only music
  sfxMute: boolean; // Controls only sound effects

  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setAmbientMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setLaserSound: (sound: HTMLAudioElement) => void;
  setThrusterSound: (sound: HTMLAudioElement) => void;

  // Control functions
  toggleMute: () => void; // Legacy support - toggles master mute
  toggleMasterMute: () => void;
  toggleMusicMute: () => void;
  toggleSfxMute: () => void;
  setMasterMute: (muted: boolean) => void;
  setMusicMute: (muted: boolean) => void;
  setSfxMute: (muted: boolean) => void;
  stopAllAudio: () => void;
  playHit: () => void;
  playSuccess: () => void;
  playLaser: () => void;
  playAmbientMusic: () => void;
  stopAmbientMusic: () => void;
  playThruster: (fuelLevel: number) => void;
  stopThruster: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  ambientMusic: null,
  hitSound: null,
  successSound: null,
  laserSound: null,
  thrusterSound: null,
  
  // Mute controls
  isMuted: false, // Legacy support - mirrors masterMute
  masterMute: false, // Controls everything
  musicMute: false, // Controls only music  
  sfxMute: false, // Controls only sound effects

  setBackgroundMusic: (music) => {
    set({ backgroundMusic: music });
    // Store reference for mining effects system
    if (typeof window !== 'undefined') {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.backgroundMusic = music;
    }
  },
  setAmbientMusic: (music) => {
    set({ ambientMusic: music });
    if (typeof window !== 'undefined') {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.ambientMusic = music;
    }
  },
  setHitSound: (sound) => {
    set({ hitSound: sound });
    // Store reference for mining effects system to use
    if (typeof window !== 'undefined') {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.hitSound = sound;
    }
  },
  setSuccessSound: (sound) => {
    set({ successSound: sound });
    if (typeof window !== 'undefined') {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.successSound = sound;
    }
  },
  setLaserSound: (sound) => {
    set({ laserSound: sound });
    if (typeof window !== 'undefined') {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.laserSound = sound;
    }
  },
  setThrusterSound: (sound) => {
    set({ thrusterSound: sound });
    if (typeof window !== 'undefined') {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.thrusterSound = sound;
    }
  },

  toggleMute: () => {
    // Legacy support - toggles master mute
    get().toggleMasterMute();
  },
  
  toggleMasterMute: () => {
    const { masterMute } = get();
    const newMutedState = !masterMute;
    
    set({ 
      masterMute: newMutedState,
      isMuted: newMutedState // Keep legacy flag in sync
    });
    
    // Stop all audio immediately when master mute is activated
    if (newMutedState) {
      get().stopAllAudio();
    }
    
    console.log(`Master audio ${newMutedState ? "muted" : "unmuted"}`);
  },
  
  toggleMusicMute: () => {
    const { musicMute } = get();
    const newMutedState = !musicMute;
    
    set({ musicMute: newMutedState });
    
    // Stop music immediately if muted
    if (newMutedState) {
      const { backgroundMusic, ambientMusic } = get();
      if (backgroundMusic) {
        backgroundMusic.pause();
      }
      if (ambientMusic) {
        ambientMusic.pause();
      }
      
      // Also stop music player
      try {
        const musicPlayer = useMusicPlayer.getState();
        if (musicPlayer.isPlaying) {
          musicPlayer.pause();
        }
      } catch (e) {
        // Music player may not be loaded yet
      }
    }
    
    console.log(`Music ${newMutedState ? "muted" : "unmuted"}`);
  },
  
  toggleSfxMute: () => {
    const { sfxMute } = get();
    const newMutedState = !sfxMute;
    
    set({ sfxMute: newMutedState });
    
    // Stop sound effects immediately if muted
    if (newMutedState) {
      const { thrusterSound } = get();
      if (thrusterSound) {
        thrusterSound.pause();
        thrusterSound.currentTime = 0;
      }
    }
    
    console.log(`Sound effects ${newMutedState ? "muted" : "unmuted"}`);
  },
  
  setMasterMute: (muted: boolean) => {
    set({ 
      masterMute: muted,
      isMuted: muted // Keep legacy flag in sync
    });
    
    if (muted) {
      get().stopAllAudio();
    }
  },
  
  setMusicMute: (muted: boolean) => {
    set({ musicMute: muted });
    
    if (muted) {
      const { backgroundMusic, ambientMusic } = get();
      if (backgroundMusic) {
        backgroundMusic.pause();
      }
      if (ambientMusic) {
        ambientMusic.pause();
      }
    }
  },
  
  setSfxMute: (muted: boolean) => {
    set({ sfxMute: muted });
    
    if (muted) {
      const { thrusterSound } = get();
      if (thrusterSound) {
        thrusterSound.pause();
        thrusterSound.currentTime = 0;
      }
    }
  },
  
  stopAllAudio: () => {
    const { backgroundMusic, ambientMusic, thrusterSound } = get();
    
    // Stop all music
    if (backgroundMusic) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
    
    if (ambientMusic) {
      ambientMusic.pause();
      ambientMusic.currentTime = 0;
    }
    
    // Stop all sound effects
    if (thrusterSound) {
      thrusterSound.pause();
      thrusterSound.currentTime = 0;
    }
    
    // Stop music player
    try {
      const musicPlayer = useMusicPlayer.getState();
      if (musicPlayer.isPlaying) {
        musicPlayer.pause();
      }
    } catch (e) {
      // Music player may not be loaded yet
    }
    
    // Stop enhanced music player
    try {
      const enhancedPlayer = useEnhancedMusicPlayer.getState();
      enhancedPlayer.cleanup();
    } catch (e) {
      // Enhanced player may not be loaded yet
    }
    
    console.log("All audio stopped");
  },

  playHit: () => {
    const { hitSound, masterMute, sfxMute } = get();
    if (hitSound) {
      // Check both master and sfx mute
      if (masterMute || sfxMute) {
        console.log("Hit sound skipped (muted)");
        return;
      }

      const throttleMs = AUDIO_CONFIG.soundEffects.hit.throttleMs ?? 0;
      if (throttleMs > 0) {
        const now = Date.now();
        const lastHitTime = (hitSound as any).lastPlayTime || 0;
        if (now - lastHitTime < throttleMs) {
          console.log("Hit sound throttled (preventing spam)");
          return;
        }
        (hitSound as any).lastPlayTime = now;
      }

      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = AUDIO_CONFIG.soundEffects.hit.volume;
      soundClone.play().catch((error) => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },

  playSuccess: () => {
    const { successSound, masterMute, sfxMute } = get();
    if (successSound) {
      // Check both master and sfx mute
      if (masterMute || sfxMute) {
        console.log("Success sound skipped (muted)");
        return;
      }

      successSound.currentTime = 0;
      successSound.play().catch((error) => {
        console.log("Success sound play prevented:", error);
      });
    }
  },

  playLaser: () => {
    const { laserSound, masterMute, sfxMute } = get();
    if (laserSound) {
      // Check both master and sfx mute
      if (masterMute || sfxMute) {
        console.log("Laser sound skipped (muted)");
        return;
      }

      // Clone the sound to allow rapid fire
      const soundClone = laserSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.6; // Increased volume for zap sound
      soundClone.play().catch((error) => {
        console.log("Laser sound play prevented:", error);
      });
    }
  },

  playAmbientMusic: () => {
    const { ambientMusic, masterMute, musicMute } = get();
    if (ambientMusic && !masterMute && !musicMute) {
      ambientMusic.volume = 0.2; // Low volume for background ambience
      ambientMusic.loop = true;
      ambientMusic.play().catch((error) => {
        console.log("Ambient music play prevented:", error);
      });
    }
  },

  stopAmbientMusic: () => {
    const { ambientMusic } = get();
    if (ambientMusic) {
      ambientMusic.pause();
      ambientMusic.currentTime = 0;
    }
  },

  playThruster: (fuelLevel) => {
    const { thrusterSound, masterMute, sfxMute } = get();
    if (thrusterSound && !masterMute && !sfxMute) {
      // Calculate volume based on fuel level (0-1)
      const baseVolume = 0.15; // Low ambient volume
      const fuelRatio = Math.max(0, Math.min(1, fuelLevel / 100)); // Normalize fuel to 0-1
      const volume = baseVolume * fuelRatio;
      
      thrusterSound.volume = volume;
      thrusterSound.loop = true;
      thrusterSound.play().catch((error) => {
        console.log("Thruster sound play prevented:", error);
      });
      
      console.log(`Thruster sound started - Volume: ${volume.toFixed(2)} (Fuel: ${fuelLevel}%)`);
    }
  },

  stopThruster: () => {
    const { thrusterSound } = get();
    if (thrusterSound) {
      thrusterSound.pause();
      thrusterSound.currentTime = 0;
      console.log("Thruster sound stopped");
    }
  },
}));
