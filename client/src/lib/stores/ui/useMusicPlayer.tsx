import { create } from "zustand";
import { useAudio } from "./useAudio";
import { useLandedState } from "../surface/useLandedState";
import { AUDIO_CONFIG, AudioCategory, MusicContext } from "../../audioConfig";

// Priority levels for music
export enum MusicPriority {
  AMBIENT = 0,
  THEME = 1,
  GAME_EVENT = 2,
  CRITICAL = 3,
}

interface Track {
  id: string;
  name: string;
  filename: string;
  audio: HTMLAudioElement | null;
  categories: AudioCategory[];
  priority?: MusicPriority;
}

interface MusicPlayerState {
  tracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number;
  isLoaded: boolean;
  isLoading: boolean;
  nextPlayTime: number | null;
  showPlaylist: boolean;
  crossfadeTimeout: NodeJS.Timeout | null;
  fadeIntervals: Set<NodeJS.Timeout>;
  playbackMode: "random" | "sequential";
  lastPlayedTracks: number[];
  hasPlayedInitialTrack: boolean;
  
  // Priority system
  currentPriority: MusicPriority;
  musicStack: Array<{ trackIndex: number; priority: MusicPriority }>;
  
  // Minecraft-style ambient timer
  ambientTimer: NodeJS.Timeout | null;
  ambientTimerActive: boolean;
  minAmbientDelay: number; // 5 minutes
  maxAmbientDelay: number; // 15 minutes
  currentMusicContext: MusicContext; // Current game context for music selection

  // Actions
  loadTracks: () => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  selectTrack: (index: number) => void;
  setVolume: (volume: number) => void;
  togglePlaylist: () => void;
  setPlaybackMode: (mode: "random" | "sequential") => void;
  scheduleNextTrack: () => void;
  crossfadeToTrack: (trackIndex: number, priority?: MusicPriority) => void;
  getCurrentTrack: () => Track | null;
  getRandomTrackIndex: (isOnSurface?: boolean) => number;
  getFilteredTracks: (isOnSurface: boolean) => Track[];
  cleanup: () => void;
  
  // Event handlers for game triggers
  triggerCombatMusic: () => void;
  triggerTransitionMusic: (track?: Track) => void;
  triggerEventMusic: (eventType: string) => void;
  returnToUserMusic: () => void;
  
  // Ambient system
  startAmbientTimer: (context?: MusicContext) => void;
  stopAmbientTimer: () => void;
  playRandomAmbient: () => void;
  
  // Location change handlers
  resetTimerOnLocationChange: (newContext: MusicContext) => void;
  setMusicContext: (context: MusicContext) => void;
}

// Random delay between tracks (2-10 minutes in milliseconds)
const getRandomDelay = () => Math.random() * (600000 - 120000) + 120000;

// Minecraft-style random delay - context-aware based on game state
const getRandomAmbientDelay = (context: MusicContext = "exploration"): number => {
  const settings = AUDIO_CONFIG.minecraftMusicSettings;
  const range = settings.delayRanges[context];
  
  if (!range) {
    console.warn(`[MusicPlayer] Unknown context: ${context}, using exploration defaults`);
    const explorationRange = settings.delayRanges.exploration;
    return Math.random() * (explorationRange.max - explorationRange.min) + explorationRange.min;
  }
  
  const delay = Math.random() * (range.max - range.min) + range.min;
  console.log(`[MusicPlayer] Random delay for ${context}: ${Math.round(delay / 60000)} minutes`);
  return delay;
};

export const useMusicPlayer = create<MusicPlayerState>((set, get) => ({
  tracks: [],
  currentTrackIndex: 0,
  isPlaying: false,
  volume: 0.1, // Lower volume for first auto-play
  isLoaded: false,
  isLoading: false,
  nextPlayTime: null,
  showPlaylist: false,
  crossfadeTimeout: null,
  fadeIntervals: new Set(),
  playbackMode: "random",
  lastPlayedTracks: [],
  hasPlayedInitialTrack: false,
  
  // Priority system
  currentPriority: MusicPriority.AMBIENT,
  musicStack: [],
  
  // Minecraft-style ambient timer
  ambientTimer: null,
  ambientTimerActive: false,
  minAmbientDelay: 5 * 60 * 1000, // 5 minutes
  maxAmbientDelay: 15 * 60 * 1000, // 15 minutes
  currentMusicContext: "exploration", // Default context

  loadTracks: async () => {
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true });
    console.log("Initializing music tracks (lazy loading enabled)...");

    try {
      // Initialize tracks without loading audio - will load on-demand
      const tracks: Track[] = AUDIO_CONFIG.musicTracks.map((file, index) => ({
        id: `track-${index}`,
        name: file.name,
        filename: file.filename,
        audio: null, // Will be loaded on-demand
        categories: [...file.categories],
        priority: (file as any).priority,
      }));

      set({
        tracks,
        isLoaded: true,
        isLoading: false,
        currentTrackIndex: 0,
      });

      console.log(`Initialized ${tracks.length} music tracks (will load on-demand)`);
    } catch (error) {
      console.error("Error initializing music tracks:", error);
      set({ isLoading: false });
    }
  },
  
  // Helper function to load a track on-demand
  loadTrackAudio: async (track: Track): Promise<boolean> => {
    if (track.audio) return true; // Already loaded
    
    console.log(`[MusicPlayer] Loading track on-demand: ${track.name}`);
    
    try {
      const audio = new Audio(`${AUDIO_CONFIG.musicBasePath}${track.filename}`);
      
      return new Promise((resolve) => {
        audio.addEventListener("canplaythrough", () => {
          audio.volume = 0;
          audio.loop = false;
          track.audio = audio;
          
          audio.addEventListener("ended", () => {
            console.log(`Track "${track.name}" ended naturally`);
            get().scheduleNextTrack();
          });
          
          console.log(`[MusicPlayer] Track loaded: ${track.name}`);
          resolve(true);
        });
        
        audio.addEventListener("error", (e) => {
          console.error(`[MusicPlayer] Failed to load ${track.filename}:`, e);
          track.audio = null;
          resolve(false);
        });
        
        audio.load();
      });
    } catch (error) {
      console.error(`[MusicPlayer] Error loading track ${track.name}:`, error);
      return false;
    }
  },

  play: async () => {
    const { tracks, currentTrackIndex, volume } = get();
    const { masterMute, musicMute } = useAudio.getState();

    if (masterMute || musicMute) {
      console.log("Music playback skipped (muted)");
      return;
    }

    if (tracks.length === 0) return;

    const currentTrack = tracks[currentTrackIndex];
    if (currentTrack) {
      // Load track on-demand if not already loaded
      if (!currentTrack.audio) {
        const loaded = await (get() as any).loadTrackAudio(currentTrack);
        if (!loaded) {
          console.error(`Failed to load track: ${currentTrack.name}`);
          return;
        }
      }
      
      if (currentTrack.audio) {
        currentTrack.audio.volume = volume;
        currentTrack.audio.play().catch((error) => {
          console.log("Music play prevented:", error);
        });

        set({ isPlaying: true });
        console.log(`Playing: ${currentTrack.name}`);
      }
    }
  },

  pause: () => {
    const { tracks, currentTrackIndex } = get();
    if (tracks.length === 0) return;

    const currentTrack = tracks[currentTrackIndex];
    if (currentTrack?.audio) {
      currentTrack.audio.pause();
      set({ isPlaying: false });
      console.log(`Paused: ${currentTrack.name}`);
    }
  },

  togglePlayPause: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  skipNext: () => {
    const { tracks, playbackMode } = get();
    if (tracks.length === 0) return;

    // Check if player is on a planet surface for context-aware selection
    const { isLanded } = useLandedState.getState();

    let nextIndex;
    if (playbackMode === "random") {
      nextIndex = get().getRandomTrackIndex(isLanded);
    } else {
      nextIndex = (get().currentTrackIndex + 1) % tracks.length;
    }

    get().crossfadeToTrack(nextIndex);
  },

  skipPrevious: () => {
    const { tracks, lastPlayedTracks } = get();
    if (tracks.length === 0) return;

    // Check if player is on a planet surface for context-aware selection
    const { isLanded } = useLandedState.getState();

    let prevIndex;
    if (lastPlayedTracks.length > 1) {
      // Go to the second-to-last track
      prevIndex = lastPlayedTracks[lastPlayedTracks.length - 2];
    } else {
      // Fallback to previous in sequence
      prevIndex = (get().currentTrackIndex - 1 + tracks.length) % tracks.length;
    }

    get().crossfadeToTrack(prevIndex);
  },

  selectTrack: (index: number) => {
    const { tracks } = get();
    if (index >= 0 && index < tracks.length) {
      get().crossfadeToTrack(index);
    }
  },

  setVolume: (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    set({ volume: clampedVolume });

    const { tracks, currentTrackIndex, isPlaying } = get();
    if (isPlaying && tracks.length > 0) {
      const currentTrack = tracks[currentTrackIndex];
      if (currentTrack?.audio) {
        currentTrack.audio.volume = clampedVolume;
      }
    }
  },

  togglePlaylist: () => {
    set((state) => ({ showPlaylist: !state.showPlaylist }));
  },

  setPlaybackMode: (mode: "random" | "sequential") => {
    set({ playbackMode: mode });
    console.log(`Playback mode set to: ${mode}`);
  },

  scheduleNextTrack: () => {
    const { crossfadeTimeout, hasPlayedInitialTrack, fadeIntervals } = get();

    // Clear existing timeout
    if (crossfadeTimeout) {
      clearTimeout(crossfadeTimeout);
    }

    // For first track: 30 seconds of inactivity, then longer delays
    const delay = hasPlayedInitialTrack ? getRandomDelay() : 30000; // 30 seconds for first track
    const nextPlayTime = Date.now() + delay;

    const timeout = setTimeout(() => {
      // Check if player is on a planet surface
      const { isLanded } = useLandedState.getState();
      const nextIndex = get().getRandomTrackIndex(isLanded);
      get().crossfadeToTrack(nextIndex);
    }, delay);

    set({
      crossfadeTimeout: timeout,
      nextPlayTime,
    });

    const timeDesc = hasPlayedInitialTrack 
      ? `${Math.round(delay / 1000)} seconds (random)` 
      : "30 seconds (initial auto-play)";
    console.log(`[MusicPlayer] Next track scheduled in ${timeDesc}`);
  },

  crossfadeToTrack: (trackIndex: number, priority?: MusicPriority) => {
    const { tracks, currentTrackIndex, volume, isPlaying, lastPlayedTracks, hasPlayedInitialTrack, fadeIntervals, currentPriority } =
      get();
    const { masterMute, musicMute } = useAudio.getState();
    
    // Handle priority if specified
    const newPriority = priority !== undefined ? priority : currentPriority;
    
    // Don't interrupt higher priority music
    if (newPriority < currentPriority) {
      console.log(`[MusicPlayer] Track queued (higher priority music playing)`);
      get().musicStack.push({ trackIndex, priority: newPriority });
      return;
    }

    if (tracks.length === 0 || trackIndex < 0 || trackIndex >= tracks.length)
      return;

    const currentTrack = tracks[currentTrackIndex];
    const nextTrack = tracks[trackIndex];

    // Clear all existing fade intervals
    fadeIntervals.forEach(interval => clearInterval(interval));
    fadeIntervals.clear();

    // Update last played tracks history
    const updatedHistory = [...lastPlayedTracks, currentTrackIndex].slice(-5); // Keep last 5 tracks

    // Fade out current track completely before starting next (prevents overlap)
    if (currentTrack?.audio && isPlaying) {
      const fadeOutInterval = setInterval(() => {
        if (currentTrack.audio!.volume > 0.01) {
          currentTrack.audio!.volume = Math.max(
            0,
            currentTrack.audio!.volume - 0.05,
          );
        } else {
          currentTrack.audio!.pause();
          currentTrack.audio!.currentTime = 0;
          clearInterval(fadeOutInterval);
          fadeIntervals.delete(fadeOutInterval);
          
          // Add a gap before starting next track (500ms silence)
          setTimeout(() => {
            startNextTrack();
          }, 500);
        }
      }, 50);
      
      fadeIntervals.add(fadeOutInterval);
      set({ fadeIntervals });
    } else if (currentTrack?.audio) {
      currentTrack.audio.pause();
      currentTrack.audio.currentTime = 0;
      // Start next track immediately if no current track is playing
      startNextTrack();
    } else {
      // No current track, start next immediately
      startNextTrack();
    }

    async function startNextTrack() {
      // Switch to next track
      set({
        currentTrackIndex: trackIndex,
        lastPlayedTracks: updatedHistory,
        hasPlayedInitialTrack: true, // Mark that we've played the initial track
      });

      // Update priority
      set({ currentPriority: newPriority });
      
      // Load track on-demand if not already loaded
      if (!nextTrack.audio) {
        const loaded = await (get() as any).loadTrackAudio(nextTrack);
        if (!loaded) {
          console.error(`[MusicPlayer] Failed to load track: ${nextTrack.name}`);
          // Try next track if this one fails
          get().scheduleNextTrack();
          return;
        }
      }
      
      // Fade in next track
      if (nextTrack.audio && !masterMute && !musicMute) {
        nextTrack.audio.volume = 0;
        nextTrack.audio.currentTime = 0;

        nextTrack.audio
          .play()
          .then(() => {
            const fadeInInterval = setInterval(() => {
              if (nextTrack.audio!.volume < volume - 0.01) {
                nextTrack.audio!.volume = Math.min(
                  volume,
                  nextTrack.audio!.volume + 0.02,
                );
              } else {
                nextTrack.audio!.volume = volume;
                clearInterval(fadeInInterval);
                fadeIntervals.delete(fadeInInterval);
              }
            }, 100);
            
            fadeIntervals.add(fadeInInterval);
            set({ isPlaying: true, fadeIntervals });
            console.log(`[MusicPlayer] Crossfaded to: ${nextTrack.name} ${!hasPlayedInitialTrack ? "(initial auto-play)" : ""}`);
          })
          .catch((error) => {
            console.log("[MusicPlayer] Music crossfade prevented:", error);
          });
      }

      // Schedule the next track (now with proper timing based on hasPlayedInitialTrack)
      get().scheduleNextTrack();
    }
  },

  getCurrentTrack: () => {
    const { tracks, currentTrackIndex } = get();
    return tracks[currentTrackIndex] || null;
  },

  getFilteredTracks: (isOnSurface: boolean) => {
    const { tracks } = get();
    
    // When in space, allow all tracks (full selection)
    if (!isOnSurface) {
      return tracks;
    }
    
    // When on surface, only play surface or atmospheric tracks
    const filtered = tracks.filter(track => 
      track.categories.includes("surface") || 
      track.categories.includes("atmospheric")
    );
    
    // If no tracks match, return all tracks as fallback
    return filtered.length > 0 ? filtered : tracks;
  },

  getRandomTrackIndex: (isOnSurface?: boolean) => {
    const { tracks, currentTrackIndex, lastPlayedTracks } = get();
    if (tracks.length <= 1) return 0;

    // Get appropriate tracks based on context
    let availableTracks = tracks;
    if (isOnSurface !== undefined) {
      const filteredTracks = get().getFilteredTracks(isOnSurface);
      // Map filtered tracks back to their indices in the main tracks array
      const filteredIndices = filteredTracks.map(track => 
        tracks.findIndex(t => t.id === track.id)
      ).filter(index => index !== -1);
      
      // Avoid recently played tracks from the filtered set
      const availableIndices = filteredIndices.filter(
        (index) =>
          index !== currentTrackIndex &&
          !lastPlayedTracks.slice(-2).includes(index),
      );

      if (availableIndices.length > 0) {
        return availableIndices[
          Math.floor(Math.random() * availableIndices.length)
        ];
      }
      
      // Fallback: any filtered track that's not current
      const fallbackIndices = filteredIndices.filter(
        (index) => index !== currentTrackIndex
      );
      if (fallbackIndices.length > 0) {
        return fallbackIndices[Math.floor(Math.random() * fallbackIndices.length)];
      }
    }

    // Default behavior (no context filtering)
    const availableIndices = tracks
      .map((_, index) => index)
      .filter(
        (index) =>
          index !== currentTrackIndex &&
          !lastPlayedTracks.slice(-2).includes(index),
      );

    if (availableIndices.length === 0) {
      return (
        tracks
          .map((_, index) => index)
          .filter((index) => index !== currentTrackIndex)[0] || 0
      );
    }

    return availableIndices[
      Math.floor(Math.random() * availableIndices.length)
    ];
  },
  
  cleanup: () => {
    const { tracks, currentTrackIndex, crossfadeTimeout, fadeIntervals, ambientTimer } = get();
    
    console.log("[MusicPlayer] Cleanup: Stopping all music and clearing timers");
    
    // Stop current track if playing
    if (tracks[currentTrackIndex]?.audio) {
      tracks[currentTrackIndex].audio!.pause();
      tracks[currentTrackIndex].audio!.currentTime = 0;
      tracks[currentTrackIndex].audio!.volume = get().volume;
    }
    
    // Clear crossfade timeout
    if (crossfadeTimeout) {
      clearTimeout(crossfadeTimeout);
    }
    
    // Clear ambient timer
    if (ambientTimer) {
      clearTimeout(ambientTimer);
    }
    
    // Clear all fade intervals
    fadeIntervals.forEach(interval => clearInterval(interval));
    
    // Reset state
    set({
      isPlaying: false,
      crossfadeTimeout: null,
      fadeIntervals: new Set(),
      nextPlayTime: null,
      ambientTimer: null,
      ambientTimerActive: false
    });
  },
  
  // Event handlers for game triggers
  triggerCombatMusic: () => {
    console.log("[MusicPlayer] Combat music triggered (instant action music)");
    const { tracks } = get();
    const settings = AUDIO_CONFIG.minecraftMusicSettings;
    
    // Set context to combat
    set({ currentMusicContext: "combat" });
    
    // Check trigger probability for enemy spawn
    const shouldTrigger = Math.random() < settings.triggerChance.onEnemySpawn;
    
    if (!shouldTrigger) {
      console.log(`[MusicPlayer] Combat trigger check failed (${Math.round(settings.triggerChance.onEnemySpawn * 100)}% chance)`);
      return;
    }
    
    // Find combat music tracks using action context
    const actionCategories = settings.contexts.action;
    const combatTracks = tracks.filter(track => 
      track.categories.some(cat => actionCategories.includes(cat as AudioCategory))
    );
    
    if (combatTracks.length > 0) {
      const randomTrack = combatTracks[Math.floor(Math.random() * combatTracks.length)];
      const trackIndex = tracks.findIndex(t => t.id === randomTrack.id);
      if (trackIndex !== -1) {
        console.log(`[MusicPlayer] Playing combat track: ${randomTrack.name}`);
        get().crossfadeToTrack(trackIndex, MusicPriority.GAME_EVENT);
        get().stopAmbientTimer();
        
        // Auto-start combat timer if configured (instant triggers)
        if (settings.autoStart.onCombatStart) {
          setTimeout(() => {
            const delay = getRandomAmbientDelay("combat"); // Very short delay (0-1 sec)
            console.log(`[MusicPlayer] Combat music will loop in ${delay}ms`);
          }, 100);
        }
      }
    }
  },
  
  triggerTransitionMusic: (track?: Track) => {
    console.log("[MusicPlayer] Transition music triggered");
    const { tracks } = get();
    
    if (track) {
      const trackIndex = tracks.findIndex(t => t.id === track.id);
      if (trackIndex !== -1) {
        get().crossfadeToTrack(trackIndex, MusicPriority.GAME_EVENT);
      }
    } else {
      // Play a random transition track
      const transitionTracks = tracks.filter(t => 
        t.categories.includes("atmospheric" as AudioCategory)
      );
      
      if (transitionTracks.length > 0) {
        const randomTrack = transitionTracks[Math.floor(Math.random() * transitionTracks.length)];
        const trackIndex = tracks.findIndex(t => t.id === randomTrack.id);
        if (trackIndex !== -1) {
          get().crossfadeToTrack(trackIndex, MusicPriority.GAME_EVENT);
        }
      }
    }
    
    get().stopAmbientTimer();
  },
  
  triggerEventMusic: (eventType: string) => {
    console.log(`[MusicPlayer] Event music triggered: ${eventType}`);
    const { tracks } = get();
    
    // Map event types to music categories/names
    let filterFn: (track: Track) => boolean;
    let priority = MusicPriority.GAME_EVENT;
    
    switch (eventType) {
      case "mining_success":
        filterFn = (t) => t.name.toLowerCase().includes("success") || t.name.toLowerCase().includes("discovery");
        priority = MusicPriority.CRITICAL;
        break;
      case "low_fuel":
        filterFn = (t) => t.name.toLowerCase().includes("tension") || t.name.toLowerCase().includes("danger");
        break;
      case "station_docking":
        filterFn = (t) => t.categories.includes("atmospheric" as AudioCategory);
        priority = MusicPriority.THEME;
        break;
      case "victory":
        filterFn = (t) => t.name.toLowerCase().includes("victory") || t.name.toLowerCase().includes("success");
        priority = MusicPriority.CRITICAL;
        break;
      default:
        filterFn = (t) => t.categories.includes("space" as AudioCategory);
    }
    
    const eventTracks = tracks.filter(filterFn);
    
    if (eventTracks.length > 0) {
      const randomTrack = eventTracks[Math.floor(Math.random() * eventTracks.length)];
      const trackIndex = tracks.findIndex(t => t.id === randomTrack.id);
      if (trackIndex !== -1) {
        get().crossfadeToTrack(trackIndex, priority);
        
        // Stop ambient timer for important events
        if (priority >= MusicPriority.GAME_EVENT) {
          get().stopAmbientTimer();
        }
      }
    }
  },
  
  returnToUserMusic: () => {
    console.log("[MusicPlayer] Returning to user music");
    const { musicStack, tracks, currentPriority } = get();
    
    // Pop from music stack if there's something to return to
    if (musicStack.length > 0) {
      const entry = musicStack.pop();
      if (entry) {
        set({ musicStack: [...musicStack] });
        get().crossfadeToTrack(entry.trackIndex, entry.priority);
        return;
      }
    }
    
    // Otherwise, return to ambient music
    set({ currentPriority: MusicPriority.AMBIENT });
    
    // Resume ambient playback
    const { isLanded } = useLandedState.getState();
    const nextIndex = get().getRandomTrackIndex(isLanded);
    get().crossfadeToTrack(nextIndex, MusicPriority.AMBIENT);
    
    // Restart ambient timer
    get().startAmbientTimer();
  },
  
  // Ambient system
  startAmbientTimer: (context?: MusicContext) => {
    const { ambientTimerActive, ambientTimer, currentMusicContext } = get();
    
    if (ambientTimerActive) return;
    
    // Clear any existing timer
    if (ambientTimer) {
      clearTimeout(ambientTimer);
    }
    
    // Use provided context or current context
    const musicContext = context || currentMusicContext;
    
    const scheduleNext = () => {
      const delay = getRandomAmbientDelay(musicContext);
      const timer = setTimeout(() => {
        get().playRandomAmbient();
        scheduleNext(); // Schedule the next one
      }, delay);
      
      set({
        ambientTimer: timer,
        ambientTimerActive: true,
        nextPlayTime: Date.now() + delay
      });
      
      console.log(`[MusicPlayer] Next ambient music in ${Math.round(delay / 60000)} minutes (context: ${musicContext})`);
    };
    
    scheduleNext();
  },
  
  stopAmbientTimer: () => {
    const { ambientTimer } = get();
    
    if (ambientTimer) {
      clearTimeout(ambientTimer);
      set({
        ambientTimer: null,
        ambientTimerActive: false,
        nextPlayTime: null
      });
      
      console.log("[MusicPlayer] Ambient timer stopped");
    }
  },
  
  playRandomAmbient: () => {
    const { currentPriority, tracks } = get();
    
    // Only play ambient if nothing higher priority is playing
    if (currentPriority > MusicPriority.AMBIENT) {
      console.log("[MusicPlayer] Skipping ambient (higher priority music playing)");
      return;
    }
    
    const { isLanded } = useLandedState.getState();
    const filteredTracks = get().getFilteredTracks(isLanded);
    
    if (filteredTracks.length > 0) {
      const randomTrack = filteredTracks[Math.floor(Math.random() * filteredTracks.length)];
      const trackIndex = tracks.findIndex(t => t.id === randomTrack.id);
      if (trackIndex !== -1) {
        get().crossfadeToTrack(trackIndex, MusicPriority.AMBIENT);
        console.log(`[MusicPlayer] Playing random ambient: ${randomTrack.name}`);
      }
    }
  },
  
  // Location change handlers
  resetTimerOnLocationChange: (newContext: MusicContext) => {
    const settings = AUDIO_CONFIG.minecraftMusicSettings;
    
    console.log(`[MusicPlayer] Location changed to: ${newContext}`);
    
    // Update current context
    set({ currentMusicContext: newContext });
    
    // Check trigger probability
    const shouldTrigger = Math.random() < settings.triggerChance.onLocationChange;
    
    if (!shouldTrigger) {
      console.log(`[MusicPlayer] Random check failed (${Math.round(settings.triggerChance.onLocationChange * 100)}% chance), no timer restart`);
      return;
    }
    
    // Check auto-start settings
    const shouldAutoStart = 
      (newContext === "planet" && settings.autoStart.onPlanetEntry) ||
      (newContext === "space" && settings.autoStart.onSpaceEntry);
    
    if (shouldAutoStart) {
      console.log(`[MusicPlayer] Auto-starting timer for ${newContext} context`);
      get().stopAmbientTimer();
      get().startAmbientTimer(newContext);
    }
  },
  
  setMusicContext: (context: MusicContext) => {
    console.log(`[MusicPlayer] Music context set to: ${context}`);
    set({ currentMusicContext: context });
  }
}));

// Track initialization state globally to prevent multiple initializations
let isInitialized = false;
let isAutoLoading = false;

export const initializeMusicPlayer = () => {
  if (!isAutoLoading && !isInitialized) {
    isAutoLoading = true;
    console.log('[MusicPlayer] Initializing music player (singleton)');
    setTimeout(() => {
      const state = useMusicPlayer.getState();
      if (!state.isLoaded && !state.isLoading) {
        state.loadTracks();
        isInitialized = true;
      } else {
        console.log('[MusicPlayer] Already loaded, skipping initialization');
      }
    }, 1000); // Delay to ensure audio context is ready
  } else {
    console.log('[MusicPlayer] Music player already initialized, skipping');
  }
};
