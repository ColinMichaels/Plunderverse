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
  const accelerationRef = useRef(new THREE.Vector3());
  const [, get] = useKeyboardControls<Controls>();
  const { selectedPlanet, isLanding, setIsLanding } = useSolarSystem();
  const { addProjectile } = useShooting();
  const { playLaser } = useAudio();
  const lastShotTimeRef = useRef(0);

  useFrame((state, delta) => {
    const controls = get();
    const velocity = velocityRef.current;
    const acceleration = accelerationRef.current;
    
    // Rocket propulsion physics constants
    const thrustPower = 8; // Lower thrust for more realistic feel
    const maxVelocity = 25; // Terminal velocity
    const dragCoefficient = 0.98; // Air resistance/space friction
    const rotationalDamping = 0.95; // Rotational drag

    // Reset acceleration each frame
    acceleration.set(0, 0, 0);

    // Get camera's forward, right, and up vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Apply thruster forces (acceleration-based)
    if (controls.forward) {
      acceleration.add(forward.multiplyScalar(thrustPower));
    }
    if (controls.backward) {
      acceleration.add(forward.multiplyScalar(-thrustPower * 0.7)); // Reverse thrusters less powerful
    }
    if (controls.left) {
      acceleration.add(right.multiplyScalar(-thrustPower * 0.8)); // Side thrusters less powerful
    }
    if (controls.right) {
      acceleration.add(right.multiplyScalar(thrustPower * 0.8));
    }
    if (controls.up) {
      acceleration.add(up.multiplyScalar(thrustPower * 0.6)); // Vertical thrusters less powerful
    }
    if (controls.down) {
      acceleration.add(up.multiplyScalar(-thrustPower * 0.6));
    }

    // Apply acceleration to velocity
    velocity.add(acceleration.clone().multiplyScalar(delta));

    // Apply drag/friction
    velocity.multiplyScalar(dragCoefficient);

    // Clamp maximum velocity
    if (velocity.length() > maxVelocity) {
      velocity.normalize().multiplyScalar(maxVelocity);
    }

    // Landing mode
    if (controls.land && selectedPlanet && !isLanding) {
      setIsLanding(true);
      console.log(`Attempting to land on ${selectedPlanet}`);
    }

    // Shooting
    if (controls && controls.shoot) {
      try {
        const currentTime = state.clock.elapsedTime;
        if (currentTime - lastShotTimeRef.current > 0.2) { // 200ms cooldown
          lastShotTimeRef.current = currentTime;
          
          // Get camera's forward direction
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          
          // Create projectile from camera position
          console.log("Firing laser...");
          addProjectile(camera.position.clone(), forward);
          playLaser();
        }
      } catch (error) {
        console.error("Error firing laser:", error);
      }
    }

    // Update camera position with momentum
    camera.position.add(velocity.clone().multiplyScalar(delta));

    // Mouse look controls with damping for smoother rotation
    const mouse = state.mouse;
    camera.rotation.order = 'YXZ';
    
    // Only apply mouse look if not landing
    if (!isLanding) {
      const sensitivity = 0.001; // Reduced sensitivity for smoother control
      const targetRotationY = camera.rotation.y - mouse.x * sensitivity;
      const targetRotationX = THREE.MathUtils.clamp(
        camera.rotation.x - mouse.y * sensitivity,
        -Math.PI / 2,
        Math.PI / 2
      );
      
      // Apply rotational damping
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotationY, rotationalDamping);
      camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotationX, rotationalDamping);
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
