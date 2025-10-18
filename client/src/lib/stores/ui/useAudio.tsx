import {create} from "zustand";
import {Howl} from "howler";
import {AUDIO_CONFIG} from "../../audioConfig";
import {useMusicPlayer} from "@/lib/stores";
import {useEnhancedMusicPlayer} from "./useEnhancedMusicPlayer";
import * as THREE from "three";

// Sound Effects Cache using Howler.js for better performance
class SoundEffectsCache {
  private cache: Map<string, Howl> = new Map();
  private loadingPromises: Map<string, Promise<Howl>> = new Map();

  async getSound(
    key: string,
    config: { path: string; volume: number; loop?: boolean },
  ): Promise<Howl> {
    // Return cached sound if available
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Return loading promise if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    // Create new loading promise
    const loadingPromise = new Promise<Howl>((resolve, reject) => {
      const howl = new Howl({
        src: [config.path],
        volume: config.volume,
        loop: config.loop || false,
        preload: true,
        onload: () => {
          console.log(`[SoundEffectsCache] Loaded: ${key}`);
          this.cache.set(key, howl);
          this.loadingPromises.delete(key);
          resolve(howl);
        },
        onloaderror: (id, error) => {
          console.error(`[SoundEffectsCache] Failed to load ${key}:`, error);
          this.loadingPromises.delete(key);
          reject(error);
        },
      });
    });

    this.loadingPromises.set(key, loadingPromise);
    return loadingPromise;
  }

  getCached(key: string): Howl | undefined {
    return this.cache.get(key);
  }

  clear() {
    this.cache.forEach((howl) => {
      howl.unload();
    });
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

interface AudioState {
  // Sound effects cache
  soundEffectsCache: SoundEffectsCache;

  // Legacy HTMLAudioElement support for background/ambient music
  backgroundMusic: HTMLAudioElement | null;
  ambientMusic: HTMLAudioElement | null;
  thrusterSound: HTMLAudioElement | null; // Legacy thruster sound

  // Active Howl instances for continuous sounds
  activeThrusterSound: number | null; // Howl sound ID
  activeWindSound: number | null; // Howl sound ID for wind
  activeRainSound: number | null; // Howl sound ID for rain

  // Last play times for throttling
  lastPlayTimes: Map<string, number>;

  // Mute controls
  isMuted: boolean; // Legacy support
  masterMute: boolean; // Controls everything
  musicMute: boolean; // Controls only music
  sfxMute: boolean; // Controls only sound effects

  // Setter functions (legacy support)
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setAmbientMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setLaserSound: (sound: HTMLAudioElement) => void;
  setThrusterSound: (sound: HTMLAudioElement) => void;
  setTakeoffSound: (sound: HTMLAudioElement) => void;
  setExplosionSound: (sound: HTMLAudioElement) => void;

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
  playExplosion: (position: THREE.Vector3) => void;
  playTakeoff: () => void;
  stopThruster: () => void;
  stopWind: () => void;
  stopRain: () => void;

  // Preload frequently used sounds
  preloadSounds: () => Promise<void>;
}

export const useAudio = create<AudioState>((set, get) => ({
  // Sound effects cache
  soundEffectsCache: new SoundEffectsCache(),

  // Legacy HTMLAudioElement support
  backgroundMusic: null,
  ambientMusic: null,
  thrusterSound: null,

  // Active Howl instances
  activeThrusterSound: null,
  activeWindSound: null,
  activeRainSound: null,

  // Last play times for throttling
  lastPlayTimes: new Map(),

  // Mute controls
  isMuted: false, // Legacy support - mirrors masterMute
  masterMute: false, // Controls everything
  musicMute: false, // Controls only music
  sfxMute: false, // Controls only sound effects

  setBackgroundMusic: (music) => {
    set({ backgroundMusic: music });
    // Store reference for mining effects system
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.backgroundMusic = music;
    }
  },
  setAmbientMusic: (music) => {
    set({ ambientMusic: music });
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.ambientMusic = music;
    }
  },
  setHitSound: (sound) => {
    // Legacy support - just store reference for compatibility
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.hitSound = sound;
    }
  },
  setSuccessSound: (sound) => {
    // Legacy support - just store reference for compatibility
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.successSound = sound;
    }
  },
  setLaserSound: (sound) => {
    // Legacy support - just store reference for compatibility
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.laserSound = sound;
    }
  },
  setThrusterSound: (sound) => {
    // Legacy support - just store reference for compatibility
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.thrusterSound = sound;
    }
  },
  setTakeoffSound: (sound) => {
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.takeoffSound = sound;
    }
  },
  setExplosionSound: (sound) => {
    if (typeof window !== "undefined") {
      (window as any).audioStore = (window as any).audioStore || {};
      (window as any).audioStore.explosionSound = sound;
    }
  },
    playExplosion: async () => {
    const { masterMute, sfxMute, soundEffectsCache } = get();
    
    if (masterMute || sfxMute) {
      console.log("Explosion sound skipped (muted)");
      return;
    }
    
    try {
      const explosionSound = await soundEffectsCache.getSound(
        "explosion",
        AUDIO_CONFIG.soundEffects.explosion
      );
      
      // Optional: Add 3D positioning logic here if position is provided
      explosionSound.play();
      console.log("Explosion sound played");
    } catch (error) {
      console.error("Failed to play explosion sound:", error);
    }
  },
  
  playTakeoff: async () => {
    const { masterMute, sfxMute, soundEffectsCache } = get();
    
    if (masterMute || sfxMute) {
      console.log("Takeoff sound skipped (muted)");
      return;
    }
    
    try {
      const takeoffSound = await soundEffectsCache.getSound(
        "takeoff",
        AUDIO_CONFIG.soundEffects.takeoff
      );
      
      // Play at full volume for prominent effect
      takeoffSound.volume(AUDIO_CONFIG.soundEffects.takeoff.volume);
      takeoffSound.play();
      console.log("[AUDIO] Takeoff sound played prominently at full volume");
    } catch (error) {
      console.error("Failed to play takeoff sound:", error);
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
      isMuted: newMutedState, // Keep legacy flag in sync
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
      isMuted: muted, // Keep legacy flag in sync
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

      // Stop atmospheric sounds
    get().stopWind();
    get().stopRain();
    get().stopThruster();

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

  playHit: async () => {
    const { masterMute, sfxMute, soundEffectsCache, lastPlayTimes } = get();

    // Check both master and sfx mute
    if (masterMute || sfxMute) {
      console.log("Hit sound skipped (muted)");
      return;
    }

    // Check throttling
    const throttleMs = AUDIO_CONFIG.soundEffects.hit.throttleMs ?? 0;
    if (throttleMs > 0) {
      const now = Date.now();
      const lastHitTime = lastPlayTimes.get("hit") || 0;
      if (now - lastHitTime < throttleMs) {
        console.log("Hit sound throttled (preventing spam)");
        return;
      }
      lastPlayTimes.set("hit", now);
    }

    try {
      const hitSound = await soundEffectsCache.getSound(
        "hit",
        AUDIO_CONFIG.soundEffects.hit,
      );
      hitSound.play();
    } catch (error) {
      console.error("Failed to play hit sound:", error);
    }
  },

  playSuccess: async () => {
    const { masterMute, sfxMute, soundEffectsCache } = get();

    // Check both master and sfx mute
    if (masterMute || sfxMute) {
      console.log("Success sound skipped (muted)");
      return;
    }

    try {
      const successSound = await soundEffectsCache.getSound(
        "success",
        AUDIO_CONFIG.soundEffects.success,
      );
      successSound.play();
    } catch (error) {
      console.error("Failed to play success sound:", error);
    }
  },

  playLaser: async () => {
    const { masterMute, sfxMute, soundEffectsCache } = get();

    // Check both master and sfx mute
    if (masterMute || sfxMute) {
      console.log("Laser sound skipped (muted)");
      return;
    }

    try {
      const laserSound = await soundEffectsCache.getSound(
        "laser",
        AUDIO_CONFIG.soundEffects.laser,
      );
      laserSound.play();
    } catch (error) {
      console.error("Failed to play laser sound:", error);
    }
  },

  playAmbientMusic: () => {
    const { ambientMusic, masterMute, musicMute } = get();
    if (ambientMusic && !masterMute && !musicMute) {
      ambientMusic.volume = 0.4; // Low volume for background ambience
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

  playThruster: async (fuelLevel) => {
    const { masterMute, sfxMute, soundEffectsCache, activeThrusterSound } =
      get();

    if (masterMute || sfxMute) {
      get().stopThruster();
      return;
    }

    try {
      const thrusterSound = await soundEffectsCache.getSound(
        "thruster",
        AUDIO_CONFIG.soundEffects.thruster,
      );

      // Stop any existing thruster sound
      if (activeThrusterSound !== null) {
        thrusterSound.stop(activeThrusterSound);
      }

      // Calculate volume based on fuel level
      const baseVolume = 0.15;
      const fuelRatio = Math.max(0, Math.min(1, fuelLevel / 100));
      const volume = baseVolume * fuelRatio;

      thrusterSound.volume(volume);
      const soundId = thrusterSound.play();
      set({ activeThrusterSound: soundId });

      console.log(
        `Thruster sound started - Volume: ${volume.toFixed(2)} (Fuel: ${fuelLevel}%)`,
      );
    } catch (error) {
      console.error("Failed to play thruster sound:", error);
    }
  },

  stopThruster: () => {
    const { soundEffectsCache, activeThrusterSound } = get();

    if (activeThrusterSound !== null) {
      soundEffectsCache.getCached("thruster")?.stop(activeThrusterSound);
      set({ activeThrusterSound: null });
      console.log("Thruster sound stopped");
    }
  },

  playWind: async (intensity = 0.5) => {
    const { masterMute, sfxMute, soundEffectsCache, activeWindSound } = get();

    // Check both master and sfx mute
    if (masterMute || sfxMute) {
      console.log("Wind sound skipped (muted)");
      return;
    }

    try {
      const windSound = await soundEffectsCache.getSound(
        "wind",
        { ...AUDIO_CONFIG.soundEffects.wind, loop: true }
      );

        // Stop existing wind sound if playing
      if (activeWindSound !== null) {
        windSound.stop(activeWindSound);
      }

      // Set volume based on intensity (0 to 1)
      const clampedIntensity = Math.max(0, Math.min(1, intensity));
      const volume = clampedIntensity * 0.4; // Max volume 0.4 for wind

        windSound.volume(volume);
      const soundId = windSound.play();
      set({ activeWindSound: soundId });

        console.log(`Wind sound started - Intensity: ${clampedIntensity.toFixed(2)}, Volume: ${volume.toFixed(2)}`);
    } catch (error) {
      console.error("Failed to play wind sound:", error);
    }
  },

  stopWind: () => {
    const { soundEffectsCache, activeWindSound } = get();

    if (activeWindSound !== null) {
      soundEffectsCache.getCached("wind")?.stop(activeWindSound);
      set({ activeWindSound: null });
      console.log("Wind sound stopped");
    }
  },

  playRain: async (intensity = 0.5) => {
    const { masterMute, sfxMute, soundEffectsCache, activeRainSound } = get();

    // Check both master and sfx mute
    if (masterMute || sfxMute) {
      console.log("Rain sound skipped (muted)");
      return;
    }

    try {
      const rainSound = await soundEffectsCache.getSound(
        "rain",
        { ...AUDIO_CONFIG.soundEffects.rain, loop: true }
      );

        // Stop existing rain sound if playing
      if (activeRainSound !== null) {
        rainSound.stop(activeRainSound);
      }

      // Set volume based on intensity (0 to 1)
      const clampedIntensity = Math.max(0, Math.min(1, intensity));
      const volume = clampedIntensity * 0.5; // Max volume 0.5 for rain

        rainSound.volume(volume);
      const soundId = rainSound.play();
      set({ activeRainSound: soundId });

        console.log(`Rain sound started - Intensity: ${clampedIntensity.toFixed(2)}, Volume: ${volume.toFixed(2)}`);
    } catch (error) {
      console.error("Failed to play rain sound:", error);
    }
  },

  stopRain: () => {
    const { soundEffectsCache, activeRainSound } = get();

    if (activeRainSound !== null) {
      soundEffectsCache.getCached("rain")?.stop(activeRainSound);
      set({ activeRainSound: null });
      console.log("Rain sound stopped");
    }
  },

  preloadSounds: async () => {
    const { soundEffectsCache } = get();
    console.log("[AudioStore] Preloading frequently used sounds...");

    // Preload frequently used sounds
    const soundsToPreload = [
      { key: "laser", config: AUDIO_CONFIG.soundEffects.laser },
      { key: "hit", config: AUDIO_CONFIG.soundEffects.hit },
      { key: "thruster", config: AUDIO_CONFIG.soundEffects.thruster },
      { key: "wind", config: AUDIO_CONFIG.soundEffects.wind },
      { key: "rain", config: AUDIO_CONFIG.soundEffects.rain },
    ];

    await Promise.all(
      soundsToPreload.map(({ key, config }) =>
        soundEffectsCache.getSound(key, config).catch((err) => {
          console.error(`Failed to preload ${key}:`, err);
        }),
      ),
    );

    console.log("[AudioStore] Sound preloading complete");
  },
}));
