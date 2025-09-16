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
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useLandingWarning } from "../lib/stores/useLandingWarning";
import { useAutopilot } from "../lib/stores/useAutopilot";
import { planets } from "../lib/planetData";

export function GameUI() {
  const { selectedPlanet, time } = useSolarSystem();
  const {
    isVisible: showLandingWarning,
    planetName,
    currentDistance,
    requiredDistance,
    hideWarning,
  } = useLandingWarning();
  const { activate: activateAutopilot } = useAutopilot();

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
      <div className="fixed bottom-4 right-4 z-30">
        <MusicPlayer />
      </div>
    </>
  );
}
