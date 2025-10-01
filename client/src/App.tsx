import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState, useRef } from "react";
import { KeyboardControls } from "@react-three/drei";
import { SolarSystem } from "./components/space/SolarSystem";
import { GameUI } from "./components/ui/GameUI";
import { SplashScreen } from "./components/screens/SplashScreen";
import { PlanetSurfaceScene } from "./components/surface/PlanetSurfaceScene";
import { TakeoffControls } from "./components/surface/TakeoffControls";
import { UILayoutProvider } from "./components/ui/UILayoutManager";
import { PatrolEncounter } from "./components/space/PatrolEncounter";
import { useAudio } from "./lib/stores/ui/useAudio";
import { useGame } from "./lib/stores/ui/useGame";
import { useSettings } from "./lib/stores/ui/useSettings";
import { TouchPropulsionControls } from "./components/mobile/TouchPropulsionControls";
import { HintModal } from "./components/screens/HintModal";
import { AUDIO_CONFIG } from "./lib/audioConfig";
import contentRegistry from "./lib/plunderverse/contentRegistry";
import { MissionDebugPanel } from "./components/debug/MissionDebugPanel";
import "@fontsource/inter";

// Main App component
function App() {
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic } = useAudio();
  const { phase } = useGame();
  
  // Create a stable keyboard map using a ref to prevent infinite loops
  const keyboardMapRef = useRef(useSettings.getState().getKeyboardMap());
  
  // Update the keyboard map only when keybinds actually change
  useEffect(() => {
    const unsubscribe = useSettings.subscribe(() => {
      keyboardMapRef.current = useSettings.getState().getKeyboardMap();
    });
    return unsubscribe;
  }, []);

  // Initialize Plunderverse content
  useEffect(() => {
    contentRegistry.loadContent().catch(error => {
      console.error('Failed to load Plunderverse content:', error);
    });
  }, []);

  // Initialize audio and show canvas
  useEffect(() => {
    const { soundEffects } = AUDIO_CONFIG;
    
    // Load background music
    const music = new Audio(soundEffects.background.path);
    music.loop = soundEffects.background.loop ?? false;
    music.volume = soundEffects.background.volume;
    setBackgroundMusic(music);

    // Load laser sound
    const laser = new Audio(soundEffects.laser.path);
    laser.volume = soundEffects.laser.volume;
    useAudio.getState().setLaserSound(laser);

    // Load hit sound for mining
    const hit = new Audio(soundEffects.hit.path);
    hit.volume = soundEffects.hit.volume;
    useAudio.getState().setHitSound(hit);

    // Load success sound
    const success = new Audio(soundEffects.success.path);
    success.volume = soundEffects.success.volume;
    useAudio.getState().setSuccessSound(success);

    // Load ambient sound  
    const ambient = new Audio(soundEffects.ambient.path);
    ambient.volume = soundEffects.ambient.volume;
    ambient.loop = soundEffects.ambient.loop ?? false;
    useAudio.getState().setAmbientMusic(ambient);

    // Load thruster sound for autopilot
    const thruster = new Audio(soundEffects.thruster.path);
    thruster.volume = soundEffects.thruster.volume;
    thruster.loop = soundEffects.thruster.loop ?? false;
    useAudio.getState().setThrusterSound(thruster);

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
        }}
      >
        {/* Show splash screen */}
        {phase === "splash" && <SplashScreen />}

        {/* Show game when playing */}
        {phase === "playing" && showCanvas && (
          <KeyboardControls map={keyboardMapRef.current}>
            <TouchPropulsionControls>
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
              >
                <color attach="background" args={["#000000"]} />

                <Suspense fallback={null}>
                  <SolarSystem />
                </Suspense>
              </Canvas>
            </TouchPropulsionControls>

            <GameUI />
            <PatrolEncounter />
            <PlanetSurfaceScene />
            <TakeoffControls />
            <HintModal />
          </KeyboardControls>
        )}
        
        {/* Debug panel available even on splash screen in dev mode */}
        {import.meta.env.DEV && <MissionDebugPanel />}
      </div>
    </UILayoutProvider>
  );
}

export default App;
