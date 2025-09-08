import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useShooting } from "../lib/stores/useShooting";
import { useAudio } from "../lib/stores/useAudio";
import { useShipStatus } from "../lib/stores/useShipStatus";
import { useGame } from "../lib/stores/useGame";
import { useLandingWarning } from "../lib/stores/useLandingWarning";
import { useAutopilot } from "../lib/stores/useAutopilot";
import { planets } from "../lib/planetData";

enum Controls {
  forward = 'forward',
  backward = 'backward',
  left = 'left',
  right = 'right',
  up = 'up',
  down = 'down',
  shoot = 'shoot',
  land = 'land',
  info = 'info',
  menu = 'menu',
  center = 'center'
}

export function CameraController() {
  const { camera } = useThree();
  const velocityRef = useRef(new THREE.Vector3());
  const accelerationRef = useRef(new THREE.Vector3());
  const [, get] = useKeyboardControls<Controls>();
  const { selectedPlanet, isLanding, setIsLanding, setCameraPosition, time } = useSolarSystem();
  const { addProjectile } = useShooting();
  const { playLaser } = useAudio();
  const { fuel, consumeFuel } = useShipStatus();
  const { showSplash } = useGame();
  const lastShotTimeRef = useRef(0);
  const lastLandingAttemptRef = useRef(0);
  const lastMenuPressRef = useRef(0);
  const lastCenterPressRef = useRef(0);
  
  // Mobile control states
  const mobileRotationRef = useRef(new THREE.Vector2(0, 0));
  const mobileThrustRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Mobile control callbacks
  const handleMobileShoot = () => {
    const currentTime = performance.now() / 1000;
    if (currentTime - lastShotTimeRef.current > 0.2) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      addProjectile(camera.position.clone(), forward.normalize());
      playLaser();
      lastShotTimeRef.current = currentTime;
    }
  };

  const handleMobileLook = (rotation: { x: number; y: number }) => {
    mobileRotationRef.current.x += rotation.x;
    mobileRotationRef.current.y += rotation.y;
  };

  const handleMobileMove = (movement: { x: number; y: number; z: number }) => {
    mobileThrustRef.current.set(movement.x, movement.y, movement.z);
    console.log("Mobile move input:", movement);
  };
  
  // Warning and autopilot stores
  const { showWarning } = useLandingWarning();
  const { isActive: isAutopilotActive, target: autopilotTarget, activate: activateAutopilot, deactivate: deactivateAutopilot } = useAutopilot();

  useFrame((state, delta) => {
    const controls = get();
    const velocity = velocityRef.current;
    const acceleration = accelerationRef.current;
    
    // Rocket propulsion physics constants
    const thrustPower = 8; // Lower thrust for more realistic feel
    const maxVelocity = 25; // Terminal velocity
    const dragCoefficient = 0.995; // Reduced friction for stickier momentum
    const mobileThrustPower = 25; // Much higher power for mobile controls
    const rotationalDamping = 0.95; // Rotational drag

    // Reset acceleration each frame
    acceleration.set(0, 0, 0);

    // Get camera's forward, right, and up vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Check if we have fuel before applying thrusters
    const hasFuel = fuel > 0;
    let thrusterActive = false;

    // Apply thruster forces (acceleration-based) only if we have fuel
    if (controls.forward && hasFuel) {
      acceleration.add(forward.multiplyScalar(thrustPower));
      thrusterActive = true;
    }
    if (controls.backward && hasFuel) {
      acceleration.add(forward.multiplyScalar(-thrustPower * 0.7)); // Reverse thrusters less powerful
      thrusterActive = true;
    }
    if (controls.left && hasFuel) {
      acceleration.add(right.multiplyScalar(-thrustPower * 0.8)); // Side thrusters less powerful
      thrusterActive = true;
    }
    if (controls.right && hasFuel) {
      acceleration.add(right.multiplyScalar(thrustPower * 0.8));
      thrusterActive = true;
    }
    if (controls.up && hasFuel) {
      acceleration.add(up.multiplyScalar(thrustPower * 0.6)); // Vertical thrusters less powerful
      thrusterActive = true;
    }
    if (controls.down && hasFuel) {
      acceleration.add(up.multiplyScalar(-thrustPower * 0.6));
      thrusterActive = true;
    }

    // Consume fuel when thrusters are active
    if (thrusterActive) {
      consumeFuel(delta * 2); // Consume 2 fuel per second when using thrusters
    }

    // Add mobile thrust input
    const mobileThrust = mobileThrustRef.current;
    if (mobileThrust.length() > 0 && hasFuel) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0);
      
      acceleration.add(forward.multiplyScalar(mobileThrust.z * mobileThrustPower));
      acceleration.add(right.multiplyScalar(mobileThrust.x * mobileThrustPower));
      acceleration.add(up.multiplyScalar(mobileThrust.y * mobileThrustPower));
      thrusterActive = true;
      console.log("Mobile thrust applied:", mobileThrust, "Fuel:", fuel);
    }

    // Apply acceleration to velocity
    velocity.add(acceleration.clone().multiplyScalar(delta));

    // Apply drag/friction
    velocity.multiplyScalar(dragCoefficient);

    // Clamp maximum velocity
    if (velocity.length() > maxVelocity) {
      velocity.normalize().multiplyScalar(maxVelocity);
    }

    // Landing mode - only allow if close to planet and not recently attempted
    if (controls.land && selectedPlanet && !isLanding) {
      const currentTime = state.clock.elapsedTime;
      
      // Check if enough time has passed since last landing attempt (2 second cooldown)
      if (currentTime - lastLandingAttemptRef.current > 2) {
        // Find the selected planet data
        const planetData = planets.find(p => p.name === selectedPlanet);
        
        if (planetData) {
          // Calculate planet's current orbital position
          const angle = time * planetData.orbitalSpeed;
          const planetX = Math.cos(angle) * planetData.distance;
          const planetZ = Math.sin(angle) * planetData.distance;
          const planetPosition = new THREE.Vector3(planetX, 0, planetZ);
          
          // Check distance to planet
          const distanceToPlanet = camera.position.distanceTo(planetPosition);
          const landingRange = planetData.size * 8; // Must be within 8x planet radius (more forgiving)
          
          if (distanceToPlanet <= landingRange) {
            setIsLanding(true);
            lastLandingAttemptRef.current = currentTime;
            console.log(`Attempting to land on ${selectedPlanet} (distance: ${Math.round(distanceToPlanet)})`);
          } else {
            console.log(`Too far from ${selectedPlanet} to land! Distance: ${Math.round(distanceToPlanet)}, required: ${Math.round(landingRange)}`);
            
            // Show warning dialog with autopilot option
            showWarning(selectedPlanet, distanceToPlanet, landingRange);
          }
        }
      }
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
    
    // Update camera position in store for UI components
    const { setCameraPosition } = useSolarSystem.getState();
    setCameraPosition(camera.position);

    // Mouse and mobile look controls with damping for smoother rotation
    const mouse = state.mouse;
    camera.rotation.order = 'YXZ';
    
    // Only apply look controls if not landing
    if (!isLanding) {
      const sensitivity = 0.001; // Reduced sensitivity for smoother control
      
      // Combine mouse and mobile rotation inputs
      const mouseX = mouse.x * sensitivity;
      const mouseY = mouse.y * sensitivity;
      const mobileX = mobileRotationRef.current.x * 0.1; // Scale mobile input
      const mobileY = mobileRotationRef.current.y * 0.1;
      
      const targetRotationY = camera.rotation.y - (mouseX + mobileX);
      const targetRotationX = THREE.MathUtils.clamp(
        camera.rotation.x - (mouseY + mobileY),
        -Math.PI / 2,
        Math.PI / 2
      );
      
      // Apply rotational damping
      camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotationY, rotationalDamping);
      camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotationX, rotationalDamping);
      
      // Decay mobile rotation input
      mobileRotationRef.current.multiplyScalar(0.95);
    }

    // Exit to menu
    if (controls.menu) {
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastMenuPressRef.current > 0.5) { // 500ms cooldown to prevent spam
        lastMenuPressRef.current = currentTime;
        console.log("Returning to main menu...");
        showSplash();
      }
    }

    // Center camera
    if (controls.center) {
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastCenterPressRef.current > 0.3) { // 300ms cooldown
        lastCenterPressRef.current = currentTime;
        console.log("Centering camera...");
        
        // Smoothly return camera to center position (looking forward)
        camera.rotation.x = 0;
        camera.rotation.y = 0;
        camera.rotation.z = 0;
      }
    }

    // Autopilot system
    if (isAutopilotActive && autopilotTarget) {
      const direction = autopilotTarget.clone().sub(camera.position).normalize();
      const autopilotSpeed = 15;
      
      // Move towards target
      velocity.add(direction.multiplyScalar(autopilotSpeed * delta));
      
      // Check if we've reached the target
      const distanceToTarget = camera.position.distanceTo(autopilotTarget);
      if (distanceToTarget < 8) {
        deactivateAutopilot();
        console.log("Autopilot navigation complete!");
      }
    }

    // During landing, reduce movement to show transition effect
    if (isLanding) {
      velocity.multiplyScalar(0.1); // Dramatically reduce movement during landing sequence
    }
  });


  // Expose mobile control callbacks for MobileControls component
  (window as any).mobileControlCallbacks = {
    onShoot: handleMobileShoot,
    onLook: handleMobileLook,
    onMove: handleMobileMove
  };

  return null;
}
