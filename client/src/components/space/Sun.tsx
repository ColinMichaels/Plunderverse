import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Billboard, useTexture } from "@react-three/drei";
import * as THREE from "three";

type SunProps = {
  /** radius of the photosphere in world units */
  radius?: number;
  /** disables the small corona billboards if you want even less overdraw */
  disableCoronaSprites?: boolean;
};

export function Sun({ radius = 5, disableCoronaSprites = false }: SunProps) {
  const coreRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);

  // Textures: base sun texture (noise texture removed - not available)
  const sunTex = useTexture("/textures/planets/2k_sun.jpg");
  
  // Create a simple noise texture in memory as fallback
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
  
  // Cleanup: dispose noise texture on unmount to prevent GPU memory leak
  useEffect(() => {
    return () => {
      noiseTex.dispose();
    };
  }, [noiseTex]);

  // Texture setup for performance
  useMemo(() => {
    sunTex.wrapS = sunTex.wrapT = THREE.RepeatWrapping;
    sunTex.minFilter = THREE.LinearMipMapLinearFilter;
    sunTex.magFilter = THREE.LinearFilter;
    sunTex.anisotropy = 2;
    
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.minFilter = THREE.LinearFilter;
    noiseTex.magFilter = THREE.LinearFilter;
  }, [sunTex, noiseTex]);

  // === Shader material (cheap: 2 scrolling noise layers to subtly warp UVs) ===
  const material = useMemo(() => {
    const uniforms = {
      uTex: { value: sunTex },
      uNoise: { value: noiseTex },
      uTime: { value: 0 },
      uEmissiveBoost: { value: 1.6 }, // overall glow
      uWarpStrength: { value: 0.06 }, // how much the noise warps UVs
      uScroll1: { value: new THREE.Vector2(0.02, 0.011) },
      uScroll2: { value: new THREE.Vector2(-0.015, 0.018) },
      uTint: { value: new THREE.Color("#FFD05A") }, // subtle warm tint
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

      // cheap luminance
      float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }

      void main() {
        // Two scrolling noise samples (tileable), combine and center around 0
        vec2 nUV1 = vUv + uScroll1 * uTime;
        vec2 nUV2 = vUv + uScroll2 * uTime * 0.7;
        float n1 = texture2D(uNoise, nUV1 * 3.0).r;
        float n2 = texture2D(uNoise, nUV2 * 2.0).r;
        float n = (n1 + n2) * 0.5;
        n = (n - 0.5) * 2.0; // [-1,1]

        // Warp the base UVs slightly with noise (avoid obvious smearing)
        vec2 warpedUv = vUv + uWarpStrength * vec2(n, -n * 0.6);

        vec3 base = texture2D(uTex, warpedUv).rgb;

        // Warm tint and emissive push that reacts a bit to the base luminance
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
    });
    mat.side = THREE.FrontSide;
    return mat;
  }, [sunTex, noiseTex]);

  // Fresnel glow shells (very cheap)
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

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });
    return mat;
  }, []);

  // Optional small corona sprites (additive, camera-facing)
  const coronaSpriteMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#FFDF80"),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return mat;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    (material.uniforms.uTime as any).value = t;
    (fresnelMat.uniforms.uTime as any).value = t;

    if (coreRef.current) coreRef.current.rotation.y += 0.002; // slow rotation
    if (innerGlowRef.current) {
      const s = 1.0 + Math.sin(t * 2.0) * 0.03;
      innerGlowRef.current.scale.setScalar(s);
    }
    if (outerGlowRef.current) {
      const s = 1.0 + Math.sin(t * 1.3) * 0.05;
      outerGlowRef.current.scale.setScalar(s);
    }
  });

  // Lighting notes:
  // - The sun is emissive; it doesn't need to receive or cast shadows itself.
  // - Keep a single shadow-casting directional light elsewhere for planets if required.

  return (
    <group>
      {/* Lightweight "sunlight" for planets (no shadows from the sun mesh itself) */}
      <pointLight
        position={[0, 0, 0]}
        intensity={3.2}
        distance={3000}
        decay={1}
        color={"#FFD77A"}
      />

      {/* Core (emissive shader) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[radius, 64, 64]} />
        {/* @ts-ignore */}
        <primitive object={material} attach="material" />
      </mesh>

      {/* Inner Fresnel glow (thin shell) */}
      <mesh ref={innerGlowRef} scale={1.06}>
        <sphereGeometry args={[radius * 1.06, 48, 48]} />
        {/* @ts-ignore */}
        <primitive object={fresnelMat} attach="material" />
      </mesh>

      {/* Outer Fresnel glow (wider) */}
      <mesh ref={outerGlowRef} scale={1.18}>
        <sphereGeometry args={[radius * 1.18, 48, 48]} />
        {/* @ts-ignore */}
        <primitive object={fresnelMat} attach="material" />
      </mesh>

      {/* Optional: a few tiny corona billboards (super cheap, additive) */}
      {!disableCoronaSprites && (
        <group>
          {[
            [1.3, 0.2, 0.0],
            [-0.7, -0.4, 0.9],
            [0.1, 0.9, -0.8],
          ].map((p, i) => (
            <Billboard
              key={i}
              position={new THREE.Vector3()
                .fromArray(p)
                .multiplyScalar(radius * 1.25)}
            >
              <mesh>
                <planeGeometry args={[radius * 0.6, radius * 0.35]} />
                {/* @ts-ignore */}
                <primitive object={coronaSpriteMat} attach="material" />
              </mesh>
            </Billboard>
          ))}
        </group>
      )}
    </group>
  );
}
