import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Torus, KeyboardControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { X, Trophy, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useMinigameSettings } from './minigameUtils';

enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
}

interface ZeroGravityRacingProps {
  onComplete: (time: number) => void;
  onExit: () => void;
}

// Checkpoint ring component
function CheckpointRing({ position, isActive, isPassed, themeColors }: { position: [number, number, number]; isActive: boolean; isPassed: boolean; themeColors: any }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current && isActive) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  const activeColor = themeColors.primary;
  const passedColor = themeColors.success;
  const inactiveColor = themeColors.secondary;

  return (
    <group position={position}>
      <Torus
        ref={ringRef}
        args={[3, 0.3, 16, 32]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          color={isPassed ? passedColor : isActive ? activeColor : inactiveColor}
          emissive={isPassed ? passedColor : isActive ? activeColor : '#000000'}
          emissiveIntensity={isPassed ? 0.3 : isActive ? 0.5 : 0}
        />
      </Torus>
      {isActive && (
        <pointLight
          position={[0, 0, 0]}
          intensity={2}
          distance={10}
          color={activeColor}
        />
      )}
    </group>
  );
}

// Player ship component
function PlayerShip({ position, onCheckpoint, touchInput, themeColors }: { position: THREE.Vector3; onCheckpoint: (index: number) => void; touchInput: React.MutableRefObject<{x: number, y: number, z: number}>; themeColors: any }) {
  const shipRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const [, getKeys] = useKeyboardControls<Controls>();
  const [checkpoints] = useState([
    new THREE.Vector3(0, 0, -20),
    new THREE.Vector3(15, 5, -40),
    new THREE.Vector3(-10, -5, -60),
    new THREE.Vector3(20, 10, -80),
    new THREE.Vector3(0, -10, -100),
    new THREE.Vector3(-15, 5, -120),
    new THREE.Vector3(10, 15, -140),
    new THREE.Vector3(0, 0, -160),
  ]);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
  const [passedCheckpoints, setPassedCheckpoints] = useState<number[]>([]);

  useFrame((state, delta) => {
    if (!shipRef.current) return;

    // Get current key states without causing re-renders
    const keys = getKeys();

    // Apply thrust
    const thrust = 20;
    const thrustVector = new THREE.Vector3();
    
    // Keyboard controls
    if (keys.forward) thrustVector.z -= thrust;
    if (keys.back) thrustVector.z += thrust;
    if (keys.left) thrustVector.x -= thrust;
    if (keys.right) thrustVector.x += thrust;
    if (keys.up) thrustVector.y += thrust;
    if (keys.down) thrustVector.y -= thrust;

    // Touch controls
    thrustVector.x += touchInput.current.x * thrust;
    thrustVector.y += touchInput.current.y * thrust;
    thrustVector.z += touchInput.current.z * thrust;

    // Apply acceleration
    velocity.current.add(thrustVector.multiplyScalar(delta));

    // Apply damping
    velocity.current.multiplyScalar(0.98);

    // Update position
    shipRef.current.position.add(velocity.current.clone().multiplyScalar(delta));

    // Check checkpoint collision
    if (currentCheckpoint < checkpoints.length) {
      const checkpoint = checkpoints[currentCheckpoint];
      const distance = shipRef.current.position.distanceTo(checkpoint);
      
      if (distance < 3.5 && !passedCheckpoints.includes(currentCheckpoint)) {
        setPassedCheckpoints(prev => [...prev, currentCheckpoint]);
        onCheckpoint(currentCheckpoint);
        setCurrentCheckpoint(prev => prev + 1);
      }
    }

    // Update position prop
    position.copy(shipRef.current.position);
  });

  return (
    <group ref={shipRef} position={[0, 0, 0]}>
      {/* Ship body - simple cone shape */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.5, 2, 8]} />
        <meshStandardMaterial
          color={themeColors.accent}
          emissive={themeColors.accent}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Thruster glow */}
      <pointLight position={[-1, 0, 0]} intensity={1} distance={5} color="#8b5cf6" />
    </group>
  );
}

// Main game scene
function RaceScene({ onCheckpoint, cameraPosition, touchInput, themeColors }: { onCheckpoint: (index: number) => void; cameraPosition: THREE.Vector3; touchInput: React.MutableRefObject<{x: number, y: number, z: number}>; themeColors: any }) {
  const checkpointPositions: [number, number, number][] = [
    [0, 0, -20],
    [15, 5, -40],
    [-10, -5, -60],
    [20, 10, -80],
    [0, -10, -100],
    [-15, 5, -120],
    [10, 15, -140],
    [0, 0, -160],
  ];
  
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
  const [passedCheckpoints, setPassedCheckpoints] = useState<number[]>([]);

  const handleCheckpoint = (index: number) => {
    setPassedCheckpoints(prev => [...prev, index]);
    setCurrentCheckpoint(prev => prev + 1);
    onCheckpoint(index);
  };

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      {/* Starfield background */}
      {Array.from({ length: 200 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200 - 100;
        return (
          <Sphere key={i} args={[0.1, 8, 8]} position={[x, y, z]}>
            <meshBasicMaterial color={themeColors.text} opacity={0.8} />
          </Sphere>
        );
      })}
      
      {/* Checkpoints */}
      {checkpointPositions.map((pos, i) => (
        <CheckpointRing
          key={i}
          position={pos}
          isActive={i === currentCheckpoint}
          isPassed={passedCheckpoints.includes(i)}
          themeColors={themeColors}
        />
      ))}
      
      {/* Player ship */}
      <PlayerShip position={cameraPosition} onCheckpoint={handleCheckpoint} touchInput={touchInput} themeColors={themeColors} />
      
      {/* Camera follows ship */}
      <OrbitControls
        target={cameraPosition}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
      />
    </>
  );
}

export const ZeroGravityRacing: React.FC<ZeroGravityRacingProps> = ({ onComplete, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'racing' | 'finished'>('ready');
  const [checkpointsPassed, setCheckpointsPassed] = useState(0);
  const [raceTime, setRaceTime] = useState(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const cameraPosition = useRef(new THREE.Vector3(0, 5, 10));
  const startTime = useRef<number>(0);
  const touchInput = useRef({ x: 0, y: 0, z: 0 });
  const { theme, themeColors, isMobile, isTouch } = useMinigameSettings();

  const totalCheckpoints = 8;

  useEffect(() => {
    if (gameState === 'racing') {
      const interval = setInterval(() => {
        setRaceTime((Date.now() - startTime.current) / 1000);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  const handleStart = () => {
    setGameState('racing');
    setCheckpointsPassed(0);
    setRaceTime(0);
    startTime.current = Date.now();
  };

  const handleCheckpoint = (index: number) => {
    const newCount = index + 1;
    setCheckpointsPassed(newCount);
    
    if (newCount >= totalCheckpoints) {
      const finalRaceTime = (Date.now() - startTime.current) / 1000;
      setFinalTime(finalRaceTime);
      setGameState('finished');
    }
  };

  const handleRestart = () => {
    setGameState('ready');
    setCheckpointsPassed(0);
    setRaceTime(0);
    setFinalTime(null);
    cameraPosition.current.set(0, 5, 10);
  };

  const keyMap = [
    { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
    { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
    { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: Controls.up, keys: ['Space'] },
    { name: Controls.down, keys: ['ShiftLeft', 'ShiftRight'] },
  ];

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* 3D Canvas */}
      <KeyboardControls map={keyMap}>
        <Canvas
          camera={{ position: [0, 5, 10], fov: 75 }}
          className="w-full h-full"
        >
          <RaceScene onCheckpoint={handleCheckpoint} cameraPosition={cameraPosition.current} touchInput={touchInput} themeColors={themeColors} />
        </Canvas>
      </KeyboardControls>

      {/* Touch Controls */}
      {isTouch && gameState === 'racing' && (
        <div className="absolute bottom-20 left-4 right-4 flex justify-between items-end pointer-events-auto">
          {/* Left stick - horizontal/vertical */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-center">
              <button
                onPointerDown={() => touchInput.current.z = -1}
                onPointerUp={() => touchInput.current.z = 0}
                className="bg-purple-600/50 border-2 border-purple-400 p-4 rounded-lg active:bg-purple-600"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onPointerDown={() => touchInput.current.x = -1}
                onPointerUp={() => touchInput.current.x = 0}
                className="bg-purple-600/50 border-2 border-purple-400 p-4 rounded-lg active:bg-purple-600"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onPointerDown={() => touchInput.current.z = 1}
                onPointerUp={() => touchInput.current.z = 0}
                className="bg-purple-600/50 border-2 border-purple-400 p-4 rounded-lg active:bg-purple-600"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
              <button
                onPointerDown={() => touchInput.current.x = 1}
                onPointerUp={() => touchInput.current.x = 0}
                className="bg-purple-600/50 border-2 border-purple-400 p-4 rounded-lg active:bg-purple-600"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Right buttons - up/down */}
          <div className="flex flex-col gap-2">
            <button
              onPointerDown={() => touchInput.current.y = 1}
              onPointerUp={() => touchInput.current.y = 0}
              className="bg-cyan-600/50 border-2 border-cyan-400 p-4 rounded-lg active:bg-cyan-600"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => touchInput.current.y = -1}
              onPointerUp={() => touchInput.current.y = 0}
              className="bg-cyan-600/50 border-2 border-cyan-400 p-4 rounded-lg active:bg-cyan-600"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="bg-black/80 border border-purple-400 rounded-lg p-3 pointer-events-auto">
            <div className="text-xs text-gray-400 mb-1">CHECKPOINTS</div>
            <div className="text-2xl font-bold text-purple-400">
              {checkpointsPassed} / {totalCheckpoints}
            </div>
          </div>
          
          <div className="bg-black/80 border border-cyan-400 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">TIME</div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {raceTime.toFixed(1)}s
            </div>
          </div>
          
          <button
            onClick={onExit}
            className="bg-black/80 border border-red-400 rounded-lg p-3 hover:bg-red-900/50 transition-colors pointer-events-auto"
          >
            <X className="w-6 h-6 text-red-400" />
          </button>
        </div>

        {/* Controls Help - only show for keyboard */}
        {gameState === 'racing' && !isTouch && (
          <div className="absolute bottom-4 left-4 bg-black/80 border border-gray-600 rounded-lg p-3 text-xs">
            <div className="text-gray-400 mb-2">CONTROLS</div>
            <div className="grid grid-cols-2 gap-2 text-gray-300">
              <div>W/↑: Forward</div>
              <div>S/↓: Backward</div>
              <div>A/←: Left</div>
              <div>D/→: Right</div>
              <div>Space: Up</div>
              <div>Shift: Down</div>
            </div>
          </div>
        )}

        {/* Start Screen */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
            <div className="text-center max-w-md">
              <h2 className="text-4xl font-bold text-purple-400 mb-4">Zero-G Racing</h2>
              <p className="text-gray-300 mb-6">
                Navigate through all {totalCheckpoints} checkpoint rings as fast as possible!
                Master momentum in zero gravity.
              </p>
              <button
                onClick={handleStart}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Start Race
              </button>
            </div>
          </div>
        )}

        {/* Finish Screen */}
        {gameState === 'finished' && finalTime !== null && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
            <div className="text-center max-w-md bg-gray-900 border-2 border-purple-400 rounded-lg p-8">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-purple-400 mb-2">Race Complete!</h2>
              <div className="text-5xl font-bold text-cyan-400 mb-4">
                {finalTime.toFixed(2)}s
              </div>
              <div className="text-lg text-gray-300 mb-6">
                Reward: {Math.max(50, Math.floor(300 - finalTime))}₡
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRestart}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Race Again
                </button>
                <button
                  onClick={() => onComplete(finalTime)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Collect Reward
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
