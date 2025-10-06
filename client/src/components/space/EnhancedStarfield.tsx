import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface EnhancedStarfieldProps {
  count?: number;
  depth?: number;
  minRadius?: number;
  enableAnimation?: boolean;
}

export function EnhancedStarfield({ 
  count = 10000, // Much higher star count for splash screen
  depth = 2000,
  minRadius = 400,
  enableAnimation = true 
}: EnhancedStarfieldProps) {
  const meshRef = useRef<THREE.Points>(null);
  const nebulaMeshRef = useRef<THREE.Points>(null);
  const distantMeshRef = useRef<THREE.Points>(null);

  // Generate main star field with varied colors and sizes
  const starData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Create stars in a large sphere with more density near the edges
      const radius = minRadius + Math.pow(Math.random(), 0.5) * depth;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // More varied star colors for realism
      const starType = Math.random();
      if (starType < 0.15) {
        // Blue giants
        colors[i * 3] = 0.7 + Math.random() * 0.3;
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i * 3 + 2] = 1.0;
        sizes[i] = 2.0 + Math.random() * 1.5;
      } else if (starType < 0.3) {
        // Red giants
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.3 + Math.random() * 0.2;
        sizes[i] = 1.5 + Math.random() * 1.0;
      } else if (starType < 0.5) {
        // Yellow stars (like our sun)
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.3;
        sizes[i] = 1.2 + Math.random() * 0.8;
      } else if (starType < 0.8) {
        // White stars
        colors[i * 3] = 0.95 + Math.random() * 0.05;
        colors[i * 3 + 1] = 0.95 + Math.random() * 0.05;
        colors[i * 3 + 2] = 1.0;
        sizes[i] = 1.0 + Math.random() * 0.5;
      } else {
        // Dim distant stars
        const brightness = 0.6 + Math.random() * 0.4;
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness + Math.random() * 0.1;
        sizes[i] = 0.5 + Math.random() * 0.5;
      }
    }

    return { positions, colors, sizes };
  }, [count, minRadius, depth]);

  // Generate nebula cloud effect
  const nebulaData = useMemo(() => {
    const nebulaCount = 2000;
    const positions = new Float32Array(nebulaCount * 3);
    const colors = new Float32Array(nebulaCount * 3);
    const sizes = new Float32Array(nebulaCount);

    for (let i = 0; i < nebulaCount; i++) {
      // Create nebula clouds in specific regions
      const clusterIndex = Math.floor(Math.random() * 3);
      const baseAngle = (clusterIndex * Math.PI * 2) / 3;
      const radius = 800 + Math.random() * 400;
      const spread = 0.5;
      
      const theta = baseAngle + (Math.random() - 0.5) * spread;
      const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.3; // Flatter distribution
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Nebula colors - purples, pinks, and blues
      const colorType = Math.random();
      if (colorType < 0.33) {
        // Purple
        colors[i * 3] = 0.6 + Math.random() * 0.4;
        colors[i * 3 + 1] = 0.3 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      } else if (colorType < 0.66) {
        // Pink
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
      } else {
        // Blue
        colors[i * 3] = 0.4 + Math.random() * 0.3;
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
      }
      
      sizes[i] = 3.0 + Math.random() * 5.0;
    }

    return { positions, colors, sizes };
  }, []);

  // Generate very distant background stars
  const distantStarData = useMemo(() => {
    const distantCount = 5000;
    const positions = new Float32Array(distantCount * 3);
    
    for (let i = 0; i < distantCount; i++) {
      const radius = 1500 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    return positions;
  }, []);

  // Subtle animation for twinkling and rotation
  useFrame((state) => {
    if (!enableAnimation) return;
    
    if (meshRef.current) {
      // Very slow rotation for depth perception
      meshRef.current.rotation.y += 0.00005;
      
      // Subtle twinkling effect
      const material = meshRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.85 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
    
    if (nebulaMeshRef.current) {
      // Slower rotation for nebula clouds
      nebulaMeshRef.current.rotation.y -= 0.00003;
      
      // Pulsing effect for nebula
      const material = nebulaMeshRef.current.material as THREE.PointsMaterial;
      material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
    
    if (distantMeshRef.current) {
      // Very slow counter-rotation for parallax effect
      distantMeshRef.current.rotation.y -= 0.00002;
    }
  });

  return (
    <group>
      {/* Very distant background stars */}
      <points ref={distantMeshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={distantStarData.length / 3}
            array={distantStarData}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#ffffff"
          transparent
          opacity={0.5}
          sizeAttenuation={false}
        />
      </points>

      {/* Nebula cloud effect */}
      <points ref={nebulaMeshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={nebulaData.positions.length / 3}
            array={nebulaData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={nebulaData.colors.length / 3}
            array={nebulaData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={nebulaData.sizes.length}
            array={nebulaData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={5}
          transparent
          opacity={0.2}
          vertexColors
          blending={THREE.AdditiveBlending}
          sizeAttenuation={false}
        />
      </points>

      {/* Main starfield with varied colors and sizes */}
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
          <bufferAttribute
            attach="attributes-size"
            count={starData.sizes.length}
            array={starData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.5}
          transparent
          opacity={0.9}
          vertexColors
          sizeAttenuation={false}
        />
      </points>
    </group>
  );
}