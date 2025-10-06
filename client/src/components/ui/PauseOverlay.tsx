import { useFocusState } from "@/lib/stores/ui/useFocusState";

export function PauseOverlay() {
  const { isPaused } = useFocusState();
  
  if (!isPaused) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-white animate-pulse">
          GAME PAUSED
        </h1>
        <p className="text-2xl text-gray-300">
          Click anywhere to resume
        </p>
        <p className="text-lg text-gray-400">
          The game is paused because the window lost focus
        </p>
      </div>
    </div>
  );
}