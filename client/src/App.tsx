import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { SolarSystem } from "./components/SolarSystem";
import { GameUI } from "./components/GameUI";
import { useAudio } from "./lib/stores/useAudio";
import "@fontsource/inter";

// Define control keys for space flight
enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
  shoot = 'shoot',
  land = 'land',
  info = 'info'
}

const controls = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.left, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.right, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.up, keys: ["KeyQ"] },
  { name: Controls.down, keys: ["KeyE"] },
  { name: Controls.shoot, keys: ["Space"] },
  { name: Controls.land, keys: ["KeyL"] },
  { name: Controls.info, keys: ["KeyI"] },
];

// Main App component
function App() {
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic } = useAudio();

  // Initialize audio and show canvas
  useEffect(() => {
    // Load background music
    const music = new Audio("/sounds/background.mp3");
    music.loop = true;
    music.volume = 0.3;
    setBackgroundMusic(music);
    
    // Load laser sound (using hit.mp3)
    const laser = new Audio("/sounds/hit.mp3");
    laser.volume = 0.4;
    useAudio.getState().setLaserSound(laser);
    
    setShowCanvas(true);
  }, [setBackgroundMusic]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <KeyboardControls map={controls}>
          <Canvas
            shadows
            camera={{
              position: [0, 10, 50],
              fov: 75,
              near: 0.1,
              far: 10000
            }}
            gl={{
              antialias: true,
              powerPreference: "high-performance"
            }}
          >
            <color attach="background" args={["#000000"]} />
            
            <Suspense fallback={null}>
              <SolarSystem />
            </Suspense>
          </Canvas>
          
          <GameUI />
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
