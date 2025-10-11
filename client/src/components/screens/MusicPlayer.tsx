import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  List,
  Shuffle,
  RotateCcw,
  Minimize2,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import {
  useMusicPlayer,
  initializeMusicPlayer,
} from "../../lib/stores/ui/useMusicPlayer";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { cn } from "../../lib/utils";

interface MusicPlayerProps {
  className?: string;
}

export function MusicPlayer({ className }: MusicPlayerProps) {
  // --- Hooks must always be called in the same order, no early returns above this line ---
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

  const { isMuted, toggleMute } = useAudio();

  const [timeUntilNext, setTimeUntilNext] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState(true);
  const [showVolPanel, setShowVolPanel] = useState(false);

  const volBtnRef = useRef<HTMLButtonElement | null>(null);

  // Initialize once
  useEffect(() => {
    initializeMusicPlayer();
  }, []);

  // Countdown to next track
  useEffect(() => {
    if (!nextPlayTime) return;
    const tick = () => {
      const ms = nextPlayTime - Date.now();
      if (ms <= 0) return setTimeUntilNext("");
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeUntilNext(`Next in ${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextPlayTime]);

  // Close the floating volume panel on outside click
  useEffect(() => {
    if (!showVolPanel) return;
    const onDocClick = (e: MouseEvent) => {
      const btn = volBtnRef.current;
      const panel = document.getElementById("mp-volume-panel");
      const t = e.target as Node;
      if (btn && !btn.contains(t) && panel && !panel.contains(t)) {
        setShowVolPanel(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showVolPanel]);

  // Computed values & classnames (hooks still always run)
  const currentTrack = getCurrentTrack();
  const volPct = Math.round(volume * 100);

  const bigSliderClass = useMemo(
    () =>
      cn(
        "flex-1 h-6",
        "[&>div]:h-6 [&_[data-slider-track]]:h-2 [&_[data-slider-track]]:rounded-full",
        "[&_[data-slider-range]]:h-2",
        "[&_[data-slider-thumb]]:h-4 [&_[data-slider-thumb]]:w-4 [&_[data-slider-thumb]]:shadow [&_[data-slider-thumb]]:bg-cyan-400",
      ),
    [],
  );

  const panelSliderClass = useMemo(
    () =>
      cn(
        "w-56 h-6",
        "[&>div]:h-6 [&_[data-slider-track]]:h-2 [&_[data-slider-range]]:h-2",
        "[&_[data-slider-thumb]]:h-4 [&_[data-slider-thumb]]:w-4 [&_[data-slider-thumb]]:shadow [&_[data-slider-thumb]]:bg-cyan-400",
      ),
    [],
  );

  // Helpers for volume
  const safeSetVolume = (v: number) => setVolume(Math.max(0, Math.min(1, v)));
  const nudge = (delta: number) => safeSetVolume((volPct + delta) / 100);
  const onVolumeWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    nudge(e.deltaY > 0 ? -5 : 5);
  };

  // --- Render (no early returns) ---
  return (
    <div
      className={cn(
        isMinimized
          ? "relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-2 py-1 w-[210px] h-[36px]"
          : "relative bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 min-w-[320px] max-w-[460px]",
        className,
      )}
    >
      {/* Header (not minimized) */}
      {!isMinimized && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="text-cyan-400 text-sm font-semibold flex items-center gap-2">
              <Volume2 size={16} />
              <span>Music</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlaylist}
              className="h-6 w-6 text-cyan-400 hover:text-cyan-300"
              title={showPlaylist ? "Hide playlist" : "Show playlist"}
            >
              <List size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 text-cyan-400 hover:text-cyan-300"
              title="Minimize"
            >
              <Minimize2 size={14} />
            </Button>
          </div>

          {/* Quick volume access */}
          <div className="flex items-center gap-2" onWheel={onVolumeWheel}>
            <Button
              ref={volBtnRef}
              variant="ghost"
              size="icon"
              onClick={() => setShowVolPanel((s) => !s)}
              className={cn(
                "h-6 w-6 hover:text-cyan-300",
                isMuted ? "text-red-400" : "text-cyan-400",
              )}
              title={isMuted ? "Unmute" : "Volume"}
              onDoubleClick={() => safeSetVolume(1)}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <span className="text-cyan-300 text-xs tabular-nums w-10 text-right">
              {volPct}%
            </span>
          </div>
        </div>
      )}

      {/* Body states (inside one render path so hooks order never changes) */}
      {!isMinimized && (
        <>
          {!isLoaded && !isLoading && (
            <div className="text-center text-cyan-300 py-6">
              Initializing music player...
            </div>
          )}

          {isLoading && (
            <div className="text-center text-cyan-300 py-6">
              Loading tracks...
            </div>
          )}

          {isLoaded && !isLoading && (
            <>
              {/* Current Track Info */}
              <div className="mt-3 mb-4">
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
                  title="Previous"
                >
                  <SkipBack size={16} />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlayPause}
                  disabled={tracks.length === 0 || isMuted}
                  className="h-9 w-9 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={skipNext}
                  disabled={tracks.length === 0}
                  className="h-8 w-8 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                  title="Next"
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
                    playbackMode === "random"
                      ? "text-cyan-400"
                      : "text-gray-500",
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

              {/* Volume (bigger) */}
              <div
                className="flex items-center gap-3 mb-5"
                onWheel={onVolumeWheel}
                role="group"
                aria-label="Volume controls"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className={cn(
                    "h-7 w-7 hover:text-cyan-300",
                    isMuted ? "text-red-400" : "text-cyan-400",
                  )}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => nudge(-5)}
                  className="h-7 w-7 text-cyan-400 hover:text-cyan-300"
                  title="Volume -5%"
                >
                  <Minus size={14} />
                </Button>

                <Slider
                  value={[volPct]}
                  onValueChange={(v) => safeSetVolume(v[0] / 100)}
                  max={100}
                  step={1}
                  aria-label="Volume"
                  className={bigSliderClass}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => nudge(+5)}
                  className="h-7 w-7 text-cyan-400 hover:text-cyan-300"
                  title="Volume +5%"
                >
                  <Plus size={14} />
                </Button>

                <span
                  className="text-cyan-300 text-xs min-w-[2.5rem] text-right select-none tabular-nums"
                  title="Double-click to reset to 100%"
                  onDoubleClick={() => safeSetVolume(1)}
                >
                  {volPct}%
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
                        title={track.name}
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

              <div className="text-xs text-gray-400 mt-3 text-center">
                {playbackMode === "random"
                  ? "Random playback"
                  : "Sequential playback"}
              </div>
            </>
          )}
        </>
      )}

      {/* Minimized view */}
      {isMinimized && (
        <div className="relative flex items-center justify-between h-full">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              disabled={tracks.length === 0 || isMuted}
              className="h-5 w-5 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 p-0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={10} /> : <Play size={10} />}
            </Button>
            <div className="text-[10px] text-white/80 truncate max-w-[110px]">
              {currentTrack ? currentTrack.name : "No track"}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              ref={volBtnRef}
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowVolPanel((s) => !s);
              }}
              className={cn(
                "h-5 w-5 hover:text-cyan-300 p-0",
                isMuted ? "text-red-400" : "text-cyan-400",
              )}
              title={
                isMuted
                  ? "Unmute (right-click for volume)"
                  : "Mute (right-click for volume)"
              }
            >
              {isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(false)}
              className="h-5 w-5 text-cyan-400 hover:text-cyan-300 p-0"
              title="Expand"
            >
              <Maximize2 size={8} />
            </Button>
          </div>
        </div>
      )}

      {/* Floating quick volume panel */}
      {showVolPanel && (
        <div
          id="mp-volume-panel"
          className="absolute z-50 rounded-lg border border-white/20 bg-black/90 backdrop-blur p-3 shadow-lg"
          style={{ top: isMinimized ? -100 : 6, right: isMinimized ? 6 : 10 }}
          onWheel={onVolumeWheel}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className={cn(
                "h-7 w-7 hover:text-cyan-300",
                isMuted ? "text-red-400" : "text-cyan-400",
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => nudge(-5)}
              className="h-7 w-7 text-cyan-400 hover:text-cyan-300"
              title="Volume -5%"
            >
              <Minus size={14} />
            </Button>

            <Slider
              value={[volPct]}
              onValueChange={(v) => safeSetVolume(v[0] / 100)}
              max={100}
              step={1}
              aria-label="Quick volume"
              className={panelSliderClass}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => nudge(+5)}
              className="h-7 w-7 text-cyan-400 hover:text-cyan-300"
              title="Volume +5%"
            >
              <Plus size={14} />
            </Button>

            <span
              className="text-cyan-300 text-xs w-10 text-right tabular-nums"
              title="Double-click to reset to 100%"
              onDoubleClick={() => safeSetVolume(1)}
            >
              {volPct}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MusicPlayer;
