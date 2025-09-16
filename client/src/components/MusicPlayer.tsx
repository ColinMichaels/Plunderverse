import React, { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  List,
  Shuffle,
  RotateCcw,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  useMusicPlayer,
  initializeMusicPlayer,
} from "../lib/stores/useMusicPlayer";
import { useAudio } from "../lib/stores/useAudio";
import { cn } from "../lib/utils";

interface MusicPlayerProps {
  className?: string;
}

export function MusicPlayer({ className }: MusicPlayerProps) {
  const {
    tracks,
    currentTrackIndex,
    isPlaying,
    volume,
    isLoaded,
    isLoading,
    nextPlayTime,
    showPlaylist,
    playbackMode,
    togglePlayPause,
    skipNext,
    skipPrevious,
    selectTrack,
    setVolume,
    togglePlaylist,
    setPlaybackMode,
    getCurrentTrack,
  } = useMusicPlayer();

  const { isMuted } = useAudio();
  const [timeUntilNext, setTimeUntilNext] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Initialize music player on mount
  useEffect(() => {
    initializeMusicPlayer();
  }, []);

  // Update time until next track
  useEffect(() => {
    if (!nextPlayTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const timeLeft = nextPlayTime - now;

      if (timeLeft <= 0) {
        setTimeUntilNext("");
        return;
      }

      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      setTimeUntilNext(
        `Next in ${minutes}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextPlayTime]);

  const currentTrack = getCurrentTrack();

  if (!isLoaded && !isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        isMinimized
          ? "bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-1 w-[150px] h-[36px]"
          : "bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 min-w-[250px]",
        className,
      )}
    >
      {/* Header - only show when not minimized */}
      {!isMinimized && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="text-cyan-400 text-sm font-semibold flex items-center gap-2">
              <Volume2 size={16} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlaylist}
              className="h-6 w-6 text-cyan-400 hover:text-cyan-300"
            >
              <List size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 text-cyan-400 hover:text-cyan-300"
            >
              <Minimize2 size={14} />
            </Button>
          </div>
        </div>
      )}

      {!isMinimized &&
        (isLoading ? (
          <div className="text-center text-cyan-300 py-4">
            Loading tracks...
          </div>
        ) : (
          <>
            {/* Current Track Info */}
            <div className="mb-4">
              <div className="text-white text-sm font-medium truncate">
                {currentTrack ? currentTrack.name : "No track selected"}
              </div>
              {!isPlaying && !isMuted && timeUntilNext && (
                <div className="text-cyan-300 text-xs mt-1">
                  {timeUntilNext}
                </div>
              )}
              {isMuted && (
                <div className="text-red-400 text-xs mt-1">Audio muted</div>
              )}
            </div>

            {/* Main Controls */}
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={skipPrevious}
                disabled={tracks.length === 0}
                className="h-8 w-8 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                <SkipBack size={16} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                disabled={tracks.length === 0 || isMuted}
                className="h-8 w-8 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={skipNext}
                disabled={tracks.length === 0}
                className="h-8 w-8 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                <SkipForward size={16} />
              </Button>

              <div className="mx-2 h-4 w-px bg-white/20" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setPlaybackMode(
                    playbackMode === "random" ? "sequential" : "random",
                  )
                }
                className={cn(
                  "h-8 w-8 hover:text-cyan-300",
                  playbackMode === "random" ? "text-cyan-400" : "text-gray-500",
                )}
                title={`Mode: ${playbackMode}`}
              >
                {playbackMode === "random" ? (
                  <Shuffle size={16} />
                ) : (
                  <RotateCcw size={16} />
                )}
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 mb-4">
              <Volume2 size={14} className="text-cyan-400 flex-shrink-0" />
              <Slider
                value={[volume * 100]}
                onValueChange={(value) => setVolume(value[0] / 100)}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-cyan-300 text-xs min-w-[2rem] text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Playlist */}
            {showPlaylist && (
              <div className="border-t border-white/20 pt-3">
                <div className="text-cyan-400 text-xs font-medium mb-2">
                  Playlist ({tracks.length} tracks)
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tracks.map((track, index) => (
                    <button
                      key={track.id}
                      onClick={() => selectTrack(index)}
                      className={cn(
                        "w-full text-left text-xs p-2 rounded hover:bg-white/10 transition-colors",
                        index === currentTrackIndex
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "text-gray-300",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {index === currentTrackIndex && isPlaying && (
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                        )}
                        <span className="truncate">{track.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info Text */}
            <div className="text-xs text-gray-400 mt-3 text-center">
              {playbackMode === "random"
                ? "random playback"
                : "Sequential playback"}
            </div>
          </>
        ))}

      {/* Minimized view - compact single line */}
      {isMinimized && (
        <div className="relative flex items-center justify-between h-full">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              disabled={tracks.length === 0 || isMuted}
              className="h-5 w-5 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 p-0"
            >
              {isPlaying ? <Pause size={10} /> : <Play size={10} />}
            </Button>
            <div className="text-[10px] text-white/70 truncate max-w-[70px]">
              {currentTrack ? currentTrack.name : "No track"}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="h-5 w-5 text-cyan-400 hover:text-cyan-300 p-0"
            >
              <Volume2 size={10} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(false)}
              className="h-5 w-5 text-cyan-400 hover:text-cyan-300 p-0"
            >
              <Maximize2 size={8} />
            </Button>
          </div>

          {/* Volume slider popup */}
          {showVolumeSlider && (
            <div className="absolute -top-10 right-0 bg-black/90 border border-white/20 rounded px-2 py-1 flex items-center gap-2 w-20">
              <Slider
                value={[volume * 100]}
                onValueChange={(value) => setVolume(value[0] / 100)}
                max={100}
                step={5}
                className="flex-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MusicPlayer;
