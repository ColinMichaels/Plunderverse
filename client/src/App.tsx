import {Canvas} from "@react-three/fiber";
import {Suspense, useEffect, useRef, useState} from "react";
import {KeyboardControls} from "@react-three/drei";
import {SolarSystem} from "./components/space/SolarSystem";
import {GameUI} from "./components/ui/GameUI";
import {EnhancedSplashScreen} from "./components/screens/EnhancedSplashScreen";
import {PlanetSurfaceScene} from "./components/surface/PlanetSurfaceScene";
import {WebGLCheckWrapper} from "./components/shared/WebGLCheckWrapper";
import {TakeoffControls} from "./components/surface/TakeoffControls";
import {UILayoutProvider} from "./components/ui/UILayoutManager";
import {PatrolEncounter} from "./components/space/PatrolEncounter";
import {MobileGame} from "./components/mobile/MobileGame";
import {AuthProvider} from "./components/auth/AuthProvider";
import {useAudio, useGame, useLandedState, useSettings} from "@/lib/stores";
import {usePlatform} from "./lib/stores/ui/usePlatform";
import {TouchPropulsionControls} from "./components/mobile/TouchPropulsionControls";
import {HintModal} from "./components/screens/HintModal";
import {AUDIO_CONFIG} from "./lib/audioConfig";
import contentRegistry from "./lib/plunderverse/contentRegistry";
import {MissionDebugPanel} from "./components/debug/MissionDebugPanel";
import {CombatDebugPanel} from "./components/debug/CombatDebugPanel";
import {ResourceManager} from "./lib/utils/ResourceManager";
import {memoryProfiler} from "./lib/utils/MemoryProfiler";
import {testTerrainCacheManagement} from "./lib/tests/testTerrainCache";
import {useAuthStore} from "./lib/stores/auth/useAuthStore";
import {cloudSyncManager} from "./services/CloudSyncManager";
import {CloudSyncManager} from "./services/CloudSyncWebSocket"; // NEW: WebSocket sync
import {Toaster} from "./components/ui/sonner";
import "./testSaveSystem"; // Import save system test module
import "./utils/testSaveFixed"; // Import fixed save test
import "./runImprovementTests"; // Import improvement tests
import "@fontsource/inter";

// Main Game component (without auth wrapper)
function GameContent() {
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic } = useAudio();
  const { phase } = useGame();
  const { isLanded } = useLandedState();
    const {platformType, updatePlatform} = usePlatform();
  
  // Log scene switches when isLanded changes
  useEffect(() => {
    console.log(`[APP-SCENE-SWITCH] isLanded changed to: ${isLanded}`, {
      phase,
      willRender: phase === "playing" ? (isLanded ? "PlanetSurfaceScene" : "SolarSystem") : "None",
      showCanvas,
      timestamp: Date.now()
    });
    
    if (phase === "playing") {
      if (isLanded) {
        console.log("[APP-SCENE-SWITCH] ✅ Now rendering PLANET SURFACE scene");
      } else {
        console.log("[APP-SCENE-SWITCH] 🚀 Now rendering SPACE scene - Canvas and SolarSystem should mount");
        console.log("[APP-SCENE-SWITCH] Current rendering conditions:", {
          phase,
          isLanded,
          showCanvas,
          willRenderCanvas: phase === "playing" && !isLanded && showCanvas
        });
        // Add a small delay to check if Canvas actually mounts
        setTimeout(() => {
          console.log("[APP-SCENE-SWITCH] Check after 100ms - Canvas should be mounted now");
        }, 100);
      }
    }
  }, [isLanded, phase, showCanvas]);

  // FORCE MOBILE DETECTION FOR SMALL VIEWPORTS
  // Check viewport width directly as a fallback
  const [forceMobile, setForceMobile] = useState(false);
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const shouldBeMobile = width < 768 || (width <= 414 && height >= 600);

      if (shouldBeMobile && platformType !== "mobile") {
        setForceMobile(true);
      } else {
        setForceMobile(shouldBeMobile);
      }
    };
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, [platformType]);

  // Use forced mobile if needed
  const effectivePlatformType = forceMobile ? "mobile" : platformType;

  // Create a stable keyboard map using a ref to prevent infinite loops
  const keyboardMapRef = useRef(useSettings.getState().getKeyboardMap());

  // Track CloudSync initialization to prevent re-initialization loop
  const cloudSyncInitializedRef = useRef(false);
  const cloudSyncInitializingRef = useRef(false);

  // Update the keyboard map only when keybinds actually change
  useEffect(() => {
      return useSettings.subscribe(() => {
          keyboardMapRef.current = useSettings.getState().getKeyboardMap();
    });
  }, []);

  // Initialize platform detection on mount and handle window resize
  useEffect(() => {
    updatePlatform();

    // Handle orientation changes on mobile
    const handleOrientationChange = () => {
      updatePlatform();
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  // Handle resource cleanup and audio management on scene transitions
  useEffect(() => {
    const resourceManager = ResourceManager.getInstance();
    const audioState = useAudio.getState();

    if (isLanded) {
      // Stop space ambience when landing
      if (
        audioState.ambientMusic &&
        audioState.ambientMusic instanceof HTMLAudioElement
      ) {
        console.log("[SCENE-MANAGER] Landing detected, pausing space ambience");
        audioState.stopAmbientMusic();
      } else {
        console.log(
          "[SCENE-MANAGER] Landing detected, but ambient music not initialized:",
          audioState.ambientMusic,
        );
      }

      // Memory profiling: Track memory before and after landing
      memoryProfiler.logCurrentStatus("Before landing cleanup");

      // Cleanup space scene resources when landing (but not persistent audio)
      console.log(
        "[SCENE-MANAGER] Landing detected, disposing space-scene resources",
      );
      const disposedCount = resourceManager.disposeByTag("space-scene");

      // Record cleanup and log scene transition
      memoryProfiler.recordCleanup(disposedCount);
      memoryProfiler.logSceneTransition("space", "planet-surface");
      resourceManager.logMemoryStatus();
    } else {
      // Play space ambience when entering space
      if (
        audioState.ambientMusic &&
        audioState.ambientMusic instanceof HTMLAudioElement &&
        !audioState.masterMute &&
        !audioState.musicMute
      ) {
        console.log("[SCENE-MANAGER] Entering space, starting space ambience");
        audioState.playAmbientMusic();
      } else {
        console.log(
          "[SCENE-MANAGER] Entering space, but cannot play ambient music:",
          {
            hasAmbient: !!audioState.ambientMusic,
            isHTMLAudioElement:
              audioState.ambientMusic instanceof HTMLAudioElement,
            masterMute: audioState.masterMute,
            musicMute: audioState.musicMute,
          },
        );
      }

      // Memory profiling: Track memory before and after takeoff
      memoryProfiler.logCurrentStatus("Before takeoff cleanup");

      // Cleanup planet surface resources when taking off
      console.log(
        "[SCENE-MANAGER] Takeoff detected, disposing planet-surface resources",
      );
      const disposedCount = resourceManager.disposeByTag("planet-surface");

      // Record cleanup and log scene transition
      memoryProfiler.recordCleanup(disposedCount);
      memoryProfiler.logSceneTransition("planet-surface", "space");
      resourceManager.logMemoryStatus();
    }
  }, [isLanded]);

  // Initialize CloudSyncManager with proper auth state subscription
  useEffect(() => {
    // Track previous auth state for transition detection
    let prevAuthState = {
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      isGuest: useAuthStore.getState().isGuest,
    };

    // Subscribe to auth state changes
    const unsubscribe = useAuthStore.subscribe((state) => {
      const currentAuthState = {
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      };

      // Check if auth state actually changed
      if (
        currentAuthState.isAuthenticated === prevAuthState.isAuthenticated &&
        currentAuthState.isGuest === prevAuthState.isGuest
      ) {
        return;
      }

      // Detect login transition (not-authenticated → authenticated, excluding guests)
      const wasNotAuthenticated =
        !prevAuthState.isAuthenticated || prevAuthState.isGuest;
      const isNowAuthenticated =
        currentAuthState.isAuthenticated && !currentAuthState.isGuest;

      if (wasNotAuthenticated && isNowAuthenticated) {
        // Prevent concurrent initialization
        if (
          cloudSyncInitializedRef.current ||
          cloudSyncInitializingRef.current
        ) {
          prevAuthState = currentAuthState;
          return;
        }

        cloudSyncInitializingRef.current = true;

        // Initialize both old cloud sync and new WebSocket sync
        Promise.all([
          cloudSyncManager.initialize(),
          CloudSyncManager.getInstance().initialize(),
        ])
          .then(() => {
            cloudSyncInitializedRef.current = true;
            console.log(
              "[CLOUD-SYNC] Both sync managers initialized successfully after login",
            );
          })
          .catch((error) => {
            console.error("[CLOUD-SYNC] Initialization failed:", error);
          })
          .finally(() => {
            cloudSyncInitializingRef.current = false;
          });
      }

      // Detect logout transition
      if (!currentAuthState.isAuthenticated && prevAuthState.isAuthenticated) {
        cloudSyncManager.reset();
        cloudSyncInitializedRef.current = false;
        console.log("[CLOUD-SYNC] Cleaned up after logout");
      }

      // Update previous state
      prevAuthState = currentAuthState;
    });

    // Also check immediately on mount in case already authenticated
    const initCloudSyncIfAuthenticated = async () => {
      const { isAuthenticated, isGuest } = useAuthStore.getState();

      console.log("[CLOUD-SYNC] Checking auth state on mount:", {
        isAuthenticated,
        isGuest,
      });

      if (
        isAuthenticated &&
        !isGuest &&
        !cloudSyncInitializedRef.current &&
        !cloudSyncInitializingRef.current
      ) {
        console.log("[CLOUD-SYNC] Starting initialization...");
        cloudSyncInitializingRef.current = true;

        try {
          // Initialize both old cloud sync and new WebSocket sync
          await Promise.all([
            cloudSyncManager.initialize(),
            CloudSyncManager.getInstance().initialize(),
          ]);
          cloudSyncInitializedRef.current = true;
          console.log(
            "[CLOUD-SYNC] Both sync managers initialized successfully on mount",
          );
        } catch (error) {
          console.error("[CLOUD-SYNC] Initialization failed:", error);
        } finally {
          cloudSyncInitializingRef.current = false;
        }
      } else {
        console.log("[CLOUD-SYNC] Skipping initialization:", {
          isAuthenticated,
          isGuest,
          alreadyInitialized: cloudSyncInitializedRef.current,
          isInitializing: cloudSyncInitializingRef.current,
        });
      }
    };

    initCloudSyncIfAuthenticated();

    return () => {
      unsubscribe();
      cloudSyncManager.reset();
      cloudSyncInitializedRef.current = false;
      cloudSyncInitializingRef.current = false;
    };
  }, []); // Empty array is fine now - we subscribe to changes internally

  // Initialize Plunderverse content and developer tools
  useEffect(() => {
    contentRegistry.loadContent().catch((error) => {
      console.error("Failed to load Plunderverse content:", error);
    });

    // Add terrain cache test to window for debugging
    (window as any).testTerrainCacheManagement = testTerrainCacheManagement;
    console.log(
      "[TERRAIN-CACHE] Test function available: Run `testTerrainCacheManagement()` in the browser console to test terrain cache management.",
    );

    // Add test notifications command for verifying dark theme styling
    (window as any).testNotifications = () => {
      import("sonner").then(({ toast }) => {
        console.log(
          "%c[NOTIFICATION TEST] Triggering all notification types...",
          "color: #fbbf24; font-weight: bold",
        );

        // Success notification - amber/gold theme
        toast.success("🎯 Mission Completed!", {
          description: "You've successfully delivered cargo to Mars Station",
          duration: 5000,
        });

        // Error notification - red with dark theme
        setTimeout(() => {
          toast.error("⚠️ Hull Breach Detected!", {
            description:
              "Critical damage to ship systems - seek immediate repairs",
            duration: 5000,
          });
        }, 1000);

        // Warning notification - orange theme
        setTimeout(() => {
          toast.warning("⛽ Low Fuel Warning", {
            description: "Only 25% fuel remaining - find a refueling station",
            duration: 5000,
          });
        }, 2000);

        // Info notification - cyan accent
        setTimeout(() => {
          toast.info("📡 New Trade Route Available", {
            description: "Profitable route discovered between Earth and Venus",
            duration: 5000,
          });
        }, 3000);

        // Basic notification (default styling)
        setTimeout(() => {
          toast("🚀 Autopilot Engaged", {
            description: "Heading to Jupiter at maximum velocity",
            duration: 5000,
          });
        }, 4000);

        return "All notification types triggered - check visual styling";
      });
    };

    // Add memory profiling console commands (development only)
    if (import.meta.env.DEV) {
      console.log(
        "%c[NOTIFICATION TEST] Run window.testNotifications() to test dark theme notifications",
        "color: #fbbf24; font-weight: bold",
      );
      const resourceManager = ResourceManager.getInstance();

      // Memory profile command - shows current memory state
      (window as any).memoryProfile = () => {
        console.log(
          "%c[DEVELOPER COMMAND] Memory Profile",
          "color: #00ff00; font-weight: bold",
        );
        memoryProfiler.logCurrentStatus("Manual Profile");
        resourceManager.logMemoryStatus();
        return "Memory profile complete";
      };

      // Force cleanup command - manually triggers resource cleanup
      (window as any).forceCleanup = () => {
        console.log(
          "%c[DEVELOPER COMMAND] Force Cleanup",
          "color: #ffa500; font-weight: bold",
        );
        const oldResourcesCleanedCount = resourceManager.cleanupOldResources(
          5 * 60 * 1000,
        ); // Cleanup resources older than 5 minutes
        memoryProfiler.recordCleanup(oldResourcesCleanedCount);
        resourceManager.logMemoryStatus();
        return `Cleaned up ${oldResourcesCleanedCount} old resources`;
      };

      // Show memory trend command - displays memory usage over time
      (window as any).showMemoryTrend = () => {
        console.log(
          "%c[DEVELOPER COMMAND] Memory Trend",
          "color: #4a90e2; font-weight: bold",
        );
        memoryProfiler.logTrend();
        return "Memory trend displayed";
      };

      // Export memory data command - exports profiling data for analysis
      (window as any).exportMemoryData = () => {
        const data = memoryProfiler.exportData();
        console.log(
          "%c[DEVELOPER COMMAND] Memory Data Export",
          "color: #4a90e2; font-weight: bold",
        );
        console.log(data);
        return data;
      };

      // Reset memory profiler command
      (window as any).resetMemoryProfiler = () => {
        console.log(
          "%c[DEVELOPER COMMAND] Reset Memory Profiler",
          "color: #ff0000; font-weight: bold",
        );
        memoryProfiler.reset();
        return "Memory profiler reset";
      };

      console.log(
        "%c[MEMORY-PROFILER] Developer commands available:",
        "color: #00ff00",
      );
      console.log("  - window.memoryProfile() : Show current memory profile");
      console.log("  - window.forceCleanup() : Force resource cleanup");
      console.log("  - window.showMemoryTrend() : Display memory usage trend");
      console.log("  - window.exportMemoryData() : Export profiling data");
      console.log("  - window.resetMemoryProfiler() : Reset profiler data");

      console.log(
        "%c[CONSOLIDATED-DEBUG-PANEL] Press backtick (`) key to toggle the comprehensive debug panel",
        "color: #00ffff; font-weight: bold",
      );
      console.log("  Features include:");
      console.log("  - Mission debugging and controls");
      console.log("  - Real-time FPS and memory monitoring");
      console.log("  - Time controls and camera positioning");
      console.log("  - Lighting controls (when landed on planet)");
      console.log("  - Test suite runners (panel, mission, objective tests)");
      console.log("  - Resource management and cleanup tools");
    }
  }, []);

  // Initialize audio and show canvas
  useEffect(() => {
    const { soundEffects } = AUDIO_CONFIG;
    const audioState = useAudio.getState();
    const resourceManager = ResourceManager.getInstance();

    // Only initialize audio if not already initialized (check if it's a proper HTMLAudioElement)
    if (
      !audioState.ambientMusic ||
      !(audioState.ambientMusic instanceof HTMLAudioElement)
    ) {
      console.log("[APP] Initializing audio system...");
      // Load background music
      const music = new Audio(soundEffects.background.path);
      music.loop = soundEffects.background.loop ?? false;
      music.volume = soundEffects.background.volume;
      setBackgroundMusic(music);

      // Load laser sound
      const laser = new Audio(soundEffects.laser.path);
      laser.volume = soundEffects.laser.volume;
      audioState.setLaserSound(laser);

      // Load hit sound for mining
      const hit = new Audio(soundEffects.hit.path);
      hit.volume = soundEffects.hit.volume;
      audioState.setHitSound(hit);

      // Load success sound
      const success = new Audio(soundEffects.success.path);
      success.volume = soundEffects.success.volume;
      audioState.setSuccessSound(success);

      // Load ambient sound (space ambience) - SINGLETON PATTERN
      const ambient = new Audio(soundEffects.ambient.path);
      ambient.volume = soundEffects.ambient.volume;
      ambient.loop = true; // Force loop to be true for space ambience
      audioState.setAmbientMusic(ambient);

      // Register ambient audio with ResourceManager with 'persistent-audio' tag to prevent disposal
      resourceManager.registerAudio("space-ambience-persistent", ambient, [
        "persistent-audio",
        "space-ambience",
      ]);
      console.log("[APP] Initialized persistent space ambience audio");

      // Load thruster sound for autopilot
      const thruster = new Audio(soundEffects.thruster.path);
      thruster.volume = soundEffects.thruster.volume;
      thruster.loop = soundEffects.thruster.loop ?? false;
      audioState.setThrusterSound(thruster);
    }

    setShowCanvas(true);
  }, [setBackgroundMusic]);

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
        {/* Route to mobile experience for mobile devices */}
        {effectivePlatformType === "mobile" ? (
          // Mobile Experience
          <MobileGame />
        ) : (
          // Desktop Experience
          <>
            {/* Show splash screen */}
            {phase === "splash" && <EnhancedSplashScreen />}

            {/* Show game when playing OR ended (for death screen) */}
            {(phase === "playing" || phase === "ended") && showCanvas && (
              <KeyboardControls map={keyboardMapRef.current}>
                {/* Conditionally render EITHER space scene OR planet surface scene */}
                {phase === "playing" && !isLanded && (
                  // Space scene - only rendered when not landed
                  <TouchPropulsionControls>
                    <WebGLCheckWrapper fallbackMessage="WebGL is required to render the space environment.">
                      <Canvas
                        shadows
                        camera={{
                          position: [0, 10, 50],
                          fov: 90,
                          near: 0.1,
                          far: 10000,
                        }}
                        gl={{
                          antialias: true,
                          powerPreference: "high-performance",
                        }}
                        onCreated={({ gl, camera }) => {
                          console.log("[CANVAS-SPACE] Canvas created with camera at:", camera.position.toArray());
                          gl.toneMapping = 1; // ACESFilmicToneMapping for better HDR
                          gl.toneMappingExposure = 1.0;
                        }}
                        onError={(error) => {
                          console.error("[CANVAS-SPACE] Canvas/Three.js error:", error);
                        }}
                      >
                        <color attach="background" args={["#000000"]} />

                        <Suspense fallback={<mesh><boxGeometry /><meshBasicMaterial color="red" /></mesh>}>
                          <SolarSystem />
                        </Suspense>
                      </Canvas>
                    </WebGLCheckWrapper>
                  </TouchPropulsionControls>
                )}

                {phase === "playing" && isLanded && (
                  // Planet surface scene - only rendered when landed
                  <PlanetSurfaceScene />
                )}

                {/* Common UI elements that persist across both scenes */}
                <GameUI />
                <PatrolEncounter />
                <TakeoffControls />
                <HintModal />
              </KeyboardControls>
            )}
          </>
        )}

        {/* Debug panel available even on splash screen in dev mode */}
        {import.meta.env.DEV && <MissionDebugPanel />}
        {import.meta.env.DEV && <CombatDebugPanel />}

        {/* Toaster for notifications */}
        <Toaster position="top-center" richColors expand={false} />
      </div>
    </UILayoutProvider>
  );
}

// Main App component with authentication wrapper
function App() {
  return (
    <AuthProvider>
      <GameContent />
    </AuthProvider>
  );
}

export default App;
