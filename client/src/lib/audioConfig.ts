export type AudioCategory = "space" | "surface" | "atmospheric";

export interface SoundEffectConfig {
  path: string;
  volume: number;
  loop?: boolean;
  playbackRate?: number;
  maxInstances?: number;
  throttleMs?: number;
}

export interface MusicTrackConfig {
  filename: string;
  name: string;
  categories: AudioCategory[];
}

export interface AudioConfig {
  soundEffects: {
    background: SoundEffectConfig;
    ambient: SoundEffectConfig;
    hit: SoundEffectConfig;
    success: SoundEffectConfig;
    laser: SoundEffectConfig;
    zap: SoundEffectConfig;
    thruster: SoundEffectConfig;
    spaceHelmetBreathing: SoundEffectConfig;
    spaceVacuumDoor: SoundEffectConfig;
  };
  musicTracks: MusicTrackConfig[];
  globalVolume: number;
  crossfadeDuration: number;
}

export const AUDIO_CONFIG: AudioConfig = {
  soundEffects: {
    background: {
      path: "/sounds/background.mp3",
      volume: 0.3,
      loop: true,
    },
    ambient: {
      path: "/sounds/space-ambience.mp3",
      volume: 0.4,
      loop: true,
    },
    hit: {
      path: "/sounds/hit.mp3",
      volume: 0.5,
      throttleMs: 200,
    },
    success: {
      path: "/sounds/success.mp3",
      volume: 0.6,
    },
    laser: {
      path: "/sounds/space-lazer.mp3",
      volume: 0.4,
    },
    zap: {
      path: "/sounds/zap.mp3",
      volume: 0.5,
    },
    thruster: {
      path: "/sounds/thruster.mp3",
      volume: 0.7,
      loop: true,
    },
    spaceHelmetBreathing: {
      path: "/sounds/space-helmet-breathing.mp3",
      volume: 0.3,
      loop: true,
    },
    spaceVacuumDoor: {
      path: "/sounds/space-vaccum-door.mp3",
      volume: 0.5,
    },
  },
  musicTracks: [
    {
      filename: "ES_Ame - Shinji Wakasa.mp3",
      name: "Ame by Shinji Wakasa",
      categories: ["surface", "atmospheric"],
    },
    {
      filename: "ES_Cairn - By Lotus.mp3",
      name: "Cairn by Lotus",
      categories: ["surface", "atmospheric"],
    },
    {
      filename: "ES_Rotting Circuit - Joseph Beg.mp3",
      name: "Rotting Circuit by Joseph Beg",
      categories: ["space"],
    },
    {
      filename: "ES_Lovesick - Cushy.mp3",
      name: "Lovesick by Cushy",
      categories: ["space", "surface"],
    },
    {
      filename: "ES_Night Sky Travel - Static Glow Sounds.mp3",
      name: "Night Sky Travel by Static Glow Sounds",
      categories: ["space", "atmospheric"],
    },
    {
      filename: "ES_Orbit - Van Sandano.mp3",
      name: "Orbit by Van Sandano",
      categories: ["space"],
    },
    {
      filename: "Galactic Marauder's Anthem.mp3",
      name: "Galactic Marauder's Anthem",
      categories: ["space"],
    },
    {
      filename: "Galactic Plunderers v2.mp3",
      name: "Galactic Plunderers v2",
      categories: ["space", "atmospheric"],
    },
    {
      filename: "Galactic Plunderers.mp3",
      name: "Galactic Plunderers",
      categories: ["space", "atmospheric"],
    },
  ],
  globalVolume: 1.0,
  crossfadeDuration: 2000,
};
