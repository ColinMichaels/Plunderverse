import { useState, useEffect } from "react";
import * as THREE from "three";
import { LandingTransition } from "../surface/LandingTransition";
import { TakeoffSequence } from "../surface/TakeoffSequence";
import { CockpitOverlay } from "../cockpit/CockpitOverlay";
import { LandingWarning } from "../surface/LandingWarning";
import { MobileHUD } from "../mobile/MobileHUD";
import { OrbitalInterface } from "../navigation/OrbitalInterface";
import { NavigationSidebar } from "../navigation/NavigationSidebar";
import { MusicPlayer } from "../screens/MusicPlayer";
import { CryptoMarketplace } from "../economy/crypto/CryptoMarketplace";
import { CrewRecruitmentInterface } from "../ship/CrewRecruitmentInterface";
// New HUD Components
import { ShipCoreStatus } from "./ShipCoreStatus";
import { PrimaryControlsHUD } from "./PrimaryControlsHUD";
import { ActionBar } from "./ActionBar";
import { ObjectiveTracker } from "../economy/ObjectiveTracker";
import { MissionHUD } from "./MissionHUD";
import { CrewBonusDisplay } from "./CrewBonusDisplay";
import { EconomicFeedback } from "../economy/EconomicFeedback";
// Save and Menu Components
import { MainMenu } from "./MainMenu";
import { SaveGamePanel } from "./SaveGamePanel";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { HintModal } from "../screens/HintModal";
import { DeathScreen } from "./DeathScreen";
// Store Hooks
import { useHUDContext } from "../../lib/stores/ui/useHUDContext";
import { useGame } from "../../lib/stores/ui/useGame";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useLandingWarning } from "../../lib/stores/surface/useLandingWarning";
import { useAutopilot } from "../../lib/stores/navigation/useAutopilot";
import { useAuthStore } from "../../lib/stores/auth/useAuthStore";
import { AutopilotIndicator } from "../navigation/AutopilotIndicator";
// Other Hooks
import { useDockingDetection } from "../../hooks/useDockingDetection";
import { useAutoSave } from "../../hooks/useAutoSave";
import { planets } from "../../lib/planetData";
import { BottomControlSidebar } from "./BottomControlSidebar";
import { FocusIndicator, FocusStatusIndicator } from "./FocusIndicator";
import { PauseOverlay } from "./PauseOverlay";
import { PauseMenu } from "./PauseMenu";
import { PlanetInfo } from "../shared/PlanetInfo";
import { TargetLockNotification } from "../combat/TargetLockNotification";

export function GameUI() {
  const [showCrewRecruitment, setShowCrewRecruitment] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);

  const { isGuest } = useAuthStore();
  const { manualSave } = useAutoSave();
  const { phase } = useGame();

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
  const { currentContext, uiZoneVisibility, isDocked } = useHUDContext();

  // Keyboard shortcut for save panel (F5 or Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 for quick save
      if (e.key === "F5") {
        e.preventDefault();
        if (!isGuest) {
          manualSave();
        } else {
          setShowSavePanel(true); // Show panel for guest to see they need to register
        }
      }
      // Ctrl+S for save panel
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        setShowSavePanel(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGuest, manualSave]);

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
      }
    }
  };

  return (
    <>
      {/* Autopilot Indicator */}
      <AutopilotIndicator />

      {/* Pause Menu - Player-controlled pause with ESC key */}
      <PauseMenu />

      {/* Pause Overlay - Shows when game loses focus (but not when pause menu is open) */}
      <PauseOverlay />

      {/* Focus State Indicators */}
      <FocusIndicator />
      <FocusStatusIndicator />

      {/* Mission HUD - horizontal display at top of screen */}
      <MissionHUD />

      {/* Cockpit Overlay - contextual background frame (only when planet selected or in combat) */}
      <CockpitOverlay />

      {/* Target Lock Notifications - shows when weapons are locking */}
      <TargetLockNotification />

      {/* Navigation Sidebar - Desktop only, left side of screen */}
      <NavigationSidebar />

      {/* New Contextual HUD System */}
      {/* Top Left - Ship Core Status */}
      {uiZoneVisibility.topLeft && <ShipCoreStatus />}

      {/* Top Left - Objective Tracker (below ship status) */}
      {uiZoneVisibility.topLeft && <ObjectiveTracker />}

      {/* Top Left - Economic Feedback (only on surface/docked, hidden in space since BottomControlSidebar shows credits) */}
      {uiZoneVisibility.topLeft &&
        (currentContext === "planet-surface" || isDocked) && (
          <div className="fixed top-64 left-4 z-40 w-80">
            <EconomicFeedback />
          </div>
        )}

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

      {/* Planet Info Display - shows when a planet (not Sun) is selected */}
      <PlanetInfo />

      {/* Orbital Interface - when orbiting a planet */}
      <OrbitalInterface />

      {/* New Icon-Only Action Bar with Sliding Panels */}
      <ActionBar />

      {/* Marketplace stays separate as it's not part of the action bar */}
      <CryptoMarketplace />

      {/* Mobile Controls - New Unified System */}
      <MobileHUD />

      {/* Music Player in bottom right corner */}
      <div className="fixed top-20 left-2 z-30">
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

      {/* Main Menu - ESC key opens it */}
      <MainMenu />

      {/* Save Game Panel - Ctrl+S or F5 */}
      <div className="fixed top-24 right-10 z-50">
        <SaveGamePanel
          isOpen={showSavePanel}
          onClose={() => setShowSavePanel(false)}
          onSaveComplete={() => {
            setShowSavePanel(false);
          }}
        />

        {/* Auto-save Indicator - Small, unobtrusive indicator in top-right */}
        <AutoSaveIndicator />
      </div>

      {/* Crew Bonus Display - Shows active crew bonuses */}
      <CrewBonusDisplay />

      {/* Hint Modal - Shows tutorial hints */}
      <HintModal />

      {/* Bottom Control Sidebar - Shows location, flashlight, and takeoff controls */}
      <BottomControlSidebar />

      {/* Death Screen - Shows when player ship is destroyed */}
      {phase === "ended" && <DeathScreen />}
    </>
  );
}
