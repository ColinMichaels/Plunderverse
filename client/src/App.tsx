import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState, useRef } from "react";
import { KeyboardControls } from "@react-three/drei";
import { SolarSystem } from "./components/SolarSystem";
import { GameUI } from "./components/GameUI";
import { SplashScreen } from "./components/SplashScreen";
import { PlanetSurfaceScene } from "./components/PlanetSurfaceScene";
import { TakeoffControls } from "./components/TakeoffControls";
import { UILayoutProvider } from "./components/UILayoutManager";
import { useAudio } from "./lib/stores/useAudio";
import { useGame } from "./lib/stores/useGame";
import { useSettings } from "./lib/stores/useSettings";
import { TouchPropulsionControls } from "./components/mobile/TouchPropulsionControls";
import { HintModal } from "./components/HintModal";
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

  // Initialize audio and show canvas
  useEffect(() => {
    // Load background music
    const music = new Audio("/sounds/background.mp3");
    music.loop = true;
    music.volume = 0.3;
    setBackgroundMusic(music);

    // Load laser sound (using hit.mp3)
    const laser = new Audio("/sounds/space-lazer.mp3");
    laser.volume = 0.4;
    useAudio.getState().setLaserSound(laser);

    // Load thruster sound for autopilot
    const thruster = new Audio("/sounds/thruster.mp3");
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
            <PlanetSurfaceScene />
            <TakeoffControls />
            <HintModal />
          </KeyboardControls>
        )}
      </div>
    </UILayoutProvider>
  );
}

export default App;
