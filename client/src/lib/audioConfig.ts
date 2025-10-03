export type AudioCategory = "space" | "surface" | "atmospheric" | "combat" | "event" | "ambient";

// Music priority levels
export enum MusicPriority {
  AMBIENT = 0,      // User/Ambient Music (lowest)
  THEME = 1,        // Location-based themes
  GAME_EVENT = 2,   // Combat, transitions
  CRITICAL = 3,     // Cutscenes, critical events (highest)
}

// Event types for music triggers
export enum MusicEventType {
  COMBAT_START = "combat_start",
  COMBAT_END = "combat_end",
  MINING_SUCCESS = "mining_success",
  LOW_FUEL = "low_fuel",
  STATION_DOCKING = "station_docking",
  STATION_UNDOCKING = "station_undocking",
  LANDING = "landing",
  TAKEOFF = "takeoff",
  WARP_START = "warp_start",
  WARP_END = "warp_end",
  DANGER = "danger",
  VICTORY = "victory",
  DISCOVERY = "discovery",
}

// Environment types for ambient music
export enum EnvironmentType {
  SPACE = "space",
  SURFACE = "surface",
  STATION = "station",
  ASTEROID_FIELD = "asteroid_field",
  NEBULA = "nebula",
}

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
  priority?: MusicPriority;
  eventType?: MusicEventType;
  environment?: EnvironmentType;
  duration?: number; // Track duration in seconds
  isJingle?: boolean; // Short tracks that don't loop
  fadeDuration?: number; // Custom fade duration for this track
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
  fadeDurations?: Map<MusicPriority, number>;
  ambientDelayRange?: {
    min: number; // Minimum delay in ms
    max: number; // Maximum delay in ms
  };
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
      categories: ["surface", "atmospheric", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SURFACE,
    },
    {
      filename: "ES_Cairn - By Lotus.mp3",
      name: "Cairn by Lotus",
      categories: ["surface", "atmospheric", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SURFACE,
    },
    {
      filename: "ES_Rotting Circuit - Joseph Beg.mp3",
      name: "Rotting Circuit by Joseph Beg",
      categories: ["space", "combat"],
      priority: MusicPriority.GAME_EVENT,
      eventType: MusicEventType.DANGER,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "ES_Lovesick - Cushy.mp3",
      name: "Lovesick by Cushy",
      categories: ["space", "surface", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "ES_Night Sky Travel - Static Glow Sounds.mp3",
      name: "Night Sky Travel by Static Glow Sounds",
      categories: ["space", "atmospheric", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "ES_Orbit - Van Sandano.mp3",
      name: "Orbit by Van Sandano",
      categories: ["space", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Galactic Marauder's Anthem.mp3",
      name: "Galactic Marauder's Anthem",
      categories: ["space", "combat", "event"],
      priority: MusicPriority.GAME_EVENT,
      eventType: MusicEventType.COMBAT_START,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Galactic Plunderers v2.mp3",
      name: "Galactic Plunderers v2",
      categories: ["space", "atmospheric", "event"],
      priority: MusicPriority.THEME,
      environment: EnvironmentType.STATION,
    },
    {
      filename: "Galactic Plunderers.mp3",
      name: "Galactic Plunderers",
      categories: ["space", "atmospheric", "event"],
      priority: MusicPriority.THEME,
      eventType: MusicEventType.STATION_DOCKING,
      environment: EnvironmentType.STATION,
    },
    {
      filename: "PlunderverseTheme.mp3",
      name: "Plunderverse Theme",
      categories: ["space", "event"],
      priority: MusicPriority.CRITICAL,
      eventType: MusicEventType.VICTORY,
      isJingle: true,
      duration: 10,
    },
    {
      filename: "Plunderverse_Aura.mp3",
      name: "Plunderverse Aura",
      categories: ["atmospheric", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.NEBULA,
    },
    {
      filename: "Plunderverse_Aura2.mp3",
      name: "Plunderverse Aura 2",
      categories: ["atmospheric", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.ASTEROID_FIELD,
    },
  ],
  globalVolume: 1.0,
  crossfadeDuration: 2000,
  fadeDurations: new Map([
    [MusicPriority.AMBIENT, 3000],
    [MusicPriority.THEME, 2000],
    [MusicPriority.GAME_EVENT, 1000],
    [MusicPriority.CRITICAL, 500],
  ]),
  ambientDelayRange: {
    min: 5 * 60 * 1000, // 5 minutes
    max: 15 * 60 * 1000, // 15 minutes
  },
};
