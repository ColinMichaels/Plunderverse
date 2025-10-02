import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useFlashlight } from "../../lib/stores/surface/useFlashlight";
import { useSurfaceCollision } from "../../lib/stores/surface/useSurfaceCollision";
import { useSurfacePlayer } from "../../lib/stores/surface/useSurfacePlayer";
import { useMining } from "../../lib/stores/economy/useMining";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { useTerrain } from "../../lib/stores/surface/useTerrain";

enum SurfaceControls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  turnLeft = "turnLeft",
  turnRight = "turnRight",
  flashlight = "flashlight",
  charge = "charge",
}

// Function to calculate terrain height at any x,z position (uses new terrain system)
function terrainHeightAt(x: number, z: number): number {
  const terrainStore = useTerrain.getState();
  return terrainStore.getHeightAt(x, z);
}

export function SurfaceMovementController() {
  const { camera } = useThree();
  const [subscribe, get] = useKeyboardControls<SurfaceControls>();
  const positionRef = useRef(new THREE.Vector3(0, 1.8, 5));
  const rotationRef = useRef(0);
  const velocityRef = useRef(new THREE.Vector3());

  // Collision system
  const { checkCollision } = useSurfaceCollision();
  const { isActive: isMining, currentNodeId } = useMining();
  const { playHit } = useAudio();
  const { setPosition, setRotation } = useSurfacePlayer();
  const lastCollisionSoundRef = useRef(0);
  const lastCollisionTimeRef = useRef(0);

  // Camera shake system
  const cameraShakeRef = useRef({
    active: false,
    intensity: 0,
    duration: 0,
    elapsed: 0,
    offset: new THREE.Vector3(),
  });

  // Flashlight system
  const {
    toggle: toggleFlashlight,
    updateBattery,
    startCharging,
    stopCharging,
    isCharging,
  } = useFlashlight();
  const lastFlashlightPressRef = useRef(0);
  const lastChargePressRef = useRef(0);

  // Debug logging for controls
  useEffect(() => {
    const unsubscribeForward = subscribe((state) => state.forward);
    const unsubscribeBack = subscribe((state) => state.backward);
    const unsubscribeLeft = subscribe((state) => state.left);
    const unsubscribeRight = subscribe((state) => state.right);
    const unsubscribeTurnLeft = subscribe((state) => state.turnLeft);
    const unsubscribeTurnRight = subscribe((state) => state.turnRight);

    return () => {
      unsubscribeForward();
      unsubscribeBack();
      unsubscribeLeft();
      unsubscribeRight();
      unsubscribeTurnLeft();
      unsubscribeTurnRight();
    };
  }, [subscribe]);

  useFrame((state, delta) => {
    const controls = get();
    const position = positionRef.current;
    const rotation = rotationRef.current;
    const velocity = velocityRef.current;
    const shake = cameraShakeRef.current;

    const moveSpeed = 6; // Rover movement speed
    const turnSpeed = 0.9; // Turning speed
    const maxVelocity = 15; // Cap velocity to prevent runaway acceleration
    const playerCollisionRadius = 2.5; // Collision detection radius

    // Reset velocity for this frame
    velocity.set(0, 0, 0);

    // Surface movement controls - compute movement directly
    if (controls.forward) {
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      velocity.add(forward.multiplyScalar(moveSpeed));
    }

    if (controls.backward) {
      const backward = new THREE.Vector3(0, 0, 1);
      backward.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      velocity.add(backward.multiplyScalar(moveSpeed));
    }

    if (controls.left) {
      const left = new THREE.Vector3(-1, 0, 0);
      left.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      velocity.add(left.multiplyScalar(moveSpeed));
    }

    if (controls.right) {
      const right = new THREE.Vector3(1, 0, 0);
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      velocity.add(right.multiplyScalar(moveSpeed));
    }

    // Rotation controls - apply directly to ref
    if (controls.turnLeft) {
      rotationRef.current += turnSpeed * delta;
    }

    if (controls.turnRight) {
      rotationRef.current -= turnSpeed * delta;
    }

    // Flashlight control - toggle with debounce
    const currentTime = performance.now();
    if (
      controls.flashlight &&
      currentTime - lastFlashlightPressRef.current > 300
    ) {
      toggleFlashlight();
      lastFlashlightPressRef.current = currentTime;
    }

    // Battery charging control - toggle with debounce
    if (controls.charge && currentTime - lastChargePressRef.current > 300) {
      if (isCharging) {
        stopCharging();
      } else {
        startCharging();
      }
      lastChargePressRef.current = currentTime;
    }

    // Update flashlight battery (drain/charge based on state)
    updateBattery(delta);

    // Clamp velocity to prevent runaway acceleration
    velocity.clampLength(0, maxVelocity);

    // Calculate intended new position
    const newPosition = position
      .clone()
      .add(velocity.clone().multiplyScalar(delta));

    // Keep within reasonable bounds
    newPosition.x = Math.max(-80, Math.min(80, newPosition.x));
    newPosition.z = Math.max(-80, Math.min(80, newPosition.z));
    // Follow terrain height with rover clearance
    newPosition.y = terrainHeightAt(newPosition.x, newPosition.z) + 1.8;

    // Check for collision before applying movement
    const collision = checkCollision(newPosition, playerCollisionRadius);
    
    if (collision) {
      // Check if we're mining the collided resource node - allow getting close if mining it
      const miningCurrentNode = isMining && collision.type === "resource" && collision.id === currentNodeId;
      
      if (!miningCurrentNode) {
        // Calculate collision intensity based on velocity magnitude
        const velocityMagnitude = velocity.length();
        const collisionIntensity = Math.min(velocityMagnitude / maxVelocity, 1.0);
        
        // Only trigger collision feedback if moving with some velocity and not too recent
        if (velocityMagnitude > 0.5 && currentTime - lastCollisionTimeRef.current > 100) {
          // Trigger camera shake
          shake.active = true;
          shake.intensity = 0.08 + (collisionIntensity * 0.12); // 0.08 to 0.2
          shake.duration = 0.25;
          shake.elapsed = 0;
          
          // Play collision sound with cooldown (0.5 seconds)
          if (currentTime - lastCollisionSoundRef.current > 500) {
            playHit();
            lastCollisionSoundRef.current = currentTime;
          }
          
          lastCollisionTimeRef.current = currentTime;
        }
        
        // Don't apply movement that would cause collision
        // Instead, slide along the collision surface
        const directionToObject = new THREE.Vector3()
          .subVectors(newPosition, collision.position)
          .normalize();
        
        // Project velocity onto tangent plane (perpendicular to collision normal)
        const velocityProjected = velocity.clone().projectOnPlane(directionToObject);
        
        // Apply reduced movement along tangent
        const slidingPosition = position
          .clone()
          .add(velocityProjected.multiplyScalar(delta * 0.3));
        
        slidingPosition.y = terrainHeightAt(slidingPosition.x, slidingPosition.z) + 1.8;
        positionRef.current.copy(slidingPosition);
      } else {
        // Mining current node - allow movement
        positionRef.current.copy(newPosition);
      }
    } else {
      // No collision - apply movement normally
      positionRef.current.copy(newPosition);
    }
    
    // Update global surface player position for other components
    setPosition(positionRef.current);
    setRotation(rotationRef.current);

    // Update camera shake
    if (shake.active) {
      shake.elapsed += delta;
      
      if (shake.elapsed < shake.duration) {
        // Generate random shake offset
        const progress = shake.elapsed / shake.duration;
        const damping = 1 - progress; // Fade out shake over time
        
        shake.offset.set(
          (Math.random() - 0.5) * shake.intensity * damping,
          (Math.random() - 0.5) * shake.intensity * damping,
          (Math.random() - 0.5) * shake.intensity * damping * 0.5
        );
      } else {
        // Shake complete - reset
        shake.active = false;
        shake.offset.set(0, 0, 0);
      }
    }

    // Update camera position and rotation with shake
    const finalCameraPosition = positionRef.current.clone().add(shake.offset);
    camera.position.copy(finalCameraPosition);
    camera.rotation.y = rotationRef.current;
    // Keep camera level with horizon (add subtle shake to rotation if needed)
    camera.rotation.x = shake.offset.y * 0.5;
    camera.rotation.z = shake.offset.x * 0.3;
    camera.updateMatrixWorld();
  });

  return null;
}
