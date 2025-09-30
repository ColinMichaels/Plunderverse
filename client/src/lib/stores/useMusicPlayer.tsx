import { create } from "zustand";
import { useAudio } from "./useAudio";
import { useLandedState } from "./useLandedState";
import { AUDIO_CONFIG, AudioCategory } from "../audioConfig";

interface Track {
  id: string;
  name: string;
  filename: string;
  audio: HTMLAudioElement | null;
  categories: AudioCategory[];
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
  playbackMode: "random" | "sequential";
  lastPlayedTracks: number[];
  hasPlayedInitialTrack: boolean;

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
  crossfadeToTrack: (trackIndex: number) => void;
  getCurrentTrack: () => Track | null;
  getRandomTrackIndex: (isOnSurface?: boolean) => number;
  getFilteredTracks: (isOnSurface: boolean) => Track[];
}

// Random delay between tracks (2-10 minutes in milliseconds)


const getRandomDelay = () => Math.random() * (600000 - 120000) + 120000;

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
  playbackMode: "random",
  lastPlayedTracks: [],
  hasPlayedInitialTrack: false,

  loadTracks: async () => {
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true });
    console.log("Loading music tracks...");

    try {
      const loadedTracks: Track[] = await Promise.all(
        AUDIO_CONFIG.musicTracks.map(async (file, index) => {
          const audio = new Audio(`/sounds/music/${file.filename}`);

          return new Promise<Track>((resolve, reject) => {
            const track: Track = {
              id: `track-${index}`,
              name: file.name,
              filename: file.filename,
              audio: null,
              categories: [...file.categories],
            };

            audio.addEventListener("canplaythrough", () => {
              audio.volume = 0;
              audio.loop = false;
              track.audio = audio;
              resolve(track);
            });

            audio.addEventListener("error", (e) => {
              console.error(`Failed to load ${file.filename}:`, e);
              track.audio = null;
              resolve(track); // Still resolve to not block other tracks
            });

            audio.addEventListener("ended", () => {
              console.log(`Track "${track.name}" ended naturally`);
              get().scheduleNextTrack();
            });

            audio.load();
          });
        }),
      );

      const validTracks = loadedTracks.filter((track) => track.audio !== null);

      set({
        tracks: validTracks,
        isLoaded: true,
        isLoading: false,
        currentTrackIndex: 0,
      });

      console.log(`Loaded ${validTracks.length} music tracks (use music player to start playback)`);
    } catch (error) {
      console.error("Error loading music tracks:", error);
      set({ isLoading: false });
    }
  },

  play: () => {
    const { tracks, currentTrackIndex, volume } = get();
    const { isMuted } = useAudio.getState();

    if (isMuted) {
      console.log("Music playback skipped (globally muted)");
      return;
    }

    if (tracks.length === 0) return;

    const currentTrack = tracks[currentTrackIndex];
    if (currentTrack?.audio) {
      currentTrack.audio.volume = volume;
      currentTrack.audio.play().catch((error) => {
        console.log("Music play prevented:", error);
      });

      set({ isPlaying: true });
      console.log(`Playing: ${currentTrack.name}`);
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
    const { crossfadeTimeout, hasPlayedInitialTrack } = get();

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
    console.log(`Next track scheduled in ${timeDesc}`);
  },

  crossfadeToTrack: (trackIndex: number) => {
    const { tracks, currentTrackIndex, volume, isPlaying, lastPlayedTracks, hasPlayedInitialTrack } =
      get();
    const { isMuted } = useAudio.getState();

    if (tracks.length === 0 || trackIndex < 0 || trackIndex >= tracks.length)
      return;

    const currentTrack = tracks[currentTrackIndex];
    const nextTrack = tracks[trackIndex];

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
          
          // Add a gap before starting next track (500ms silence)
          setTimeout(() => {
            startNextTrack();
          }, 500);
        }
      }, 50);
    } else if (currentTrack?.audio) {
      currentTrack.audio.pause();
      currentTrack.audio.currentTime = 0;
      // Start next track immediately if no current track is playing
      startNextTrack();
    } else {
      // No current track, start next immediately
      startNextTrack();
    }

    function startNextTrack() {
      // Switch to next track
      set({
        currentTrackIndex: trackIndex,
        lastPlayedTracks: updatedHistory,
        hasPlayedInitialTrack: true, // Mark that we've played the initial track
      });

      // Fade in next track
      if (nextTrack?.audio && !isMuted) {
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
              }
            }, 100);

            set({ isPlaying: true });
            console.log(`Crossfaded to: ${nextTrack.name} ${!hasPlayedInitialTrack ? "(initial auto-play)" : ""}`);
          })
          .catch((error) => {
            console.log("Music crossfade prevented:", error);
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
}));

// Auto-load tracks when the store is first accessed
let isAutoLoading = false;
export const initializeMusicPlayer = () => {
  if (!isAutoLoading) {
    isAutoLoading = true;
    setTimeout(() => {
      useMusicPlayer.getState().loadTracks();
    }, 1000); // Delay to ensure audio context is ready
  }
};
