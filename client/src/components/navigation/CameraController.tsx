/**
 * CameraController - Optimized for high-performance frame rates
 * 
 * Performance optimizations implemented:
 * - Frame-based throttling: Collision detection runs every 4 frames
 * - Adaptive quality: Frame skipping when performance drops below 60 FPS
 * - Cached calculations: Direction vectors and planet positions are cached
 * - Reduced Quaternion.slerp: Only updates every 3 frames during expensive operations
 * - Pre-allocated vectors: Temp vectors to avoid garbage collection
 * - Planet position caching: 100ms cache duration for orbital calculations
 * - Proximity checks: Throttled to every 5 frames
 * 
 * These optimizations significantly reduce jittering and improve overall frame rate
 * while maintaining smooth and responsive controls.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls, PerspectiveCamera } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useShooting } from "../../lib/stores/combat/useShooting";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useGame } from "../../lib/stores/ui/useGame";
import { useLandingWarning } from "../../lib/stores/surface/useLandingWarning";
import { useAutopilot } from "../../lib/stores/navigation/useAutopilot";
import { useEquipment } from "../../lib/stores/ship/useEquipment";
import { useMining } from "../../lib/stores/economy/useMining";
import { useLandedState } from "../../lib/stores/surface/useLandedState";
import { useSettings } from "../../lib/stores/ui/useSettings";
import { planets } from "../../lib/planetData";
import { bindInputHandlers, useInput } from "../../stores/useInput";
import { Controls } from "../../lib/controls";

export function CameraController() {
  const { camera } = useThree();
  const velocityRef = useRef(new THREE.Vector3());
  const accelerationRef = useRef(new THREE.Vector3());
  const [, get] = useKeyboardControls<Controls>();
  const { selectedPlanet, isLanding, setIsLanding, setCameraPosition, time } =
    useSolarSystem();
  const { addProjectile } = useShooting();
  const { playLaser } = useAudio();
  const { setThrusting, setWarpMode, isWarpMode, upgrades } = useShipStatus();
  const { showSplash } = useGame();
  const { setGyroEnabled, setDragging } = useInput();
  const { sensitivity, invertY } = useSettings();
  const lastShotTimeRef = useRef(0);
  const lastLandingAttemptRef = useRef(0);
  const lastMenuPressRef = useRef(0);
  const lastCenterPressRef = useRef(0);
  const lastForwardPressRef = useRef(0);
  const forwardDoubleClickRef = useRef(false);
  const warpSpeedMultiplierRef = useRef(1);
  
  // Dynamic FOV state for smooth camera adjustments
  const currentFOVRef = useRef(75);
  const targetFOVRef = useRef(75);
  const defaultFOV = 75;
  const minFOV = 50;
  const maxFOV = 90; // For warp mode

  // Mobile control states
  const mobileRotationRef = useRef(new THREE.Vector2(0, 0));
  const mobileThrustRef = useRef(new THREE.Vector3(0, 0, 0));

  // ===== PERFORMANCE OPTIMIZATIONS =====
  // Frame counters for throttling expensive operations
  const frameCounterRef = useRef(0);
  const collisionCheckInterval = 4; // Check collisions every 4 frames
  const slerpUpdateInterval = 3; // Update slerp every 3 frames
  const proximityCheckInterval = 5; // Check proximity every 5 frames
  
  // Frame rate monitoring for adaptive quality
  const frameTimesRef = useRef<number[]>([]);
  const targetFrameTime = 1000 / 60; // Target 60 FPS (16.67ms per frame)
  const lowPerfThreshold = targetFrameTime * 1.5; // If frame takes > 25ms, we're in low perf mode
  const isLowPerfRef = useRef(false);
  
  // Cached values to reduce redundant calculations
  const cachedDirectionsRef = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    lastQuaternion: new THREE.Quaternion(),
    needsUpdate: true
  });
  
  // Cached planet positions (updated less frequently)
  const cachedPlanetPositionsRef = useRef<Map<string, { position: THREE.Vector3, lastUpdate: number }>>(new Map());
  const planetPositionCacheDuration = 100; // Cache planet positions for 100ms
  
  // Pre-allocated vectors to avoid garbage collection
  const tempVec3_1 = useRef(new THREE.Vector3());
  const tempVec3_2 = useRef(new THREE.Vector3());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempMatrix = useRef(new THREE.Matrix4());

  // Mobile control handlers for InputBus
  const handleMobileShoot = () => {
    const currentTime = performance.now() / 1000;
    if (currentTime - lastShotTimeRef.current > 0.2) {
      // Use cached forward direction if available
      const forward = cachedDirectionsRef.current.forward.clone();
      if (forward.lengthSq() === 0) {
        forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      }
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
  };

  const handleMobileLand = () => {
    const currentTime = performance.now() / 1000;
    
    // Debounce landing attempts to prevent spam
    if (currentTime - lastLandingAttemptRef.current < 2) return;
    lastLandingAttemptRef.current = currentTime;

    console.log("[MOBILE-CONTROLS] Landing button pressed");

    // Check if already landing or landed
    if (isLanding || isLanded) {
      console.log("[MOBILE-CONTROLS] Already landing or landed - ignoring");
      return;
    }

    // Same landing logic as keyboard controls
    if (selectedPlanet && !isMining && !isAutopilotActive) {
      // Get the target planet data
      const targetPlanet = planets.find(p => p.name === selectedPlanet);
      if (!targetPlanet) {
        console.log("[MOBILE-CONTROLS] Invalid planet selected");
        return;
      }

      // Use cached planet position if available
      const planetPosition = getCachedPlanetPosition(targetPlanet);
      const distance = camera.position.distanceTo(planetPosition);

      console.log(`[MOBILE-CONTROLS] Attempting to land on ${selectedPlanet} at distance ${distance.toFixed(1)}`);

      const requiredDistance = targetPlanet.size * 8; // Same as keyboard controls

      if (distance <= requiredDistance) {
        setIsLanding(true);
        console.log(`[MOBILE-CONTROLS] Landing initiated on ${selectedPlanet}!`);
      } else {
        // Show landing warning with autopilot option
        showWarning(selectedPlanet, distance, requiredDistance);
        console.log(`[MOBILE-CONTROLS] Too far to land (${distance.toFixed(1)} > ${requiredDistance.toFixed(1)})`);
      }
    } else {
      console.log("[MOBILE-CONTROLS] Cannot land - no planet selected or other operation in progress");
    }
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
    enterOrbit,
    updateThrusterVolume,
  } = useAutopilot();

  // Equipment system for ship degradation and fuel
  const {
    consumeFuel: consumeShipFuel,
    applyShipDegradation,
    getEquipment,
    getPerformanceMultiplier,
  } = useEquipment();

  // Mining system - prevent movement when mining
  const { isActive: isMining } = useMining();

  // Landed state - prevent movement when landed on surface
  const { isLanded, isTakingOff, getTakeoffOrbitPosition } = useLandedState();

  // Proximity camera state for manual planet approach
  const [isProximityCameraActive, setProximityCameraActive] = useState(false);

  // Track takeoff state to trigger positioning
  const [hasTakeoffPending, setHasTakeoffPending] = useState(false);

  // ===== HELPER FUNCTIONS =====
  // Get cached planet position with automatic cache invalidation
  const getCachedPlanetPosition = (planetData: any): THREE.Vector3 => {
    const now = performance.now();
    const cacheKey = planetData.name;
    const cached = cachedPlanetPositionsRef.current.get(cacheKey);
    
    if (cached && (now - cached.lastUpdate) < planetPositionCacheDuration) {
      return cached.position;
    }
    
    // Calculate fresh position
    const universeTime = useSolarSystem.getState().getUniverseTime();
    const angle = universeTime * planetData.orbitalSpeed;
    const planetX = Math.cos(angle) * planetData.distance;
    const planetZ = Math.sin(angle) * planetData.distance;
    const position = new THREE.Vector3(planetX, 0, planetZ);
    
    // Update cache
    cachedPlanetPositionsRef.current.set(cacheKey, {
      position: position.clone(),
      lastUpdate: now
    });
    
    return position;
  };

  // Update cached direction vectors when quaternion changes significantly
  const updateCachedDirections = () => {
    const cache = cachedDirectionsRef.current;
    const quaternionChanged = !camera.quaternion.equals(cache.lastQuaternion);
    
    if (quaternionChanged || cache.needsUpdate) {
      cache.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      cache.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      cache.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      cache.lastQuaternion.copy(camera.quaternion);
      cache.needsUpdate = false;
    }
  };

  // Monitor frame rate performance
  const updatePerformanceMetrics = (deltaMs: number) => {
    const times = frameTimesRef.current;
    times.push(deltaMs);
    
    // Keep only last 30 frames for averaging
    if (times.length > 30) {
      times.shift();
    }
    
    // Calculate average frame time
    if (times.length >= 10) {
      const avgFrameTime = times.reduce((a, b) => a + b, 0) / times.length;
      isLowPerfRef.current = avgFrameTime > lowPerfThreshold;
    }
  };

  // Check for pending takeoff on mount and when takeoffPlanetName changes
  useEffect(() => {
    const checkForTakeoff = () => {
      const takeoffPlanetName = useLandedState.getState().takeoffPlanetName;
      if (takeoffPlanetName) {
        setHasTakeoffPending(true);
      }
    };
    
    // Check immediately on mount
    checkForTakeoff();
    
    // Subscribe to changes in landed state
    const unsubscribe = useLandedState.subscribe(
      (state) => {
        if (state.takeoffPlanetName) {
          setHasTakeoffPending(true);
        }
      }
    );
    
    return unsubscribe;
  }, []);

  // Handle ship positioning after takeoff from planet surface
  useEffect(() => {
    if (!hasTakeoffPending) return;
    
    // Check if we need to position ship after takeoff
    const takeoffPosition = getTakeoffOrbitPosition();
    
    if (takeoffPosition) {
      console.log("[TAKEOFF] Positioning ship in orbit after takeoff");
      
      // Position camera at orbital location
      camera.position.copy(takeoffPosition.position);
      setCameraPosition(takeoffPosition.position);
      
      // Set initial velocity for orbital motion
      velocityRef.current.copy(takeoffPosition.velocity);
      
      // Select the planet we took off from
      const takeoffPlanetName = useLandedState.getState().takeoffPlanetName;
      if (takeoffPlanetName) {
        useSolarSystem.getState().setSelectedPlanet(takeoffPlanetName);
      }
      
      console.log("[TAKEOFF] Ship positioned successfully:", {
        position: takeoffPosition.position,
        velocity: takeoffPosition.velocity,
        planet: takeoffPlanetName
      });
      
      // Clear the pending takeoff flag
      setHasTakeoffPending(false);
    }
  }, [hasTakeoffPending, camera, setCameraPosition, getTakeoffOrbitPosition]);

  useFrame((state, delta) => {
    // Performance monitoring
    const frameStartTime = performance.now();
    
    // Increment frame counter
    frameCounterRef.current++;
    const frameCount = frameCounterRef.current;
    
    // Skip heavy processing on low performance
    const skipHeavyProcessing = isLowPerfRef.current && (frameCount % 2 === 0);
    
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

    // Update cached directions only when needed (every few frames)
    if (frameCount % 2 === 0) {
      updateCachedDirections();
    }
    
    // Use cached directions
    const { forward, right, up } = cachedDirectionsRef.current;

    // Check if we have fuel before applying thrusters (from equipment system)
    const fuelTank = getEquipment("fuel-tank");
    const hasFuel = fuelTank && fuelTank.currentDurability > 0;
    const enginePerformance = getPerformanceMultiplier("engine-main");
    let thrusterActive = false;

    // Apply current modifiers including engine performance
    const baseThrustWithPerformance = baseThrustPower * enginePerformance;
    const thrustPower = isWarpMode
      ? baseThrustWithPerformance * warpThrustMultiplier
      : baseThrustWithPerformance;
    const maxVelocity = isWarpMode
      ? warpMaxVelocity * enginePerformance
      : baseMaxVelocity * enginePerformance;

    // Disable movement controls when autopilot is active, mining, landing, or landed on surface
    if (!isAutopilotActive && !isMining && !isLanding && !isLanded) {
      // Detect double-click for warp mode
      const currentTime = performance.now();
      if (controls.forward && hasFuel) {
        // Check for double-click
        if (currentTime - lastForwardPressRef.current < 300) {
          // 300ms window for double-click
          const currentFuel = fuelTank?.currentDurability || 0;
          if (upgrades.warpCapability || currentFuel > 30) {
            // Need warp upgrade OR sufficient fuel
            setWarpMode(true);
            forwardDoubleClickRef.current = true;
            console.log("Warp mode activated!");
          }
        }
        lastForwardPressRef.current = currentTime;

        // Use temp vector to avoid creating new objects
        tempVec3_1.current.copy(forward).multiplyScalar(thrustPower);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      } else if (!controls.forward && isWarpMode) {
        // Deactivate warp when forward key is released
        setWarpMode(false);
        forwardDoubleClickRef.current = false;
        console.log("Warp mode deactivated");
      }
      if (controls.backward && hasFuel) {
        tempVec3_1.current.copy(forward).multiplyScalar(-thrustPower * 0.7);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }
      if (controls.left && hasFuel) {
        tempVec3_1.current.copy(right).multiplyScalar(-thrustPower * 0.8);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }
      if (controls.right && hasFuel) {
        tempVec3_1.current.copy(right).multiplyScalar(thrustPower * 0.8);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }
      if (controls.up && hasFuel) {
        tempVec3_1.current.copy(up).multiplyScalar(thrustPower * 0.6);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }
      if (controls.down && hasFuel) {
        tempVec3_1.current.copy(up).multiplyScalar(-thrustPower * 0.6);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }
    } // End movement controls check (autopilot, mining, landing, landed)

    // Add mobile thrust input (also disabled during autopilot, mining, landing, or landed)
    const mobileThrust = mobileThrustRef.current;
    
    if (
      mobileThrust.length() > 0 &&
      hasFuel &&
      !isAutopilotActive &&
      !isMining &&
      !isLanding &&
      !isLanded
    ) {
      // Use cached directions for mobile thrust
      tempVec3_1.current.copy(forward).multiplyScalar(mobileThrust.z * mobileThrustPower);
      tempVec3_2.current.copy(right).multiplyScalar(mobileThrust.x * mobileThrustPower);
      
      acceleration.add(tempVec3_1.current);
      acceleration.add(tempVec3_2.current);
      acceleration.add(up.clone().multiplyScalar(mobileThrust.y * mobileThrustPower));
      thrusterActive = true;

      // Visual feedback for thrust
      const thrustIndicator = document.getElementById("thrust-indicator");
      if (thrustIndicator) {
        thrustIndicator.style.opacity = "1";
        (thrustIndicator.nextElementSibling as HTMLElement).textContent =
          "ACTIVE";
      }
    } else {
      // Reset thrust indicator when not thrusting
      const thrustIndicator = document.getElementById("thrust-indicator");
      if (thrustIndicator && thrustIndicator.style.opacity !== "0") {
        thrustIndicator.style.opacity = "0";
        (thrustIndicator.nextElementSibling as HTMLElement).textContent =
          "IDLE";
      }
    }

    // Stop all movement when mining, landing, or landed on surface
    if (isMining || isLanding || isLanded) {
      velocity.set(0, 0, 0);
      acceleration.set(0, 0, 0);
    } else {
      // Apply acceleration to velocity
      tempVec3_1.current.copy(acceleration).multiplyScalar(delta);
      velocity.add(tempVec3_1.current);

      // Apply drag/friction
      velocity.multiplyScalar(dragCoefficient);
    }

    // Planet collision detection - THROTTLED (only check every N frames)
    if (!skipHeavyProcessing && frameCount % collisionCheckInterval === 0 && 
        !isAutopilotActive && !isLanding && !isLanded) {
      tempVec3_1.current.copy(velocity).multiplyScalar(delta);
      const proposedPosition = tempVec3_2.current.copy(camera.position).add(tempVec3_1.current);
      
      for (const planetData of planets) {
        // Use cached planet position
        const planetPosition = getCachedPlanetPosition(planetData);
        
        // Check collision with planet (using planet size as collision radius)
        const collisionRadius = planetData.size * 2.5; // Slightly larger than visual size for safety margin
        const distanceToProposed = proposedPosition.distanceTo(planetPosition);
        
        if (distanceToProposed < collisionRadius) {
          // Collision detected! Stop movement towards planet
          const directionToPlanet = tempVec3_1.current.copy(planetPosition).sub(camera.position).normalize();
          const velocityTowardsPlanet = velocity.dot(directionToPlanet);
          
          if (velocityTowardsPlanet > 0) {
            // Only prevent movement if heading towards planet
            // Bounce back with reduced velocity
            const bounce = directionToPlanet.multiplyScalar(-velocityTowardsPlanet * 0.5);
            velocity.add(bounce);
            
            // Push camera slightly away from planet surface
            const pushDistance = collisionRadius - camera.position.distanceTo(planetPosition);
            if (pushDistance > 0) {
              const pushDirection = tempVec3_1.current.copy(camera.position).sub(planetPosition).normalize();
              camera.position.add(pushDirection.multiplyScalar(pushDistance + 0.5));
            }
            
            console.log(`Collision with ${planetData.name} prevented at distance ${distanceToProposed.toFixed(1)}`);
          }
        }
      }
    }

    // Landing mode - only allow if close to planet and not recently attempted
    if (controls.land && selectedPlanet && !isLanding) {
      const currentTime = state.clock.elapsedTime;

      // Check if enough time has passed since last landing attempt (2 second cooldown)
      if (currentTime - lastLandingAttemptRef.current > 2) {
        // Find the selected planet data
        const planetData = planets.find((p) => p.name === selectedPlanet);

        if (planetData) {
          // Use cached planet position
          const planetPosition = getCachedPlanetPosition(planetData);

          // Check distance to planet
          const distanceToPlanet = camera.position.distanceTo(planetPosition);
          const landingRange = planetData.size * 12; // Must be within 12x planet radius (more forgiving)

          if (distanceToPlanet <= landingRange) {
            setIsLanding(true);
            lastLandingAttemptRef.current = currentTime;
            console.log(
              `Attempting to land on ${selectedPlanet} (distance: ${Math.round(distanceToPlanet)})`,
            );
          } else {
            console.log(
              `Too far from ${selectedPlanet} to land! Distance: ${Math.round(distanceToPlanet)}, required: ${Math.round(landingRange)}`,
            );

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
        if (currentTime - lastShotTimeRef.current > 0.2) {
          // 200ms cooldown
          lastShotTimeRef.current = currentTime;

          // Use cached forward direction
          const shootDirection = cachedDirectionsRef.current.forward.clone();
          
          // Create projectile from camera position
          console.log("Firing laser...");
          addProjectile(camera.position.clone(), shootDirection);
          playLaser();
        }
      } catch (error) {
        console.error("Error firing laser:", error);
      }
    }

    // Mouse and mobile look controls with damping for smoother rotation
    const mouse = state.mouse;
    camera.rotation.order = "YXZ";

    // Only apply look controls if not landing
    if (!isLanding) {
      // Combine mouse and mobile rotation inputs
      const mouseX = mouse.x * sensitivity;
      const mouseY = mouse.y * sensitivity * (invertY ? -1 : 1);
      const mobileX = mobileRotationRef.current.x * 0.1; // Scale mobile input
      const mobileY = mobileRotationRef.current.y * 0.1 * (invertY ? -1 : 1);

      const targetRotationY = camera.rotation.y - (mouseX + mobileX);
      const targetRotationX = THREE.MathUtils.clamp(
        camera.rotation.x - (mouseY + mobileY),
        -Math.PI / 2,
        Math.PI / 2,
      );

      // Apply rotational damping
      camera.rotation.y = THREE.MathUtils.lerp(
        camera.rotation.y,
        targetRotationY,
        rotationalDamping,
      );
      camera.rotation.x = THREE.MathUtils.lerp(
        camera.rotation.x,
        targetRotationX,
        rotationalDamping,
      );

      // Decay mobile rotation input
      mobileRotationRef.current.multiplyScalar(0.95);
    }

    // Exit to menu
    if (controls.menu) {
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastMenuPressRef.current > 0.5) {
        // 500ms cooldown to prevent spam
        lastMenuPressRef.current = currentTime;
        console.log("Returning to main menu...");
        showSplash();
      }
    }

    // Center camera
    if (controls.center) {
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastCenterPressRef.current > 0.3) {
        // 300ms cooldown
        lastCenterPressRef.current = currentTime;
        console.log("Centering camera...");

        // Smoothly return camera to center position (looking forward)
        camera.rotation.x = 0;
        camera.rotation.y = 0;
        camera.rotation.z = 0;
      }
    }

    // Autopilot system with orbital mechanics - THROTTLED SLERP
    // Check !isLanded to prevent autopilot from running when docked/landed
    if (isAutopilotActive && selectedPlanet && !isLanded) {
      // Calculate current planet position dynamically
      const planetData = planets.find((p) => p.name === selectedPlanet);
      if (planetData) {
        // Use cached planet position
        const currentPlanetPosition = getCachedPlanetPosition(planetData);

        // Update autopilot target to follow moving planet
        if (autopilotTarget) {
          autopilotTarget.copy(currentPlanetPosition);
        }

        const distanceToTarget = camera.position.distanceTo(
          currentPlanetPosition,
        );
        const autopilotSpeed = 4; // Reduced speed for extended travel time
        const landingDistance = planetData.size * 12; // Use proper landing distance from game logic

        // Disable warp mode during autopilot for consistent behavior
        if (isWarpMode) {
          setWarpMode(false);
        }

        if (!isOrbiting && distanceToTarget > landingDistance) {
          // Approach phase - fly towards current planet position
          const direction = tempVec3_1.current.copy(currentPlanetPosition)
            .sub(camera.position)
            .normalize();

          // Only update quaternion slerp on certain frames to reduce computation
          if (!skipHeavyProcessing && frameCount % slerpUpdateInterval === 0) {
            const targetQuaternion = tempQuaternion.current;
            const lookAtMatrix = tempMatrix.current;
            lookAtMatrix.lookAt(
              camera.position,
              currentPlanetPosition,
              new THREE.Vector3(0, 1, 0),
            );
            targetQuaternion.setFromRotationMatrix(lookAtMatrix);

            // Smooth interpolation towards target orientation
            camera.quaternion.slerp(targetQuaternion, delta * 1.5);
          }

          // Move towards target with warping effects
          const autopilotVelocity = direction.multiplyScalar(
            autopilotSpeed * delta,
          );
          velocity.add(autopilotVelocity);

          // Check if we should enter orbit (within landing distance)
          if (distanceToTarget <= landingDistance + 5) {
            enterOrbit(landingDistance);
            console.log(
              `Autopilot entering stable orbit around ${selectedPlanet} at ${landingDistance} units`,
            );
          }
        } else if (isOrbiting) {
          // Orbital phase - smooth orbit around the moving planet center
          const orbitSpeed = 0.15; // Much slower orbital rotation for graceful, cinematic viewing
          const currentOrbitAngle =
            useAutopilot.getState().orbitAngle + orbitSpeed * delta;

          // Update orbit angle smoothly without frequent store updates
          useAutopilot.setState({ orbitAngle: currentOrbitAngle });

          // Calculate smooth orbital position around current planet center
          const orbitX = Math.cos(currentOrbitAngle) * orbitRadius;
          const orbitZ = Math.sin(currentOrbitAngle) * orbitRadius;
          const targetOrbitPosition = tempVec3_1.current.copy(currentPlanetPosition)
            .add(new THREE.Vector3(orbitX, 0, orbitZ));

          // Smooth orbital movement using gentle interpolation
          const currentPosition = camera.position.clone();
          const smoothFactor = delta * 2.0; // Gentle movement factor
          const newPosition = currentPosition.lerp(
            targetOrbitPosition,
            smoothFactor,
          );

          // Apply the smooth position directly to camera
          camera.position.copy(newPosition);

          // Only update quaternion slerp on certain frames
          if (!skipHeavyProcessing && frameCount % slerpUpdateInterval === 0) {
            // Smoothly orient camera toward planet with very gentle rotation
            const targetQuaternion = tempQuaternion.current;
            const lookAtMatrix = tempMatrix.current;
            const upVector = new THREE.Vector3(0, 1, 0);

            lookAtMatrix.lookAt(camera.position, currentPlanetPosition, upVector);
            targetQuaternion.setFromRotationMatrix(lookAtMatrix);

            // Very smooth camera rotation for cinematic feel
            camera.quaternion.slerp(targetQuaternion, delta * 1.2);
          }
        }

        // Mark as thrusting during autopilot and consume fuel
        setThrusting(true);
        thrusterActive = true;

        // Consume fuel from equipment system during autopilot
        // Further reduced autopilot fuel consumption with efficiency factors
        const baseAutopilotRate = 0.2; // Further reduced to make fuel last longer
        const { getFuelEfficiencyMultiplier } = useEquipment.getState();
        const fuelEfficiency = getFuelEfficiencyMultiplier();
        
        // Apply crew pilot bonus if available
        const crewState = (window as any).crewManagement;
        const crewFuelBonus = 1 - (crewState?.bonuses?.fuelEfficiency || 0); // Convert percentage reduction to multiplier
        
        const finalAutopilotConsumption =
          baseAutopilotRate * fuelEfficiency * crewFuelBonus * delta;

        if (!consumeShipFuel(finalAutopilotConsumption)) {
          console.warn("Out of fuel! Autopilot deactivated.");
          deactivateAutopilot();
        } else {
          // Update thruster volume based on current fuel level
          updateThrusterVolume();
        }

        // Apply ship degradation during autopilot travel
        const travelIntensity = distanceToTarget > landingDistance ? 1.0 : 0.5; // Higher intensity during approach
        applyShipDegradation("autopilot", travelIntensity, delta);
      }
    }

    // Proximity-based camera behavior - THROTTLED (check every N frames)
    if (!skipHeavyProcessing && frameCount % proximityCheckInterval === 0 &&
        !isAutopilotActive && selectedPlanet && !isMining && !isLanding && !isLanded) {
      const planetData = planets.find((p) => p.name === selectedPlanet);
      if (planetData) {
        // Use cached planet position
        const currentPlanetPosition = getCachedPlanetPosition(planetData);

        const distanceToPlanet = camera.position.distanceTo(currentPlanetPosition);
        const proximityEnterDistance = planetData.size * 15; // Enter proximity mode a bit further out
        const proximityExitDistance = planetData.size * 18; // Hysteresis to prevent jitter

        // Check proximity with hysteresis
        if (!isProximityCameraActive && distanceToPlanet < proximityEnterDistance) {
          setProximityCameraActive(true);
          console.log(`[PROXIMITY] Entering proximity camera mode for ${selectedPlanet} (distance: ${Math.round(distanceToPlanet)})`);
        } else if (isProximityCameraActive && distanceToPlanet > proximityExitDistance) {
          setProximityCameraActive(false);
          console.log(`[PROXIMITY] Exiting proximity camera mode for ${selectedPlanet} (distance: ${Math.round(distanceToPlanet)})`);
        }

        // Apply smooth camera adjustments when in proximity
        if (isProximityCameraActive) {
          // Calculate proximity factor (0 to 1, where 1 is very close)
          const proximityFactor = Math.max(0, 1 - (distanceToPlanet - planetData.size * 3) / (proximityEnterDistance - planetData.size * 3));
          
          // Adjust FOV based on proximity (zoom in slightly when close)
          const targetFOV = defaultFOV - (proximityFactor * 10); // Max 10 degree reduction
          targetFOVRef.current = targetFOV;
          
          // Only apply camera adjustments every few frames
          if (frameCount % slerpUpdateInterval === 0) {
            // Subtle camera orientation adjustment towards planet
            const toPlanet = tempVec3_1.current.copy(currentPlanetPosition).sub(camera.position).normalize();
            const currentForward = tempVec3_2.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
            
            // Only adjust if not looking directly at planet
            const dotProduct = currentForward.dot(toPlanet);
            if (dotProduct < 0.95) { // Not looking directly at planet
              // Create target quaternion that partially looks at planet
              const targetQuaternion = tempQuaternion.current;
              const lookAtMatrix = tempMatrix.current;
              
              // Blend between current forward and planet direction
              const blendedTarget = currentForward.lerp(toPlanet, proximityFactor * 0.3);
              const lookTarget = camera.position.clone().add(blendedTarget);
              
              lookAtMatrix.lookAt(camera.position, lookTarget, new THREE.Vector3(0, 1, 0));
              targetQuaternion.setFromRotationMatrix(lookAtMatrix);
              
              // Very subtle adjustment
              camera.quaternion.slerp(targetQuaternion, delta * 0.5 * proximityFactor);
            }
          }
        }
      }
    }

    // Update camera FOV smoothly (if using perspective camera)
    if (camera instanceof THREE.PerspectiveCamera) {
      currentFOVRef.current = THREE.MathUtils.lerp(
        currentFOVRef.current,
        targetFOVRef.current,
        delta * 2,
      );
      camera.fov = currentFOVRef.current;
      camera.updateProjectionMatrix();
    }

    // Apply velocity to camera position
    if (!isLanding && !isLanded && !isMining) {
      tempVec3_1.current.copy(velocity).multiplyScalar(delta);
      camera.position.add(tempVec3_1.current);
    }

    // Update camera position in store
    setCameraPosition(camera.position);

    // Consume fuel if thrusting (consolidated at end of frame)
    if (thrusterActive && !isAutopilotActive) {
      // Calculate fuel consumption based on mode and efficiency
      const baseFuelRate = isWarpMode ? warpFuelConsumption : 1.0;
      const { getFuelEfficiencyMultiplier } = useEquipment.getState();
      const fuelEfficiency = getFuelEfficiencyMultiplier();
      
      // Apply crew pilot bonus if available
      const crewState = (window as any).crewManagement;
      const crewFuelBonus = 1 - (crewState?.bonuses?.fuelEfficiency || 0);
      
      const finalFuelConsumption = baseFuelRate * fuelEfficiency * crewFuelBonus * delta;
      
      if (!consumeShipFuel(finalFuelConsumption)) {
        console.warn("Out of fuel!");
        // Deactivate warp mode if out of fuel
        if (isWarpMode) {
          setWarpMode(false);
        }
      }
      
      // Apply ship degradation during manual flight
      const flightIntensity = isWarpMode ? 2.0 : 1.0;
      applyShipDegradation("autopilot", flightIntensity, delta);
    }

    // Update thruster state
    setThrusting(thrusterActive);
    
    // Performance monitoring at end of frame
    const frameEndTime = performance.now();
    const frameDuration = frameEndTime - frameStartTime;
    updatePerformanceMetrics(frameDuration);
  });

  // Bind input handlers to InputBus (mobile support)
  useEffect(() => {
    bindInputHandlers({
      onLook: handleMobileLook,
      onMove: handleMobileMove,
      onShoot: handleMobileShoot,
      onLand: handleMobileLand,
    });

    return () => {
      console.log("[CameraController] Input handlers unbound");
      // No longer unbinding as the store manager handles global cleanup
      
      // Instead, we just reset our local control inputs
      setGyroEnabled(false);
      setDragging(false);
      
      // Also cleanup at the InputBus level
      (window as any).InputBus?.removeHandlers({
        onLook: () => {},
        onMove: () => {},
        onShoot: () => {},
        onLand: () => {},
      });
    };
  }, []);

  return null;
}