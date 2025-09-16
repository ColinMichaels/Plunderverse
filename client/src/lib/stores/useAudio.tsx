import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  ambientMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  laserSound: HTMLAudioElement | null;
  thrusterSound: HTMLAudioElement | null;
  isMuted: boolean;

  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setAmbientMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setLaserSound: (sound: HTMLAudioElement) => void;
  setThrusterSound: (sound: HTMLAudioElement) => void;

  // Control functions
  toggleMute: () => void;
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
  isMuted: false, // Start muted by default

  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setAmbientMusic: (music) => set({ ambientMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setLaserSound: (sound) => set({ laserSound: sound }),
  setThrusterSound: (sound) => set({ thrusterSound: sound }),

  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;

    // Just update the muted state
    set({ isMuted: newMutedState });

    // Log the change
    console.log(`Sound ${newMutedState ? "muted" : "unmuted"}`);
  },

  playHit: () => {
    const { hitSound, isMuted } = get();
    if (hitSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
        console.log("Hit sound skipped (muted)");
        return;
      }

      // PLACEHOLDER: Prevent rapid hit sound spam - limit to once per 200ms  
      // TODO: Future sound design work will revisit this debouncing implementation
      const now = Date.now();
      const lastHitTime = (hitSound as any).lastPlayTime || 0;
      if (now - lastHitTime < 200) {
        console.log("Hit sound throttled (preventing spam)");
        return;
      }
      (hitSound as any).lastPlayTime = now;

      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      soundClone.play().catch((error) => {
        console.log("Hit sound play prevented:", error);
      });
    }
  },

  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (successSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
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
    const { laserSound, isMuted } = get();
    if (laserSound) {
      // If sound is muted, don't play anything
      if (isMuted) {
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
    const { ambientMusic, isMuted } = get();
    if (ambientMusic && !isMuted) {
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
    const { thrusterSound, isMuted } = get();
    if (thrusterSound && !isMuted) {
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
