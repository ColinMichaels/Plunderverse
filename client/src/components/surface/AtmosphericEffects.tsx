import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import {
  heatShimmerVertexShader,
  heatShimmerFragmentShader,
} from "../../shaders/heatShimmer";
import { useWind } from "../../lib/stores/surface/useWind";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useSettings } from "../../lib/stores/ui/useSettings";
import { useTerrain } from "../../lib/stores/surface/useTerrain";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { ResourceManager } from "../../lib/utils/ResourceManager";

// Create custom heat shimmer material
const HeatShimmerMaterial = shaderMaterial(
  {
    uTime: 0,
    uIntensity: 0.5,
    uFrequency: 10,
    uSpeed: 1,
    uDistortionScale: 5,
    uRefractiveIndex: 1.3,
    uColor: new THREE.Color("#ff8800"),
    uTexture: null,
    uOpacity: 0.3,
  },
  heatShimmerVertexShader,
  heatShimmerFragmentShader,
);

extend({ HeatShimmerMaterial });

// TypeScript declaration for the custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      heatShimmerMaterial: any;
    }
  }
}

interface AtmosphericEffectsProps {
  planetName: string;
  position?: [number, number, number];
  flashlightOn?: boolean;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  size: number;
  opacity: number;
  type: "dust" | "rain" | "fog" | "pollen" | "ash" | "acid";
  color: THREE.Color;
}

// Particle pool for performance
class AtmosphericParticlePool {
  private particles: ParticleData[] = [];
  private activeCount: number = 0;
  private maxParticles: number;

  constructor(maxParticles: number = 50) {
    // Drastically reduced from 1000 to 50
    this.maxParticles = maxParticles;
    // Pre-allocate particles
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 1,
        size: 0.1,
        opacity: 1,
        type: "dust",
        color: new THREE.Color(),
      });
    }
  }

  spawn(
    type: ParticleData["type"],
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    lifetime: number,
    size: number,
    color: THREE.Color,
  ): ParticleData | null {
    if (this.activeCount >= this.maxParticles) return null;

    const particle = this.particles[this.activeCount];
    particle.position.copy(position);
    particle.velocity.copy(velocity);
    particle.lifetime = lifetime;
    particle.maxLifetime = lifetime;
    particle.size = size;
    particle.opacity = 1;
    particle.type = type;
    particle.color.copy(color);

    this.activeCount++;
    return particle;
  }

  update(
    deltaTime: number,
    windVector: THREE.Vector3,
    bounds: { min: THREE.Vector3; max: THREE.Vector3 },
  ) {
    let writeIndex = 0;

    for (let i = 0; i < this.activeCount; i++) {
      const particle = this.particles[i];
      particle.lifetime -= deltaTime;

      if (particle.lifetime > 0) {
        // Update position
        particle.position.add(
          particle.velocity.clone().multiplyScalar(deltaTime),
        );

        // Apply wind
        if (
          particle.type === "dust" ||
          particle.type === "pollen" ||
          particle.type === "ash"
        ) {
          particle.position.add(
            windVector.clone().multiplyScalar(deltaTime * 2),
          );
        } else if (particle.type === "fog") {
          particle.position.add(
            windVector.clone().multiplyScalar(deltaTime * 0.5),
          );
        }

        // Apply gravity for rain and acid rain
        if (particle.type === "rain" || particle.type === "acid") {
          particle.velocity.y -= 9.8 * deltaTime;
        }

        // Wrap around bounds
        if (particle.position.x < bounds.min.x)
          particle.position.x = bounds.max.x;
        if (particle.position.x > bounds.max.x)
          particle.position.x = bounds.min.x;
        if (particle.position.z < bounds.min.z)
          particle.position.z = bounds.max.z;
        if (particle.position.z > bounds.max.z)
          particle.position.z = bounds.min.z;

        // Reset rain/acid when it hits ground
        if (
          (particle.type === "rain" || particle.type === "acid") &&
          particle.position.y < 0
        ) {
          particle.position.y = bounds.max.y;
          particle.velocity.y = 0;
        }

        // Update opacity based on lifetime
        particle.opacity = Math.min(
          1,
          particle.lifetime / particle.maxLifetime,
        );

        // Keep particle if still alive
        if (writeIndex !== i) {
          this.particles[writeIndex] = particle;
          this.particles[i] = this.particles[writeIndex];
        }
        writeIndex++;
      }
    }

    this.activeCount = writeIndex;
  }

  getActiveParticles() {
    return this.particles.slice(0, this.activeCount);
  }

  clear() {
    this.activeCount = 0;
  }

  getActiveCount() {
    return this.activeCount;
  }
}

// Get atmospheric parameters for each planet
const getPlanetAtmosphere = (planetName: string, timeOfDay: number) => {
  const isDawn = timeOfDay >= 5 && timeOfDay <= 7;
  const isMorning = timeOfDay >= 7 && timeOfDay <= 10;
  const isNight = timeOfDay >= 20 || timeOfDay <= 5;

  switch (planetName) {
    case "Mars":
      return {
        fogColor: new THREE.Color("#CD5C5C"),
        fogDensity: 0.002 + Math.random() * 0.001, // Variable dust
        particleTypes: ["dust", "dust", "dust"], // Mostly dust
        particleCount: 30, // Reduced from 800 to 30
        particleColor: new THREE.Color("#8B4513"),
        particleSpeed: 2.0,
        particleSize: 0.3,
        visibility: 50, // Reduced during dust storms
        hasHeatShimmer: false,
        stormIntensity: Math.random() > 0.7 ? 1.5 : 0.5, // Random dust storms
      };

    case "Venus":
      return {
        fogColor: new THREE.Color("#FFA500"),
        fogDensity: 0.008, // Very thick atmosphere
        particleTypes: ["acid", "fog", "ash"],
        particleCount: 25, // Reduced from 600 to 25
        particleColor: new THREE.Color("#FFD700"),
        particleSpeed: 0.5,
        particleSize: 0.2,
        visibility: 20, // Very poor visibility
        hasHeatShimmer: true,
        heatIntensity: 1.5,
      };

    case "Earth":
      return {
        fogColor: new THREE.Color(isMorning ? "#E0F7FA" : "#87CEEB"),
        fogDensity: isDawn ? 0.003 : isMorning ? 0.001 : 0.0005,
        particleTypes: isMorning ? ["pollen", "fog"] : ["rain"],
        particleCount: isMorning ? 20 : 15, // Reduced from 400/300 to 20/15
        particleColor: new THREE.Color(isMorning ? "#FFFFCC" : "#4A90E2"),
        particleSpeed: 1.0,
        particleSize: isMorning ? 0.1 : 0.15,
        visibility: isDawn ? 80 : 200,
        hasHeatShimmer: false,
        rainIntensity: Math.random() > 0.8 ? 1.0 : 0,
      };

    case "Jupiter":
    case "Saturn":
    case "Neptune":
      return {
        fogColor: new THREE.Color(
          planetName === "Neptune" ? "#4B70DD" : "#D8CA9D",
        ),
        fogDensity: 0.005,
        particleTypes: ["fog", "fog", "dust"],
        particleCount: 40, // Reduced from 1000 to 40
        particleColor: new THREE.Color(
          planetName === "Neptune" ? "#4B70DD" : "#FAD5A5",
        ),
        particleSpeed: 3.0, // High wind speeds
        particleSize: 0.4,
        visibility: 40,
        hasHeatShimmer: false,
        hasLightning: true,
        lightningFrequency: 0.01,
      };

    case "Mercury":
    case "Moon":
      return {
        fogColor: new THREE.Color("#000000"),
        fogDensity: 0.0001, // Almost no atmosphere
        particleTypes: [],
        particleCount: 0,
        particleColor: new THREE.Color("#CCCCCC"),
        particleSpeed: 0,
        particleSize: 0,
        visibility: 1000, // Perfect visibility
        hasHeatShimmer: planetName === "Mercury",
        heatIntensity: planetName === "Mercury" ? 2.0 : 0,
      };

    default:
      return {
        fogColor: new THREE.Color("#CCCCCC"),
        fogDensity: 0.001,
        particleTypes: ["dust"],
        particleCount: 15, // Reduced from 200 to 15
        particleColor: new THREE.Color("#888888"),
        particleSpeed: 1.0,
        particleSize: 0.2,
        visibility: 100,
        hasHeatShimmer: false,
      };
  }
};

export function AtmosphericEffects({
  planetName,
  position = [0, 0, 0],
  flashlightOn = false,
}: AtmosphericEffectsProps) {
  const { scene, camera } = useThree();
  const { time } = useSolarSystem();
  const { enableParticles, graphicsQuality } = useSettings();
  const { updateWind, getWindVector, triggerStorm, stopStorm } = useWind();
  const { getHeightAt } = useTerrain();
  const { playWind, stopWind, playRain, stopRain } = useAudio();

  const particlePoolRef = useRef<AtmosphericParticlePool>();
  const particlesRef = useRef<THREE.Points>(null);
  const heatShimmerRef = useRef<any>(null);
  const lightningRef = useRef<THREE.PointLight>(null);
  const lastSpawnTime = useRef(0);
  const [isStormActive, setIsStormActive] = useState(false);

  const resourceManager = ResourceManager.getInstance();
  const particleGeometryIdRef = useRef<string>(
    `particle-geometry-${planetName}-${Date.now()}`,
  );
  const particleMaterialIdRef = useRef<string>(
    `particle-material-${planetName}-${Date.now()}`,
  );
  const heatShimmerMaterialIdRef = useRef<string>(
    `heat-shimmer-material-${planetName}-${Date.now()}`,
  );
  const fogPlaneMaterialIdsRef = useRef<string[]>([]);

  // Calculate time of day (0-24 hours)
  const timeOfDay = useMemo(() => {
    return (time * 10) % 24; // Convert game time to hours
  }, [time]);

  // Get atmospheric parameters
  const atmosphere = useMemo(() => {
    return getPlanetAtmosphere(planetName, timeOfDay);
  }, [planetName, timeOfDay]);

  // Initialize particle pool and cleanup resources
  useEffect(() => {
    const maxParticles =
      graphicsQuality === "high" ? 50 : graphicsQuality === "medium" ? 30 : 20; // Drastically reduced
    particlePoolRef.current = new AtmosphericParticlePool(maxParticles);
    console.log(
      `[AtmosphericEffects] Initialized particle pool for ${planetName} with ${maxParticles} particles`,
    );

    return () => {
      console.log(
        `[AtmosphericEffects] Clearing particle pool for ${planetName}`,
      );
      particlePoolRef.current?.clear();
    };
  }, [graphicsQuality, planetName]);

  // Cleanup resources when planet changes or component unmounts
  useEffect(() => {
    console.log(
      `[AtmosphericEffects] Initializing atmospheric effects for planet: ${planetName}`,
    );

    return () => {
      console.log(
        `[AtmosphericEffects] Cleaning up atmospheric resources for planet: ${planetName}`,
      );
      // Dispose all resources tagged with atmospheric-effects
      resourceManager.disposeByTag("atmospheric-effects");
      resourceManager.disposeByTag(`planet-${planetName}-atmosphere`);

      // Dispose specific resource IDs
      resourceManager.disposeResource(particleGeometryIdRef.current);
      resourceManager.disposeResource(particleMaterialIdRef.current);
      resourceManager.disposeResource(heatShimmerMaterialIdRef.current);

      // Dispose fog plane materials
      fogPlaneMaterialIdsRef.current.forEach((id) => {
        resourceManager.disposeResource(id);
      });
      fogPlaneMaterialIdsRef.current = [];
    };
  }, [planetName]);

  // Set up fog for the scene
  useEffect(() => {
    if (atmosphere.fogDensity > 0) {
      scene.fog = new THREE.FogExp2(atmosphere.fogColor, atmosphere.fogDensity);

      // Reduce fog when flashlight is on
      if (flashlightOn) {
        scene.fog = new THREE.FogExp2(
          atmosphere.fogColor,
          atmosphere.fogDensity * 0.5,
        );
      }
    } else {
      scene.fog = null;
    }

    return () => {
      scene.fog = null;
    };
  }, [scene, atmosphere, flashlightOn]);

  // Handle storm events and atmospheric sounds
  useEffect(() => {
    const shouldHaveStorm =
      atmosphere.stormIntensity && atmosphere.stormIntensity > 1.0;

    if (shouldHaveStorm && !isStormActive) {
      triggerStorm();
      setIsStormActive(true);
      console.log(`[ATMOSPHERE] Storm started on ${planetName}`);
    } else if (!shouldHaveStorm && isStormActive) {
      stopStorm();
      setIsStormActive(false);
      console.log(`[ATMOSPHERE] Storm ended on ${planetName}`);
    }
  }, [
    atmosphere.stormIntensity,
    isStormActive,
    planetName,
    triggerStorm,
    stopStorm,
  ]);

  // Handle atmospheric sounds based on planet conditions
  useEffect(() => {
    // Determine wind intensity based on planet and conditions
    let windIntensity = 0;
    let rainIntensity = 0;

    switch (planetName) {
      case "Mars":
        // Mars has dust storms with moderate to strong winds
        windIntensity = isStormActive ? 0.8 : 0.3;
        break;
      case "Venus":
        // Venus has slow, dense atmosphere
        windIntensity = 0.2;
        break;
      case "Earth":
        // Earth has variable conditions
        windIntensity = isStormActive ? 0.6 : 0.15;
        rainIntensity = atmosphere.rainIntensity || 0;
        break;
      case "Jupiter":
      case "Saturn":
      case "Neptune":
        // Gas giants have very strong winds
        windIntensity = 0.9;
        break;
      case "Moon":
      case "Mercury":
        // No atmosphere, no wind
        windIntensity = 0;
        break;
      default:
        windIntensity = 0.2;
    }

    // Play or update wind sound
    if (windIntensity > 0) {
      playWind(windIntensity);
    } else {
      stopWind();
    }

    // Play or update rain sound (Earth only for now)
    if (rainIntensity > 0) {
      playRain();
    } else {
      stopRain();
    }

    // Cleanup sounds when component unmounts or planet changes
    return () => {
      stopWind();
      stopRain();
    };
  }, [
    planetName,
    isStormActive,
    atmosphere.rainIntensity,
    playWind,
    stopWind,
    playRain,
    stopRain,
  ]);

  // Generate particle geometry
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(atmosphere.particleCount * 3);
    const colors = new Float32Array(atmosphere.particleCount * 3);
    const sizes = new Float32Array(atmosphere.particleCount);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Register geometry with ResourceManager
    resourceManager.registerGeometry(particleGeometryIdRef.current, geometry, [
      "atmospheric-effects",
      `planet-${planetName}-atmosphere`,
    ]);
    console.log(
      `[AtmosphericEffects] Registered particle geometry: ${particleGeometryIdRef.current}`,
    );

    return geometry;
  }, [atmosphere.particleCount, planetName]);

  // Update particles
  useFrame((state, delta) => {
    if (!enableParticles || !particlePoolRef.current || !particlesRef.current)
      return;

    // Update wind
    updateWind(delta, planetName);
    const windVector = getWindVector();

    // Update heat shimmer
    if (heatShimmerRef.current && atmosphere.hasHeatShimmer) {
      heatShimmerRef.current.uTime = state.clock.elapsedTime;
      heatShimmerRef.current.uIntensity = atmosphere.heatIntensity || 1.0;
    }

    // Lightning effect
    if (lightningRef.current && atmosphere.hasLightning) {
      if (Math.random() < (atmosphere.lightningFrequency || 0.01)) {
        lightningRef.current.intensity = 100;
        lightningRef.current.position.set(
          camera.position.x + (Math.random() - 0.5) * 100,
          30 + Math.random() * 20,
          camera.position.z + (Math.random() - 0.5) * 100,
        );
      } else if (lightningRef.current.intensity > 0) {
        lightningRef.current.intensity *= 0.9; // Fade out
      }
    }

    const currentTime = state.clock.elapsedTime;
    const spawnInterval = 0.05; // Spawn particles every 50ms

    // Spawn new particles
    if (
      currentTime - lastSpawnTime.current > spawnInterval &&
      atmosphere.particleTypes.length > 0
    ) {
      lastSpawnTime.current = currentTime;

      const particleType = atmosphere.particleTypes[
        Math.floor(Math.random() * atmosphere.particleTypes.length)
      ] as ParticleData["type"];
      const spawnCount = Math.floor(atmosphere.particleCount / 100); // Spawn a fraction each frame

      for (let i = 0; i < spawnCount; i++) {
        let spawnPos: THREE.Vector3;
        let velocity: THREE.Vector3;
        let lifetime: number;
        let size: number;

        switch (particleType) {
          case "dust":
          case "pollen":
          case "ash":
            // Spawn around the player
            spawnPos = new THREE.Vector3(
              camera.position.x + (Math.random() - 0.5) * 100,
              Math.random() * 20,
              camera.position.z + (Math.random() - 0.5) * 100,
            );
            velocity = new THREE.Vector3(
              (Math.random() - 0.5) * atmosphere.particleSpeed,
              (Math.random() - 0.5) * 0.5,
              (Math.random() - 0.5) * atmosphere.particleSpeed,
            );
            lifetime = 10 + Math.random() * 10;
            size = atmosphere.particleSize * (0.5 + Math.random());
            break;

          case "rain":
          case "acid":
            // Spawn above the player
            spawnPos = new THREE.Vector3(
              camera.position.x + (Math.random() - 0.5) * 50,
              30 + Math.random() * 10,
              camera.position.z + (Math.random() - 0.5) * 50,
            );
            velocity = new THREE.Vector3(
              windVector.x * 0.5,
              -5 - Math.random() * 5,
              windVector.z * 0.5,
            );
            lifetime = 5;
            size = atmosphere.particleSize;
            break;

          case "fog":
            // Spawn at ground level around player
            spawnPos = new THREE.Vector3(
              camera.position.x + (Math.random() - 0.5) * 80,
              getHeightAt(camera.position.x, camera.position.z) +
                Math.random() * 5,
              camera.position.z + (Math.random() - 0.5) * 80,
            );
            velocity = new THREE.Vector3(
              (Math.random() - 0.5) * 0.2,
              0,
              (Math.random() - 0.5) * 0.2,
            );
            lifetime = 20;
            size = atmosphere.particleSize * 3; // Larger for fog
            break;

          default:
            continue;
        }

        particlePoolRef.current.spawn(
          particleType,
          spawnPos,
          velocity,
          lifetime,
          size,
          atmosphere.particleColor.clone(),
        );
      }
    }

    // Update particle pool
    const bounds = {
      min: new THREE.Vector3(
        camera.position.x - 100,
        -10,
        camera.position.z - 100,
      ),
      max: new THREE.Vector3(
        camera.position.x + 100,
        40,
        camera.position.z + 100,
      ),
    };

    particlePoolRef.current.update(delta, windVector, bounds);

    // Update particle geometry
    const particles = particlePoolRef.current.getActiveParticles();
    const positions = particlesRef.current.geometry.attributes.position
      .array as Float32Array;
    const colors = particlesRef.current.geometry.attributes.color
      .array as Float32Array;
    const sizes = particlesRef.current.geometry.attributes.size
      .array as Float32Array;

    for (let i = 0; i < particles.length && i < atmosphere.particleCount; i++) {
      const particle = particles[i];
      const i3 = i * 3;

      positions[i3] = particle.position.x;
      positions[i3 + 1] = particle.position.y;
      positions[i3 + 2] = particle.position.z;

      const color = particle.color;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = particle.size * particle.opacity;
    }

    // Clear unused particles
    for (let i = particles.length; i < atmosphere.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = -1000; // Hide below ground
      positions[i3 + 2] = 0;
      sizes[i] = 0;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.color.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
  });

  if (!enableParticles) return null;

  return (
    <group position={position}>
      {/* Atmospheric particles */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          ref={(material) => {
            if (
              material &&
              !resourceManager.hasResource(particleMaterialIdRef.current)
            ) {
              resourceManager.registerMaterial(
                particleMaterialIdRef.current,
                material,
                ["atmospheric-effects", `planet-${planetName}-atmosphere`],
              );
            }
          }}
          size={1}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Heat shimmer effect for hot planets */}
      {atmosphere.hasHeatShimmer && (
        <mesh position={[0, 5, 0]} scale={[100, 20, 100]}>
          <planeGeometry args={[1, 1, 32, 32]} />
          <heatShimmerMaterial
            ref={(material: any) => {
              heatShimmerRef.current = material;
              if (
                material &&
                !resourceManager.hasResource(heatShimmerMaterialIdRef.current)
              ) {
                resourceManager.registerMaterial(
                  heatShimmerMaterialIdRef.current,
                  material,
                  [
                    "atmospheric-effects",
                    `planet-${planetName}-atmosphere`,
                    "heat-shimmer",
                  ],
                );
              }
            }}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Lightning effect for gas giants */}
      {atmosphere.hasLightning && (
        <pointLight
          ref={lightningRef}
          color="#FFFFFF"
          intensity={0}
          distance={200}
          decay={2}
        />
      )}

      {/* Volumetric fog planes for thick atmospheres */}
      {atmosphere.fogDensity > 0.003 && (
        <>
          {[0, 10, 20, 30].map((height, index) => {
            const fogMaterialId = `fog-plane-material-${height}-${planetName}`;
            if (!fogPlaneMaterialIdsRef.current.includes(fogMaterialId)) {
              fogPlaneMaterialIdsRef.current.push(fogMaterialId);
            }

            return (
              <mesh
                key={index}
                position={[0, height, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[200, 200]} />
                <meshBasicMaterial
                  ref={(material) => {
                    if (
                      material &&
                      !resourceManager.hasResource(fogMaterialId)
                    ) {
                      resourceManager.registerMaterial(
                        fogMaterialId,
                        material,
                        [
                          "atmospheric-effects",
                          `planet-${planetName}-atmosphere`,
                          "fog-plane",
                        ],
                      );
                    }
                  }}
                  color={atmosphere.fogColor}
                  transparent
                  opacity={0.1 * (1 - height / 40)}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
}
