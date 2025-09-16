import { create } from "zustand";
import { useAudio } from "./useAudio";

interface Track {
  id: string;
  name: string;
  filename: string;
  audio: HTMLAudioElement | null;
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
  getRandomTrackIndex: () => number;
}

// scan music files in the public/sounds/music directory
// and create an array of objects with the filename and name of each track
// todo: automate this process using a script to scan the directory and generate the array

const MUSIC_FILES = [
  {
    filename: "ES_Ame - Shinji Wakasa.mp3",
    name: "Ame by Shinji Wakasa",
  },
  {
    filename: "ES_Cairn - By Lotus.mp3",
    name: "Cairn by Lotus",
  },
  {
    filename: "ES_Rotting Circuit - Joseph Beg.mp3",
    name: "Rotting Circuit by Joseph Beg",
  },
  {
    filename: "ES_Lovesick - Cushy.mp3",
    name: "Lovesick by Cushy",
  },
  {
    filename: "ES_Night Sky Travel - Static Glow Sounds.mp3",
    name: "Night Sky Travel by Static Glow Sounds",
  },
  {
    filename: "ES_Orbit - Van Sandano.mp3",
    name: "Orbit by Van Sandano",
  },
];

// Random delay between tracks (2-10 minutes in milliseconds)
const getRandomDelay = () => Math.random() * (600000 - 120000) + 120000;

export const useMusicPlayer = create<MusicPlayerState>((set, get) => ({
  tracks: [],
  currentTrackIndex: 0,
  isPlaying: false,
  volume: 0.15, // Low background volume like Minecraft
  isLoaded: false,
  isLoading: false,
  nextPlayTime: null,
  showPlaylist: false,
  crossfadeTimeout: null,
  playbackMode: "random",
  lastPlayedTracks: [],

  loadTracks: async () => {
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true });
    console.log("Loading music tracks...");

    try {
      const loadedTracks: Track[] = await Promise.all(
        MUSIC_FILES.map(async (file, index) => {
          const audio = new Audio(`/sounds/music/${file.filename}`);

          return new Promise<Track>((resolve, reject) => {
            const track: Track = {
              id: `track-${index}`,
              name: file.name,
              filename: file.filename,
              audio: null,
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

      console.log(`Loaded ${validTracks.length} music tracks`);

      // Start the Minecraft-style random music system
      get().scheduleNextTrack();
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

    let nextIndex;
    if (playbackMode === "random") {
      nextIndex = get().getRandomTrackIndex();
    } else {
      nextIndex = (get().currentTrackIndex + 1) % tracks.length;
    }

    get().crossfadeToTrack(nextIndex);
  },

  skipPrevious: () => {
    const { tracks, lastPlayedTracks } = get();
    if (tracks.length === 0) return;

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
    const { crossfadeTimeout } = get();

    // Clear existing timeout
    if (crossfadeTimeout) {
      clearTimeout(crossfadeTimeout);
    }

    // Schedule next track with random delay (Minecraft-style)
    const delay = getRandomDelay();
    const nextPlayTime = Date.now() + delay;

    const timeout = setTimeout(() => {
      const nextIndex = get().getRandomTrackIndex();
      get().crossfadeToTrack(nextIndex);
    }, delay);

    set({
      crossfadeTimeout: timeout,
      nextPlayTime,
    });

    console.log(`Next track scheduled in ${Math.round(delay / 1000)} seconds`);
  },

  crossfadeToTrack: (trackIndex: number) => {
    const { tracks, currentTrackIndex, volume, isPlaying, lastPlayedTracks } =
      get();
    const { isMuted } = useAudio.getState();

    if (tracks.length === 0 || trackIndex < 0 || trackIndex >= tracks.length)
      return;

    const currentTrack = tracks[currentTrackIndex];
    const nextTrack = tracks[trackIndex];

    // Update last played tracks history
    const updatedHistory = [...lastPlayedTracks, currentTrackIndex].slice(-5); // Keep last 5 tracks

    // Fade out current track
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
        }
      }, 50);
    } else if (currentTrack?.audio) {
      currentTrack.audio.pause();
      currentTrack.audio.currentTime = 0;
    }

    // Switch to next track
    set({
      currentTrackIndex: trackIndex,
      lastPlayedTracks: updatedHistory,
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
          console.log(`Crossfaded to: ${nextTrack.name}`);
        })
        .catch((error) => {
          console.log("Music crossfade prevented:", error);
        });
    }

    // Schedule the next track
    get().scheduleNextTrack();
  },

  getCurrentTrack: () => {
    const { tracks, currentTrackIndex } = get();
    return tracks[currentTrackIndex] || null;
  },

  getRandomTrackIndex: () => {
    const { tracks, currentTrackIndex, lastPlayedTracks } = get();
    if (tracks.length <= 1) return 0;

    // Avoid recently played tracks
    const availableIndices = tracks
      .map((_, index) => index)
      .filter(
        (index) =>
          index !== currentTrackIndex &&
          !lastPlayedTracks.slice(-2).includes(index),
      );

    if (availableIndices.length === 0) {
      // If all tracks were recently played, just pick a different one
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
