import { useState, useEffect } from "react";
import * as THREE from "three";
import { useDebugTools } from "../../lib/stores/useDebugTools";
import { useSolarSystem } from "../../lib/stores/useSolarSystem";
import { useLandedState } from "../../lib/stores/useLandedState";
import { planets } from "../../lib/planetData";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { X } from "lucide-react";
import { DraggablePanel } from "../ui/DraggablePanel";

export function DevDebugOverlay() {
  const {
    isVisible,
    timeScale,
    showCollisionBoxes,
    showWireframes,
    toggleVisibility,
    setTimeScale,
    toggleCollisionBoxes,
    toggleWireframes,
  } = useDebugTools();

  const { time, setTime, cameraPosition, setCameraPosition, setSelectedPlanet } = useSolarSystem();
  const { landedPlanet, setLanded } = useLandedState();

  const [previousTimeScale, setPreviousTimeScale] = useState(timeScale || 1);
  const [selectedTravelPlanet, setSelectedTravelPlanet] = useState<string>("");
  const [posX, setPosX] = useState(cameraPosition.x.toFixed(2));
  const [posY, setPosY] = useState(cameraPosition.y.toFixed(2));
  const [posZ, setPosZ] = useState(cameraPosition.z.toFixed(2));

  // Derive isPaused from store's timeScale
  const isPaused = timeScale === 0;

  useEffect(() => {
    if (timeScale > 0) {
      setPreviousTimeScale(timeScale);
    }
  }, [timeScale]);

  // Only render in dev mode AND when visible
  if (!import.meta.env.DEV || !isVisible) {
    return null;
  }

  // Convert time (seconds) to HH:MM format
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600) % 24;
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // Handle time pause/resume
  const handlePauseToggle = () => {
    if (isPaused) {
      // Resume: restore previous time scale
      setTimeScale(previousTimeScale || 1);
    } else {
      // Pause: save current time scale and set to 0
      setPreviousTimeScale(timeScale);
      setTimeScale(0);
    }
  };

  // Handle position update
  const handlePositionUpdate = () => {
    const x = parseFloat(posX) || 0;
    const y = parseFloat(posY) || 0;
    const z = parseFloat(posZ) || 0;
    setCameraPosition(new THREE.Vector3(x, y, z));
    console.log(`[DEBUG] Camera position set to: (${x}, ${y}, ${z})`);
  };

  // Handle position reset
  const handlePositionReset = () => {
    const resetPos = { x: 0, y: 10, z: 50 };
    setPosX(resetPos.x.toFixed(2));
    setPosY(resetPos.y.toFixed(2));
    setPosZ(resetPos.z.toFixed(2));
    setCameraPosition(new THREE.Vector3(resetPos.x, resetPos.y, resetPos.z));
    console.log("[DEBUG] Camera position reset to default");
  };

  // Handle planet travel
  const handleTravelToPlanet = () => {
    if (selectedTravelPlanet) {
      const planet = planets.find(p => p.name === selectedTravelPlanet);
      if (planet) {
        const angle = planet.orbitalSpeed * time;
        const planetPos = new THREE.Vector3(
          Math.cos(angle) * planet.distance,
          0,
          Math.sin(angle) * planet.distance
        );
        
        setSelectedPlanet(selectedTravelPlanet);
        
        // Calculate radial offset from planet center (away from sun)
        const directionFromSun = planetPos.clone().normalize();
        const viewDistance = planet.size * 3 + 15; // Safe distance based on planet size
        const cameraPos = planetPos.clone().add(
          directionFromSun.clone().multiplyScalar(viewDistance)
        );
        // Add some Y offset for better viewing angle
        cameraPos.y += 10;
        
        setCameraPosition(cameraPos);
        
        setLanded(selectedTravelPlanet);
        
        console.log(`[DEBUG] Fast traveled to ${selectedTravelPlanet} - Planet at (${planetPos.x.toFixed(1)}, ${planetPos.y.toFixed(1)}, ${planetPos.z.toFixed(1)}), Camera at (${cameraPos.x.toFixed(1)}, ${cameraPos.y.toFixed(1)}, ${cameraPos.z.toFixed(1)})`);
      }
    }
  };

  return (
    <DraggablePanel
      defaultPosition={{ x: 16, y: 16 }}
      handle=".debug-panel-header"
      bounds="window"
    >
      <div className="z-50 w-80 bg-gray-900/90 backdrop-blur-md border border-cyan-400/50 rounded-lg shadow-2xl shadow-cyan-500/20 overflow-hidden">
        {/* Header */}
        <div className="debug-panel-header cursor-move flex items-center justify-between px-4 py-2 bg-cyan-500/10 border-b border-cyan-400/30">
        <h2 className="text-cyan-400 font-semibold text-sm">Debug Controls</h2>
        <button
          onClick={toggleVisibility}
          className="text-cyan-400 hover:text-cyan-300 transition-colors"
          title="Close Debug Overlay (F3)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        {/* Time Controls Section */}
        <div className="space-y-3">
          <h3 className="text-cyan-400 text-xs font-semibold uppercase tracking-wide border-b border-cyan-400/20 pb-1">
            Time Controls
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300 text-xs">
                Time of Day: {formatTime(time)}
              </Label>
            </div>
            <Slider
              value={[time]}
              onValueChange={([value]) => setTime(value)}
              min={0}
              max={86400}
              step={60}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300 text-xs">
                Time Scale: {timeScale.toFixed(1)}x
              </Label>
            </div>
            <Slider
              value={[timeScale]}
              onValueChange={([value]) => setTimeScale(value)}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>

          <Button
            onClick={handlePauseToggle}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
            size="sm"
          >
            {isPaused ? "Resume Time" : "Pause Time"}
          </Button>
        </div>

        {/* Player Controls Section */}
        <div className="space-y-3">
          <h3 className="text-cyan-400 text-xs font-semibold uppercase tracking-wide border-b border-cyan-400/20 pb-1">
            Player/Camera Position
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">X</Label>
              <Input
                type="number"
                value={posX}
                onChange={(e) => setPosX(e.target.value)}
                className="h-8 text-xs bg-gray-800/50 border-cyan-400/30 text-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Y</Label>
              <Input
                type="number"
                value={posY}
                onChange={(e) => setPosY(e.target.value)}
                className="h-8 text-xs bg-gray-800/50 border-cyan-400/30 text-gray-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Z</Label>
              <Input
                type="number"
                value={posZ}
                onChange={(e) => setPosZ(e.target.value)}
                className="h-8 text-xs bg-gray-800/50 border-cyan-400/30 text-gray-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handlePositionUpdate}
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              size="sm"
            >
              Set Position
            </Button>
            <Button
              onClick={handlePositionReset}
              variant="outline"
              className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 text-xs"
              size="sm"
            >
              Reset Position
            </Button>
          </div>
        </div>

        {/* Planet Fast Travel Section */}
        <div className="space-y-3">
          <h3 className="text-cyan-400 text-xs font-semibold uppercase tracking-wide border-b border-cyan-400/20 pb-1">
            Planet Fast Travel
          </h3>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Select Planet</Label>
              <Select
                value={selectedTravelPlanet}
                onValueChange={setSelectedTravelPlanet}
              >
                <SelectTrigger className="h-9 bg-gray-800/50 border-cyan-400/30 text-gray-200 text-xs">
                  <SelectValue placeholder="Choose a planet..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-cyan-400/30">
                  {planets.map((planet) => (
                    <SelectItem
                      key={planet.name}
                      value={planet.name}
                      className="text-gray-200 text-xs focus:bg-cyan-500/20 focus:text-cyan-400"
                    >
                      {planet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleTravelToPlanet}
              disabled={!selectedTravelPlanet}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              size="sm"
            >
              Travel to Planet
            </Button>

            {landedPlanet && (
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <span className="text-cyan-400">Current:</span>
                <span className="text-gray-200">{landedPlanet}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visualization Section */}
        <div className="space-y-3">
          <h3 className="text-cyan-400 text-xs font-semibold uppercase tracking-wide border-b border-cyan-400/20 pb-1">
            Visualization
          </h3>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="collision-boxes"
                checked={showCollisionBoxes}
                onCheckedChange={toggleCollisionBoxes}
                className="border-cyan-400/50 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
              />
              <Label
                htmlFor="collision-boxes"
                className="text-gray-300 text-xs cursor-pointer"
              >
                Show Collision Boxes
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="wireframes"
                checked={showWireframes}
                onCheckedChange={toggleWireframes}
                className="border-cyan-400/50 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
              />
              <Label
                htmlFor="wireframes"
                className="text-gray-300 text-xs cursor-pointer"
              >
                Show Wireframes
              </Label>
            </div>
          </div>
        </div>
      </div>
      </div>
    </DraggablePanel>
  );
}
