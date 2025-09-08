import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Starfield() {
  const starGroupRef = useRef<THREE.Group>(null);
  const nebulaRef = useRef<THREE.Mesh>(null);

  // Generate varied star data
  const starData = useMemo(() => {
    const starCount = 6000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    // Star color temperature variations
    const starTypes = [
      { color: [1.0, 0.8, 0.6], weight: 0.4 }, // Orange/red stars
      { color: [1.0, 1.0, 1.0], weight: 0.3 }, // White stars
      { color: [0.8, 0.9, 1.0], weight: 0.2 }, // Blue-white stars
      { color: [1.0, 0.9, 0.7], weight: 0.1 }, // Yellow stars
    ];
    
    for (let i = 0; i < starCount; i++) {
      // Create stars in a large sphere around the solar system
      const radius = 800 + Math.random() * 1200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Select star type based on weights
      let randomValue = Math.random();
      let selectedType = starTypes[0];
      for (const type of starTypes) {
        if (randomValue < type.weight) {
          selectedType = type;
          break;
        }
        randomValue -= type.weight;
      }
      
      // Add some variation to the color
      const colorVariation = 0.2;
      colors[i * 3] = selectedType.color[0] + (Math.random() - 0.5) * colorVariation;
      colors[i * 3 + 1] = selectedType.color[1] + (Math.random() - 0.5) * colorVariation;
      colors[i * 3 + 2] = selectedType.color[2] + (Math.random() - 0.5) * colorVariation;
      
      // Varied star sizes (most small, some large)
      sizes[i] = Math.random() < 0.8 ? 1 + Math.random() * 2 : 3 + Math.random() * 4;
    }
    
    return { positions, colors, sizes };
  }, []);

  // Generate nebula positions and colors
  const nebulaData = useMemo(() => {
    const nebulaCount = 15;
    const positions = [];
    const scales = [];
    const colors = [];
    
    const nebulaColors = [
      [0.8, 0.2, 0.6], // Pink/magenta
      [0.3, 0.6, 0.9], // Blue
      [0.9, 0.5, 0.2], // Orange
      [0.5, 0.8, 0.3], // Green
      [0.7, 0.3, 0.9], // Purple
    ];
    
    for (let i = 0; i < nebulaCount; i++) {
      const radius = 1500 + Math.random() * 1000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions.push([
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ]);
      
      scales.push(100 + Math.random() * 200);
      colors.push(nebulaColors[Math.floor(Math.random() * nebulaColors.length)]);
    }
    
    return { positions, scales, colors };
  }, []);

  // Subtle twinkling animation
  useFrame((state) => {
    if (starGroupRef.current) {
      starGroupRef.current.rotation.y += 0.00005;
    }
    
    // Gentle nebula animation
    if (nebulaRef.current) {
      nebulaRef.current.rotation.z += 0.0001;
    }
  });

  return (
    <group ref={starGroupRef}>
      {/* Main starfield */}
      <points>
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
          size={2}
          transparent
          opacity={0.9}
          sizeAttenuation={false}
          vertexColors
        />
      </points>

      {/* Distant nebulae */}
      {nebulaData.positions.map((position, index) => (
        <mesh
          key={index}
          position={position}
          scale={nebulaData.scales[index]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={new THREE.Color(...nebulaData.colors[index])}
            transparent
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Milky Way background glow */}
      <mesh ref={nebulaRef} position={[0, 0, 0]} scale={3000}>
        <planeGeometry args={[1, 0.3]} />
        <meshBasicMaterial
          color={new THREE.Color(0.4, 0.3, 0.6)}
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
