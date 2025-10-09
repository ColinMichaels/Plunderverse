import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useParrot } from '@/lib/stores/useParrot';

export function HolographicParrot({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { settings } = useParrot();
  const flickerRef = useRef(0);

  const parrotMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(0x00ff88),
      emissive: new THREE.Color(0x00ff88),
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
      wireframe: false,
      side: THREE.DoubleSide,
    });
  }, []);

  const iridescent = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: new THREE.Color(0xffd700),
      emissive: new THREE.Color(0xffd700),
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
      wireframe: false,
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !settings.isVisible) return;

    const time = state.clock.getElapsedTime();
    
    meshRef.current.rotation.y = Math.sin(time * 0.5) * 0.2;
    meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.05;

    flickerRef.current += 0.1;
    if (Math.sin(flickerRef.current) > 0.95) {
      parrotMaterial.opacity = 0.3 + Math.random() * 0.3;
    } else {
      parrotMaterial.opacity = 0.7 + Math.random() * 0.1;
    }

    const hue = (time * 0.1) % 1;
    const color = new THREE.Color().setHSL(hue * 0.3 + 0.4, 0.8, 0.5);
    parrotMaterial.emissive = color;
  });

  if (!settings.isVisible) return null;

  return (
    <group position={position}>
      <mesh ref={meshRef} material={parrotMaterial}>
        <sphereGeometry args={[0.3, 16, 16]} />
      </mesh>
      
      <mesh position={[0.2, 0.15, 0]} material={parrotMaterial} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
      </mesh>

      <mesh position={[-0.15, -0.2, 0.1]} material={iridescent}>
        <boxGeometry args={[0.3, 0.6, 0.1]} />
      </mesh>
      <mesh position={[0.15, -0.2, 0.1]} material={iridescent}>
        <boxGeometry args={[0.3, 0.6, 0.1]} />
      </mesh>

      <mesh position={[-0.3, -0.5, 0]} material={parrotMaterial}>
        <sphereGeometry args={[0.15, 8, 8]} />
      </mesh>
      <mesh position={[0.3, -0.5, 0]} material={parrotMaterial}>
        <sphereGeometry args={[0.15, 8, 8]} />
      </mesh>

      <pointLight position={[0, 0, 0.5]} color={0x00ff88} intensity={2} distance={3} />
    </group>
  );
}
