import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusState } from "@/lib/stores/ui/useFocusState";
import { useGame } from "@/lib/stores/ui/useGame";
import { useSettings } from "@/lib/stores/ui/useSettings";
import { useLandedState } from "@/lib/stores/surface/useLandedState";
import { useShipStatus } from "@/lib/stores/ship/useShipStatus";
import { useShooting } from "@/lib/stores/combat/useShooting";
import { useEnemies } from "@/lib/stores/combat/useEnemies";
import { useAutopilot } from "@/lib/stores/navigation/useAutopilot";
import { useSolarSystem } from "@/lib/stores/space/useSolarSystem";
import {
  Play,
  Home,
  Settings,
  Power,
  Volume2,
  VolumeX,
  Monitor,
  Gamepad2,
  HelpCircle,
} from "lucide-react";
import { SettingsContent } from "../screens/SettingsContent";
import { Vector3 } from "three";

export function PauseMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "main" | "settings" | "controls"
  >("main");
  const [editingKeybind, setEditingKeybind] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { isPaused, setPaused } = useFocusState();
  const { phase, showSplash } = useGame();
  const { isLanded } = useLandedState();
  const { deactivate: deactivateAutopilot } = useAutopilot();
  const { keybinds, updateKeybind, resetToDefaults } = useSettings();

  // Open/close the pause menu with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle ESC when in playing phase
      if (e.key === "Escape" && phase === "playing") {
        e.preventDefault();
        e.stopPropagation();

        // If editing keybind, cancel that instead
        if (editingKeybind) {
          setEditingKeybind(null);
          return;
        }

        // Toggle pause menu
        const newOpenState = !isOpen;
        setIsOpen(newOpenState);
        setPaused(newOpenState);
        setActivePanel("main"); // Reset to main panel when opening
      }
    };

    // Higher priority to intercept ESC before other components
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, phase, setPaused, editingKeybind]);

  // Handle keybind editing
  useEffect(() => {
    if (!editingKeybind) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.code;

      if (key === "Escape") {
        setEditingKeybind(null);
        return;
      }

      const currentKeys = keybinds[editingKeybind] || [];
      if (!currentKeys.includes(key)) {
        updateKeybind(editingKeybind, [...currentKeys, key]);
      }
      setEditingKeybind(null);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [editingKeybind, keybinds, updateKeybind]);

  // Freeze/unfreeze game systems when paused
  useEffect(() => {
    if (isPaused) {
      // Store current game time scale if Three.js is being used
      if (window.THREE?.Clock) {
        // This would need to be integrated with your Three.js setup
        console.log("[PAUSE-MENU] Game paused");
      }
    } else {
      console.log("[PAUSE-MENU] Game resumed");
    }
  }, [isPaused]);

  const handleResume = () => {
    setIsOpen(false);
    setPaused(false);
    setActivePanel("main");
  };

  const handleReturnToHome = () => {
    // Stop autopilot
    deactivateAutopilot();

    // Clear combat state
    useEnemies.getState().clearEnemies();
    useShooting.setState({ projectiles: [] });

    // Reset ship position (handled by SplashScreen)
    useSolarSystem.getState().setCameraPosition(new Vector3(0, 10, 50));

    // Reset to splash screen
    showSplash();

    // Close pause menu
    setIsOpen(false);
    setPaused(false);
    setActivePanel("main");

    console.log("[PAUSE-MENU] Returned to home screen");
  };

  const handleExitGame = () => {
     handleReturnToHome
  };

  const handleKeybindClick = (action: string) => {
    setEditingKeybind(action);
  };

  const handleRemoveKey = (action: string, keyToRemove: string) => {
    const currentKeys = keybinds[action] || [];
    const newKeys = currentKeys.filter((k) => k !== keyToRemove);
    if (newKeys.length > 0) {
      updateKeybind(action, newKeys);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setEditingKeybind(null);
  };

  if (!isOpen || phase !== "playing") return null;

  return (
    <AnimatePresence>
      {/* Background overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
        onClick={(e) => {
          // Close if clicking outside the menu
          if (e.target === e.currentTarget) {
            handleResume();
          }
        }}
      >
        {/* Pause Menu Container */}
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg"
        >
          {/* Glassmorphism Card */}
          <div className="relative bg-slate-900/90 backdrop-blur-xl border-2 border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden">
            {/* Animated border gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-500/10 pointer-events-none" />

            {/* Sci-fi corner decorations */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-orange-400/40 rounded-tl-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-orange-400/40 rounded-tr-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-orange-400/40 rounded-bl-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-orange-400/40 rounded-br-2xl pointer-events-none" />

            {/* Header */}
            <div className="relative px-8 py-6 bg-gradient-to-r from-orange-600/20 via-amber-600/20 to-orange-600/20 border-b border-orange-500/20">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold text-center bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent"
              >
                GAME PAUSED
              </motion.h1>
              <p className="text-center text-gray-400 mt-2 text-sm">
                {isLanded
                  ? "Surface Operations Suspended"
                  : "Space Flight Suspended"}
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {activePanel === "main" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-3"
                >
                  {/* Resume Button */}
                  <button
                    onClick={handleResume}
                    className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 p-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-600/0 to-emerald-600/20 group-hover:from-green-600/20 group-hover:to-emerald-600/30 transition-all duration-300" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Play className="w-6 h-6 text-green-400 group-hover:text-green-300" />
                      <span className="text-lg font-semibold text-green-400 group-hover:text-green-300">
                        Resume Game
                      </span>
                    </div>
                    <p className="relative text-xs text-gray-500 mt-1">
                      Press ESC to continue
                    </p>
                  </button>

                  {/* Return to Home */}
                  <button
                    onClick={handleReturnToHome}
                    className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 p-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-cyan-600/20 group-hover:from-blue-600/20 group-hover:to-cyan-600/30 transition-all duration-300" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Home className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                      <span className="text-lg font-semibold text-blue-400 group-hover:text-blue-300">
                        Return to Home
                      </span>
                    </div>
                    <p className="relative text-xs text-gray-500 mt-1">
                      Go back to main menu
                    </p>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => setActivePanel("settings")}
                    className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 p-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-pink-600/20 group-hover:from-purple-600/20 group-hover:to-pink-600/30 transition-all duration-300" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Settings className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                      <span className="text-lg font-semibold text-purple-400 group-hover:text-purple-300">
                        Settings
                      </span>
                    </div>
                    <p className="relative text-xs text-gray-500 mt-1">
                      Game options & controls
                    </p>
                  </button>

                  {/* Exit Game */}
                  <button
                    onClick={handleExitGame}
                    className="w-full group relative overflow-hidden rounded-lg bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 hover:border-red-400/50 transition-all duration-300 p-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 to-orange-600/20 group-hover:from-red-600/20 group-hover:to-orange-600/30 transition-all duration-300" />
                    <div className="relative flex items-center justify-center gap-3">
                      <Power className="w-6 h-6 text-red-400 group-hover:text-red-300" />
                      <span className="text-lg font-semibold text-red-400 group-hover:text-red-300">
                        Exit Game
                      </span>
                    </div>
                    <p className="relative text-xs text-gray-500 mt-1">
                      Desktop version only
                    </p>
                  </button>
                </motion.div>
              )}

              {activePanel === "settings" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {/* Back button */}
                  <button
                    onClick={() => setActivePanel("main")}
                    className="text-orange-400 hover:text-orange-300 flex items-center gap-2 mb-4"
                  >
                    ← Back to Menu
                  </button>

                  {/* Settings Content */}
                  <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <SettingsContent
                      editingKeybind={editingKeybind}
                      setEditingKeybind={setEditingKeybind}
                      onKeybindClick={handleKeybindClick}
                      onRemoveKey={handleRemoveKey}
                      onReset={handleReset}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer with tips */}
            <div className="px-8 py-4 bg-slate-800/50 border-t border-slate-700/50">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <HelpCircle className="w-3 h-3" />
                <span>Press ESC to close this menu</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
