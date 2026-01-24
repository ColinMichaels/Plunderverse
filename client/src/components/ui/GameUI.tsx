import {useEffect, useState} from "react";
import * as THREE from "three";
import {PlanetTransitionOverlay} from "../surface/PlanetTransition";
import {CockpitOverlay} from "../cockpit/CockpitOverlay";
import {LandingWarning} from "../surface/LandingWarning";
import {OrbitalInterface} from "../navigation/OrbitalInterface";
import {NavigationSidebar} from "../navigation/NavigationSidebar";
import {MusicPlayer} from "../screens/MusicPlayer";
import {CrewRecruitmentInterface} from "../ship/CrewRecruitmentInterface";
import {ParrotHolographicPopup} from "../parrot/ParrotHolographicPopup";

import {ActionBar} from "./ActionBar";
import {ObjectiveTracker} from "../economy/ObjectiveTracker";
import {MissionHUD} from "./MissionHUD";
import {CrewBonusDisplay} from "./CrewBonusDisplay";
// Save and Menu Components
import {MainMenu} from "./MainMenu";
import {SaveGamePanel} from "./SaveGamePanel";
import {AutoSaveIndicator} from "./AutoSaveIndicator";
import {HintModal} from "../screens/HintModal";
import {DeathScreen} from "./DeathScreen";
// Store Hooks
import {useHUDContext} from "../../lib/stores/ui/useHUDContext";
import {useAutopilot, useGame, useLandedState, useLandingWarning, useRewards, useSolarSystem} from "@/lib/stores";
import {useAuthStore} from "@/lib/stores/auth/useAuthStore.ts";
import {useParrot} from "@/lib/stores/useParrot.ts";
import {useParrotEvents} from "@/hooks/useParrotEvents.ts";
import {useCrewManagement} from "../../lib/stores/ship/useCrewManagement";
import {AutopilotIndicator} from "../navigation/AutopilotIndicator";
// Other Hooks
import {useDockingDetection} from "../../hooks/useDockingDetection";
import {useAutoSave} from "../../hooks/useAutoSave";
import {planets} from "@/lib/planetData.ts";
import {BottomControlSidebar} from "./BottomControlSidebar";
import {PauseOverlay} from "./PauseOverlay";
import {PauseMenu} from "./PauseMenu";
import {TargetLockNotification} from "../combat/TargetLockNotification";
import {Parrot} from "@/services/ParrotPersonality";

export function GameUI() {
  const [showCrewRecruitment, setShowCrewRecruitment] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);

  const { isGuest } = useAuthStore();
  const { manualSave } = useAutoSave();
  const { phase } = useGame();
  const { initialize: initializeParrot, comment: parrotComment, praise: parrotPraise } = useParrot();
  const crewManagement = useCrewManagement();
  const { isTakingOff, setIsTakingOff, setNotLanded, setLanded } = useLandedState();
  const { processLandingReward } = useRewards();

  // Initialize docking detection
  useDockingDetection();

  // Initialize Parrot on mount
  useEffect(() => {
    initializeParrot();
      // Brief greeting through personality once UI mounts
      parrotComment("Systems online. Cockpit HUD linked.", "info");
  }, [initializeParrot, parrotComment]);

    // Update crew task progress every 10 second
  useEffect(() => {
    const interval = setInterval(() => {
      crewManagement.updateTaskProgress();
    }, 10000);

    return () => clearInterval(interval);
  }, [crewManagement]);

    // Enable Parrot event hooks
  useParrotEvents();
  const { selectedPlanet, time, isLanding, setIsLanding } = useSolarSystem();
  const {
    isVisible: showLandingWarning,
    planetName,
    currentDistance,
    requiredDistance,
    hideWarning,
  } = useLandingWarning();
  const { activateCinematic: activateAutopilot } = useAutopilot();
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

      {/* Mission HUD - horizontal display at top of screen */}
      <MissionHUD />

      {/* Cockpit Overlay - contextual background frame (only when planet selected or in combat) */}
      <CockpitOverlay />

      {/* Target Lock Notifications - shows when weapons are locking */}
      <TargetLockNotification />

      {/* Only show main UI components when NOT in death screen */}
      {phase !== "ended" && (
        <>
          {/* Navigation Sidebar - Desktop only, left side of screen */}
          <NavigationSidebar />

          {/* New Contextual HUD System */}

          {/* Top Left - Objective Tracker (below ship status) */}
          {uiZoneVisibility.topLeft && <ObjectiveTracker />}
        </>
      )}

      {/* Landing Transition - Using unified planet transition component */}
      {isLanding && selectedPlanet && (
        <PlanetTransitionOverlay
          direction="landing"
          startOnMount
          duration={5.2}
          targetPlanet={selectedPlanet}
          onThrustStart={() => {
            console.log('[Landing] Deceleration started - play retro-thrust sound');
              parrotComment('Decelerating for landing burn.', 'info');
          }}
          onComplete={() => {
            console.log('[Landing] Landing sequence complete - switching to surface view');
              parrotComment('Landing sequence complete!', 'info');
              parrotPraise();
            setIsLanding(false);
            setLanded(selectedPlanet);
            processLandingReward(selectedPlanet);
          }}
        />
      )}

      {/* Landing Warning Dialog */}
      <LandingWarning
        isVisible={showLandingWarning}
        planetName={planetName}
        currentDistance={currentDistance}
        requiredDistance={requiredDistance}
        onClose={hideWarning}
        onAutopilot={handleAutopilot}
      />

      {/* Only show interactive UI components when NOT in death screen */}
      {phase !== "ended" && (
        <>
          {/* Orbital Interface - when orbiting a planet */}
          <OrbitalInterface />
          {/* New Icon-Only Action Bar with Sliding Panels */}
          <ActionBar />

          {/* Music Player in bottom right corner */}
          <div className="fixed top-20 left-2 z-30">
            <MusicPlayer />
          </div>
        </>
      )}

      {/* Additional UI components hidden during death screen */}
      {phase !== "ended" && (
        <>
          {/* Parrot Holographic Popup - Shows when speaking */}
          <ParrotHolographicPopup />

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
        </>
      )}

      {/* Death Screen - Shows when player ship is destroyed */}
      {phase === "ended" && <DeathScreen />}
    </>
  );
}
