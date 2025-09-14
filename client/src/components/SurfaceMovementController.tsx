import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";

enum SurfaceControls {
  forward = 'forward',
  backward = 'backward', 
  left = 'left',
  right = 'right',
  turnLeft = 'turnLeft',
  turnRight = 'turnRight'
}

// Function to calculate terrain height at any x,z position (matches terrain generation)
function terrainHeightAt(x: number, z: number): number {
  return Math.sin(x * 0.01) * Math.cos(z * 0.01) * 2 + 
         Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
}

export function SurfaceMovementController() {
  const { camera } = useThree();
  const [subscribe, get] = useKeyboardControls<SurfaceControls>();
  const positionRef = useRef(new THREE.Vector3(0, 1.8, 5));
  const rotationRef = useRef(0);
  const velocityRef = useRef(new THREE.Vector3());

  // Debug logging for controls
  useEffect(() => {
    const unsubscribeForward = subscribe(
      (state) => state.forward,
      (pressed) => console.log("Surface Forward:", pressed)
    );
    const unsubscribeBack = subscribe(
      (state) => state.backward,
      (pressed) => console.log("Surface Backward:", pressed)
    );
    const unsubscribeLeft = subscribe(
      (state) => state.left,
      (pressed) => console.log("Surface Left:", pressed)
    );
    const unsubscribeRight = subscribe(
      (state) => state.right,
      (pressed) => console.log("Surface Right:", pressed)
    );
    const unsubscribeTurnLeft = subscribe(
      (state) => state.turnLeft,
      (pressed) => console.log("Surface Turn Left:", pressed)
    );
    const unsubscribeTurnRight = subscribe(
      (state) => state.turnRight,
      (pressed) => console.log("Surface Turn Right:", pressed)
    );

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
    
    const moveSpeed = 12; // Rover movement speed
    const turnSpeed = 3; // Turning speed
    const maxVelocity = 15; // Cap velocity to prevent runaway acceleration
    
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
    
    // Clamp velocity to prevent runaway acceleration
    velocity.clampLength(0, maxVelocity);
    
    // Update position directly with single delta application
    const newPosition = position.clone().add(velocity.clone().multiplyScalar(delta));
    
    // Keep within reasonable bounds
    newPosition.x = Math.max(-80, Math.min(80, newPosition.x));
    newPosition.z = Math.max(-80, Math.min(80, newPosition.z));
    // Follow terrain height with rover clearance
    newPosition.y = terrainHeightAt(newPosition.x, newPosition.z) + 1.8;
    
    positionRef.current.copy(newPosition);
    
    // Update camera position and rotation directly
    camera.position.copy(positionRef.current);
    camera.rotation.y = rotationRef.current;
    // Add slight downward pitch to see terrain
    camera.rotation.x = -0.1;
    camera.updateMatrixWorld();
  });

  return null;
}