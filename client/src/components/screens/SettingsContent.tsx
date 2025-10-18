import {useSettings} from "../../lib/stores/ui/useSettings";
import {Slider} from "../ui/slider";
import {Switch} from "../ui/switch";
import {Button} from "../ui/button";
import {Label} from "../ui/label";
import {Palette} from "lucide-react";
import {KeybindingEditor} from "@/lib/utils/KeyBindingEditor.tsx";

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

interface SettingsContentProps {
  editingKeybind: string | null;
  setEditingKeybind: (key: string | null) => void;
  onKeybindClick: (action: string) => void;
  onRemoveKey: (action: string, keyToRemove: string) => void;
  onReset: () => void;
}

export function SettingsContent({
  editingKeybind,
  setEditingKeybind,
  onKeybindClick,
  onRemoveKey,
  onReset,
}: SettingsContentProps) {
  const {
    sensitivity,
    invertY,
    keybinds,
    setSensitivity,
    setInvertY,
    miningEffectsIntensity,
    enableScreenShake,
    enableVisualEffects,
    setMiningEffectsIntensity,
    setEnableScreenShake,
    setEnableVisualEffects,
    uiTheme,
    setUITheme,
  } = useSettings();

  return (
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
          className="w-full h-4 bg-gray-700 rounded-full"
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
        <Switch id="invert-y" checked={invertY} onCheckedChange={setInvertY} />
      </div>

      {/* UI Theme Section */}
      <div className="space-y-3 border-t border-cyan-700 pt-4">
        <h3 className="text-cyan-300 font-semibold text-sm uppercase pb-1 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          UI Theme
        </h3>

        <div className="space-y-2">
          <Label className="text-cyan-300 font-semibold">
            Choose your UI style
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setUITheme('classic')}
              className={`p-4 rounded border-2 transition-all ${
                uiTheme === 'classic'
                  ? 'border-cyan-400 bg-cyan-900/30'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-full h-16 rounded bg-gradient-to-br from-slate-700 to-slate-800 border border-cyan-500/50 flex items-center justify-center">
                  <div className="text-cyan-400 font-mono text-xs">CLASSIC</div>
                </div>
                <div className="text-xs text-gray-300">
                  Cyberpunk Orange/Cyan
                </div>
              </div>
            </button>

            <button
              onClick={() => setUITheme('monochrome')}
              className={`p-4 rounded border-2 transition-all ${
                uiTheme === 'monochrome'
                  ? 'border-white bg-gray-700/30'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-full h-16 rounded bg-gradient-to-br from-black to-gray-900 border border-white/50 flex items-center justify-center">
                  <div className="text-white font-mono text-xs">MONOCHROME</div>
                </div>
                <div className="text-xs text-gray-300">
                  Black/White/Gray
                </div>
              </div>
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Theme changes apply instantly to all UI elements
          </p>
        </div>
      </div>

      {/* Mining Effects Section */}
      <div className="space-y-3 border-t border-cyan-700 pt-4">
        <h3 className="text-cyan-300 font-semibold text-sm uppercase pb-1">
          ⛏️ Mining Effects
        </h3>

        {/* Effects Intensity */}
        <div className="space-y-2">
          <Label
            htmlFor="mining-intensity"
            className="text-cyan-300 font-semibold"
          >
            Mining Effects Intensity:{" "}
            {Math.round((miningEffectsIntensity ?? 1) * 100)}%
          </Label>
          <Slider
            id="mining-intensity"
            min={0}
            max={1}
            step={0.1}
            value={[miningEffectsIntensity ?? 1]}
            onValueChange={([value]) => setMiningEffectsIntensity?.(value)}
            className="w-full"
          />
          <p className="text-xs text-gray-400">
            Adjust the overall intensity of mining feedback effects
          </p>
        </div>

        {/* Screen Shake */}
        <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
          <div className="space-y-0.5">
            <Label
              htmlFor="screen-shake"
              className="text-cyan-300 font-semibold"
            >
              Screen Shake
            </Label>
            <p className="text-xs text-gray-400">
              Camera shake when mining resources
            </p>
          </div>
          <Switch
            id="screen-shake"
            checked={enableScreenShake ?? true}
            onCheckedChange={setEnableScreenShake}
          />
        </div>

        {/* Visual Effects */}
        <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded">
          <div className="space-y-0.5">
            <Label
              htmlFor="visual-effects"
              className="text-cyan-300 font-semibold"
            >
              Visual Effects
            </Label>
            <p className="text-xs text-gray-400">
              Flash, vignette, and color effects during mining
            </p>
          </div>
          <Switch
            id="visual-effects"
            checked={enableVisualEffects ?? true}
            onCheckedChange={setEnableVisualEffects}
          />
        </div>
      </div>

      {/* Keybindings */}
        <KeybindingEditor/>

      {/* Reset Button */}
      <div className="flex justify-end pt-4 border-t border-gray-700">
        <Button
          onClick={onReset}
          variant="outline"
          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-600"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
