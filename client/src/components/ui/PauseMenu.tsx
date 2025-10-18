import {useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {useFocusState} from "@/lib/stores/ui/useFocusState";
import {useGame} from "@/lib/stores/ui/useGame";
import {useSettings} from "@/lib/stores/ui/useSettings";
import {useLandedState} from "@/lib/stores/surface/useLandedState";
import {useShooting} from "@/lib/stores/combat/useShooting";
import {useEnemies} from "@/lib/stores/combat/useEnemies";
import {useAutopilot} from "@/lib/stores/navigation/useAutopilot";
import {INPUT_KEY_EVENT, InputRouter} from "@/lib/InputRouter";
import {HelpCircle, Home, Play, Power, Settings, Save} from "lucide-react";
import {SettingsContent} from "../screens/SettingsContent";
import {useAutoSave} from "@/hooks/useAutoSave";

// Ensure router is attached once this module is imported
if (typeof window !== 'undefined') {
    InputRouter.instance().attach();
}

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
  const { manualSave, isSaving } = useAutoSave();

    // Open/close the pause menu with ESC via global input router
  useEffect(() => {
      const onKey = (e: Event) => {
          const ce = e as CustomEvent<{ key: string; code: string; domEvent: KeyboardEvent }>;
          const {key} = ce.detail || ({} as any);

          // Only handle ESC when in playing phase and if nobody else already consumed this key
          if (key === 'Escape' && phase === 'playing') {
              // If a different UI (e.g., ActionBar) wants to consume ESC first, they should call e.preventDefault().
              if (e.defaultPrevented) return;

              // If editing keybind, consume ESC to cancel editing only
        if (editingKeybind) {
            e.preventDefault();
          setEditingKeybind(null);
          return;
        }

              // Toggle pause
              e.preventDefault();
        const newOpenState = !isOpen;
        setIsOpen(newOpenState);
        setPaused(newOpenState);
              setActivePanel('main');
      }
    };

      window.addEventListener(INPUT_KEY_EVENT, onKey as EventListener, {capture: true});
      return () => window.removeEventListener(INPUT_KEY_EVENT, onKey as EventListener, {capture: true} as any);
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

    // Reset to splash screen
    showSplash();

    // Close pause menu
    setIsOpen(false);
    setPaused(true);
    setActivePanel("main");

    console.log("[PAUSE-MENU] Returned to home screen");
  };

  const handleExitGame = () => {
      handleReturnToHome();
  };

  const handleQuickSave = () => {
    manualSave();
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
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"
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
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Themed Glassmorphism Card */}
          <div className="relative bg-[var(--theme-bg-primary)] backdrop-blur-xl border border-[var(--theme-border-primary)] rounded-none shadow-2xl overflow-hidden">
            {/* Subtle scan line effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/5 pointer-events-none" />

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-12 h-12 border-l border-t border-[var(--theme-border-accent)] pointer-events-none" />
            <div className="absolute top-0 right-0 w-12 h-12 border-r border-t border-[var(--theme-border-accent)] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-l border-b border-[var(--theme-border-accent)] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-[var(--theme-border-accent)] pointer-events-none" />

            {/* Header */}
            <div className="relative px-8 py-6 bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-primary)]">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-bold text-center text-[var(--theme-text-primary)] tracking-widest font-mono"
              >
                // SYSTEM PAUSED
              </motion.h1>
              <p className="text-center text-[var(--theme-text-secondary)] mt-2 text-xs font-mono tracking-wider">
                {isLanded
                  ? "[ SURFACE OPS SUSPENDED ]"
                  : "[ SPACE FLIGHT SUSPENDED ]"}
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
                    className="w-full group relative overflow-hidden border border-[var(--theme-border-primary)] hover:border-[var(--theme-border-hover)] hover:bg-[var(--theme-bg-secondary)] transition-all duration-200 p-4"
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      <Play className="w-5 h-5 text-[var(--theme-text-accent)]" />
                      <span className="text-base font-mono font-medium text-[var(--theme-text-primary)] tracking-wide">
                        RESUME
                      </span>
                    </div>
                    <p className="relative text-[10px] text-[var(--theme-text-secondary)] mt-1 font-mono">
                      ESC
                    </p>
                  </button>

                  {/* Quick Save Button */}
                  <button
                    onClick={handleQuickSave}
                    disabled={isSaving}
                    className="w-full group relative overflow-hidden border border-[var(--theme-border-primary)] hover:border-[var(--theme-border-hover)] hover:bg-[var(--theme-bg-secondary)] transition-all duration-200 p-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      <Save className="w-5 h-5 text-[var(--theme-text-accent)]" />
                      <span className="text-base font-mono font-medium text-[var(--theme-text-primary)] tracking-wide">
                        {isSaving ? "SAVING..." : "QUICK SAVE"}
                      </span>
                    </div>
                    <p className="relative text-[10px] text-[var(--theme-text-secondary)] mt-1 font-mono">
                      F5
                    </p>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => setActivePanel("settings")}
                    className="w-full group relative overflow-hidden border border-[var(--theme-border-primary)] hover:border-[var(--theme-border-hover)] hover:bg-[var(--theme-bg-secondary)] transition-all duration-200 p-4"
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      <Settings className="w-5 h-5 text-[var(--theme-text-accent)]" />
                      <span className="text-base font-mono font-medium text-[var(--theme-text-primary)] tracking-wide">
                        SETTINGS
                      </span>
                    </div>
                    <p className="relative text-[10px] text-[var(--theme-text-secondary)] mt-1 font-mono">
                      OPTIONS & CONTROLS
                    </p>
                  </button>

                  {/* Return to Home */}
                  <button
                    onClick={handleReturnToHome}
                    className="w-full group relative overflow-hidden border border-[var(--theme-border-primary)] hover:border-[var(--theme-border-hover)] hover:bg-[var(--theme-bg-secondary)] transition-all duration-200 p-4"
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      <Home className="w-5 h-5 text-[var(--theme-text-accent)]" />
                      <span className="text-base font-mono font-medium text-[var(--theme-text-primary)] tracking-wide">
                        MAIN MENU
                      </span>
                    </div>
                    <p className="relative text-[10px] text-[var(--theme-text-secondary)] mt-1 font-mono">
                      RETURN TO HOME
                    </p>
                  </button>

                  {/* Exit Game */}
                  <button
                    onClick={handleExitGame}
                    className="w-full group relative overflow-hidden border border-[var(--theme-border-primary)] hover:border-[var(--theme-border-hover)] hover:bg-[var(--theme-bg-secondary)] transition-all duration-200 p-4"
                  >
                    <div className="relative flex items-center justify-center gap-3">
                      <Power className="w-5 h-5 text-[var(--theme-text-accent)]" />
                      <span className="text-base font-mono font-medium text-[var(--theme-text-primary)] tracking-wide">
                        EXIT
                      </span>
                    </div>
                    <p className="relative text-[10px] text-[var(--theme-text-secondary)] mt-1 font-mono">
                      DESKTOP ONLY
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
                    className="text-[var(--theme-text-accent)] hover:text-[var(--theme-text-highlight)] flex items-center gap-2 mb-4 font-mono text-sm"
                  >
                    ← BACK
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
            <div className="px-8 py-4 bg-[var(--theme-bg-secondary)] border-t border-[var(--theme-border-primary)]">
              <div className="flex items-center justify-center gap-2 text-[10px] text-[var(--theme-text-secondary)] font-mono">
                <HelpCircle className="w-3 h-3" />
                <span>ESC TO CLOSE</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
