import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useShooting } from "../lib/stores/useShooting";
import { useAudio } from "../lib/stores/useAudio";

enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
  shoot = 'shoot',
  land = 'land',
  info = 'info'
}

export function CameraController() {
  const { camera } = useThree();
  const velocityRef = useRef(new THREE.Vector3());
  const [, get] = useKeyboardControls<Controls>();
  const { selectedPlanet, isLanding, setIsLanding } = useSolarSystem();
  const { addProjectile } = useShooting();
  const { playLaser } = useAudio();
  const lastShotTimeRef = useRef(0);

  useFrame((state, delta) => {
    const controls = get();
    const velocity = velocityRef.current;
    
    // Movement speeds
    const baseSpeed = 20;
    const boostMultiplier = 1; // Removed boost functionality
    const speed = baseSpeed * boostMultiplier * delta;

    // Get camera's forward, right, and up vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Apply movement forces
    if (controls.forward) {
      velocity.add(forward.multiplyScalar(speed));
      console.log("Moving forward");
    }
    if (controls.backward) {
      velocity.add(forward.multiplyScalar(-speed));
      console.log("Moving backward");
    }
    if (controls.left) {
      velocity.add(right.multiplyScalar(-speed));
      console.log("Moving left");
    }
    if (controls.right) {
      velocity.add(right.multiplyScalar(speed));
      console.log("Moving right");
    }
    if (controls.up) {
      velocity.add(up.multiplyScalar(speed));
      console.log("Moving up");
    }
    if (controls.down) {
      velocity.add(up.multiplyScalar(-speed));
      console.log("Moving down");
    }

    // Landing mode
    if (controls.land && selectedPlanet && !isLanding) {
      setIsLanding(true);
      console.log(`Attempting to land on ${selectedPlanet}`);
    }

    // Shooting
    if (controls.shoot) {
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastShotTimeRef.current > 0.2) { // 200ms cooldown
        lastShotTimeRef.current = currentTime;
        
        // Get camera's forward direction
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        
        // Create projectile from camera position
        addProjectile(camera.position.clone(), forward);
        playLaser();
      }
    }

    // Apply drag
    velocity.multiplyScalar(0.95);

    // Update camera position
    camera.position.add(velocity);

    // Mouse look controls (simple version)
    const mouse = state.mouse;
    camera.rotation.order = 'YXZ';
    
    // Only apply mouse look if not landing
    if (!isLanding) {
      const sensitivity = 0.002;
      camera.rotation.y -= mouse.x * sensitivity;
      camera.rotation.x = THREE.MathUtils.clamp(
        camera.rotation.x - mouse.y * sensitivity,
        -Math.PI / 2,
        Math.PI / 2
      );
    }

    // Auto-landing sequence
    if (isLanding && selectedPlanet) {
      // This is a simplified landing - in a real implementation,
      // you'd calculate the planet's current position and smoothly move to it
      const landingHeight = 10;
      const targetY = landingHeight;
      
      if (camera.position.y > targetY) {
        camera.position.y -= 20 * delta;
        velocity.multiplyScalar(0.9); // Slow down during landing
      } else {
        setIsLanding(false);
        console.log(`Landed on ${selectedPlanet}!`);
      }
    }
  });

  return null;
}
