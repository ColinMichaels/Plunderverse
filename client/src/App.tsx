import {useEffect, useRef, useState} from "react";
import {GameUI} from "./components/ui/GameUI";
import {BabylonCanvasWithInit} from "./engine/components/BabylonCanvas";
import {BabylonSolarSystem} from "./engine/scenes/BabylonSolarSystem";
import {BabylonCombatScene} from "./engine/scenes/BabylonCombatScene";
import {BabylonSurfaceScene} from "./engine/scenes/BabylonSurfaceScene";
import {EnhancedSplashScreen} from "./components/screens/EnhancedSplashScreen";
import {WebGLCheckWrapper} from "./components/shared/WebGLCheckWrapper";
import {TakeoffControls} from "./components/surface/TakeoffControls";
import {UILayoutProvider} from "./components/ui/UILayoutManager";
import {PatrolEncounter} from "./components/space/PatrolEncounter";
import {MobileGame} from "./components/mobile/MobileGame";
import {useAudio, useGame, useLandedState, useSettings} from "@/lib/stores";
import {usePlatform} from "./lib/stores/ui/usePlatform";
import {TouchPropulsionControls} from "./components/mobile/TouchPropulsionControls";
import {HintModal} from "./components/screens/HintModal";
import contentRegistry from "./lib/plunderverse/contentRegistry";
import {MissionDebugPanel} from "./components/debug/MissionDebugPanel";
import {CombatDebugPanel} from "./components/debug/CombatDebugPanel";
import {ResourceManager} from "./lib/utils/ResourceManager";
import {memoryProfiler} from "./lib/utils/MemoryProfiler";
import {useAuthStore} from "./lib/stores/auth/useAuthStore";
import {Toaster} from "./components/ui/sonner";
import {BabylonTestPageWithMount} from "./components/debug/BabylonTestPage";
import {EngineErrorBoundary} from "./engine/components/EngineErrorBoundary";
import {CloudSyncProvider} from "./providers/CloudSyncProvider";
import {debugLog, debugError} from "./lib/utils/debug";
import "@fontsource/inter";

// Main Game component (without auth wrapper)
function GameContent() {
  const [showCanvas, setShowCanvas] = useState(false);
  const [showBabylonTest, setShowBabylonTest] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('babylon') === 'true';
  });

  // Use state with subscription instead of Zustand hooks to avoid React duplicate issue
  const [phase, setPhase] = useState(() => useGame.getState().phase);
  const [isLanded, setIsLanded] = useState(() => useLandedState.getState().isLanded);
  const [platformType, setPlatformType] = useState(() => usePlatform.getState().platformType);
  const [uiTheme, setUiTheme] = useState(() => useSettings.getState().uiTheme);

  // Subscribe to store changes
  useEffect(() => {
    const unsubGame = useGame.subscribe((state) => setPhase(state.phase));
    const unsubLanded = useLandedState.subscribe((state) => setIsLanded(state.isLanded));
    const unsubPlatform = usePlatform.subscribe((state) => setPlatformType(state.platformType));
    const unsubSettings = useSettings.subscribe((state) => setUiTheme(state.uiTheme));
    return () => {
      unsubGame();
      unsubLanded();
      unsubPlatform();
      unsubSettings();
    };
  }, []);

  const updatePlatform = usePlatform.getState().updatePlatform;

  // Initialize theme on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', uiTheme);
      debugLog('theme', `Initialized with theme: ${uiTheme}`);
    }
  }, [uiTheme]);

  // FORCE MOBILE DETECTION FOR SMALL VIEWPORTS
  const [forceMobile, setForceMobile] = useState(false);
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const shouldBeMobile = width < 768 || (width <= 414 && height >= 600);
      setForceMobile(shouldBeMobile && platformType !== "mobile" ? true : shouldBeMobile);
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, [platformType]);

  const effectivePlatformType = forceMobile ? "mobile" : platformType;

  // Create a stable keyboard map using a ref to prevent infinite loops
  const keyboardMapRef = useRef(useSettings.getState().getKeyboardMap());

  // Update the keyboard map only when keybinds actually change
  useEffect(() => {
    return useSettings.subscribe(() => {
      keyboardMapRef.current = useSettings.getState().getKeyboardMap();
    });
  }, []);

  // Initialize platform detection on mount and handle window resize
  useEffect(() => {
    updatePlatform();
    window.addEventListener("orientationchange", updatePlatform);
    return () => window.removeEventListener("orientationchange", updatePlatform);
  }, []);

  // Handle resource cleanup and audio management on scene transitions
  useEffect(() => {
    const resourceManager = ResourceManager.getInstance();
    const audioState = useAudio.getState();

    if (isLanded) {
      audioState.stopAmbientMusic();
      memoryProfiler.logCurrentStatus("Before landing cleanup");
      const disposedCount = resourceManager.disposeByTag("space-scene");
      memoryProfiler.recordCleanup(disposedCount);
      memoryProfiler.logSceneTransition("space", "planet-surface");
      debugLog('scene', 'Landed - disposed space-scene resources');
    } else {
      if (!audioState.masterMute && !audioState.musicMute) {
        audioState.playAmbientMusic();
      }
      memoryProfiler.logCurrentStatus("Before takeoff cleanup");
      const disposedCount = resourceManager.disposeByTag("planet-surface");
      memoryProfiler.recordCleanup(disposedCount);
      memoryProfiler.logSceneTransition("planet-surface", "space");
      debugLog('scene', 'Took off - disposed planet-surface resources');
    }
  }, [isLanded]);

  // Initialize Plunderverse content and developer tools
  useEffect(() => {
    contentRegistry.loadContent().catch((error) => {
      debugError('content', 'Failed to load Plunderverse content:', error);
    });

    // Expose dev tools on window (dev only)
    if (import.meta.env.DEV) {
      const resourceManager = ResourceManager.getInstance();

      (window as any).testNotifications = () => {
        import("sonner").then(({ toast }) => {
          toast.success("Mission Completed!", { description: "Cargo delivered to Mars Station", duration: 5000 });
          setTimeout(() => toast.error("Hull Breach!", { description: "Seek immediate repairs", duration: 5000 }), 1000);
          setTimeout(() => toast.warning("Low Fuel", { description: "25% fuel remaining", duration: 5000 }), 2000);
          setTimeout(() => toast.info("New Trade Route", { description: "Earth to Venus route discovered", duration: 5000 }), 3000);
          setTimeout(() => toast("Autopilot Engaged", { duration: 5000 }), 4000);
        });
      };

      (window as any).memoryProfile = () => {
        memoryProfiler.logCurrentStatus("Manual Profile");
        resourceManager.logMemoryStatus();
        return "Memory profile complete";
      };

      (window as any).forceCleanup = () => {
        const count = resourceManager.cleanupOldResources(5 * 60 * 1000);
        memoryProfiler.recordCleanup(count);
        resourceManager.logMemoryStatus();
        return `Cleaned up ${count} old resources`;
      };

      (window as any).showMemoryTrend = () => { memoryProfiler.logTrend(); };
      (window as any).exportMemoryData = () => { const d = memoryProfiler.exportData(); console.log(d); return d; };
      (window as any).resetMemoryProfiler = () => { memoryProfiler.reset(); };

      console.log('%c[DEV] Commands: testNotifications, memoryProfile, forceCleanup, showMemoryTrend, exportMemoryData, resetMemoryProfiler', 'color:#00ff00');
    }
  }, []);

  // Show canvas on mount
  useEffect(() => {
    setShowCanvas(true);
  }, []);

  return (
    <UILayoutProvider>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          background: "black",
        }}
      >
        {/* Babylon.js test page - access via ?babylon=true */}
        {showBabylonTest && (
          <BabylonTestPageWithMount onBack={() => {
            setShowBabylonTest(false);
            window.history.replaceState({}, '', window.location.pathname);
          }} />
        )}

        {!showBabylonTest && (
          effectivePlatformType === "mobile" ? (
            <MobileGame />
          ) : (
            <>
              {phase === "splash" && <EnhancedSplashScreen />}

              {(phase === "playing" || phase === "ended") && showCanvas && (
                <>
                  <TouchPropulsionControls>
                    <WebGLCheckWrapper fallbackMessage="WebGL is required to render the game.">
                      <EngineErrorBoundary>
                        <BabylonCanvasWithInit
                          className="absolute inset-0"
                          onReady={() => debugLog('babylon', 'Engine ready')}
                          onError={(err) => debugError('babylon', 'Engine error:', err)}
                        >
                          {!isLanded ? (
                            <>
                              <BabylonSolarSystem />
                              <BabylonCombatScene />
                            </>
                          ) : (
                            <BabylonSurfaceScene />
                          )}
                        </BabylonCanvasWithInit>
                      </EngineErrorBoundary>
                    </WebGLCheckWrapper>
                  </TouchPropulsionControls>

                  <GameUI />
                  <PatrolEncounter />
                  <TakeoffControls />
                  <HintModal />
                </>
              )}
            </>
          )
        )}

        {import.meta.env.DEV && <MissionDebugPanel />}
        {import.meta.env.DEV && <CombatDebugPanel />}

        <Toaster position="top-center" richColors expand={false} />
      </div>
    </UILayoutProvider>
  );
}

// Main App component
function App() {
  useEffect(() => {
    useAuthStore.setState({ isGuest: true, isAuthReady: true });
  }, []);

  return (
    <CloudSyncProvider>
      <GameContent />
    </CloudSyncProvider>
  );
}

export default App;
