import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useMiningEffects } from '../../lib/stores/surface/useMiningEffects';

/**
 * Camera shake effect component for mining feedback
 * Must be placed inside the Canvas to access the camera
 */
export function CameraShake() {
  const { camera } = useThree();
  const lastUpdateRef = useRef(0);
  
  useFrame((state, delta) => {
    const effectsStore = useMiningEffects.getState();
    
    // Update screen shake if active
    if (effectsStore.isShaking) {
      effectsStore.updateScreenShake(camera, delta);
    }
  });
  
  return null;
}