export type AudioCategory =
  | "space"
  | "surface"
  | "atmospheric"
  | "combat"
  | "event"
  | "theme"
  | "ambient";

// Music priority levels
export enum MusicPriority {
  AMBIENT = 0, // User/Ambient Music (lowest)
  THEME = 1, // Location-based themes
  GAME_EVENT = 2, // Combat, transitions
  CRITICAL = 3, // Cutscenes, critical events (highest)
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

// Music context types for Minecraft-style scheduling
export type MusicContext =
  | "space"
  | "planet"
  | "mining"
  | "combat"
  | "exploration";

// Minecraft-style music settings interface
export interface MinecraftMusicSettings {
  delayRanges: {
    space: { min: number; max: number };
    planet: { min: number; max: number };
    mining: { min: number; max: number };
    combat: { min: number; max: number };
    exploration: { min: number; max: number };
  };
  contexts: {
    action: AudioCategory[];
    ambient: AudioCategory[];
    exploration: AudioCategory[];
  };
  triggerChance: {
    onLocationChange: number;
    onMining: number;
    onEnemySpawn: number;
  };
  autoStart: {
    onPlanetEntry: boolean;
    onSpaceEntry: boolean;
    onMiningStart: boolean;
    onCombatStart: boolean;
  };
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
    wind: SoundEffectConfig;
    rain: SoundEffectConfig;
    explosion: SoundEffectConfig;
    takeoff: SoundEffectConfig;
  };
  musicTracks: MusicTrackConfig[];
  musicBasePath: string;
  globalVolume: number;
  crossfadeDuration: number;
  fadeDurations?: Map<MusicPriority, number>;
  ambientDelayRange?: {
    min: number; // Minimum delay in ms
    max: number; // Maximum delay in ms
  };
  minecraftMusicSettings: MinecraftMusicSettings;
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
    explosion: {
      path: "/sounds/explosion.mp3",
      volume: 1.0,
    },
    takeoff: {
      path: "/sounds/takeoff.mp3",
      volume: 0.5,
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
    wind: {
      path: "/sounds/wind.mp3",
      volume: 1.0,
      loop: true,
    },
    rain: {
      path: "/sounds/rain.mp3",
      volume: 1.0,
      loop: true,
    },
  },
  musicBasePath: "/sounds/music/",
  musicTracks: [
    {
      filename: "PlunderverseTheme.mp3",
      name: "Plunderverse Theme",
      categories: ["theme", "event"],
      priority: MusicPriority.THEME,
    },
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
      filename: "Plunderverse_Aura.mp3",
      name: "Plunderverse Aura",
      categories: ["atmospheric", "ambient"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Plunderverse_Aura2.mp3",
      name: "Plunderverse Aura 2",
      categories: ["atmospheric", "ambient", "space"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Plunderverse-experiment-3.mp3",
      name: "Plunderverse-experiment-3",
      categories: ["atmospheric", "ambient", "space"],
      priority: MusicPriority.GAME_EVENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Space Battle.mp3",
      name: "Space Battle",
      categories: ["atmospheric", "ambient", "space"],
      priority: MusicPriority.GAME_EVENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Space Battle quicker.mp3",
      name: "Space Battle quicker",
      categories: ["atmospheric", "ambient", "space"],
      priority: MusicPriority.GAME_EVENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Space SOnnet #6 (0.67x).mp3",
      name: "Space SOnnet #6 (0.67x)",
      categories: ["atmospheric", "ambient", "space"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SPACE,
    },
    {
      filename: "Space SOnnet #7 (0.67x).mp3",
      name: "Space SOnnet #6 (0.67x)",
      categories: ["atmospheric", "ambient", "space"],
      priority: MusicPriority.AMBIENT,
      environment: EnvironmentType.SPACE,
    },
  ],
  globalVolume: 1.0,
  crossfadeDuration: 2000,
  fadeDurations: new Map([
    [MusicPriority.AMBIENT, 6000],
    [MusicPriority.THEME, 2000],
    [MusicPriority.GAME_EVENT, 1000],
    [MusicPriority.CRITICAL, 500],
  ]),
  ambientDelayRange: {
    min: 1 * 60 * 1000, // 1 minute
    max: 10 * 60 * 1000, // 10 mins
  },
  minecraftMusicSettings: {
    // Context-specific delay ranges (in milliseconds)
    delayRanges: {
      space: { min: 1 * 60 * 1000, max: 1 * 60 * 1000 }, // 10 secs - 1 minutes in space
      planet: { min: 1 * 60 * 1000, max: 5 * 60 * 1000 }, // 5-15 minutes on planet
      mining: { min: 2 * 60 * 1000, max: 8 * 60 * 1000 }, // 2-8 minutes while mining
      combat: { min: 0, max: 1000 }, // Instant (0-1 sec) for combat
      exploration: { min: 1 * 60 * 1000, max: 6 * 60 * 1000 }, // 4-12 minutes exploring
    },
    // Music categories for different contexts
    contexts: {
      action: ["combat"], // Action music for combat
      ambient: ["ambient", "atmospheric"], // Ambient background music
      exploration: ["space", "surface", "ambient"], // Exploration music
    },
    // Trigger probabilities (0-1 scale)
    triggerChance: {
      onLocationChange: 0.6, // 60% chance to trigger on location change
      onMining: 0.4, // 40% chance to trigger when mining starts
      onEnemySpawn: 1.0, // 100% chance when enemy engages
    },
    // Auto-start settings for different events
    autoStart: {
      onPlanetEntry: true, // Auto-start timer when entering planet
      onSpaceEntry: true, // Auto-start timer when entering space
      onMiningStart: false, // Only start if no music playing
      onCombatStart: true, // Always start combat music immediately
    },
  },
};
