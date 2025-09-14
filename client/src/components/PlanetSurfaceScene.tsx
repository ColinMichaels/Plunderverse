import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import { useLandedState } from "../lib/stores/useLandedState";
import { useMining } from "../lib/stores/useMining";
import { useAudio } from "../lib/stores/useAudio";
import { planets, ResourceData } from "../lib/planetData";
import { SurfaceMovementController } from "./SurfaceMovementController";
import * as THREE from "three";

function SurfaceTerrain({ planetName }: { planetName: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Get planet data for surface color
  const planet = planets.find(p => p.name === planetName);
  const surfaceColor = planet?.color || "#8C7853";
  
  // Generate terrain vertices using useMemo to avoid recreating on every render
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const vertices = geometry.attributes.position.array as Float32Array;
    
    // Add some height variation to make it look like terrain
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 1];
      // Simple noise-like function for terrain height
      const height = Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2 + 
                     Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
      vertices[i + 2] = height;
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  
  return (
    <mesh ref={meshRef} geometry={terrainGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        color={surfaceColor}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

function SurfaceRocks({ planetName }: { planetName: string }) {
  const planet = planets.find(p => p.name === planetName);
  const rockColor = planet?.color || "#666666";
  
  // Generate rock positions using useMemo
  const rockPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 20; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 100,
        y: 0.2 + Math.random() * 0.5,
        z: (Math.random() - 0.5) * 100,
        scale: 0.5 + Math.random() * 1.5,
        rotationY: Math.random() * Math.PI * 2
      });
    }
    return positions;
  }, [planetName]);
  
  return (
    <>
      {rockPositions.map((rock, index) => (
        <mesh key={index} position={[rock.x, rock.y, rock.z]} scale={rock.scale} rotation={[0, rock.rotationY, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={rockColor} roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}

function SurfaceSky({ planetName }: { planetName: string }) {
  // Different sky colors based on planet
  const getSkyColor = (name: string) => {
    switch (name) {
      case "Mars": return "#CD5C5C";
      case "Venus": return "#FFA500";
      case "Earth": return "#87CEEB";
      case "Mercury": return "#2F2F2F";
      default: return "#1a1a2e";
    }
  };
  
  return (
    <mesh>
      <sphereGeometry args={[500, 32, 32]} />
      <meshBasicMaterial color={getSkyColor(planetName)} side={THREE.BackSide} />
    </mesh>
  );
}

function SurfaceLighting() {
  return (
    <>
      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Directional light as main sun */}
      <directionalLight
        position={[50, 100, 50]}
        intensity={1}
        color="#FDB813"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Point lights for resource highlighting */}
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#ffffff" />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#ffffff" />
    </>
  );
}

function ResourceNode({ resource, position, onInteract }: { 
  resource: ResourceData, 
  position: [number, number, number], 
  onInteract: () => void 
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Get color based on rarity
  const getResourceColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#10B981';
      case 'uncommon': return '#3B82F6';
      case 'rare': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#6B7280';
    }
  };
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      
      // Glow effect when hovered
      if (hovered) {
        meshRef.current.rotation.y += 0.02;
      }
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onInteract}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.2 : 1}
    >
      <octahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial 
        color={getResourceColor(resource.rarity)}
        emissive={hovered ? getResourceColor(resource.rarity) : '#000000'}
        emissiveIntensity={hovered ? 0.3 : 0}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

function ResourceNodes({ planetName }: { planetName: string }) {
  const planet = planets.find(p => p.name === planetName);
  const { startMining } = useMining();
  const { playSuccess } = useAudio();
  
  if (!planet) return null;
  
  // Generate resource node positions
  const resourcePositions = useMemo(() => {
    const positions: Array<{resource: ResourceData, position: [number, number, number]}> = [];
    
    planet.resources.forEach((resource, index) => {
      // Create multiple nodes for each resource type
      const nodeCount = resource.rarity === 'legendary' ? 1 : 
                       resource.rarity === 'rare' ? 2 : 
                       resource.rarity === 'uncommon' ? 3 : 4;
      
      for (let i = 0; i < nodeCount; i++) {
        const angle = (index * nodeCount + i) * (Math.PI * 2) / (planet.resources.length * 3);
        const distance = 15 + Math.random() * 30;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const y = 0.5 + Math.random() * 1.5;
        
        positions.push({
          resource,
          position: [x, y, z]
        });
      }
    });
    
    return positions;
  }, [planet, planetName]);
  
  const handleResourceClick = (resource: ResourceData) => {
    try {
      startMining(planetName, resource);
      playSuccess();
      console.log(`Starting to mine ${resource.type} on ${planetName}`);
    } catch (error) {
      console.error(`Failed to start mining ${resource.type}:`, error);
    }
  };
  
  return (
    <>
      {resourcePositions.map((node, index) => (
        <ResourceNode
          key={`${node.resource.type}-${index}`}
          resource={node.resource}
          position={node.position}
          onInteract={() => handleResourceClick(node.resource)}
        />
      ))}
    </>
  );
}

function HelmetOverlay({ planetName }: { planetName: string }) {
  const planet = planets.find(p => p.name === planetName);
  const needsHelmet = planet?.atmosphere !== "Nitrogen (78%), Oxygen (21%)";
  
  if (!needsHelmet) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Helmet frame */}
      <div className="absolute inset-0">
        {/* Top curved frame */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-24 bg-gradient-to-b from-gray-800/80 to-transparent rounded-b-full" />
        
        {/* Bottom curved frame */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-16 bg-gradient-to-t from-gray-800/80 to-transparent rounded-t-full" />
        
        {/* Left side frame */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-16 h-64 bg-gradient-to-r from-gray-800/80 to-transparent rounded-r-full" />
        
        {/* Right side frame */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-16 h-64 bg-gradient-to-l from-gray-800/80 to-transparent rounded-l-full" />
      </div>
      
      {/* HUD elements */}
      <div className="absolute top-4 right-4 bg-gray-900/70 border border-green-400 rounded p-2 text-green-400 text-xs font-mono">
        <div>O₂: 98%</div>
        <div>SUIT: OK</div>
        <div>TEMP: {planet?.surfaceTemperature}</div>
      </div>
      
      {/* Atmosphere warning */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/70 border border-red-400 rounded px-3 py-1 text-red-400 text-sm">
        ⚠️ HOSTILE ATMOSPHERE - EVA SUIT ACTIVE
      </div>
    </div>
  );
}

function SurfaceControls({ planetName }: { planetName: string }) {
  const planet = planets.find(p => p.name === planetName);
  const { isActive: isMining, targetResource, progress } = useMining();
  
  return (
    <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-cyan-400 rounded-lg p-4 max-w-md">
      <h3 className="text-lg font-bold text-cyan-400 mb-3">🚀 Surface Operations</h3>
      
      {/* Movement controls */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Rover Controls:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>WASD: Move</div>
          <div>Q/E: Turn</div>
        </div>
      </div>
      
      {/* Mining status */}
      {isMining ? (
        <div className="mb-3 p-3 bg-yellow-900/30 border border-yellow-400 rounded">
          <div className="text-yellow-400 text-sm mb-1">
            ⛏️ Mining: {targetResource?.type}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-yellow-400 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-gray-400 mt-1">{Math.round(progress)}% complete</div>
        </div>
      ) : (
        <div className="mb-3 p-3 bg-green-900/30 border border-green-400 rounded">
          <div className="text-green-400 text-sm mb-1">📍 Ready to mine</div>
          <div className="text-xs text-gray-400">Look for glowing resource nodes and click to start mining</div>
        </div>
      )}
      
      {/* Available resources */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Available Resources:</h4>
        <div className="space-y-1">
          {planet?.resources.map((resource, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span className={`${
                resource.rarity === 'legendary' ? 'text-yellow-400' :
                resource.rarity === 'rare' ? 'text-purple-400' :
                resource.rarity === 'uncommon' ? 'text-blue-400' : 'text-green-400'
              }`}>
                {resource.type}
              </span>
              <span className="text-gray-400">{resource.value}cr</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlanetSurfaceScene() {
  const { isLanded, landedPlanet } = useLandedState();
  
  if (!isLanded || !landedPlanet) return null;
  
  // Surface movement controls
  const surfaceControls = [
    { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
    { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
    { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
    { name: 'right', keys: ['KeyD', 'ArrowRight'] },
    { name: 'turnLeft', keys: ['KeyQ'] },
    { name: 'turnRight', keys: ['KeyE'] },
  ];
  
  return (
    <div className="fixed inset-0 z-20">
      <KeyboardControls map={surfaceControls}>
        <Canvas camera={{ position: [0, 1.8, 5], fov: 75 }}>
          <SurfaceLighting />
          <SurfaceSky planetName={landedPlanet} />
          <SurfaceTerrain planetName={landedPlanet} />
          <SurfaceRocks planetName={landedPlanet} />
          <ResourceNodes planetName={landedPlanet} />
          <SurfaceMovementController />
        </Canvas>
      </KeyboardControls>
      
      {/* Helmet overlay for non-breathable atmospheres */}
      <HelmetOverlay planetName={landedPlanet} />
      
      {/* Surface controls and mining interface */}
      <SurfaceControls planetName={landedPlanet} />
    </div>
  );
}