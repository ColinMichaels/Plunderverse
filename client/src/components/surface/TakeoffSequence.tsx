import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";

/** Replace with your actual planet store hook. Needs { textureUrl: string, radius?: number, name?: string } */
type PlanetInfo = { textureUrl: string; radius?: number; name?: string };
type UsePlanetStore = () => { currentPlanet: PlanetInfo | null };
// Example shape; wire your real store:
declare const usePlanetStore: UsePlanetStore;

type TakeoffTransitionProps = {
  /** Call to start; or mount with `autoStart` */
  startOnMount?: boolean;
  /** Called when camera finishes and we can switch to space scene */
  onComplete?: () => void;
  /** Duration seconds for the whole move (default 5.2s) */
  duration?: number;
  /** Optional audio trigger */
  onThrustStart?: () => void;
};

export function TakeoffTransitionOverlay(props: TakeoffTransitionProps) {
  const [running, setRunning] = useState(!!props.startOnMount);
  if (!running) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none", // block interactions during transition if desired set to 'auto'
        zIndex: 1000,
        background: "black",
      }}
    >
      <Canvas
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
        dpr={[1, 2]}
        camera={{ position: [0, 1.5, 8], fov: 50, near: 0.1, far: 5000 }}
      >
        <TakeoffScene
          duration={props.duration ?? 5.2}
          onComplete={() => {
            setRunning(false);
            props.onComplete?.();
          }}
          onThrustStart={props.onThrustStart}
        />
      </Canvas>
    </div>
  );
}

function TakeoffScene({
  duration,
  onComplete,
  onThrustStart,
}: {
  duration: number;
  onComplete?: () => void;
  onThrustStart?: () => void;
}) {
  const { currentPlanet } = usePlanetStore();
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

  // Cheap atmosphere (shader fresnel on backside)
  const atmosphereMat = useMemo(() => {
    const uniforms = {
      uColor: { value: new THREE.Color("#8ecbff") },
      uOpacity: { value: 0.38 },
      uPower: { value: 2.5 },
      uCut: { value: 0.0 },
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
      uniform float uOpacity;
      uniform float uPower;
      uniform float uCut;
      varying vec3 vWN;
      varying vec3 vWP;
      void main() {
        vec3 V = normalize(cameraPosition - vWP);
        float f = pow(1.0 - max(dot(normalize(vWN), V), 0.0), uPower);
        float a = clamp(f - uCut, 0.0, 1.0);
        gl_FragColor = vec4(uColor * a, a * uOpacity);
      }
    `;
    return new THREE.ShaderMaterial({
      uniforms, vertexShader: vs, fragmentShader: fs,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
    });
  }, []);

  // Speed lines (very cheap: a few billboarded quads that streak scale/opacity)
  const speedMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ffffff"),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  // Stars fade in later
  const starRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);
  const cam = useThree((s) => s.camera);
  const clockRef = useRef<number>(0);
  const startedThrust = useRef(false);

  // Easing helpers
  const easeInOut = (t: number) => 0.5 * (1 - Math.cos(Math.PI * t)); // cosine ease
  const easeExpo = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))); // sharp kick
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // Precompute path parameters
  const startCam = new THREE.Vector3(0, planetRadius * 0.18, planetRadius * 2.1); // low over surface
  const endCam = new THREE.Vector3(0, planetRadius * 3.2, planetRadius * 6.5); // far out
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
  }, []); // eslint-disable-line

  useFrame((state, dt) => {
    clockRef.current += dt;
    const t = clamp01(clockRef.current / duration);

    // Phase curve: slight hover (0..0.12), thrust (0.12..0.7), coast (0.7..1)
    const thrustGate = t > 0.12;
    if (thrustGate && !startedThrust.current) {
      startedThrust.current = true;
      onThrustStart?.();
    }

    // Position along an eased path with a small arc (bank to the right)
    const u = easeInOut(t);
    const arc = Math.sin(u * Math.PI) * planetRadius * 0.15;
    const camPos = new THREE.Vector3().lerpVectors(startCam, endCam, u);
    camPos.x += arc;
    cam.position.copy(camPos);

    // Look at planet center during early phase; then ahead slightly
    const ahead = new THREE.Vector3(0.25 * u, 0.1 * u, -0.2 * u);
    cam.lookAt(lookTarget.clone().add(ahead));

    // Planet scale → shrinks; slight rotation for movement cue
    const planet = planetRef.current!;
    const atmo = atmoRef.current!;
    if (planet) {
      planet.rotation.y += 0.15 * dt;
      const scl = lerp(1.0, 0.35, u);
      planet.scale.setScalar(scl);
      planet.position.set(0, -planetRadius * (0.9 + 1.0 * u), 0);
    }
    if (atmo) {
      const shell = 1.03 + 0.2 * (1 - u);
      atmo.scale.setScalar(shell);
      // fade atmosphere cut as we exit
      (atmosphereMat.uniforms.uCut as any).value = lerp(0.0, 0.6, u);
      (atmosphereMat.uniforms.uOpacity as any).value = lerp(0.42, 0.08, u);
    }

    // Screen shake (tiny; stronger during 0.15..0.55)
    const thrustT = clamp01((t - 0.15) / 0.4);
    const shake = 0.03 * (1 - Math.cos(thrustT * Math.PI)) * (1 - u);
    cam.position.x += (Math.random() - 0.5) * shake;
    cam.position.y += (Math.random() - 0.5) * shake * 0.7;

    // Speed lines opacity & length driven by thrustT
    const speedOpacity = thrustT > 0 ? 0.3 * (0.5 + 0.5 * Math.sin(6.0 * Math.PI * thrustT)) : 0.0;
    (speedMat.opacity as number) = speedOpacity;

    // Stars fade in late
    if (starRef.current) {
      starRef.current.visible = true;
      starRef.current.children.forEach((c) => {
        const m = (c as any).material as THREE.Material & { opacity?: number; transparent?: boolean; depthWrite?: boolean };
        if (m && "opacity" in m) {
          m.transparent = true;
          (m as any).depthWrite = false;
          (m as any).opacity = clamp01((t - 0.65) / 0.3);
        }
      });
    }

    // Complete
    if (t >= 1) onComplete?.();
  });

  // Speed lines geometry instances
  const speedLines = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const r = planetRadius * (1.3 + Math.random() * 0.7);
      const len = 0.8 + Math.random() * 1.4;
      const w = 0.015 + Math.random() * 0.02;
      arr.push({ x: Math.cos(angle) * r, y: (Math.random() - 0.5) * r * 0.4, z: Math.sin(angle) * r, len, w, rot: Math.random() * Math.PI });
    }
    return arr;
  }, [planetRadius]);

  return (
    <>
      {/* black-to-brown space background via fog color fade is overkill—just use Stars and keep it dark */}
      <ambientLight intensity={0.3} />

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

        {/* Atmosphere shell */}
        <mesh ref={atmoRef} scale={1.06}>
          <sphereGeometry args={[planetRadius * 1.06, 48, 48]} />
          {/* @ts-ignore */}
          <primitive object={atmosphereMat} attach="material" />
        </mesh>
      </group>

      {/* Speed lines (billboards) */}
      <group>
        {speedLines.map((sp, i) => (
          <Billboard key={i} position={[sp.x, sp.y, sp.z]} follow={true}>
            <mesh rotation-z={sp.rot}>
              <planeGeometry args={[sp.w, sp.len]} />
              {/* @ts-ignore */}
              <primitive object={speedMat} attach="material" />
            </mesh>
          </Billboard>
        ))}
      </group>

      {/* Stars fade-in */}
      <group ref={starRef} visible={false}>
        <Stars
          radius={400}
          depth={100}
          count={4000}
          factor={2}
          saturation={0}
          fade
          speed={0}
        />
      </group>
    </>
  );
}