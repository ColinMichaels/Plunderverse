import { useState, useEffect } from "react";
import * as THREE from "three";
import { LandingTransition } from "../surface/LandingTransition";
import { TakeoffSequence } from "../surface/TakeoffSequence";
import { CockpitOverlay } from "../cockpit/CockpitOverlay";
import { LandingWarning } from "../surface/LandingWarning";
import { MobileHUD } from "../mobile/MobileHUD";
import { OrbitalInterface } from "../navigation/OrbitalInterface";
import { NavigationSidebar } from "../navigation/NavigationSidebar";
import { FixedMiniMap } from "../navigation/MiniMap/FixedMiniMap";
import { MusicPlayer } from "../screens/MusicPlayer";
import { CryptoMarketplace } from "../economy/crypto/CryptoMarketplace";
import { DevDebugOverlay } from "../debug/DevDebugOverlay";
import { CrewRecruitmentInterface } from "../ship/CrewRecruitmentInterface";
// New HUD Components
import { ShipCoreStatus } from "./ShipCoreStatus";
import { MissionContextHUD } from "./MissionContextHUD";
import { PrimaryControlsHUD } from "./PrimaryControlsHUD";
import { ActionBar } from "./ActionBar";
import { ObjectiveTracker } from "../economy/ObjectiveTracker";
import { useHUDContext } from "../../lib/stores/ui/useHUDContext";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useLandingWarning } from "../../lib/stores/surface/useLandingWarning";
import { useAutopilot } from "../../lib/stores/navigation/useAutopilot";
import { useDebugTools } from "../../lib/stores/debug/useDebugTools";
import { useDockingDetection } from "../../hooks/useDockingDetection";
import { planets } from "../../lib/planetData";
import { TakeoffControls } from "../surface/TakeoffControls";

export function GameUI() {
  const [showCrewRecruitment, setShowCrewRecruitment] = useState(false);

  // Initialize docking detection
  useDockingDetection();
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
  const { currentContext, uiZoneVisibility } = useHUDContext();

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

      {/* Navigation Sidebar - Desktop only, left side of screen */}
      <NavigationSidebar />

      {/* New Contextual HUD System */}
      {/* Top Left - Ship Core Status */}
      {uiZoneVisibility.topLeft && <ShipCoreStatus />}
      
      {/* Top Left - Objective Tracker (below ship status) */}
      {uiZoneVisibility.topLeft && <ObjectiveTracker />}

      {/* Top Right - Mission Context */}
      {uiZoneVisibility.topRight && <MissionContextHUD />}

      {/* Bottom Center - Primary Controls */}
      {uiZoneVisibility.bottomCenter && <PrimaryControlsHUD />}

      {/* Landing Transition */}
      <LandingTransition />

      {/* Takeoff Sequence */}
      <TakeoffSequence />

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

      {/* New Icon-Only Action Bar with Sliding Panels */}
      <ActionBar />

      {/* Marketplace stays separate as it's not part of the action bar */}
      <CryptoMarketplace />

      {/* Mobile Controls - New Unified System */}
      <MobileHUD />

      {/* Fixed minimap in bottom left corner */}
      <div className="fixed bottom-4 left-8 z-30">
        <FixedMiniMap />
      </div>

      {/* Take Off Controls when landed */}
      <div className="fixed bottom-4 left-40 z-30">
        <TakeoffControls />
      </div>

      {/* Music Player in bottom right corner */}
      <div className="fixed top-4 left-28 z-30">
        <MusicPlayer />
      </div>

      {/* Crew Recruitment Interface - Modal overlay */}
      {showCrewRecruitment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <CrewRecruitmentInterface
            stationFaction="independents"
            onClose={() => setShowCrewRecruitment(false)}
          />
        </div>
      )}

      {/* Debug Overlay - Dev mode only (F3 to toggle) */}
      <DevDebugOverlay />
    </>
  );
}
