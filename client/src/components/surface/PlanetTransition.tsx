import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import { useLandedState } from "../../lib/stores/surface/useLandedState";
import { planets } from "../../lib/planetData";

type PlanetTransitionProps = {
  /** Direction of transition - 'landing' or 'takeoff' */
  direction: 'landing' | 'takeoff';
  /** Call to start; or mount with `autoStart` */
  startOnMount?: boolean;
  /** Called when camera finishes and we can switch scenes */
  onComplete?: () => void;
  /** Duration seconds for the whole move (default 5.2s) */
  duration?: number;
  /** Optional audio trigger for thrust/engine sounds */
  onThrustStart?: () => void;
  /** For landing: the target planet name */
  targetPlanet?: string;
};

export function PlanetTransitionOverlay(props: PlanetTransitionProps) {
  const [running, setRunning] = useState(!!props.startOnMount);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  
  if (!running) return null;
  
  // For landing, start camera far away; for takeoff, start close
  const initialCameraPos = props.direction === 'landing' 
    ? [0, 50, 200] // Start far for landing
    : [0, 1.5, 8];  // Start close for takeoff
    
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      {/* Main scene */}
      <div style={{ position: "absolute", inset: 0, background: "black" }}>
        <Canvas
          gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
          dpr={[1, 2]}
          camera={{ position: initialCameraPos as [number, number, number], fov: 50, near: 0.1, far: 5000 }}
        >
          <PlanetTransitionScene
            direction={props.direction}
            duration={props.duration ?? 5.2}
            onComplete={() => {
              setRunning(false);
              props.onComplete?.();
            }}
            onThrustStart={props.onThrustStart}
            targetPlanet={props.targetPlanet}
            onFadeStart={(opacity: number) => setFadeOpacity(opacity)}
          />
        </Canvas>
      </div>
      
      {/* Fade overlay for smooth transition */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "black",
          opacity: fadeOpacity,
          transition: "opacity 0.25s ease-in-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// Starfield component for takeoff background
function Starfield({ opacity = 1 }: { opacity: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate star positions
  const starsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(3000 * 3); // 3000 stars
    const colors = new Float32Array(3000 * 3);
    
    for (let i = 0; i < 3000; i++) {
      const i3 = i * 3;
      
      // Random positions in a sphere around the camera
      const radius = 100 + Math.random() * 900;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Star colors (white to slightly blue/yellow)
      const colorVariance = Math.random();
      colors[i3] = 0.9 + colorVariance * 0.1; // R
      colors[i3 + 1] = 0.9 + colorVariance * 0.05; // G
      colors[i3 + 2] = 0.95 + colorVariance * 0.05; // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, []);
  
  // Star material with opacity control
  const starsMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
  }, [opacity]);
  
  // Rotate stars slowly
  useFrame((state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.01;
      pointsRef.current.rotation.x += delta * 0.005;
    }
  });
  
  return (
    <points ref={pointsRef} geometry={starsGeometry} material={starsMaterial} />
  );
}

// REMOVED: SpeedLines and AtmosphericBurnParticles components
// These particle effects have been removed to simplify the transition animation
// Keeping only the core elements: starfield, engine glow, and planet animation

// Engine glow component
function EngineGlow({ intensity = 0, position = [0, -3, 0] as [number, number, number] }) {
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Animated glow material
  const glowMaterial = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uCoreColor: { value: new THREE.Color("#ffaa00") },
      uGlowColor: { value: new THREE.Color("#0088ff") },
    };
    
    const vertexShader = /* glsl */`
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = /* glsl */`
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uCoreColor;
      uniform vec3 uGlowColor;
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        // Radial gradient from center
        vec2 center = vUv - 0.5;
        float dist = length(center);
        
        // Pulsing effect
        float pulse = sin(uTime * 3.0) * 0.1 + 0.9;
        
        // Core to edge gradient
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        glow = pow(glow, 2.0) * pulse;
        
        // Mix core and glow colors
        vec3 color = mix(uGlowColor, uCoreColor, glow);
        
        // Fade based on intensity
        float alpha = glow * uIntensity;
        
        gl_FragColor = vec4(color * alpha * 2.0, alpha);
      }
    `;
    
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [intensity]);
  
  useFrame((state) => {
    if (glowRef.current && glowMaterial) {
      (glowMaterial.uniforms.uTime as any).value = state.clock.elapsedTime;
      (glowMaterial.uniforms.uIntensity as any).value = intensity;
      
      // Animate scale for pulsing effect
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.1 + 1;
      glowRef.current.scale.setScalar(pulse);
    }
    
    if (lightRef.current) {
      // Animate light intensity
      lightRef.current.intensity = intensity * 3 * (Math.sin(state.clock.elapsedTime * 5) * 0.2 + 0.8);
    }
  });
  
  if (intensity === 0) return null;
  
  return (
    <group position={position}>
      {/* Engine glow mesh */}
      <mesh ref={glowRef}>
        <planeGeometry args={[4, 4]} />
        {/* @ts-ignore */}
        <primitive object={glowMaterial} attach="material" />
      </mesh>
      
      {/* Dynamic point light */}
      <pointLight
        ref={lightRef}
        color={new THREE.Color("#ff8800")}
        intensity={intensity * 3}
        distance={20}
        decay={2}
      />
    </group>
  );
}

function PlanetTransitionScene({
  direction,
  duration,
  onComplete,
  onThrustStart,
  targetPlanet,
  onFadeStart,
}: {
  direction: 'landing' | 'takeoff';
  duration: number;
  onComplete?: () => void;
  onThrustStart?: () => void;
  targetPlanet?: string;
  onFadeStart?: (opacity: number) => void;
}) {
  const { landedPlanet } = useLandedState();
  
  // For takeoff, use currently landed planet; for landing, use target planet
  const planetName = direction === 'takeoff' ? landedPlanet : targetPlanet;
  const planetData = planetName ? planets.find(p => p.name === planetName) : null;
  
  const currentPlanet = planetData ? {
    textureUrl: planetData.texture || `/textures/planets/2k_${planetName?.toLowerCase()}_daymap.jpg`,
    radius: planetData.size || 5,
    name: planetData.name
  } : null;
  
  const textureUrl = currentPlanet?.textureUrl ?? "/textures/planets/2k_earth_daymap.jpg";
  const planetRadius = (currentPlanet?.radius ?? 5) * 1.0;

  // Textures
  const planetTex = useTexture(textureUrl);
  useMemo(() => {
    planetTex.wrapS = planetTex.wrapT = THREE.RepeatWrapping;
    planetTex.minFilter = THREE.LinearMipMapLinearFilter;
    planetTex.magFilter = THREE.LinearFilter;
    // @ts-ignore
    planetTex.colorSpace = THREE.SRGBColorSpace ?? THREE.sRGBEncoding;
  }, [planetTex]);

  // Enhanced atmosphere shader with blue rim light
  const atmosphereMat = useMemo(() => {
    const uniforms = {
      uColor: { value: new THREE.Color("#4da6ff") }, // More blue color
      uRimColor: { value: new THREE.Color("#0066ff") }, // Deep blue rim
      uOpacity: { value: 0.45 },
      uPower: { value: 2.5 },
      uCut: { value: 0.0 },
      uRimIntensity: { value: 1.0 },
    };
    const vs = /* glsl */`
      varying vec3 vWN;
      varying vec3 vWP;
      void main() {
        vec4 wp = modelMatrix * vec4(position,1.0);
        vWP = wp.xyz;
        vWN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;
    const fs = /* glsl */`
      uniform vec3 uColor;
      uniform vec3 uRimColor;
      uniform float uOpacity;
      uniform float uPower;
      uniform float uCut;
      uniform float uRimIntensity;
      varying vec3 vWN;
      varying vec3 vWP;
      void main() {
        vec3 V = normalize(cameraPosition - vWP);
        float f = pow(1.0 - max(dot(normalize(vWN), V), 0.0), uPower);
        float a = clamp(f - uCut, 0.0, 1.0);
        
        // Enhanced rim lighting
        float rim = pow(1.0 - max(dot(normalize(vWN), V), 0.0), 1.5);
        vec3 finalColor = mix(uColor, uRimColor, rim * uRimIntensity);
        
        gl_FragColor = vec4(finalColor * a, a * uOpacity);
      }
    `;
    return new THREE.ShaderMaterial({
      uniforms, vertexShader: vs, fragmentShader: fs,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
    });
  }, []);

  // Planet and atmosphere references
  const planetRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);
  const cam = useThree((s) => s.camera);
  const clockRef = useRef<number>(0);
  const startedThrust = useRef(false);
  
  // Track starfield opacity for takeoff
  const [starfieldOpacity, setStarfieldOpacity] = useState(direction === 'takeoff' ? 0 : 0);
  
  // Engine glow intensity (keeping only this effect)
  const [engineGlowIntensity, setEngineGlowIntensity] = useState(0);
  
  // Safety tracking to prevent multiple onComplete calls
  const completedRef = useRef(false);
  const animationTimeoutRef = useRef<number | null>(null);

  // Easing helpers
  const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t)); // cosine ease
  const easeExpo = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))); // sharp kick
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Precompute path parameters based on direction
  const lowPos = new THREE.Vector3(0, planetRadius * 0.18, planetRadius * 2.1); // low over surface
  const farPos = new THREE.Vector3(0, planetRadius * 3.2, planetRadius * 6.5); // far out
  
  // Swap start/end positions based on direction
  const startCam = direction === 'takeoff' ? lowPos : farPos;
  const endCam = direction === 'takeoff' ? farPos : lowPos;
  const lookTarget = new THREE.Vector3(0, 0, 0);

  // Prepare scene light (sun fake) so the limb looks right
  const light = useMemo(() => new THREE.DirectionalLight("#fff8e0", 1.1), []);
  useEffect(() => {
    light.position.set(5, 10, 8);
    (cam as any).add?.(light); // cheap attach; overlay scene only
    return () => (cam as any).remove?.(light);
  }, [cam, light]);

  useEffect(() => {
    // initial camera pose
    cam.position.copy(startCam);
    cam.lookAt(lookTarget);
    
    // Debug: Component mounted
    console.log('[PlanetTransition] Component mounted', {
      direction,
      duration,
      planetName,
      startCam: startCam.toArray(),
      endCam: endCam.toArray()
    });
    
    // Set a safety timeout to prevent indefinite running (add 2 seconds to expected duration)
    const safetyTimeout = setTimeout(() => {
      console.warn('[PlanetTransition] Safety timeout triggered! Forcing completion');
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }, (duration + 2) * 1000);
    
    animationTimeoutRef.current = safetyTimeout;
    
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []); // eslint-disable-line

  useFrame((state, dt) => {
    // Safety check: prevent running if already completed
    if (completedRef.current) return;
    
    clockRef.current += dt;
    const t = clamp01(clockRef.current / duration);
    
    // Debug: Log progress every 10% (0.0, 0.1, 0.2, etc)
    const progressPercent = Math.floor(t * 10) * 10;
    if (progressPercent > 0 && progressPercent % 10 === 0 && 
        !(`logged_${progressPercent}` in (window as any))) {
      (window as any)[`logged_${progressPercent}`] = true;
      console.log(`[PlanetTransition] Progress: ${progressPercent}%`, {
        t,
        elapsedSeconds: clockRef.current,
        direction,
        altitude: cam.position.length() - planetRadius
      });
    }

    // Phase curve: slight hover (0..0.12), thrust (0.12..0.7), coast (0.7..1)
    const thrustGate = t > 0.12;
    if (thrustGate && !startedThrust.current) {
      startedThrust.current = true;
      console.log('[PlanetTransition] Thrust started at t:', t);
      onThrustStart?.();
    }

    // Position along an eased path with a small arc (bank to the right)
    const u = easeInOut(t);
    const arc = Math.sin(u * Math.PI) * planetRadius * 0.15;
    const camPos = new THREE.Vector3().lerpVectors(startCam, endCam, u);
    camPos.x += arc;
    cam.position.copy(camPos);
    
    // Calculate altitude for effects
    const altitude = cam.position.length() - planetRadius;
    const normalizedAltitude = clamp01(altitude / (planetRadius * 2));

    // Look at planet center during early phase; then ahead slightly
    const aheadFactor = direction === 'takeoff' ? u : (1 - u);
    const ahead = new THREE.Vector3(0.25 * aheadFactor, 0.1 * aheadFactor, -0.2 * aheadFactor);
    cam.lookAt(lookTarget.clone().add(ahead));

    // Engine glow effect (strongest during thrust phase) - SIMPLIFIED
    if (direction === 'takeoff') {
      const thrustPhase = clamp01((t - 0.12) / 0.58); // 0.12 to 0.7
      const glowIntensity = thrustPhase * (1 - t * 0.3); // Fade out toward end
      setEngineGlowIntensity(glowIntensity);
      
      // REMOVED: Speed lines and atmospheric burn particles
      // Keeping only the engine glow for simpler, more reliable animation
    }

    // Planet scale and position based on direction
    const planet = planetRef.current!;
    const atmo = atmoRef.current!;
    if (planet) {
      planet.rotation.y += 0.15 * dt;
      
      if (direction === 'takeoff') {
        // Takeoff: planet shrinks and moves down
        const scl = lerp(1.0, 0.35, u);
        planet.scale.setScalar(scl);
        planet.position.set(0, -planetRadius * (0.9 + 1.0 * u), 0);
      } else {
        // Landing: planet grows and moves up
        const scl = lerp(0.35, 1.0, u);
        planet.scale.setScalar(scl);
        planet.position.set(0, -planetRadius * (1.9 - 1.0 * u), 0);
      }
    }
    
    if (atmo) {
      if (direction === 'takeoff') {
        // Takeoff: atmosphere fades with enhanced rim
        const shell = 1.03 + 0.2 * (1 - u);
        atmo.scale.setScalar(shell);
        (atmosphereMat.uniforms.uCut as any).value = lerp(0.0, 0.6, u);
        (atmosphereMat.uniforms.uOpacity as any).value = lerp(0.45, 0.08, u);
        // Fade rim intensity as we leave
        (atmosphereMat.uniforms.uRimIntensity as any).value = lerp(1.0, 0.2, u);
      } else {
        // Landing: atmosphere appears
        const shell = 1.23 - 0.2 * u;
        atmo.scale.setScalar(shell);
        (atmosphereMat.uniforms.uCut as any).value = lerp(0.6, 0.0, u);
        (atmosphereMat.uniforms.uOpacity as any).value = lerp(0.08, 0.45, u);
        (atmosphereMat.uniforms.uRimIntensity as any).value = lerp(0.2, 1.0, u);
      }
    }

    // Enhanced altitude-dependent camera shake
    const thrustT = clamp01((t - 0.15) / 0.4);
    // Stronger shake at low altitude, diminishes with height
    const altitudeFactor = direction === 'takeoff' ? (1 - normalizedAltitude) : normalizedAltitude;
    const shake = 0.04 * (1 - Math.cos(thrustT * Math.PI)) * altitudeFactor * (1 - u);
    
    // Apply shake with more variance
    cam.position.x += (Math.random() - 0.5) * shake;
    cam.position.y += (Math.random() - 0.5) * shake * 0.5;
    cam.position.z += (Math.random() - 0.5) * shake * 0.3;
    
    // Slight rotation shake for more dramatic effect
    const rotShake = shake * 0.1;
    cam.rotation.z += (Math.random() - 0.5) * rotShake;
    
    // Starfield fade-in during takeoff (progressive from 0.3 to 1.0 of progress)
    if (direction === 'takeoff') {
      const starFadeStart = 0.3; // Start fading in at 30% progress
      const starFadeEnd = 1.0;   // Fully visible at end
      const starT = clamp01((t - starFadeStart) / (starFadeEnd - starFadeStart));
      setStarfieldOpacity(starT);
    }

    // Fade to black for takeoff near the end (last 0.25 seconds of real time)
    const elapsedSeconds = clockRef.current;
    const remainingSeconds = duration - elapsedSeconds;
    
    if (direction === 'takeoff' && remainingSeconds <= 0.25) {
      const fadeProgress = clamp01((0.25 - remainingSeconds) / 0.25);
      onFadeStart?.(fadeProgress);
      
      // Debug: Log fade progress
      if (fadeProgress > 0 && !(`fade_logged` in (window as any))) {
        (window as any).fade_logged = true;
        console.log('[PlanetTransition] Fade to black starting', {
          fadeProgress,
          remainingSeconds,
          t
        });
      }
    } else if (direction === 'landing' && elapsedSeconds <= 0.25) {
      // Fade in from black at start of landing (first 0.25 seconds)
      const fadeProgress = clamp01(1 - (elapsedSeconds / 0.25));
      onFadeStart?.(fadeProgress);
    }

    // Complete with safety check
    if (t >= 1 && !completedRef.current) {
      completedRef.current = true;
      
      // Clear safety timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      
      // Debug: Log completion
      console.log('[PlanetTransition] Animation completed!', {
        t,
        elapsedSeconds: clockRef.current,
        direction,
        finalCamPos: cam.position.toArray()
      });
      
      // Clean up logging flags
      for (let i = 10; i <= 100; i += 10) {
        delete (window as any)[`logged_${i}`];
      }
      delete (window as any).fade_logged;
      
      onComplete?.();
    }
  });

  return (
    <>
      {/* Starfield for takeoff - renders behind everything */}
      {direction === 'takeoff' && (
        <Starfield opacity={starfieldOpacity} />
      )}
      
      {/* Simple ambient lighting */}
      <ambientLight intensity={0.3} />

      {/* Engine glow effect for takeoff */}
      {direction === 'takeoff' && (
        <EngineGlow 
          intensity={engineGlowIntensity} 
          position={[0, -3, 2]}
        />
      )}

      {/* Planet directly under camera path */}
      <group position={[0, 0, 0]}>
        <mesh ref={planetRef}>
          <sphereGeometry args={[planetRadius, 64, 64]} />
          <meshStandardMaterial
            map={planetTex}
            roughness={1}
            metalness={0}
            emissive={"#000000"}
          />
        </mesh>

        {/* Atmosphere shell with enhanced rim lighting */}
        <mesh ref={atmoRef} scale={1.06}>
          <sphereGeometry args={[planetRadius * 1.06, 48, 48]} />
          {/* @ts-ignore */}
          <primitive object={atmosphereMat} attach="material" />
        </mesh>
      </group>
    </>
  );
}