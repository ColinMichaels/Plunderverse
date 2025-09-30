import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useTexture } from "@react-three/drei";
import { useLandedState } from "../lib/stores/useLandedState";
import { useMining } from "../lib/stores/useMining";
import { useAudio } from "../lib/stores/useAudio";
import { useStorageInfo } from "../domain/economy/selectors";
import { useInventoryStore } from "../domain/economy/inventory.store";
import { useEquipment } from "../lib/stores/useEquipment";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { planets, ResourceData } from "../lib/planetData";
import { SurfaceMovementController } from "./SurfaceMovementController";
import { FBXAsteroid } from "./FBXAsteroid";
import { FlashlightSystem } from "./FlashlightSystem";
import * as THREE from "three";

import { usePlayer } from "../lib/stores/usePlayer";
import { useFlashlight } from "../lib/stores/useFlashlight";
import { useSurfaceCollision } from "../lib/stores/useSurfaceCollision";
import { AUDIO_CONFIG } from "../lib/audioConfig";

function SurfaceTerrain({ planetName }: { planetName: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Get planet data for surface color
  const planet = planets.find((p) => p.name === planetName);
  const surfaceColor = planet?.color || "#8C7853";

  // Load surface texture
  const surfaceTexture = useTexture(
    "/textures/surfaces/black-white-details-moon-texture-concept.jpg",
  );

  // Generate terrain vertices using useMemo to avoid recreating on every render
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(400, 400, 50, 50);
    const vertices = geometry.attributes.position.array as Float32Array;

    // Add some height variation to make it look like terrain
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 1];
      // Simple noise-like function for terrain height
      const height =
        Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2 +
        Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
      vertices[i + 2] = height;
    }

    geometry.computeVertexNormals();
    return geometry;
  }, []);

  // Configure texture
  useEffect(() => {
    if (surfaceTexture) {
      surfaceTexture.wrapS = THREE.RepeatWrapping;
      surfaceTexture.wrapT = THREE.RepeatWrapping;
      surfaceTexture.repeat.set(8, 8); // Repeat the texture 8x8 times for detail
      surfaceTexture.anisotropy = 16; // Improve texture quality at angles
    }
  }, [surfaceTexture]);

  return (
    <mesh
      ref={meshRef}
      geometry={terrainGeometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
    >
      <meshStandardMaterial
        map={surfaceTexture}
        color={surfaceColor}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

// Function to calculate terrain height (shared with SurfaceMovementController)
function terrainHeightAt(x: number, z: number): number {
  return (
    Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2 +
    Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5
  );
}

function SurfaceRocks({ planetName }: { planetName: string }) {
  const planet = planets.find((p) => p.name === planetName);
  const rockColor = planet?.color || "#666666";
  const { registerCollisionObject, unregisterCollisionObject } = useSurfaceCollision();

  // Generate rock positions using useMemo
  const rockPositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      const terrainHeight = terrainHeightAt(x, z);
      
      // Pre-calculate final render scale to match collision radius
      const baseScale = 0.5 + Math.random() * 1.5;
      const randomVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 variation
      const finalScale = baseScale * 0.025 * randomVariation;

      positions.push({
        id: `rock-${planetName}-${i}`,
        x,
        y: terrainHeight + 0.3 + Math.random() * 0.5, // Sit on terrain with clearance
        z,
        scale: finalScale, // Store the final render scale
        rotationY: Math.random() * Math.PI * 2,
      });
    }
    return positions;
  }, [planetName]);

  // Register rock collision objects
  useEffect(() => {
    rockPositions.forEach((rock) => {
      registerCollisionObject({
        id: rock.id,
        position: new THREE.Vector3(rock.x, rock.y, rock.z),
        radius: rock.scale * 2, // Collision radius matches visual size
        type: "rock",
      });
    });

    return () => {
      rockPositions.forEach((rock) => {
        unregisterCollisionObject(rock.id);
      });
    };
  }, [rockPositions]);

  return (
    <>
      {rockPositions.map((rock, index) => (
        <FBXAsteroid
          key={rock.id}
          position={[rock.x, rock.y, rock.z]}
          scale={rock.scale} // Use pre-calculated final scale
          rotation={[0, rock.rotationY, 0]}
          color={rockColor}
          roughness={0.8}
          metalness={0.1}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

function SurfaceSky({ planetName }: { planetName: string }) {
  const { time } = useSolarSystem();
  const meshRef = useRef<THREE.Mesh>(null);
  const starfieldRef = useRef<THREE.Points>(null);
  const planetsRef = useRef<THREE.Group>(null);

  // Orbital calculation utilities
  const calculateOrbitPosition = (
    distance: number,
    speed: number,
    time: number,
  ) => {
    const angle = speed * time;
    return new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance,
    );
  };

  // TEMPORARY: Commenting out corrupted code to fix syntax errors
  /*
  const calculatePlanetPosition = (planet: any, time: number) => {
    return calculateOrbitPosition(planet.distance, planet.orbita

  // map planet textures appropriately and shade them according to the sun position to make them appear more realistic in the sky
  const planetTextures = useMemo(() =>
    planets.map((planet) => ({
      name: planet.name,
      texture: useTexture(planet.texture || "/textures/planets/2k_earth_daymap.jpg"),
    }))
                                  , [])
  );
  // Get planet texture by name
  const getPlanetTexture = (planetName: string) =>
    planetTextures.find((p) => p.name === planetName)?.texture || null
  ;
  // Update planet textures when planetName changes
  useEffect(() =>



      lSpeed, time);
  };
  */
  
  // Temporary minimal implementation to get app running
  const calculatePlanetPosition = (planet: any, time: number) => {
    const angle = planet.orbitalSpeed * time;
    return new THREE.Vector3(
      Math.cos(angle) * planet.distance,
      0,
      Math.sin(angle) * planet.distance,
    );
  };

  // Calculate visible planets for current time
  const visiblePlanets = useMemo(() => {
    const currentPlanet = planets.find((p) => p.name === planetName);
    if (!currentPlanet) return [];

    const currentPosition = calculatePlanetPosition(currentPlanet, time);
    const visibleObjects: Array<{
      planet: any;
      skyPosition: THREE.Vector3;
      apparentSize: number;
      distance: number;
    }> = [];

    // Add the Sun as a visible object
    const sunDistance = currentPosition.length();
    const sunDirection = currentPosition.clone().negate().normalize();
    const sunSkyPosition = sunDirection.clone().multiplyScalar(400);
    const sunApparentSize = Math.min(40, Math.max(8, 15 * (30 / sunDistance)));

    visibleObjects.push({
      planet: { name: "Sun", size: 15, color: "#FDB813" },
      skyPosition: sunSkyPosition,
      apparentSize: sunApparentSize,
      distance: sunDistance,
    });

    // Add other planets
    planets.forEach((planet) => {
      if (planet.name === planetName) return;

      const planetPosition = calculatePlanetPosition(planet, time);
      const relativePosition = planetPosition.clone().sub(currentPosition);
      const distance = relativePosition.length();

      if (distance > 5) {
        const direction = relativePosition.normalize();
        const skyPosition = direction.clone().multiplyScalar(400);
        const apparentSize = Math.max(
          0.8,
          Math.log(planet.size + 1) * (50 / Math.sqrt(distance)),
        );

        visibleObjects.push({
          planet,
          skyPosition,
          apparentSize,
          distance,
        });
      }
    });

    return visibleObjects;
  }, [planetName, time]);

  // Get atmospheric gradient colors
  const getAtmosphericGradient = (planetName: string) => {
    switch (planetName) {
      case "Earth":
        return {
          horizonColor: "#87CEEB",
          zenithColor: "#191970",
          atmosphereIntensity: 0.8,
        };
      case "Mars":
        return {
          horizonColor: "#CD5C5C",
          zenithColor: "#2F1B14",
          atmosphereIntensity: 0.6,
        };
      case "Venus":
        return {
          horizonColor: "#FFA500",
          zenithColor: "#8B4513",
          atmosphereIntensity: 0.9,
        };
      case "Mercury":
        return {
          horizonColor: "#2F2F2F",
          zenithColor: "#000000",
          atmosphereIntensity: 0.1,
        };
      case "Jupiter":
        return {
          horizonColor: "#D8CA9D",
          zenithColor: "#8B7355",
          atmosphereIntensity: 0.7,
        };
      case "Saturn":
        return {
          horizonColor: "#FAD5A5",
          zenithColor: "#CD853F",
          atmosphereIntensity: 0.7,
        };
      case "Uranus":
        return {
          horizonColor: "#4FD0E7",
          zenithColor: "#2F4F4F",
          atmosphereIntensity: 0.5,
        };
      case "Neptune":
        return {
          horizonColor: "#4B70DD",
          zenithColor: "#191970",
          atmosphereIntensity: 0.6,
        };
      default:
        return {
          horizonColor: "#1a1a2e",
          zenithColor: "#000000",
          atmosphereIntensity: 0.3,
        };
    }
  };

  const atmosphericData = useMemo(
    () => getAtmosphericGradient(planetName),
    [planetName],
  );

  // Generate starfield data
  const starData = useMemo(() => {
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 450 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Star color variations - different stellar types
      const starType = Math.random();
      if (starType < 0.4) {
        // Orange/red stars (most common)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.5 + Math.random() * 0.2;
      } else if (starType < 0.7) {
        // White stars
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      } else if (starType < 0.9) {
        // Blue-white stars
        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Yellow stars (like our sun)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      }
    }

    return { positions, colors };
  }, []);

  // Create atmospheric gradient texture
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");

    if (context) {
      const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, atmosphericData.zenithColor);
      gradient.addColorStop(0.7, atmosphericData.horizonColor);
      gradient.addColorStop(1, "#000000");

      context.fillStyle = gradient;
      context.fillRect(0, 0, 256, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [atmosphericData]);

  // Subtle animation for stars
  useFrame((state) => {
    if (starfieldRef.current) {
      starfieldRef.current.rotation.y += 0.00005;

      const material = starfieldRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group>
      {/* Deep space background */}
      <mesh>
        <sphereGeometry args={[490, 32, 32]} />
        <meshBasicMaterial
          color="#000011"
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Atmospheric sky dome with gradient */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[480, 32, 32]} />
        <meshBasicMaterial
          map={gradientTexture}
          side={THREE.BackSide}
          transparent
          opacity={atmosphericData.atmosphereIntensity}
          depthWrite={false}
        />
      </mesh>

      {/* Starfield */}
      <points ref={starfieldRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={starData.positions.length / 3}
            array={starData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={starData.colors.length / 3}
            array={starData.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.2}
          transparent
          opacity={0.7}
          sizeAttenuation={false}
          vertexColors
        />
      </points>

      {/* Distant planets and celestial objects */}
      <group ref={planetsRef}>
        {visiblePlanets.map((celestialObject, index) => (
          <mesh
            key={`${celestialObject.planet.name}-${index}`}
            position={[
              celestialObject.skyPosition.x,
              celestialObject.skyPosition.y,
              celestialObject.skyPosition.z,
            ]}
          >
            <sphereGeometry args={[celestialObject.apparentSize, 8, 8]} />
            {celestialObject.planet.name === "Sun" ? (
              <meshStandardMaterial
                color={celestialObject.planet.color}
                emissive={celestialObject.planet.color}
                emissiveIntensity={0.8}
              />
            ) : (
              <meshBasicMaterial color={celestialObject.planet.color} />
            )}
          </mesh>
        ))}
      </group>

      {/* Additional dim background stars for depth */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={1500}
            array={useMemo(() => {
              const positions = new Float32Array(1500 * 3);
              for (let i = 0; i < 1500; i++) {
                const radius = 520 + Math.random() * 80;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;

                positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = radius * Math.cos(phi);
              }
              return positions;
            }, [])}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.6}
          color="#ffffff"
          transparent
          opacity={0.3}
          sizeAttenuation={false}
        />
      </points>
    </group>
  );
}

function SurfaceLighting() {
  const { landedPlanet } = useLandedState();
  const { time } = useSolarSystem();

  const planet = useMemo(() => {
    return planets.find((p) => p.name === landedPlanet);
  }, [landedPlanet]);

  const surfaceColor = planet?.color || "#8C7853";

  // Calculate realistic sun position and intensity based on orbital mechanics and planet rotation
  const lightingData = useMemo(() => {
    if (!planet)
      return {
        sunPosition: new THREE.Vector3(50, 200, 50),
        sunIntensity: 0.9,
        distanceBasedIntensity: 1.0,
      };

    const calculateOrbitPosition = (
      distance: number,
      speed: number,
      time: number,
    ) => {
      const angle = speed * time;
      return new THREE.Vector3(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance,
      );
    };

    const calculatePlanetPosition = (planet: any, time: number) => {
      return calculateOrbitPosition(planet.distance, planet.orbitalSpeed, time);
    };

    // Get planet's orbital position
    const currentPlanetPosition = calculatePlanetPosition(planet, time);

    // Calculate distance-based intensity using inverse square law
    // Base intensity on Earth's distance (75 units) as reference (30 * 2.5 from planetData)
    const earthDistance = 75;
    const distanceFromSun = currentPlanetPosition.length();
    const distanceBasedIntensity = Math.pow(earthDistance / distanceFromSun, 2);

    // Add planet rotation for local day/night cycle
    const rotationAngle = time * planet.rotationSpeed * 15; // Scale rotation for visible effect
    const localTimeOfDay = rotationAngle % (2 * Math.PI);

    // Sun direction from planet (sun is at origin)
    const sunDirection = currentPlanetPosition.clone().negate().normalize();

    // Apply planet rotation to determine local sun position
    // Rotate around planet's Y-axis to simulate planet rotation
    const rotatedSunDirection = sunDirection.clone();
    rotatedSunDirection.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      localTimeOfDay,
    );

    // Position the directional light further away for better shadows
    const sunLightPosition = rotatedSunDirection.clone().multiplyScalar(400);

    // Calculate sun elevation based on rotated position
    const sunElevation = Math.asin(
      Math.max(-1, Math.min(1, rotatedSunDirection.y)),
    );

    // Calculate intensity based on sun elevation and distance
    let sunIntensity = 0;

    if (sunElevation < -0.4) {
      // Deep night - complete darkness
      sunIntensity = 0.0;
    } else if (sunElevation < -0.1) {
      // Dawn/dusk transition
      const transitionFactor = (sunElevation + 0.4) / 0.3;
      sunIntensity = Math.max(0, transitionFactor * 0.1);
    } else if (sunElevation < 0.2) {
      // Early morning/late evening
      const dawnFactor = (sunElevation + 0.1) / 0.3;
      sunIntensity = 0.1 + dawnFactor * 0.4;
    } else {
      // Full daylight
      sunIntensity = 0.5 + Math.sin(sunElevation) * 0.9;
    }

    // Apply distance-based scaling with realistic intensity differences
    const finalIntensity = sunIntensity * distanceBasedIntensity;

    return {
      sunPosition: sunLightPosition,
      sunIntensity: Math.max(0, Math.min(4.0, finalIntensity)), // Higher cap for closer planets
      distanceBasedIntensity,
      sunElevation,
      planetName: planet.name,
    };
  }, [planet, time]);

  const { sunPosition, sunIntensity } = lightingData;

  // Add debug logging for lighting changes
  useEffect(() => {
    if (
      planet &&
      lightingData &&
      typeof lightingData.sunElevation === "number"
    ) {
      console.log(
        `[LIGHTING-${planet.name}] Distance-based intensity: ${lightingData.distanceBasedIntensity.toFixed(2)}x, Sun intensity: ${sunIntensity.toFixed(2)}, Elevation: ${((lightingData.sunElevation * 180) / Math.PI).toFixed(1)}°`,
      );
    }
  }, [planet?.name, sunIntensity, lightingData]);

  return (
    <>
      {/* Extremely minimal ambient light - shadows should be very dark */}
      <ambientLight intensity={0.02} color={surfaceColor} />

      {/* Dynamic sun based on orbital mechanics and planet rotation */}
      <directionalLight
        position={[sunPosition.x, sunPosition.y, sunPosition.z]}
        intensity={sunIntensity}
        color="#FDB813"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-camera-near={0.1}
        shadow-camera-far={800}
        shadow-bias={-0.0005}
      />

      {/* Removed all secondary lights - flashlight is essential for navigation in shadows! */}
    </>
  );
}

function ResourceNode({
  resource,
  position,
  onInteract,
  progress = 0,
  nodeId,
}: {
  resource: ResourceData;
  position: [number, number, number];
  onInteract: () => void;
  progress?: number;
  nodeId: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const { registerCollisionObject, unregisterCollisionObject } = useSurfaceCollision();

  // Register collision object on mount
  useEffect(() => {
    const collisionObj = {
      id: nodeId,
      position: new THREE.Vector3(position[0], position[1], position[2]),
      radius: 1.5,
      type: "resource" as const,
    };
    registerCollisionObject(collisionObj);

    return () => {
      unregisterCollisionObject(nodeId);
    };
  }, [nodeId, position[0], position[1], position[2]]);

  // Get color based on rarity
  const getResourceColor = (rarity: string) => {
    switch (rarity) {
      case "common":
        return "#10B981";
      case "uncommon":
        return "#3B82F6";
      case "rare":
        return "#8B5CF6";
      case "legendary":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  // Calculate scale based on mining progress: 1.0 down to 0.2
  const miningScale = 1 - (progress * 0.8);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;

      // Glow effect when hovered
      if (hovered) {
        meshRef.current.rotation.y += 0.02;
      }
    }
  });

  // Combine mining scale with hover scale
  const baseScale = hovered ? 1.2 : 1;
  const finalScale = baseScale * miningScale;

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onInteract}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={finalScale}
    >
      <octahedronGeometry args={[1.5, 0]} />
      <meshStandardMaterial
        color={getResourceColor(resource.rarity)}
        emissive={hovered ? getResourceColor(resource.rarity) : "#000000"}
        emissiveIntensity={hovered ? 0.3 : 0}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

function ResourceNodes({ planetName }: { planetName: string }) {
  const planet = planets.find((p) => p.name === planetName);
  const { startMining, performClick, isActive, targetResource, clicksCompleted, clicksRequired, currentNodeId } = useMining();
  const { playHit } = useAudio();

  // Track destroyed resource nodes per planet
  const [destroyedNodes, setDestroyedNodes] = useState<Set<string>>(new Set());

  // Calculate current mining progress (0 to 1)
  const miningProgress = isActive && clicksRequired > 0 
    ? Math.min(1, clicksCompleted / clicksRequired) // Clamp to [0,1]
    : 0;

  if (!planet) return null;

  // Generate resource node positions
  const resourcePositions = useMemo(() => {
    const positions: Array<{
      resource: ResourceData;
      position: [number, number, number];
      id: string;
    }> = [];

    planet.resources.forEach((resource, resourceIndex) => {
      // Create multiple nodes for each resource type
      const nodeCount =
        resource.rarity === "legendary"
          ? 1
          : resource.rarity === "rare"
            ? 2
            : resource.rarity === "uncommon"
              ? 3
              : 4;

      for (let i = 0; i < nodeCount; i++) {
        const angle =
          ((resourceIndex * nodeCount + i) * (Math.PI * 2)) /
          (planet.resources.length * 3);
        const distance = 15 + Math.random() * 30;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const terrainHeight = terrainHeightAt(x, z);
        const y = terrainHeight + 0.8 + Math.random() * 1.5; // Sit on terrain with clearance

        positions.push({
          resource,
          position: [x, y, z],
          id: `${planetName}-${resource.type}-${resourceIndex}-${i}`, // Unique ID with resource index to prevent collisions
        });
      }
    });

    return positions;
  }, [planet, planetName]);

  const handleResourceClick = async (resource: ResourceData, nodeId: string) => {
    console.log(
      `[MINING-DEBUG] Resource click detected: ${resource.type} on ${planetName}`,
    );
    console.log(
      `[MINING-DEBUG] Current mining state: isActive=${isActive}, targetResource=${targetResource?.type}`,
    );

    try {
      // Check if we're currently mining THIS SPECIFIC node
      const { currentNodeId: activeNodeId } = useMining.getState();
      
      if (isActive && activeNodeId === nodeId) {
        // If already mining this specific node, perform a click
        console.log(
          `[MINING-DEBUG] Performing mining click for ${resource.type} (node: ${nodeId})`,
        );
        const result = await performClick();
        console.log(`[MINING-DEBUG] performClick result:`, result);

        if (result) {
          // Mining completed - check if transaction was successful
          console.log(
            `[MINING-DEBUG] Mining completed! Transaction result:`,
            result,
          );

          if (result.success) {
            // Transaction successful - resources, credits, equipment wear, and sounds already handled by economy service
            console.log(`[MINING-DEBUG] Mining transaction successful: ${result.message}`);
            
            // Extract details for logging if available
            if (result.details?.resourcesAdded && result.details.resourcesAdded.length > 0) {
              const addedResource = result.details.resourcesAdded[0];
              console.log(
                `[MINING-DEBUG] Successfully mined ${addedResource.quantity} ${addedResource.type}`,
              );
            }

            if (result.details?.creditsEarned) {
              console.log(
                `[MINING-DEBUG] Earned ${result.details.creditsEarned} credits from mining`,
              );
            }

            // Destroy the mined resource node since mining was successful
            setDestroyedNodes(
              (prev) => new Set(Array.from(prev).concat(nodeId)),
            );
            console.log(
              `[MINING-DEBUG] Resource node ${nodeId} destroyed after successful mining`,
            );
          } else {
            // Transaction failed - handle failure case
            console.warn(`[MINING-DEBUG] Mining transaction failed: ${result.message}`);
            
            // Check for specific equipment failure cases
            if (result.message.includes('broken') || result.message.includes('full')) {
              console.warn(`[MINING-DEBUG] ${result.message}`);
              // Note: Equipment failure sounds and UI feedback are handled by the economy service
            }
          }
        } else {
          // Continue mining - play hit sound
          console.log(`[MINING-DEBUG] Mining click registered, continuing...`);
          playHit();
        }
      } else {
        // Start mining a new resource
        console.log(
          `[MINING-DEBUG] Starting new mining operation for ${resource.type} (node: ${nodeId}) on ${planetName}`,
        );
        startMining(planetName, resource, nodeId);
        console.log(
          `[MINING-DEBUG] startMining called for ${resource.type} (node: ${nodeId}) on ${planetName}`,
        );
      }
    } catch (error) {
      console.error(`[MINING-DEBUG] Failed to mine ${resource.type}:`, error);
    }
  };

  return (
    <>
      {resourcePositions
        .filter((node) => !destroyedNodes.has(node.id)) // Only show non-destroyed nodes
        .map((node, index) => {
          // Check if THIS SPECIFIC node is currently being mined using its unique ID
          const isBeingMined = isActive && currentNodeId === node.id;
          const nodeProgress = isBeingMined ? miningProgress : 0;
          
          return (
            <ResourceNode
              key={node.id}
              nodeId={node.id}
              resource={node.resource}
              position={node.position}
              onInteract={() => handleResourceClick(node.resource, node.id)}
              progress={nodeProgress}
            />
          );
        })}
    </>
  );
}

function HelmetOverlay({ planetName }: { planetName: string }) {
  const player = usePlayer.getState();
  const planet = planets.find((p) => p.name === planetName);
  const needsHelmet = planetName !== "Earth"; // More robust check
  const [helmetAudio, setHelmetAudio] = useState<HTMLAudioElement | null>(null);
  const { isMuted } = useAudio(); // Respect global audio settings
  const { isOn, batteryLevel, getBatteryStatus, isCharging } = useFlashlight(); // Flashlight status

  // Initialize and manage helmet breathing audio
  useEffect(() => {
    if (needsHelmet) {
      const { soundEffects } = AUDIO_CONFIG;
      const audio = new Audio(soundEffects.spaceHelmetBreathing.path);
      audio.loop = soundEffects.spaceHelmetBreathing.loop ?? true;
      audio.volume = isMuted ? 0 : soundEffects.spaceHelmetBreathing.volume;
      audio
        .play()
        .catch((e) => console.log("Helmet audio autoplay prevented:", e));
      setHelmetAudio(audio);

      return () => {
        audio.pause();
        audio.currentTime = 0;
        setHelmetAudio(null);
      };
    }
  }, [needsHelmet, isMuted]);

  // Update volume when mute state changes
  useEffect(() => {
    if (helmetAudio) {
      const { soundEffects } = AUDIO_CONFIG;
      helmetAudio.volume = isMuted ? 0 : soundEffects.spaceHelmetBreathing.volume;
    }
  }, [isMuted, helmetAudio]);

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
        <div>O₂: {player.oxygenPercentage}</div>
        <div>SUIT: {player.suitStatus} </div>
        <div>TEMP: {planet?.surfaceTemperature}</div>
        <div
          className={`${
            getBatteryStatus() === "critical"
              ? "text-red-400"
              : getBatteryStatus() === "low"
                ? "text-yellow-400"
                : isCharging
                  ? "text-cyan-400"
                  : "text-green-400"
          }`}
        >
          💡: {isOn ? "ON" : "OFF"} {Math.round(batteryLevel)}%{" "}
          {isCharging ? "⚡" : ""}
        </div>
      </div>

      {/* Atmosphere warning */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/70 border border-red-400 rounded px-3 py-1 text-red-400 text-sm">
        ⚠️ HOSTILE ATMOSPHERE - EVA SUIT ACTIVE
      </div>
    </div>
  );
}

function SurfaceControls({ planetName }: { planetName: string }) {
  const planet = planets.find((p) => p.name === planetName);
  const {
    isActive: isMining,
    targetResource,
    clicksCompleted,
    clicksRequired,
  } = useMining();
  const {
    isOn,
    batteryLevel,
    getBatteryStatus,
    isCharging,
    toggle: toggleFlashlight,
    startCharging,
    stopCharging,
  } = useFlashlight();

  return (
    <div className="absolute bottom-4 right-4 bg-gray-900/90 border border-cyan-400 rounded-lg p-4 max-w-md">
      <h3 className="text-lg font-bold text-cyan-400 mb-3">
        🚀 Surface Operations
      </h3>

      {/* Movement controls */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Rover Controls:
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
          <div>WASD: Move</div>
          <div>Q/E: Turn</div>
          <div>F: Flashlight</div>
          <div>R: Charge</div>
        </div>

        {/* Flashlight controls */}
        <div className="flex gap-2">
          <button
            onClick={toggleFlashlight}
            className={`flex-1 px-3 py-2 rounded text-xs font-semibold transition-colors ${
              isOn
                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                : "bg-gray-600 hover:bg-gray-700 text-gray-300"
            }`}
          >
            💡 {isOn ? "ON" : "OFF"} ({Math.round(batteryLevel)}%)
          </button>
          <button
            onClick={() => (isCharging ? stopCharging() : startCharging())}
            className={`px-3 py-2 rounded text-xs font-semibold transition-colors ${
              isCharging
                ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                : "bg-gray-600 hover:bg-gray-700 text-gray-300"
            }`}
          >
            {isCharging ? "⚡ STOP" : "🔋 CHARGE"}
          </button>
        </div>
      </div>

      {/* Mining status */}
      {isMining ? (
        <div className="mb-3 p-3 bg-yellow-900/30 border border-yellow-400 rounded">
          <div className="text-yellow-400 text-sm mb-1">
            ⛏️ Mining: {targetResource?.type}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(clicksCompleted / clicksRequired) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {clicksCompleted}/{clicksRequired} clicks - Click to mine!
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 bg-green-900/30 border border-green-400 rounded">
          <div className="text-green-400 text-sm mb-1">📍 Ready to mine</div>
          <div className="text-xs text-gray-400">
            Look for glowing resource nodes and click to start mining
          </div>
        </div>
      )}

      {/* Available resources */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">
          Available Resources:
        </h4>
        <div className="space-y-1">
          {planet?.resources.map((resource, index) => (
            <div key={index} className="flex justify-between text-xs">
              <span
                className={`${
                  resource.rarity === "legendary"
                    ? "text-yellow-400"
                    : resource.rarity === "rare"
                      ? "text-purple-400"
                      : resource.rarity === "uncommon"
                        ? "text-blue-400"
                        : "text-green-400"
                }`}
              >
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

function MiningDebugDisplay() {
  const { isLanded, landedPlanet } = useLandedState();
  const { isActive, targetResource, clicksCompleted, clicksRequired } =
    useMining();
  const items = useInventoryStore(state => state.items);
  const storageInfo = useStorageInfo();
  const { used: storageUsed, capacity: storageCapacity } = storageInfo;
  const { getPerformanceMultiplier, getConditionStatus } = useEquipment();

  // Calculate total units and find last changed item
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const lastChangedItem = items.length > 0 ? items[items.length - 1] : null;

  // Get equipment performance data
  const drillPerformance = getPerformanceMultiplier("drill-mk1");
  const extractorPerformance = getPerformanceMultiplier("extractor-basic");
  const drillStatus = getConditionStatus("drill-mk1");
  const extractorStatus = getConditionStatus("extractor-basic");

  return (
    <div className="fixed top-4 right-4 bg-black/80 border border-cyan-400/50 rounded p-3 text-cyan-400 font-mono text-xs z-50">
      <div className="space-y-1">
        <div>LANDING: {isLanded ? `✓ ${landedPlanet}` : "✗ Not landed"}</div>
        <div>
          MINING: {isActive ? `✓ ${targetResource?.type}` : "✗ Inactive"}
        </div>
        <div>
          PROGRESS: {clicksCompleted}/{clicksRequired}
        </div>
        <div>
          CARGO: {totalUnits} units ({items.length} types)
        </div>
        <div>
          STORAGE: {storageUsed}/{storageCapacity}
        </div>
        {lastChangedItem && (
          <div>
            LAST: {lastChangedItem.quantity}x {lastChangedItem.type}
          </div>
        )}
        <div className="border-t border-cyan-600 pt-1 mt-1">
          <div>
            DRILL: {(drillPerformance * 100).toFixed(0)}% ({drillStatus})
          </div>
          <div>
            EXTR: {(extractorPerformance * 100).toFixed(0)}% ({extractorStatus})
          </div>
          {(drillStatus === "broken" || extractorStatus === "broken") && (
            <div className="text-red-400">⚠️ EQUIPMENT BROKEN</div>
          )}
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
    { name: "forward", keys: ["KeyW", "ArrowUp"] },
    { name: "backward", keys: ["KeyS", "ArrowDown"] },
    { name: "left", keys: ["KeyA", "ArrowLeft"] },
    { name: "right", keys: ["KeyD", "ArrowRight"] },
    { name: "turnLeft", keys: ["KeyQ"] },
    { name: "turnRight", keys: ["KeyE"] },
    { name: "flashlight", keys: ["KeyF"] },
    { name: "charge", keys: ["KeyC"] },
  ];

  return (
    <div className="fixed inset-0 z-20">
      <KeyboardControls map={surfaceControls}>
        <Canvas camera={{ position: [0, 1.8, 5], fov: 75 }}>
          <SurfaceLighting />
          <FlashlightSystem />
          <SurfaceSky planetName={landedPlanet} />
          <SurfaceTerrain planetName={landedPlanet} />
          <SurfaceRocks planetName={landedPlanet} />
          <ResourceNodes planetName={landedPlanet} />
          <SurfaceMovementController />
        </Canvas>
      </KeyboardControls>

      {/* Mining debug display */}
      <MiningDebugDisplay />

      {/* Helmet overlay for non-breathable atmospheres */}
      <HelmetOverlay planetName={landedPlanet} />

      {/* Surface controls and mining interface */}
      <SurfaceControls planetName={landedPlanet} />
    </div>
  );
}
