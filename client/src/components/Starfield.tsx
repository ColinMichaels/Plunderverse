import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Starfield() {
  const meshRef = useRef<THREE.Points>(null);

  // Generate enhanced star data with varied colors and sizes
  const starData = useMemo(() => {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Create stars in a large sphere around the solar system
      const radius = 600 + Math.random() * 800;
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

  // Subtle twinkling animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.00008;

      // Subtle twinkling effect on material opacity
      const material = meshRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group>
      {/* Main starfield with varied colors */}
      <points ref={meshRef}>
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
          size={1.5}
          transparent
          opacity={0.8}
          sizeAttenuation={false}
          vertexColors
        />
      </points>

      {/* Additional background stars - smaller and dimmer */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2000}
            array={useMemo(() => {
              const positions = new Float32Array(2000 * 3);
              for (let i = 0; i < 2000; i++) {
                const radius = 1200 + Math.random() * 600;
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
          size={0.8}
          color="#ffffff"
          transparent
          opacity={0.4}
          sizeAttenuation={false}
        />
      </points>
    </group>
  );
}
