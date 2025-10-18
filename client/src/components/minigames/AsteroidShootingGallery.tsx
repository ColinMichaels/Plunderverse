import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { X, Trophy, RotateCcw, Target } from 'lucide-react';
import { useMinigameSettings, getThemeColors, ThemeColors } from './minigameUtils';

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
function AsteroidTarget({ 
  asteroid, 
  onHit, 
  themeColors 
}: { 
  asteroid: Asteroid; 
  onHit: (id: number) => void;
  themeColors: ThemeColors;
}) {
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
        color={isHovered ? new THREE.Color(themeColors.danger) : new THREE.Color(themeColors.secondary)}
        emissive={isHovered ? new THREE.Color(themeColors.danger) : new THREE.Color('#000000')}
        emissiveIntensity={isHovered ? 0.5 : 0}
        roughness={0.8}
      />
    </mesh>
  );
}

// Crosshair component that follows pointer
function Crosshair({ 
  mousePosition, 
  themeColors 
}: { 
  mousePosition: { x: number; y: number };
  themeColors: ThemeColors;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Convert screen position to world position
    const vector = new THREE.Vector3(
      mousePosition.x,
      mousePosition.y,
      0.5
    );
    vector.unproject(camera);
    
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    groupRef.current.position.set(pos.x, pos.y, -10);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <ringGeometry args={[0.1, 0.15, 32]} />
        <meshBasicMaterial 
          color={new THREE.Color(themeColors.primary)} 
          transparent 
          opacity={0.5} 
        />
      </mesh>
      <mesh>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshBasicMaterial color={new THREE.Color(themeColors.primary)} />
      </mesh>
      {/* Center dot */}
      <mesh>
        <circleGeometry args={[0.02, 16]} />
        <meshBasicMaterial color={new THREE.Color(themeColors.primary)} />
      </mesh>
    </group>
  );
}

// Main shooting gallery scene
function ShootingScene({ 
  asteroids, 
  onHit,
  showCrosshair,
  mousePosition,
  themeColors
}: { 
  asteroids: Asteroid[]; 
  onHit: (id: number) => void;
  showCrosshair: boolean;
  mousePosition: { x: number; y: number };
  themeColors: ThemeColors;
}) {
  // Pre-calculate starfield positions (avoiding Math.random in render)
  const starPositions = useRef<Array<[number, number, number]>>(
    Array.from({ length: 150 }, () => [
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100 - 50
    ])
  );

  return (
    <>
      <color attach="background" args={[themeColors.background]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />
      
      {/* Starfield background */}
      {starPositions.current.map((pos, i) => (
        <Sphere key={i} args={[0.05, 8, 8]} position={pos}>
          <meshBasicMaterial color={new THREE.Color(themeColors.text)} />
        </Sphere>
      ))}
      
      {/* Asteroids */}
      {asteroids.map((asteroid) => (
        <AsteroidTarget 
          key={asteroid.id} 
          asteroid={asteroid} 
          onHit={onHit} 
          themeColors={themeColors}
        />
      ))}
      
      {/* Crosshair */}
      {showCrosshair && (
        <Crosshair mousePosition={mousePosition} themeColors={themeColors} />
      )}
    </>
  );
}

export const AsteroidShootingGallery: React.FC<AsteroidShootingGalleryProps> = ({ onComplete, onExit }) => {
  const settings = useMinigameSettings();
  const themeColors = settings.themeColors;
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const nextAsteroidId = useRef(0);
  const lastMissTime = useRef(0);
  const gameStartTime = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Track mouse/touch position
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      setMousePosition({ x, y });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove as any);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove as any);
    };
  }, []);

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
    <div 
      ref={canvasRef}
      className="fixed inset-0 z-50" 
      style={{ 
        backgroundColor: themeColors.background,
        cursor: gameState === 'playing' ? 'crosshair' : 'default',
        touchAction: 'none'
      }}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      >
        <ShootingScene 
          asteroids={asteroids} 
          onHit={handleHit}
          showCrosshair={gameState === 'playing'}
          mousePosition={mousePosition}
          themeColors={themeColors}
        />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD */}
        <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-start gap-2">
          <div 
            className="rounded-lg p-2 sm:p-3 pointer-events-auto min-w-[100px] sm:min-w-[120px]"
            style={{ 
              backgroundColor: themeColors.panel + 'cc',
              borderColor: themeColors.secondary,
              borderWidth: '2px'
            }}
          >
            <div className="text-xs mb-1" style={{ color: themeColors.text + '99' }}>SCORE</div>
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: themeColors.secondary }}>
              {score}
            </div>
            {combo > 1 && (
              <div className="text-xs font-bold mt-1" style={{ color: themeColors.accent }}>
                {combo}x COMBO!
              </div>
            )}
          </div>
          
          <div 
            className="rounded-lg p-2 sm:p-3"
            style={{ 
              backgroundColor: themeColors.panel + 'cc',
              borderColor: themeColors.primary,
              borderWidth: '2px'
            }}
          >
            <div className="text-xs mb-1" style={{ color: themeColors.text + '99' }}>TIME</div>
            <div className="text-xl sm:text-2xl font-bold font-mono" style={{ color: themeColors.primary }}>
              {timeLeft.toFixed(1)}s
            </div>
          </div>
          
          <button
            onClick={onExit}
            className="rounded-lg p-2 sm:p-3 hover:opacity-80 transition-opacity pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ 
              backgroundColor: themeColors.panel + 'cc',
              borderColor: themeColors.danger,
              borderWidth: '2px'
            }}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: themeColors.danger }} />
          </button>
        </div>

        {/* Accuracy Display */}
        {gameState === 'playing' && (
          <div 
            className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 rounded-lg p-2 sm:p-3 text-xs"
            style={{ 
              backgroundColor: themeColors.panel + 'cc',
              borderColor: themeColors.border,
              borderWidth: '2px'
            }}
          >
            <div className="grid grid-cols-2 gap-2 sm:gap-3" style={{ color: themeColors.text }}>
              <div>
                <div style={{ color: themeColors.text + '99' }}>Hits</div>
                <div className="text-base sm:text-lg font-bold" style={{ color: themeColors.success }}>
                  {Math.floor(score / 10)}
                </div>
              </div>
              <div>
                <div style={{ color: themeColors.text + '99' }}>Misses</div>
                <div className="text-base sm:text-lg font-bold" style={{ color: themeColors.danger }}>
                  {misses}
                </div>
              </div>
              <div className="col-span-2">
                <div style={{ color: themeColors.text + '99' }}>Accuracy</div>
                <div className="text-base sm:text-lg font-bold" style={{ color: themeColors.primary }}>
                  {accuracy}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Screen */}
        {gameState === 'ready' && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-auto p-4"
            style={{ backgroundColor: themeColors.background + 'e6' }}
          >
            <div className="text-center max-w-md w-full">
              <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" style={{ color: themeColors.secondary }} />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: themeColors.secondary }}>
                Shooting Gallery
              </h2>
              <p className="mb-6" style={{ color: themeColors.text }}>
                {settings.isMobile ? 'Tap' : 'Click'} on asteroids to destroy them! Build combos for higher scores. Don't let them escape!
              </p>
              <button
                onClick={handleStart}
                className="font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg transition-opacity hover:opacity-90 min-h-[44px] text-base sm:text-lg"
                style={{ 
                  backgroundColor: themeColors.secondary,
                  color: themeColors.background
                }}
              >
                Start Shooting
              </button>
            </div>
          </div>
        )}

        {/* Finish Screen */}
        {gameState === 'finished' && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-auto p-4"
            style={{ backgroundColor: themeColors.background + 'e6' }}
          >
            <div 
              className="text-center max-w-md w-full rounded-lg p-6 sm:p-8"
              style={{ 
                backgroundColor: themeColors.panel,
                borderColor: themeColors.secondary,
                borderWidth: '2px'
              }}
            >
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4" style={{ color: themeColors.accent }} />
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: themeColors.secondary }}>
                Time's Up!
              </h2>
              <div className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: themeColors.secondary }}>
                {score}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 text-sm">
                <div>
                  <div style={{ color: themeColors.text + '99' }}>Hits</div>
                  <div className="text-lg sm:text-xl font-bold" style={{ color: themeColors.success }}>
                    {Math.floor(score / 10)}
                  </div>
                </div>
                <div>
                  <div style={{ color: themeColors.text + '99' }}>Misses</div>
                  <div className="text-lg sm:text-xl font-bold" style={{ color: themeColors.danger }}>
                    {misses}
                  </div>
                </div>
                <div className="col-span-2">
                  <div style={{ color: themeColors.text + '99' }}>Accuracy</div>
                  <div className="text-lg sm:text-xl font-bold" style={{ color: themeColors.primary }}>
                    {accuracy}%
                  </div>
                </div>
              </div>
              <div className="text-base sm:text-lg mb-6" style={{ color: themeColors.text }}>
                Reward: {Math.floor(score * 2)}₡
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRestart}
                  className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-90 flex items-center justify-center gap-2 min-h-[44px]"
                  style={{ 
                    backgroundColor: themeColors.border,
                    color: themeColors.text
                  }}
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
                <button
                  onClick={() => onComplete(score)}
                  className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-90 min-h-[44px]"
                  style={{ 
                    backgroundColor: themeColors.secondary,
                    color: themeColors.background
                  }}
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
