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
import { useEquipment } from "../lib/stores/useEquipment";
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
  const { setThrusting, setWarpMode, isWarpMode, upgrades } = useShipStatus();
  const { showSplash } = useGame();
  const lastShotTimeRef = useRef(0);
  const lastLandingAttemptRef = useRef(0);
  const lastMenuPressRef = useRef(0);
  const lastCenterPressRef = useRef(0);
  const lastForwardPressRef = useRef(0);
  const forwardDoubleClickRef = useRef(false);
  const warpSpeedMultiplierRef = useRef(1);
  const lastThrusterSoundRef = useRef(0);
  
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
  const { 
    isActive: isAutopilotActive, 
    target: autopilotTarget, 
    activate: activateAutopilot, 
    deactivate: deactivateAutopilot,
    isOrbiting,
    orbitRadius,
    orbitAngle,
    enterOrbit
  } = useAutopilot();

  // Equipment system for ship degradation and fuel
  const { 
    consumeFuel: consumeShipFuel, 
    applyShipDegradation,
    getEquipment,
    getPerformanceMultiplier
  } = useEquipment();

  useFrame((state, delta) => {
    const controls = get();
    const velocity = velocityRef.current;
    const acceleration = accelerationRef.current;
    
    // Rocket propulsion physics constants
    const baseThrustPower = 8; // Lower thrust for more realistic feel
    const baseMaxVelocity = 25; // Terminal velocity
    const dragCoefficient = 0.995; // Reduced friction for stickier momentum
    const mobileThrustPower = 25; // Much higher power for mobile controls
    const rotationalDamping = 0.95; // Rotational drag
    
    // Warp mode constants
    const warpThrustMultiplier = upgrades.warpCapability ? 4 : 2; // Enhanced thrust in warp
    const warpMaxVelocity = upgrades.warpCapability ? 150 : 75; // Much higher max velocity
    const warpFuelConsumption = 8; // Higher fuel consumption in warp

    // Reset acceleration each frame
    acceleration.set(0, 0, 0);

    // Get camera's forward, right, and up vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Check if we have fuel before applying thrusters (from equipment system)
    const fuelTank = getEquipment('fuel-tank');
    const hasFuel = fuelTank && fuelTank.currentDurability > 0;
    const enginePerformance = getPerformanceMultiplier('engine-main');
    let thrusterActive = false;

    // Apply current modifiers including engine performance
    const baseThrustWithPerformance = baseThrustPower * enginePerformance;
    const thrustPower = isWarpMode ? baseThrustWithPerformance * warpThrustMultiplier : baseThrustWithPerformance;
    const maxVelocity = isWarpMode ? warpMaxVelocity * enginePerformance : baseMaxVelocity * enginePerformance;

    // Disable movement controls when autopilot is active
    if (!isAutopilotActive) {
      // Detect double-click for warp mode
      const currentTime = performance.now();
      if (controls.forward && hasFuel) {
        // Check for double-click
        if (currentTime - lastForwardPressRef.current < 300) { // 300ms window for double-click
          const currentFuel = fuelTank?.currentDurability || 0;
          if (upgrades.warpCapability || currentFuel > 30) { // Need warp upgrade OR sufficient fuel
            setWarpMode(true);
            forwardDoubleClickRef.current = true;
            console.log("Warp mode activated!");
          }
        }
        lastForwardPressRef.current = currentTime;
        
        acceleration.add(forward.multiplyScalar(thrustPower));
        thrusterActive = true;
      } else if (!controls.forward && isWarpMode) {
        // Deactivate warp when forward key is released
        setWarpMode(false);
        forwardDoubleClickRef.current = false;
        console.log("Warp mode deactivated");
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
    } // End autopilot check

    // Note: Fuel consumption moved to end of frame after all thrust sources computed

    // Add mobile thrust input (also disabled during autopilot)
    const mobileThrust = mobileThrustRef.current;
    if (mobileThrust.length() > 0 && hasFuel && !isAutopilotActive) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0);
      
      acceleration.add(forward.multiplyScalar(mobileThrust.z * mobileThrustPower));
      acceleration.add(right.multiplyScalar(mobileThrust.x * mobileThrustPower));
      acceleration.add(up.multiplyScalar(mobileThrust.y * mobileThrustPower));
      thrusterActive = true;
      console.log("Mobile thrust applied:", mobileThrust, "Fuel:", fuelTank?.currentDurability || 0);
      
      // Visual feedback for thrust
      const thrustIndicator = document.getElementById('thrust-indicator');
      if (thrustIndicator) {
        thrustIndicator.style.opacity = '1';
        (thrustIndicator.nextElementSibling as HTMLElement).textContent = 'ACTIVE';
      }
    } else {
      // Reset thrust indicator when not thrusting
      const thrustIndicator = document.getElementById('thrust-indicator');
      if (thrustIndicator) {
        thrustIndicator.style.opacity = '0';
        (thrustIndicator.nextElementSibling as HTMLElement).textContent = 'IDLE';
      }
    }

    // Apply acceleration to velocity
    velocity.add(acceleration.clone().multiplyScalar(delta));

    // Apply drag/friction
    velocity.multiplyScalar(dragCoefficient);

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
          const landingRange = planetData.size * 12; // Must be within 12x planet radius (more forgiving)
          
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

    // Note: Camera position update moved to end of frame after velocity clamping

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

    // Autopilot system with orbital mechanics
    if (isAutopilotActive && selectedPlanet) {
      // Calculate current planet position dynamically
      const planetData = planets.find(p => p.name === selectedPlanet);
      if (planetData) {
        // Calculate planet's current orbital position around the sun
        const angle = time * planetData.orbitalSpeed;
        const planetX = Math.cos(angle) * planetData.distance;
        const planetZ = Math.sin(angle) * planetData.distance;
        const currentPlanetPosition = new THREE.Vector3(planetX, 0, planetZ);
        
        // Update autopilot target to follow moving planet
        if (autopilotTarget) {
          autopilotTarget.copy(currentPlanetPosition);
        }
        
        const distanceToTarget = camera.position.distanceTo(currentPlanetPosition);
        const autopilotSpeed = 4; // Reduced speed for extended travel time
        const landingDistance = planetData.size * 12; // Use proper landing distance from game logic
        
        // Disable warp mode during autopilot for consistent behavior
        if (isWarpMode) {
          setWarpMode(false);
        }
        
        // Proper timestamp-based audio throttling (max 1 sound per 2 seconds)
        const currentTime = state.clock.elapsedTime;
        const soundInterval = 2; // Play sound every 2 seconds
        if (currentTime - lastThrusterSoundRef.current >= soundInterval) {
          playLaser(); // Reuse laser sound as thruster sound
          lastThrusterSoundRef.current = currentTime;
        }
        
        if (!isOrbiting && distanceToTarget > landingDistance) {
          // Approach phase - fly towards current planet position
          const direction = currentPlanetPosition.clone().sub(camera.position).normalize();
          
          // Smoothly rotate camera to face target
          const targetQuaternion = new THREE.Quaternion();
          const lookAtMatrix = new THREE.Matrix4();
          lookAtMatrix.lookAt(camera.position, currentPlanetPosition, new THREE.Vector3(0, 1, 0));
          targetQuaternion.setFromRotationMatrix(lookAtMatrix);
          
          // Smooth interpolation towards target orientation
          camera.quaternion.slerp(targetQuaternion, delta * 1.5);
          
          // Move towards target with warping effects
          const autopilotVelocity = direction.multiplyScalar(autopilotSpeed * delta);
          velocity.add(autopilotVelocity);
          
          // Check if we should enter orbit (within landing distance)
          if (distanceToTarget <= landingDistance + 5) {
            enterOrbit(landingDistance);
            console.log(`Autopilot entering stable orbit around ${selectedPlanet} at ${landingDistance} units`);
          }
        } else if (isOrbiting) {
          // Orbital phase - smooth orbit around the moving planet center
          const orbitSpeed = 0.15; // Much slower orbital rotation for graceful, cinematic viewing
          const currentOrbitAngle = useAutopilot.getState().orbitAngle + (orbitSpeed * delta);
          
          // Update orbit angle smoothly without frequent store updates
          useAutopilot.setState({ orbitAngle: currentOrbitAngle });
          
          // Calculate smooth orbital position around current planet center
          const orbitX = Math.cos(currentOrbitAngle) * orbitRadius;
          const orbitZ = Math.sin(currentOrbitAngle) * orbitRadius;
          const targetOrbitPosition = currentPlanetPosition.clone().add(new THREE.Vector3(orbitX, 0, orbitZ));
          
          // Smooth orbital movement using gentle interpolation
          const currentPosition = camera.position.clone();
          const smoothFactor = delta * 2.0; // Gentle movement factor
          const newPosition = currentPosition.lerp(targetOrbitPosition, smoothFactor);
          
          // Apply the smooth position directly to camera
          camera.position.copy(newPosition);
          
          // Smoothly orient camera toward planet with very gentle rotation
          const planetDirection = currentPlanetPosition.clone().sub(camera.position).normalize();
          const targetQuaternion = new THREE.Quaternion();
          const lookAtMatrix = new THREE.Matrix4();
          const upVector = new THREE.Vector3(0, 1, 0);
          
          lookAtMatrix.lookAt(camera.position, currentPlanetPosition, upVector);
          targetQuaternion.setFromRotationMatrix(lookAtMatrix);
          
          // Very smooth camera rotation for cinematic feel
          camera.quaternion.slerp(targetQuaternion, delta * 1.2);
        }
        
        // Mark as thrusting during autopilot and consume fuel
        setThrusting(true);
        thrusterActive = true;

        // Consume fuel from equipment system during autopilot
        const autopilotFuelRate = 1.5; // Units per second during autopilot
        if (!consumeShipFuel(autopilotFuelRate * delta)) {
          console.warn("Out of fuel! Autopilot deactivated.");
          deactivateAutopilot();
        }

        // Apply ship degradation during autopilot travel
        const travelIntensity = distanceToTarget > landingDistance ? 1.0 : 0.5; // Higher intensity during approach
        applyShipDegradation('autopilot', travelIntensity, delta);
      }
    }

    // Clamp maximum velocity (after all thrust sources computed)
    const effectiveMaxVelocity = isAutopilotActive ? Math.min(maxVelocity, 25) : maxVelocity;
    if (velocity.length() > effectiveMaxVelocity) {
      velocity.normalize().multiplyScalar(effectiveMaxVelocity);
    }

    // During landing, reduce movement to show transition effect
    if (isLanding) {
      velocity.multiplyScalar(0.1); // Dramatically reduce movement during landing sequence
    }
    
    // Update camera position with momentum (after velocity clamping)
    camera.position.add(velocity.clone().multiplyScalar(delta));
    
    // Update camera position in store for UI components
    const { setCameraPosition } = useSolarSystem.getState();
    setCameraPosition(camera.position);
    
    // Consume fuel after all thrust sources have been computed
    setThrusting(thrusterActive);
    if (thrusterActive) {
      const baseFuelConsumption = 2;
      const fuelMultiplier = isWarpMode ? warpFuelConsumption : baseFuelConsumption;
      const efficiencyBonus = upgrades.thrustEfficiency; // Reduces fuel consumption
      // Degraded engines consume more fuel
      const engineEfficiency = enginePerformance > 0 ? enginePerformance : 1.0;
      const engineFuelPenalty = 1 + (1 - engineEfficiency) * 0.5; // Up to 50% more fuel with broken engine
      const finalConsumption = (fuelMultiplier * efficiencyBonus * engineFuelPenalty) * delta;
      
      // Use equipment fuel system
      if (!consumeShipFuel(finalConsumption)) {
        console.warn("Out of fuel! Engines shut down.");
        setThrusting(false);
        setWarpMode(false);
      }
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
