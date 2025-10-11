import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";

type SunProps = {
  radius?: number;
  disableCoronaSprites?: boolean;
};

export function Sun({ radius = 5, disableCoronaSprites = false }: SunProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const bigFlareRef = useRef<THREE.Mesh>(null);

  // Base photosphere texture
  const sunTex = useTexture("/textures/planets/2k_sun.jpg");

  // Flare sprite texture from your public folder
  const flareTex = useTexture("/textures/planets/sun_flare.png");

  // Create a tiny procedural noise as a fallback warp source (cheap)
  const noiseTex = useMemo(() => {
    const size = 512;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const noise = Math.random() * 255;
      data[i * 4] = noise;
      data[i * 4 + 1] = noise;
      data[i * 4 + 2] = noise;
      data[i * 4 + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => () => noiseTex.dispose(), [noiseTex]);

  // Texture setup for performance/quality
  useMemo(() => {
    // photosphere
    sunTex.wrapS = sunTex.wrapT = THREE.RepeatWrapping;
    sunTex.minFilter = THREE.LinearMipMapLinearFilter;
    sunTex.magFilter = THREE.LinearFilter;
    sunTex.anisotropy = 2;

    // noise
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.minFilter = THREE.LinearFilter;
    noiseTex.magFilter = THREE.LinearFilter;

    // flare sprite (keep edge clean)
    flareTex.generateMipmaps = true;
    flareTex.minFilter = THREE.LinearMipMapLinearFilter;
    flareTex.magFilter = THREE.LinearFilter;
    flareTex.wrapS = flareTex.wrapT = THREE.ClampToEdgeWrapping;
    // If you’re using linear workflow/tone mapping, leave colorSpace as SRGB for UI-ish sprites
    // @ts-ignore
    flareTex.colorSpace = THREE.SRGBColorSpace ?? THREE.sRGBEncoding;
  }, [sunTex, noiseTex, flareTex]);

  // === Photosphere shader (UV warp via two scrolling noise samples) ===
  const material = useMemo(() => {
    const uniforms = {
      uTex: { value: sunTex },
      uNoise: { value: noiseTex },
      uTime: { value: 0 },
      uEmissiveBoost: { value: 1.6 },
      uWarpStrength: { value: 0.06 },
      uScroll1: { value: new THREE.Vector2(0.02, 0.011) },
      uScroll2: { value: new THREE.Vector2(-0.015, 0.018) },
      uTint: { value: new THREE.Color("#FFD05A") },
    };

    const vert = /* glsl */ `
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const frag = /* glsl */ `
      uniform sampler2D uTex;
      uniform sampler2D uNoise;
      uniform float uTime;
      uniform float uEmissiveBoost;
      uniform float uWarpStrength;
      uniform vec2 uScroll1;
      uniform vec2 uScroll2;
      uniform vec3 uTint;
      varying vec3 vNormal;
      varying vec2 vUv;

      float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }

      void main() {
        vec2 nUV1 = vUv + uScroll1 * uTime;
        vec2 nUV2 = vUv + uScroll2 * uTime * 0.7;
        float n1 = texture2D(uNoise, nUV1 * 3.0).r;
        float n2 = texture2D(uNoise, nUV2 * 2.0).r;
        float n = (n1 + n2) * 0.5;
        n = (n - 0.5) * 2.0;

        vec2 warpedUv = vUv + uWarpStrength * vec2(n, -n * 0.6);
        vec3 base = texture2D(uTex, warpedUv).rgb;

        float hot = smoothstep(0.35, 0.9, luma(base));
        vec3 color = mix(base, base * uTint, 0.25);
        color *= mix(1.0, uEmissiveBoost, 0.35 + 0.65 * hot);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      blending: THREE.NormalBlending,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
    });
    return mat;
  }, [sunTex, noiseTex]);

  // Fresnel glow shells (cheap)
  const fresnelMat = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#FFCC66") },
      uPower: { value: 2.0 },
      uOpacity: { value: 0.28 },
      uPulse: { value: 0.05 },
    };

    const vert = /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main(){
        vec4 worldPos = modelMatrix * vec4(position,1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const frag = /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uOpacity;
      uniform float uPulse;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main(){
        vec3 V = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - max(dot(normalize(vWorldNormal), V), 0.0), uPower);
        float pulse = 1.0 + sin(uTime * 1.8) * uPulse;
        vec3 col = uColor * fres * pulse;
        gl_FragColor = vec4(col, uOpacity * fres);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });
  }, []);

  // Flare materials using your PNG (billboarded sprites)
  const flareMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: flareTex,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false, // keep the glow even when peeking at edges
      toneMapped: false, // don’t dim via tone mapping
    } as any);
  }, [flareTex]);

  const smallFlareMat = useMemo(() => {
    return flareMat.clone();
  }, [flareMat]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    (material.uniforms.uTime as any).value = t;
    (fresnelMat.uniforms.uTime as any).value = t;

    if (coreRef.current) coreRef.current.rotation.y += 0.002;

    if (innerGlowRef.current) {
      const s = 1.0 + Math.sin(t * 2.0) * 0.03;
      innerGlowRef.current.scale.setScalar(s);
    }
    if (outerGlowRef.current) {
      const s = 1.0 + Math.sin(t * 1.3) * 0.05;
      outerGlowRef.current.scale.setScalar(s);
    }

    // gentle spin/pulse on the big flare
    if (bigFlareRef.current) {
      bigFlareRef.current.rotation.z += 0.002;
      const m = bigFlareRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.28 + Math.sin(t * 0.7) * 0.08;
    }
  });

  return (
    <group>
      {/* Sunlight for planets - very strong intensity for visible day/night contrast */}
      <pointLight
        position={[0, 0, 0]}
        intensity={100}
        distance={5000}
        decay={1}
        color={"#FFD77A"}
      />

      {/* Core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        {/* @ts-ignore */}
        <primitive object={material} attach="material" />
      </mesh>

      {/* Inner/Outer Fresnel shells */}
      <mesh ref={innerGlowRef} scale={1.06}>
        <sphereGeometry args={[radius * 1.06, 48, 48]} />
        {/* @ts-ignore */}
        <primitive object={fresnelMat} attach="material" />
      </mesh>

      <mesh ref={outerGlowRef} scale={1.18}>
        <sphereGeometry args={[radius * 1.18, 48, 48]} />
        {/* @ts-ignore */}
        <primitive object={fresnelMat} attach="material" />
      </mesh>

      {/* --- Flare sprites using your PNG --- */}
      {/* Big, soft halo — sits just beyond the shells */}
      <Billboard position={[0, 0, 0]}>
        <mesh ref={bigFlareRef} renderOrder={999}>
          {/* Wider than the sun so it bleeds nicely */}
          <planeGeometry args={[radius * 3.2, radius * 3.2]} />
          {/* @ts-ignore */}
          <primitive object={flareMat} attach="material" />
        </mesh>
      </Billboard>

      {/* Optional: three smaller angled streaks */}
      {!disableCoronaSprites && (
        <group renderOrder={1000}>
          {[
            {
              pos: new THREE.Vector3(0.0, radius * 0.4, 0.0),
              size: [radius * 1.4, radius * 0.9],
              rot: 0.35,
            },
            {
              pos: new THREE.Vector3(
                radius * -0.5,
                -radius * 0.3,
                radius * 0.4,
              ),
              size: [radius * 1.2, radius * 0.8],
              rot: -0.6,
            },
            {
              pos: new THREE.Vector3(radius * 0.3, radius * 0.7, -radius * 0.5),
              size: [radius * 1.0, radius * 0.7],
              rot: 0.9,
            },
          ].map((cfg, i) => (
            <Billboard key={i} position={cfg.pos}>
              <mesh rotation={[0, 0, cfg.rot]}>
                <planeGeometry args={cfg.size as [number, number]} />
                {/* @ts-ignore */}
                <primitive object={smallFlareMat} attach="material" />
              </mesh>
            </Billboard>
          ))}
        </group>
      )}
    </group>
  );
}
