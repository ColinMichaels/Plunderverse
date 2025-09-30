import { useState, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { LandingTransition } from "./LandingTransition";
import { WarpingEffect } from "./WarpingEffect";
import { CockpitOverlay } from "./CockpitOverlay";
import { LandingWarning } from "./LandingWarning";
import { CockpitHUD } from "./CockpitHUD";
import { MiniMap } from "./MiniMap";
import { MobileHUD } from "./mobile/MobileHUD";
import { OrbitalInterface } from "./OrbitalInterface";
import { InventoryDisplay } from "./InventoryDisplay";
import { EquipmentWarning } from "./EquipmentWarning";
import { ShipStatus } from "./ShipStatus";
import { FixedMiniMap } from "./FixedMiniMap";
import { MusicPlayer } from "./MusicPlayer";
import { CryptoWallet } from "./CryptoWallet";
import { CryptoMarketplace } from "./CryptoMarketplace";
import { ControlsHelp } from "./ControlsHelp";
import { SettingsPanel } from "./SettingsPanel";
import { DevDebugOverlay } from "./DevDebugOverlay";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useLandingWarning } from "../lib/stores/useLandingWarning";
import { useAutopilot } from "../lib/stores/useAutopilot";
import { useDebugTools } from "../lib/stores/useDebugTools";
import { planets } from "../lib/planetData";

export function GameUI() {
  const [showSettings, setShowSettings] = useState(false);
  const { selectedPlanet, time } = useSolarSystem();
  const {
    isVisible: showLandingWarning,
    planetName,
    currentDistance,
    requiredDistance,
    hideWarning,
  } = useLandingWarning();
  const { activate: activateAutopilot } = useAutopilot();
  const { toggleVisibility } = useDebugTools();

  // F3 key handler for debug overlay (dev mode only)
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.log("[DEBUG] GameUI mounted - F3 to toggle debug overlay");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F3") {
        event.preventDefault();
        event.stopPropagation();
        toggleVisibility();
        console.log("[DEBUG] F3 pressed - Debug overlay toggled");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleVisibility]);

  // Autopilot activation function
  const handleAutopilot = () => {
    if (selectedPlanet) {
      const planetData = planets.find((p) => p.name === selectedPlanet);
      if (planetData) {
        // Calculate target position near the planet
        const angle = time * planetData.orbitalSpeed;
        const planetX = Math.cos(angle) * planetData.distance;
        const planetZ = Math.sin(angle) * planetData.distance;
        const targetPosition = new THREE.Vector3(planetX, 0, planetZ);

        // Move to a safe distance from the planet (slightly closer than landing range)
        const approachDirection = new THREE.Vector3(0, 10, 50); // Assume current camera position
        const safeDistance = planetData.size * 6;
        targetPosition.add(
          approachDirection.normalize().multiplyScalar(safeDistance),
        );

        activateAutopilot(targetPosition);
        console.log(`Autopilot activated! Navigating to ${selectedPlanet}`);
      }
    }
  };

  return (
    <>
      {/* Cockpit Overlay - background frame */}
      <CockpitOverlay />

      {/* Unified Cockpit HUD */}
      <CockpitHUD />

      {/* Landing Transition */}
      <LandingTransition />

      {/* Landing Warning Dialog */}
      <LandingWarning
        isVisible={showLandingWarning}
        planetName={planetName}
        currentDistance={currentDistance}
        requiredDistance={requiredDistance}
        onClose={hideWarning}
        onAutopilot={handleAutopilot}
      />

      {/* Orbital Interface - when orbiting a planet */}
      <OrbitalInterface />

      {/* UI Components - these register themselves with UILayoutManager but render content via SpaceUIPanel */}
      <ShipStatus />

      <InventoryDisplay />
      <EquipmentWarning />

      {/* Cryptocurrency Components */}
      <CryptoWallet />
      <CryptoMarketplace />

      {/* Mobile Controls - New Unified System */}
      <MobileHUD />

      {/* Fixed minimap in bottom left corner */}
      <div className="fixed bottom-4 left-4 z-30">
        <FixedMiniMap />
      </div>

      {/* Music Player in bottom right corner */}
      <div className="fixed bottom-4 left-8 z-30">
        <MusicPlayer />
      </div>

      {/* Controls Help - shows on first launch, accessible via F1 */}
      <ControlsHelp />

      {/* Settings button in top right corner */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all z-40 backdrop-blur-sm flex items-center justify-center"
        title="Game Settings"
      >
        <span className="text-xl">⚙️</span>
      </button>

      {/* Settings Panel */}
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />

      {/* Debug Overlay - Dev mode only (F3 to toggle) */}
      <DevDebugOverlay />
    </>
  );
}
