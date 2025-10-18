import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { X, Trophy, RotateCcw, Target } from 'lucide-react';

interface AsteroidShootingGalleryProps {
  onComplete: (score: number) => void;
  onExit: () => void;
}

interface Asteroid {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  hit: boolean;
}

// Asteroid target component
function AsteroidTarget({ asteroid, onHit }: { asteroid: Asteroid; onHit: (id: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  useFrame((state, delta) => {
    if (!meshRef.current || asteroid.hit) return;
    
    // Move asteroid
    meshRef.current.position.add(asteroid.velocity.clone().multiplyScalar(delta));
    
    // Rotate
    meshRef.current.rotation.x += delta * 0.5;
    meshRef.current.rotation.y += delta * 0.3;
    
    // Update asteroid position
    asteroid.position.copy(meshRef.current.position);
    
    // Remove if off screen
    if (meshRef.current.position.z > 5) {
      asteroid.hit = true;
    }
  });

  if (asteroid.hit) return null;

  return (
    <mesh
      ref={meshRef}
      position={asteroid.position}
      onClick={(e) => {
        e.stopPropagation();
        onHit(asteroid.id);
      }}
      onPointerOver={() => setIsHovered(true)}
      onPointerOut={() => setIsHovered(false)}
    >
      <dodecahedronGeometry args={[asteroid.size, 0]} />
      <meshStandardMaterial
        color={isHovered ? '#ff6b6b' : '#8b7355'}
        emissive={isHovered ? '#ff0000' : '#000000'}
        emissiveIntensity={isHovered ? 0.5 : 0}
        roughness={0.8}
      />
    </mesh>
  );
}

// Crosshair component
function Crosshair() {
  return (
    <group>
      <mesh position={[0, 0, -10]}>
        <ringGeometry args={[0.1, 0.15, 32]} />
        <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0, -10]}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
    </group>
  );
}

// Main shooting gallery scene
function ShootingScene({ 
  asteroids, 
  onHit,
  showCrosshair 
}: { 
  asteroids: Asteroid[]; 
  onHit: (id: number) => void;
  showCrosshair: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      
      {/* Starfield background */}
      {Array.from({ length: 150 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100 - 50;
        return (
          <Sphere key={i} args={[0.05, 8, 8]} position={[x, y, z]}>
            <meshBasicMaterial color="#ffffff" />
          </Sphere>
        );
      })}
      
      {/* Asteroids */}
      {asteroids.map((asteroid) => (
        <AsteroidTarget key={asteroid.id} asteroid={asteroid} onHit={onHit} />
      ))}
      
      {/* Crosshair */}
      {showCrosshair && <Crosshair />}
    </>
  );
}

export const AsteroidShootingGallery: React.FC<AsteroidShootingGalleryProps> = ({ onComplete, onExit }) => {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const nextAsteroidId = useRef(0);
  const lastMissTime = useRef(0);
  const gameStartTime = useRef(0);

  // Spawn asteroids
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const spawnInterval = setInterval(() => {
      const newAsteroid: Asteroid = {
        id: nextAsteroidId.current++,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10,
          -30
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          Math.random() * 3 + 2
        ),
        size: Math.random() * 0.5 + 0.5,
        hit: false
      };
      
      setAsteroids(prev => [...prev, newAsteroid]);
    }, 1000);

    return () => clearInterval(spawnInterval);
  }, [gameState]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 0.1;
        if (newTime <= 0) {
          setGameState('finished');
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(timerInterval);
  }, [gameState]);

  // Clean up asteroids that are off-screen
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const cleanupInterval = setInterval(() => {
      setAsteroids(prev => {
        const cleaned = prev.filter(a => !a.hit && a.position.z < 5);
        const missedCount = prev.length - cleaned.length - prev.filter(a => a.hit).length;
        
        if (missedCount > 0) {
          setMisses(m => m + missedCount);
          setCombo(0);
          lastMissTime.current = Date.now();
        }
        
        return cleaned;
      });
    }, 500);

    return () => clearInterval(cleanupInterval);
  }, [gameState]);

  const handleStart = () => {
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMisses(0);
    setTimeLeft(60);
    setAsteroids([]);
    nextAsteroidId.current = 0;
    gameStartTime.current = Date.now();
  };

  const handleHit = (id: number) => {
    setAsteroids(prev => 
      prev.map(a => a.id === id ? { ...a, hit: true } : a)
    );
    
    const newCombo = combo + 1;
    setCombo(newCombo);
    
    // Score with combo multiplier
    const basePoints = 10;
    const comboMultiplier = Math.min(newCombo, 10);
    const points = basePoints * comboMultiplier;
    
    setScore(s => s + points);
  };

  const handleRestart = () => {
    setGameState('ready');
    setScore(0);
    setCombo(0);
    setMisses(0);
    setTimeLeft(60);
    setAsteroids([]);
  };

  const accuracy = misses + score / 10 > 0 ? ((score / 10) / (misses + score / 10) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 bg-black z-50" style={{ cursor: gameState === 'playing' ? 'crosshair' : 'default' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        className="w-full h-full"
      >
        <ShootingScene 
          asteroids={asteroids} 
          onHit={handleHit}
          showCrosshair={gameState === 'playing'}
        />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="bg-black/80 border border-orange-400 rounded-lg p-3 pointer-events-auto">
            <div className="text-xs text-gray-400 mb-1">SCORE</div>
            <div className="text-3xl font-bold text-orange-400">
              {score}
            </div>
            {combo > 1 && (
              <div className="text-xs text-yellow-400 font-bold mt-1">
                {combo}x COMBO!
              </div>
            )}
          </div>
          
          <div className="bg-black/80 border border-cyan-400 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">TIME</div>
            <div className="text-2xl font-bold font-mono text-cyan-400">
              {timeLeft.toFixed(1)}s
            </div>
          </div>
          
          <button
            onClick={onExit}
            className="bg-black/80 border border-red-400 rounded-lg p-3 hover:bg-red-900/50 transition-colors pointer-events-auto"
          >
            <X className="w-6 h-6 text-red-400" />
          </button>
        </div>

        {/* Accuracy Display */}
        {gameState === 'playing' && (
          <div className="absolute bottom-4 right-4 bg-black/80 border border-gray-600 rounded-lg p-3 text-xs">
            <div className="grid grid-cols-2 gap-3 text-gray-300">
              <div>
                <div className="text-gray-400">Hits</div>
                <div className="text-lg font-bold text-green-400">{Math.floor(score / 10)}</div>
              </div>
              <div>
                <div className="text-gray-400">Misses</div>
                <div className="text-lg font-bold text-red-400">{misses}</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-400">Accuracy</div>
                <div className="text-lg font-bold text-cyan-400">{accuracy}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Start Screen */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
            <div className="text-center max-w-md">
              <Target className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-orange-400 mb-4">Shooting Gallery</h2>
              <p className="text-gray-300 mb-6">
                Click on asteroids to destroy them! Build combos for higher scores. Don't let them escape!
              </p>
              <button
                onClick={handleStart}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Start Shooting
              </button>
            </div>
          </div>
        )}

        {/* Finish Screen */}
        {gameState === 'finished' && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto">
            <div className="text-center max-w-md bg-gray-900 border-2 border-orange-400 rounded-lg p-8">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-orange-400 mb-2">Time's Up!</h2>
              <div className="text-5xl font-bold text-orange-400 mb-4">
                {score}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <div className="text-gray-400">Hits</div>
                  <div className="text-xl font-bold text-green-400">{Math.floor(score / 10)}</div>
                </div>
                <div>
                  <div className="text-gray-400">Misses</div>
                  <div className="text-xl font-bold text-red-400">{misses}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-gray-400">Accuracy</div>
                  <div className="text-xl font-bold text-cyan-400">{accuracy}%</div>
                </div>
              </div>
              <div className="text-lg text-gray-300 mb-6">
                Reward: {Math.floor(score * 2)}₡
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRestart}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
                <button
                  onClick={() => onComplete(score)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
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
