import { useState, useEffect } from "react";
import { useSettings } from "../lib/stores/useSettings";
import { Controls } from "../lib/controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONTROL_LABELS: Record<string, string> = {
  forward: "Move Forward",
  backward: "Move Backward",
  left: "Move Left",
  right: "Move Right",
  up: "Move Up",
  down: "Move Down",
  shoot: "Fire Lasers",
  land: "Land on Planet",
  info: "Planet Info",
  menu: "Menu",
  center: "Center Camera",
};

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const {
    sensitivity,
    invertY,
    keybinds,
    setSensitivity,
    setInvertY,
    updateKeybind,
    resetToDefaults,
  } = useSettings();

  const [editingKeybind, setEditingKeybind] = useState<string | null>(null);

  const handleKeybindClick = (action: string) => {
    setEditingKeybind(action);
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900/95 border-2 border-cyan-400 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-400">
            ⚙️ Game Settings
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Customize your controls and camera settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mouse Sensitivity */}
          <div className="space-y-2">
            <Label htmlFor="sensitivity" className="text-cyan-300 font-semibold">
              Mouse Sensitivity: {(sensitivity * 1000).toFixed(1)}
            </Label>
            <Slider
              id="sensitivity"
              min={0.0002}
              max={0.005}
              step={0.0001}
              value={[sensitivity]}
              onValueChange={([value]) => setSensitivity(value)}
              className="w-full"
            />
            <p className="text-xs text-gray-400">
              Adjust how quickly the camera responds to mouse movement
            </p>
          </div>

          {/* Invert Y-Axis */}
          <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
            <div className="space-y-0.5">
              <Label htmlFor="invert-y" className="text-cyan-300 font-semibold">
                Invert Y-Axis
              </Label>
              <p className="text-xs text-gray-400">
                Reverse vertical mouse look direction
              </p>
            </div>
            <Switch
              id="invert-y"
              checked={invertY}
              onCheckedChange={setInvertY}
            />
          </div>

          {/* Keybindings */}
          <div className="space-y-3">
            <h3 className="text-cyan-300 font-semibold text-sm uppercase border-b border-cyan-700 pb-1">
              🎮 Key Bindings
            </h3>
            <div className="space-y-2">
              {Object.entries(Controls).map(([key, value]) => {
                const action = value as string;
                const keys = keybinds[action] || [];
                const isEditing = editingKeybind === action;

                return (
                  <div
                    key={action}
                    className="flex justify-between items-center bg-gray-800/50 p-2 rounded"
                  >
                    <span className="text-gray-300">
                      {CONTROL_LABELS[action] || action}
                    </span>
                    <div className="flex gap-2 items-center">
                      {keys.map((keyCode) => (
                        <div
                          key={keyCode}
                          className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded"
                        >
                          <kbd className="text-white font-mono text-sm">
                            {keyCode.replace("Key", "").replace("Arrow", "")}
                          </kbd>
                          <button
                            onClick={() => handleRemoveKey(action, keyCode)}
                            className="text-red-400 hover:text-red-300 text-xs ml-1"
                            title="Remove key"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {isEditing ? (
                        <div className="px-3 py-1 bg-yellow-600 text-black rounded font-mono text-sm animate-pulse">
                          Press key...
                        </div>
                      ) : (
                        <button
                          onClick={() => handleKeybindClick(action)}
                          className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Click "+ Add" to bind a new key. Press ESC to cancel.
            </p>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end pt-4 border-t border-gray-700">
            <Button
              onClick={handleReset}
              variant="outline"
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
