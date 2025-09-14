import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useLandedState } from "../lib/stores/useLandedState";
import { planets } from "../lib/planetData";
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
    <mesh ref={meshRef} geometry={terrainGeometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
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
        y: Math.random() * 1,
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
    </>
  );
}

function SurfaceCamera() {
  useFrame((state) => {
    // Gentle camera movement to show we're on the surface
    state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.1) * 2;
    state.camera.position.y = 3 + Math.sin(state.clock.elapsedTime * 0.15) * 0.5;
    state.camera.position.z = 5 + Math.cos(state.clock.elapsedTime * 0.1) * 2;
    state.camera.lookAt(0, 0, 0);
  });
  
  return null;
}

export function PlanetSurfaceScene() {
  const { isLanded, landedPlanet } = useLandedState();
  
  if (!isLanded || !landedPlanet) return null;
  
  return (
    <div className="fixed inset-0 z-20">
      <Canvas camera={{ position: [0, 3, 5], fov: 75 }}>
        <SurfaceLighting />
        <SurfaceSky planetName={landedPlanet} />
        <SurfaceTerrain planetName={landedPlanet} />
        <SurfaceRocks planetName={landedPlanet} />
        <SurfaceCamera />
      </Canvas>
      
      {/* Surface UI Overlay */}
      <div className="absolute top-4 left-4 bg-gray-900/90 border border-cyan-400 rounded-lg p-4 max-w-sm">
        <h2 className="text-xl font-bold text-cyan-400 mb-2">🌍 Surface of {landedPlanet}</h2>
        <p className="text-gray-300 text-sm mb-2">
          Your ship has successfully landed on the surface. Mining operations are now available.
        </p>
        <div className="flex items-center space-x-2 text-green-400 text-sm">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span>Landing Systems: OPERATIONAL</span>
        </div>
      </div>
    </div>
  );
}