import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { LandingTransition } from "./LandingTransition";
import { CockpitOverlay } from "./CockpitOverlay";
import { LandingWarning } from "./LandingWarning";
import { CockpitHUD } from "./CockpitHUD";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useLandingWarning } from "../lib/stores/useLandingWarning";
import { useAutopilot } from "../lib/stores/useAutopilot";
import { planets } from "../lib/planetData";

enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
  shoot = 'shoot',
  land = 'land',
  info = 'info',
  menu = 'menu',
  center = 'center'
}

export function GameUI() {
  const { selectedPlanet, time } = useSolarSystem();
  const { isVisible: showLandingWarning, planetName, currentDistance, requiredDistance, hideWarning } = useLandingWarning();
  const { activate: activateAutopilot } = useAutopilot();

  // Autopilot activation function
  const handleAutopilot = () => {
    if (selectedPlanet) {
      const planetData = planets.find(p => p.name === selectedPlanet);
      if (planetData) {
        // Calculate target position near the planet
        const angle = time * planetData.orbitalSpeed;
        const planetX = Math.cos(angle) * planetData.distance;
        const planetZ = Math.sin(angle) * planetData.distance;
        const targetPosition = new THREE.Vector3(planetX, 0, planetZ);
        
        // Move to a safe distance from the planet (slightly closer than landing range)
        const approachDirection = new THREE.Vector3(0, 10, 50); // Assume current camera position
        const safeDistance = planetData.size * 6;
        targetPosition.add(approachDirection.normalize().multiplyScalar(safeDistance));
        
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
    </>
  );
}
