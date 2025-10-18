import { create } from "zustand";
import { useAudio } from "./useAudio";
import { useLandedState } from "../surface/useLandedState";
import { AUDIO_CONFIG, AudioCategory } from "../../audioConfig";

// Priority levels for music playback
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

interface MusicTrack {
  id: string;
  name: string;
  filename: string;
  audio: HTMLAudioElement | null;
  categories: AudioCategory[];
  priority?: MusicPriority;
  eventType?: MusicEventType;
  environment?: EnvironmentType;
  duration?: number;
  isJingle?: boolean; // Short tracks that don't loop
}

interface MusicLayer {
  track: MusicTrack | null;
  priority: MusicPriority;
  volume: number;
  isPlaying: boolean;
  fadeTimeout?: NodeJS.Timeout;
}

interface MusicStackEntry {
  track: MusicTrack;
  priority: MusicPriority;
  timestamp: number;
  returnAfter?: boolean; // Should return to previous music after this plays
}

interface EnhancedMusicPlayerState {
  // Track management
  tracks: MusicTrack[];
  eventTracks: Map<MusicEventType, MusicTrack[]>;
  ambientTracks: Map<EnvironmentType, MusicTrack[]>;
  
  // Layer system
  layers: MusicLayer[];
  activeLayer: MusicLayer | null;
  
  // Music stack for transitions
  musicStack: MusicStackEntry[];
  
  // Current state
  currentEnvironment: EnvironmentType;
  currentPriority: MusicPriority;
  isPlaying: boolean;
  masterVolume: number;
  
  // Minecraft-style ambient system
  ambientTimerActive: boolean;
  nextAmbientTime: number | null;
  ambientTimer: NodeJS.Timeout | null;
  minAmbientDelay: number; // 5 minutes in ms
  maxAmbientDelay: number; // 15 minutes in ms
  
  // Fade configuration per priority
  fadeDurations: Map<MusicPriority, number>;
  
  // Loading state
  isLoaded: boolean;
  isLoading: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  
  // Priority-based playback
  playWithPriority: (track: MusicTrack, priority: MusicPriority, returnAfter?: boolean) => void;
  stopLayer: (priority: MusicPriority) => void;
  
  // Event triggers
  triggerCombatMusic: () => void;
  triggerTransitionMusic: (track?: MusicTrack) => void;
  triggerEventMusic: (eventType: MusicEventType) => void;
  returnToUserMusic: () => void;
  
  // Environment changes
  setEnvironment: (env: EnvironmentType) => void;
  
  // Ambient system
  startAmbientTimer: () => void;
  stopAmbientTimer: () => void;
  playRandomAmbient: () => void;
  
  // Volume control
  setMasterVolume: (volume: number) => void;
  setLayerVolume: (priority: MusicPriority, volume: number) => void;
  
  // Stack management
  pushToStack: (track: MusicTrack, priority: MusicPriority, returnAfter?: boolean) => void;
  popFromStack: () => MusicStackEntry | undefined;
  clearStack: () => void;
  
  // Utility
  getActiveTrack: () => MusicTrack | null;
  getTracksByEvent: (eventType: MusicEventType) => MusicTrack[];
  getAmbientTracks: (env: EnvironmentType) => MusicTrack[];
  cleanup: () => void;
}

// Minecraft-style random delay between ambient tracks (5-15 minutes)
const getRandomAmbientDelay = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export const useEnhancedMusicPlayer = create<EnhancedMusicPlayerState>((set, get) => ({
  // Initial state
  tracks: [],
  eventTracks: new Map(),
  ambientTracks: new Map(),
  
  layers: [
    { track: null, priority: MusicPriority.AMBIENT, volume: 0.3, isPlaying: false },
    { track: null, priority: MusicPriority.THEME, volume: 0.5, isPlaying: false },
    { track: null, priority: MusicPriority.GAME_EVENT, volume: 0.7, isPlaying: false },
    { track: null, priority: MusicPriority.CRITICAL, volume: 1.0, isPlaying: false },
  ],
  activeLayer: null,
  
  musicStack: [],
  
  currentEnvironment: EnvironmentType.SPACE,
  currentPriority: MusicPriority.AMBIENT,
  isPlaying: false,
  masterVolume: 0.5,
  
  ambientTimerActive: false,
  nextAmbientTime: null,
  ambientTimer: null,
  minAmbientDelay: 5 * 60 * 1000,  // 5 minutes
  maxAmbientDelay: 15 * 60 * 1000, // 15 minutes
  
  fadeDurations: new Map([
    [MusicPriority.AMBIENT, 3000],
    [MusicPriority.THEME, 2000],
    [MusicPriority.GAME_EVENT, 1000],
    [MusicPriority.CRITICAL, 500],
  ]),
  
  isLoaded: false,
  isLoading: false,
  
  // Initialize the music system
  initialize: async () => {
    const { isLoaded, isLoading } = get();
    if (isLoaded || isLoading) return;
    
    set({ isLoading: true });
    console.log("[EnhancedMusicPlayer] Initializing music system (lazy loading enabled)...");
    
    try {
      // Initialize tracks without loading audio - will load on-demand
      const loadedTracks: MusicTrack[] = [];
      const eventTracksMap = new Map<MusicEventType, MusicTrack[]>();
      const ambientTracksMap = new Map<EnvironmentType, MusicTrack[]>();
      
      // Process tracks from AUDIO_CONFIG
      for (const configTrack of AUDIO_CONFIG.musicTracks) {
        const track: MusicTrack = {
          id: `track-${configTrack.filename}`,
          name: configTrack.name,
          filename: configTrack.filename,
          audio: null, // Will be loaded on-demand
          categories: configTrack.categories,
          priority: (configTrack as any).priority || MusicPriority.AMBIENT,
          eventType: (configTrack as any).eventType,
          environment: (configTrack as any).environment,
          duration: (configTrack as any).duration,
          isJingle: (configTrack as any).isJingle || false,
        };
        
        loadedTracks.push(track);
        
        // Organize by event type
        if (track.eventType) {
          if (!eventTracksMap.has(track.eventType)) {
            eventTracksMap.set(track.eventType, []);
          }
          eventTracksMap.get(track.eventType)!.push(track);
        }
        
        // Organize by environment for ambient tracks
        if (track.priority === MusicPriority.AMBIENT) {
          // Determine environment from categories
          if (track.categories.includes("space")) {
            if (!ambientTracksMap.has(EnvironmentType.SPACE)) {
              ambientTracksMap.set(EnvironmentType.SPACE, []);
            }
            ambientTracksMap.get(EnvironmentType.SPACE)!.push(track);
          }
          if (track.categories.includes("surface")) {
            if (!ambientTracksMap.has(EnvironmentType.SURFACE)) {
              ambientTracksMap.set(EnvironmentType.SURFACE, []);
            }
            ambientTracksMap.get(EnvironmentType.SURFACE)!.push(track);
          }
          if (track.categories.includes("atmospheric")) {
            if (!ambientTracksMap.has(EnvironmentType.STATION)) {
              ambientTracksMap.set(EnvironmentType.STATION, []);
            }
            ambientTracksMap.get(EnvironmentType.STATION)!.push(track);
          }
        }
      }
      
      set({
        tracks: loadedTracks,
        eventTracks: eventTracksMap,
        ambientTracks: ambientTracksMap,
        isLoaded: true,
        isLoading: false,
      });
      
      console.log(`[EnhancedMusicPlayer] Initialized ${loadedTracks.length} tracks (lazy loading)`);
      
      // Start ambient timer
      get().startAmbientTimer();
      
    } catch (error) {
      console.error("[EnhancedMusicPlayer] Initialization failed:", error);
      set({ isLoading: false });
    }
  },
  
  // Helper function to load a track audio on-demand
  loadTrackAudio: async (track: MusicTrack): Promise<boolean> => {
    if (track.audio) return true; // Already loaded
    
    console.log(`[EnhancedMusicPlayer] Loading track on-demand: ${track.name}`);
    
    try {
      const audio = new Audio(`${AUDIO_CONFIG.musicBasePath}${track.filename}`);
      
      return new Promise((resolve) => {
        audio.addEventListener("canplaythrough", () => {
          audio.volume = 0;
          audio.loop = !track.isJingle;
          track.audio = audio;
          
          console.log(`[EnhancedMusicPlayer] Track loaded: ${track.name}`);
          resolve(true);
        });
        
        audio.addEventListener("error", (e) => {
          console.error(`[EnhancedMusicPlayer] Failed to load ${track.filename}:`, e);
          track.audio = null;
          resolve(false);
        });
        
        audio.load();
      });
    } catch (error) {
      console.error(`[EnhancedMusicPlayer] Error loading track ${track.name}:`, error);
      return false;
    }
  },
  
  // Play music with priority
  playWithPriority: async (track: MusicTrack, priority: MusicPriority, returnAfter = false) => {
    const { layers, activeLayer, fadeDurations, masterVolume } = get();
    const { masterMute, musicMute, musicVolume: audioMusicVolume, masterVolume: audioMasterVolume } = useAudio.getState();
    
    // Check if audio is muted
    if (masterMute || musicMute) {
      console.log("[EnhancedMusicPlayer] Music playback skipped (muted)");
      return;
    }
    
    // Find the layer for this priority
    const layer = layers.find(l => l.priority === priority);
    if (!layer) return;
    
    // Load track on-demand if not already loaded
    if (!track.audio) {
      const loaded = await (get() as any).loadTrackAudio(track);
      if (!loaded) {
        console.error(`[EnhancedMusicPlayer] Failed to load track: ${track.name}`);
        return;
      }
    }
    
    // Stop any lower priority music
    for (const l of layers) {
      if (l.priority < priority && l.isPlaying && l.track?.audio) {
        const fadeDuration = fadeDurations.get(l.priority) || 2000;
        fadeOut(l.track.audio, fadeDuration, () => {
          l.track!.audio!.pause();
          l.track!.audio!.currentTime = 0;
          l.isPlaying = false;
        });
      }
    }
    
    // If there's a higher priority track playing, don't play this one
    const higherPriorityPlaying = layers.some(l => l.priority > priority && l.isPlaying);
    if (higherPriorityPlaying) {
      console.log(`[EnhancedMusicPlayer] Track "${track.name}" queued (higher priority music playing)`);
      get().pushToStack(track, priority, returnAfter);
      return;
    }
    
    // Stop current track in same layer if different
    if (layer.track && layer.track.id !== track.id && layer.track.audio) {
      const fadeDuration = fadeDurations.get(priority) || 2000;
      fadeOut(layer.track.audio, fadeDuration, () => {
        layer.track!.audio!.pause();
        layer.track!.audio!.currentTime = 0;
      });
    }
    
    // Update layer
    layer.track = track;
    layer.isPlaying = true;
    
    // Play the track with fade in
    const fadeDuration = fadeDurations.get(priority) || 2000;
    track.audio.currentTime = 0;
    track.audio.volume = 0;
    track.audio.play().then(() => {
      // Apply volume multiplication: layer.volume × musicVolume × masterVolume
      // Use callback to recalculate target volume on every fade tick
      fadeIn(track.audio!, () => {
        const { masterVolume, musicVolume } = useAudio.getState();
        return layer.volume * musicVolume * masterVolume;
      }, fadeDuration);
      
      set({
        layers: [...layers],
        activeLayer: layer,
        currentPriority: priority,
        isPlaying: true,
      });
      
      console.log(`[EnhancedMusicPlayer] Playing "${track.name}" at priority ${priority}`);
      
      // Handle jingles and return after
      if (track.isJingle || returnAfter) {
        track.audio!.addEventListener("ended", () => {
          get().returnToUserMusic();
        }, { once: true });
      }
    }).catch(error => {
      console.error("[EnhancedMusicPlayer] Playback failed:", error);
    });
  },
  
  // Stop a specific layer
  stopLayer: (priority: MusicPriority) => {
    const { layers, fadeDurations } = get();
    const layer = layers.find(l => l.priority === priority);
    
    if (layer && layer.track?.audio && layer.isPlaying) {
      const fadeDuration = fadeDurations.get(priority) || 2000;
      fadeOut(layer.track.audio, fadeDuration, () => {
        layer.track!.audio!.pause();
        layer.track!.audio!.currentTime = 0;
        layer.track = null;
        layer.isPlaying = false;
        
        set({ layers: [...layers] });
        console.log(`[EnhancedMusicPlayer] Stopped layer ${priority}`);
        
        // Check if we should resume a lower priority track
        get().returnToUserMusic();
      });
    }
  },
  
  // Event triggers
  triggerCombatMusic: () => {
    const { eventTracks } = get();
    const combatTracks = eventTracks.get(MusicEventType.COMBAT_START) || [];
    
    if (combatTracks.length > 0) {
      const track = combatTracks[Math.floor(Math.random() * combatTracks.length)];
      get().playWithPriority(track, MusicPriority.GAME_EVENT);
      get().stopAmbientTimer();
      console.log("[EnhancedMusicPlayer] Combat music triggered");
    }
  },
  
  triggerTransitionMusic: (track?: MusicTrack) => {
    if (track) {
      get().playWithPriority(track, MusicPriority.GAME_EVENT, true);
    } else {
      // Use default transition music if available
      const { eventTracks } = get();
      const transitionTracks = eventTracks.get(MusicEventType.LANDING) || 
                              eventTracks.get(MusicEventType.TAKEOFF) || [];
      
      if (transitionTracks.length > 0) {
        const selectedTrack = transitionTracks[Math.floor(Math.random() * transitionTracks.length)];
        get().playWithPriority(selectedTrack, MusicPriority.GAME_EVENT, true);
      }
    }
    console.log("[EnhancedMusicPlayer] Transition music triggered");
  },
  
  triggerEventMusic: (eventType: MusicEventType) => {
    const { eventTracks } = get();
    const tracks = eventTracks.get(eventType) || [];
    
    if (tracks.length > 0) {
      const track = tracks[Math.floor(Math.random() * tracks.length)];
      const priority = eventType === MusicEventType.VICTORY || 
                      eventType === MusicEventType.DISCOVERY 
                      ? MusicPriority.CRITICAL 
                      : MusicPriority.GAME_EVENT;
      
      const returnAfter = track.isJingle || 
                          eventType === MusicEventType.MINING_SUCCESS ||
                          eventType === MusicEventType.VICTORY;
      
      get().playWithPriority(track, priority, returnAfter);
      
      // Stop ambient timer for important events
      if (priority >= MusicPriority.GAME_EVENT) {
        get().stopAmbientTimer();
      }
      
      console.log(`[EnhancedMusicPlayer] Event music triggered: ${eventType}`);
    }
  },
  
  returnToUserMusic: () => {
    const { musicStack, layers, currentEnvironment } = get();
    
    // Try to pop from stack first
    const stackEntry = get().popFromStack();
    if (stackEntry) {
      get().playWithPriority(stackEntry.track, stackEntry.priority);
      return;
    }
    
    // Find the highest priority layer that should be playing
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.track && !layer.isPlaying) {
        get().playWithPriority(layer.track, layer.priority);
        break;
      }
    }
    
    // Resume ambient timer
    get().startAmbientTimer();
    
    console.log("[EnhancedMusicPlayer] Returned to user music");
  },
  
  // Environment changes
  setEnvironment: (env: EnvironmentType) => {
    set({ currentEnvironment: env });
    console.log(`[EnhancedMusicPlayer] Environment changed to: ${env}`);
    
    // Could trigger environment-specific theme music here
    const { tracks, currentPriority } = get();
    if (currentPriority <= MusicPriority.THEME) {
      // Find and play appropriate theme for this environment
      const themeTracks = tracks.filter(t => 
        t.priority === MusicPriority.THEME && 
        t.environment === env
      );
      
      if (themeTracks.length > 0) {
        const track = themeTracks[Math.floor(Math.random() * themeTracks.length)];
        get().playWithPriority(track, MusicPriority.THEME);
      }
    }
  },
  
  // Ambient system
  startAmbientTimer: () => {
    const { ambientTimerActive, ambientTimer, minAmbientDelay, maxAmbientDelay } = get();
    
    if (ambientTimerActive) return;
    
    // Clear any existing timer
    if (ambientTimer) {
      clearTimeout(ambientTimer);
    }
    
    const scheduleNext = () => {
      const delay = getRandomAmbientDelay(minAmbientDelay, maxAmbientDelay);
      const timer = setTimeout(() => {
        get().playRandomAmbient();
        scheduleNext(); // Schedule the next one
      }, delay);
      
      set({
        ambientTimer: timer,
        nextAmbientTime: Date.now() + delay,
        ambientTimerActive: true,
      });
      
      console.log(`[EnhancedMusicPlayer] Next ambient in ${Math.round(delay / 60000)} minutes`);
    };
    
    scheduleNext();
  },
  
  stopAmbientTimer: () => {
    const { ambientTimer } = get();
    
    if (ambientTimer) {
      clearTimeout(ambientTimer);
      set({
        ambientTimer: null,
        nextAmbientTime: null,
        ambientTimerActive: false,
      });
      
      console.log("[EnhancedMusicPlayer] Ambient timer stopped");
    }
  },
  
  playRandomAmbient: () => {
    const { currentEnvironment, ambientTracks, currentPriority } = get();
    
    // Only play ambient if nothing higher priority is playing
    if (currentPriority > MusicPriority.AMBIENT) {
      console.log("[EnhancedMusicPlayer] Skipping ambient (higher priority music playing)");
      return;
    }
    
    const tracks = ambientTracks.get(currentEnvironment) || [];
    if (tracks.length > 0) {
      const track = tracks[Math.floor(Math.random() * tracks.length)];
      get().playWithPriority(track, MusicPriority.AMBIENT);
      console.log(`[EnhancedMusicPlayer] Playing random ambient for ${currentEnvironment}`);
    }
  },
  
  // Volume control
  setMasterVolume: (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    set({ masterVolume: clampedVolume });
    
    // Update all playing tracks
    const { layers } = get();
    for (const layer of layers) {
      if (layer.track?.audio && layer.isPlaying) {
        layer.track.audio.volume = layer.volume * clampedVolume;
      }
    }
  },
  
  setLayerVolume: (priority: MusicPriority, volume: number) => {
    const { layers, masterVolume } = get();
    const layer = layers.find(l => l.priority === priority);
    
    if (layer) {
      layer.volume = Math.max(0, Math.min(1, volume));
      if (layer.track?.audio && layer.isPlaying) {
        layer.track.audio.volume = layer.volume * masterVolume;
      }
      set({ layers: [...layers] });
    }
  },
  
  // Stack management
  pushToStack: (track: MusicTrack, priority: MusicPriority, returnAfter = false) => {
    const { musicStack } = get();
    musicStack.push({
      track,
      priority,
      timestamp: Date.now(),
      returnAfter,
    });
    set({ musicStack: [...musicStack] });
  },
  
  popFromStack: () => {
    const { musicStack } = get();
    if (musicStack.length === 0) return undefined;
    
    const entry = musicStack.pop();
    set({ musicStack: [...musicStack] });
    return entry;
  },
  
  clearStack: () => {
    set({ musicStack: [] });
  },
  
  // Utility
  getActiveTrack: () => {
    const { activeLayer } = get();
    return activeLayer?.track || null;
  },
  
  getTracksByEvent: (eventType: MusicEventType) => {
    const { eventTracks } = get();
    return eventTracks.get(eventType) || [];
  },
  
  getAmbientTracks: (env: EnvironmentType) => {
    const { ambientTracks } = get();
    return ambientTracks.get(env) || [];
  },
  
  cleanup: () => {
    const { layers, ambientTimer } = get();
    
    console.log("[EnhancedMusicPlayer] Cleaning up...");
    
    // Stop all music
    for (const layer of layers) {
      if (layer.track?.audio) {
        layer.track.audio.pause();
        layer.track.audio.currentTime = 0;
        layer.track = null;
        layer.isPlaying = false;
      }
    }
    
    // Clear ambient timer
    if (ambientTimer) {
      clearTimeout(ambientTimer);
    }
    
    // Clear stack
    get().clearStack();
    
    set({
      layers: [...layers],
      activeLayer: null,
      isPlaying: false,
      ambientTimer: null,
      nextAmbientTime: null,
      ambientTimerActive: false,
    });
  },
}));

// Lazy subscription setup to avoid circular dependency
let volumeSubscriptionInitialized = false;
function initializeVolumeSubscription() {
  if (volumeSubscriptionInitialized) return;
  volumeSubscriptionInitialized = true;
  
  // Subscribe to volume changes from useAudio and update all active layers
  useAudio.subscribe((audioState) => {
    const { masterVolume, musicVolume, masterMute, musicMute } = audioState;
    const enhancedPlayerState = useEnhancedMusicPlayer.getState();
    const { layers, isPlaying } = enhancedPlayerState;
    
    // Update volume of all currently playing layers in real-time
    if (isPlaying) {
      layers.forEach(layer => {
        if (layer.isPlaying && layer.track?.audio) {
          // Check mute state
          if (masterMute || musicMute) {
            layer.track.audio.volume = 0;
          } else {
            // Apply volume multiplication: layer.volume × musicVolume × masterVolume
            const actualVolume = layer.volume * musicVolume * masterVolume;
            layer.track.audio.volume = actualVolume;
          }
        }
      });
    }
  });
}

// Helper functions for smooth fading
function fadeIn(audio: HTMLAudioElement, getTargetVolume: () => number, duration: number) {
  const initialTarget = getTargetVolume();
  const step = initialTarget / (duration / 50);
  const interval = setInterval(() => {
    // Re-check mute state on every tick
    const { masterMute, musicMute } = useAudio.getState();
    
    if (masterMute || musicMute) {
      // Muted during fade - stop fading and set to 0
      audio.volume = 0;
      clearInterval(interval);
      return;
    }
    
    // Recalculate target volume on every tick to honor slider changes
    const latestTarget = getTargetVolume();
    
    if (audio.volume < latestTarget - step) {
      audio.volume = Math.min(latestTarget, audio.volume + step);
    } else {
      audio.volume = latestTarget;
      clearInterval(interval);
    }
  }, 50);
}

function fadeOut(audio: HTMLAudioElement, duration: number, onComplete?: () => void) {
  const startVolume = audio.volume;
  const step = startVolume / (duration / 50);
  const interval = setInterval(() => {
    if (audio.volume > step) {
      audio.volume = Math.max(0, audio.volume - step);
    } else {
      audio.volume = 0;
      clearInterval(interval);
      if (onComplete) onComplete();
    }
  }, 50);
}

// Auto-initialize when the store is first accessed
let isAutoInitializing = false;
export const initializeEnhancedMusicPlayer = () => {
  if (!isAutoInitializing) {
    isAutoInitializing = true;
    
    // Initialize volume subscription
    initializeVolumeSubscription();
    
    setTimeout(() => {
      useEnhancedMusicPlayer.getState().initialize();
    }, 1000); // Delay to ensure audio context is ready
  }
};