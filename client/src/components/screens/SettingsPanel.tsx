import { useState, useEffect } from "react";
import { useSettings } from "../../lib/stores/ui/useSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { SettingsContent } from "./SettingsContent";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const {
    keybinds,
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

        <SettingsContent
          editingKeybind={editingKeybind}
          setEditingKeybind={setEditingKeybind}
          onKeybindClick={handleKeybindClick}
          onRemoveKey={handleRemoveKey}
          onReset={handleReset}
        />
      </DialogContent>
    </Dialog>
  );
}
