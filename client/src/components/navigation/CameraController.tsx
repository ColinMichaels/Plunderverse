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
import { useKeyboardControls } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSolarSystem } from "@/lib/stores/space/useSolarSystem";
import { useShooting } from "@/lib/stores/combat/useShooting";
import { useAudio } from "@/lib/stores/ui/useAudio";
import { useShipStatus } from "@/lib/stores/ship/useShipStatus";
import { useGame } from "@/lib/stores/ui/useGame";
import { useLandingWarning } from "@/lib/stores/surface/useLandingWarning";
import { useAutopilot } from "@/lib/stores/navigation/useAutopilot";
import { useEquipment } from "@/lib/stores/ship/useEquipment";
import { useMining } from "@/lib/stores/economy/useMining";
import { useLandedState } from "@/lib/stores/surface/useLandedState";
import { useSettings } from "@/lib/stores/ui/useSettings";
import { planets } from "@/lib/planetData";
import { bindInputHandlers, useInput } from "@/stores/useInput";
import { Controls } from "@/lib/controls";
import { useWeaponSystems } from "@/lib/stores/combat/useWeaponSystems";
import { useFocusState } from "@/lib/stores/ui/useFocusState";
import { BoostMeter } from "@/components/ui/BoostMeter";

export function CameraController() {
  const { camera } = useThree();
  const velocityRef = useRef(new THREE.Vector3());
  const accelerationRef = useRef(new THREE.Vector3());
  const [, get] = useKeyboardControls<Controls>();
  const { selectedPlanet, isLanding, setIsLanding, setCameraPosition, setShipPosition, setShipRotation, setShipVelocity, hasRestoredState, setHasRestoredState } =
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
  const lastTorpedoPressRef = useRef(0);
  const lastMissilePressRef = useRef(0);

  // Focus state management - use global focus state store
  const { hasFocus, isPaused, setFocus } = useFocusState();

  // ===== ADVANCED FLIGHT CONTROL SYSTEM =====
  // Thrust ramping system
  const thrustHoldTimeRef = useRef<Record<string, number>>({
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0,
  });
  const thrustRampDuration = 0.5; // Ramp to 100% over 0.5 seconds
  const tapThreshold = 0.15; // 150ms for tap detection

  // Boost system state
  const boostMeterRef = useRef(100); // Max 100 units
  const maxBoostMeter = 100;
  const boostDrainRate = 20; // Units per second
  const boostRegenRate = 10; // Units per second
  const boostMultiplier = 2.5; // 2.5x thrust when boosting
  const boostVelocityMultiplier = 1.5; // 50% velocity increase
  const isBoostingRef = useRef(false);

  // Rotation ramping system
  const rotationHoldTimeRef = useRef<Record<string, number>>({
    left: 0,
    right: 0,
    up: 0,
    down: 0,
  });
  const rotationRampDuration = 0.3; // Ramp rotation over 0.3 seconds

  // Friction damping
  const frictionCoefficient = 0.95; // Applied when not thrusting
  const minVelocityThreshold = 0.01; // Below this, velocity is clamped to 0

  // Track key press times for tap detection
  const keyPressTimeRef = useRef<Record<string, number>>({
    forward: 0,
    backward: 0,
    left: 0,
    right: 0,
    up: 0,
    down: 0,
  });

  // Track key states
  const previousKeyStateRef = useRef<Record<string, boolean>>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  });

  // Dynamic FOV state for smooth camera adjustments
  const currentFOVRef = useRef(75);
  const targetFOVRef = useRef(75);
  const defaultFOV = 75;

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
    needsUpdate: true,
  });

  // Cached planet positions (updated less frequently)
  const cachedPlanetPositionsRef = useRef<
    Map<string, { position: THREE.Vector3; lastUpdate: number }>
  >(new Map());
  const planetPositionCacheDuration = 100; // Cache planet positions for 100ms

  // Pre-allocated vectors to avoid garbage collection
  const tempVec3_1 = useRef(new THREE.Vector3());
  const tempVec3_2 = useRef(new THREE.Vector3());
  const tempQuaternion = useRef(new THREE.Quaternion());
  const tempMatrix = useRef(new THREE.Matrix4());

  // Track previous planet position for velocity calculation during orbit
  const previousPlanetPositionRef = useRef<THREE.Vector3 | null>(null);
  const trackedPlanetNameRef = useRef<string | null>(null);

  // ===== HELPER FUNCTIONS =====
  // Easing function for smooth acceleration curves
  const easeInOutQuad = (t: number): number => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  };

  // Calculate thrust multiplier based on hold time
  const calculateThrustMultiplier = (
    holdTime: number,
    isTap: boolean,
  ): number => {
    if (isTap) {
      return 0.3; // 30% instant thrust for taps
    }
    const rampProgress = Math.min(1.0, holdTime / thrustRampDuration);
    return easeInOutQuad(rampProgress);
  };

  // Calculate rotation multiplier based on hold time
  const calculateRotationMultiplier = (
    holdTime: number,
    isTap: boolean,
  ): number => {
    if (isTap) {
      return 0.3; // 30% instant rotation for taps
    }
    const rampProgress = Math.min(1.0, holdTime / rotationRampDuration);
    return easeInOutQuad(rampProgress);
  };

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
      const targetPlanet = planets.find((p) => p.name === selectedPlanet);
      if (!targetPlanet) {
        console.log("[MOBILE-CONTROLS] Invalid planet selected");
        return;
      }

      // Use cached planet position if available
      const planetPosition = getCachedPlanetPosition(targetPlanet);
      const distance = camera.position.distanceTo(planetPosition);

      console.log(
        `[MOBILE-CONTROLS] Attempting to land on ${selectedPlanet} at distance ${distance.toFixed(1)}`,
      );

      const requiredDistance = targetPlanet.size * 8; // Same as keyboard controls

      if (distance <= requiredDistance) {
        setIsLanding(true);
        console.log(
          `[MOBILE-CONTROLS] Landing initiated on ${selectedPlanet}!`,
        );
      } else {
        // Show landing warning with autopilot option
        showWarning(selectedPlanet, distance, requiredDistance);
        console.log(
          `[MOBILE-CONTROLS] Too far to land (${distance.toFixed(1)} > ${requiredDistance.toFixed(1)})`,
        );
      }
    } else {
      console.log(
        "[MOBILE-CONTROLS] Cannot land - no planet selected or other operation in progress",
      );
    }
  };

  // Warning and autopilot stores
  const { showWarning } = useLandingWarning();
  const {
    isActive: isAutopilotActive,
    target: autopilotTarget,
    activateCinematic: activateAutopilot,
    deactivate: deactivateAutopilot,
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

  // Weapon systems for torpedo and missile
  const {
    startLocking,
    updateLocking,
    cancelLocking,
    fireTorpedo,
    fireMissile,
    updateCooldowns,
    updateHomingProjectiles,
    isLocking,
    currentTarget,
  } = useWeaponSystems();

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

    if (cached && now - cached.lastUpdate < planetPositionCacheDuration) {
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
      lastUpdate: now,
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

  // Focus management - track window focus/blur events
  useEffect(() => {
    const handleFocus = () => {
      console.log("[FOCUS] Game window gained focus");
      setFocus(true);
    };

    const handleBlur = () => {
      console.log("[FOCUS] Game window lost focus");
      setFocus(false);
      // Velocity preserved - will coast down naturally via friction
    };

    // Listen for both window and document focus events for better coverage
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    });

    // Also handle canvas click to regain focus
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const handleCanvasClick = () => {
        if (!hasFocus) {
          console.log("[FOCUS] Canvas clicked - regaining focus");
          setFocus(true);
        }
      };
      canvas.addEventListener("click", handleCanvasClick);

      return () => {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        canvas.removeEventListener("click", handleCanvasClick);
      };
    }

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [setFocus, hasFocus]);

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
    return useLandedState.subscribe((state) => {
      if (state.takeoffPlanetName) {
        setHasTakeoffPending(true);
      }
    });
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
        planet: takeoffPlanetName,
      });

      // Clear the pending takeoff flag
      setHasTakeoffPending(false);
    }
  }, [hasTakeoffPending, camera, setCameraPosition, getTakeoffOrbitPosition]);

  useFrame((state, delta) => {
    // Don't update if the game is paused
    if (isPaused) return;

    // Performance monitoring
    const frameStartTime = performance.now();

    // Increment frame counter
    frameCounterRef.current++;
    const frameCount = frameCounterRef.current;

    // Skip heavy processing on low performance
    const skipHeavyProcessing = isLowPerfRef.current && frameCount % 2 === 0;

    // Only process controls if the game has focus
    // When not focused, provide all control keys with false values to avoid TypeScript errors
    const controls = hasFocus
      ? get()
      : {
          forward: false,
          backward: false,
          left: false,
          right: false,
          up: false,
          down: false,
          shoot: false,
          land: false,
          info: false,
          menu: false,
          center: false,
          flashlight: false,
          charge: false,
          torpedo: false,
          missile: false,
        };
    const velocity = velocityRef.current;
    const acceleration = accelerationRef.current;

    // Rocket propulsion physics constants
    const baseThrustPower = 100; // Much more responsive for combat
    const baseMaxVelocity = 200; // Much higher max velocity for quick maneuvers
    const dragCoefficient = 0.995; // Reduced friction for stickier momentum
    const mobileThrustPower = 100; // Increased for faster mobile movement
    const rotationalDamping = 0.92; // Snappier turning for better combat targeting

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

    // ===== ADVANCED FLIGHT CONTROL IMPLEMENTATION =====
    // Disable movement controls when autopilot is active, mining, landing, or landed on surface
    if (!isAutopilotActive && !isMining && !isLanding && !isLanded) {
      const currentTime = performance.now() / 1000; // Convert to seconds
      const thrustKeys = [
        "forward",
        "backward",
        "left",
        "right",
        "up",
        "down",
      ] as const;

      // Update boost state
      const isBoosting = (controls as any).boost && boostMeterRef.current > 0;
      if (isBoosting !== isBoostingRef.current) {
        isBoostingRef.current = isBoosting;
        if (isBoosting) {
          console.log(
            `[BOOST] Activated! Meter: ${boostMeterRef.current.toFixed(0)}`,
          );
        }
      }

      // Update boost meter
      if (isBoosting) {
        boostMeterRef.current = Math.max(
          0,
          boostMeterRef.current - boostDrainRate * delta,
        );
      } else {
        boostMeterRef.current = Math.min(
          maxBoostMeter,
          boostMeterRef.current + boostRegenRate * delta,
        );
      }

      // Calculate boost modifiers
      const currentBoostMultiplier = isBoosting ? boostMultiplier : 1.0;
      const currentMaxVelocity = isBoosting
        ? maxVelocity * boostVelocityMultiplier
        : maxVelocity;

      // Cache forward key state BEFORE loop updates it (for warp double-tap detection)
      const wasForwardPressed = previousKeyStateRef.current.forward;

      // Track key states for each thrust direction
      thrustKeys.forEach((key) => {
        const isPressed = controls[key];
        const wasPressed = previousKeyStateRef.current[key];

        // Key just pressed
        if (isPressed && !wasPressed) {
          keyPressTimeRef.current[key] = currentTime;
          thrustHoldTimeRef.current[key] = 0;
        }
        // Key held
        else if (isPressed && wasPressed) {
          thrustHoldTimeRef.current[key] += delta;
        }
        // Key just released
        else if (!isPressed && wasPressed) {
          // Reset hold time
          thrustHoldTimeRef.current[key] = 0;
        }

        // Update previous state
        previousKeyStateRef.current[key] = isPressed;
      });

      // ===== DIRECT THRUST SYSTEM (SIMPLE & RESPONSIVE) =====
      // Check for double-tap warp on key press (not every frame)
      if (controls.forward && !wasForwardPressed) {
        // Forward key just pressed - check for double-tap
        const timeSinceLastPress = currentTime - lastForwardPressRef.current;
        if (timeSinceLastPress < 0.3 && lastForwardPressRef.current > 0) {
          // Only activate warp on second press (lastForwardPressRef > 0 means it's not first press)
          const currentFuel = fuelTank?.currentDurability || 0;
          if (upgrades.warpCapability || currentFuel > 30) {
            setWarpMode(true);
            forwardDoubleClickRef.current = true;
            console.log("[WARP] Mode activated!");
          }
        }
        lastForwardPressRef.current = currentTime;
      }
      
      // Forward thrust with simple hold-based ramping
      if (controls.forward && hasFuel) {
        const holdTime = thrustHoldTimeRef.current.forward;
        const multiplier = calculateThrustMultiplier(holdTime, false);
        const effectiveThrust =
          baseThrustWithPerformance * multiplier * currentBoostMultiplier;

        // Apply thrust
        const finalThrust = isWarpMode
          ? effectiveThrust * warpThrustMultiplier
          : effectiveThrust;
        tempVec3_1.current.copy(forward).multiplyScalar(finalThrust);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      } else if (!controls.forward && isWarpMode) {
        setWarpMode(false);
        forwardDoubleClickRef.current = false;
        console.log("[WARP] Mode deactivated");
      }

      // Apply other directional thrust with ease-in/ease-out based on hold time
      if (controls.backward && hasFuel) {
        const multiplier = calculateThrustMultiplier(
          thrustHoldTimeRef.current.backward,
          false,
        );
        const effectiveThrust =
          baseThrustWithPerformance * multiplier * currentBoostMultiplier * 0.7;
        tempVec3_1.current.copy(forward).multiplyScalar(-effectiveThrust);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }

      if (controls.left && hasFuel) {
        const multiplier = calculateThrustMultiplier(
          thrustHoldTimeRef.current.left,
          false,
        );
        const effectiveThrust =
          baseThrustWithPerformance * multiplier * currentBoostMultiplier * 0.8;
        tempVec3_1.current.copy(right).multiplyScalar(-effectiveThrust);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }

      if (controls.right && hasFuel) {
        const multiplier = calculateThrustMultiplier(
          thrustHoldTimeRef.current.right,
          false,
        );
        const effectiveThrust =
          baseThrustWithPerformance * multiplier * currentBoostMultiplier * 0.8;
        tempVec3_1.current.copy(right).multiplyScalar(effectiveThrust);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }

      if (controls.up && hasFuel) {
        const multiplier = calculateThrustMultiplier(
          thrustHoldTimeRef.current.up,
          false,
        );
        const effectiveThrust =
          baseThrustWithPerformance * multiplier * currentBoostMultiplier * 0.6;
        tempVec3_1.current.copy(up).multiplyScalar(effectiveThrust);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }

      if (controls.down && hasFuel) {
        const multiplier = calculateThrustMultiplier(
          thrustHoldTimeRef.current.down,
          false,
        );
        const effectiveThrust =
          baseThrustWithPerformance * multiplier * currentBoostMultiplier * 0.6;
        tempVec3_1.current.copy(up).multiplyScalar(-effectiveThrust);
        acceleration.add(tempVec3_1.current);
        thrusterActive = true;
      }

      // Clamp velocity to max speed (with boost modifier)
      if (velocity.length() > currentMaxVelocity) {
        velocity.normalize().multiplyScalar(currentMaxVelocity);
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
      tempVec3_1.current
        .copy(forward)
        .multiplyScalar(mobileThrust.z * mobileThrustPower);
      tempVec3_2.current
        .copy(right)
        .multiplyScalar(mobileThrust.x * mobileThrustPower);

      acceleration.add(tempVec3_1.current);
      acceleration.add(tempVec3_2.current);
      acceleration.add(
        up.clone().multiplyScalar(mobileThrust.y * mobileThrustPower),
      );
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

    // AIM-BASED DIRECTIONAL THRUST ENHANCEMENT
    // When any thrust is active (keyboard OR mobile), add a component in the direction the camera is aiming
    // This improves combat maneuvering and precise movement control
    if (
      thrusterActive &&
      hasFuel &&
      !isAutopilotActive &&
      !isMining &&
      !isLanding &&
      !isLanded
    ) {
      // Get the actual camera forward direction (where player is aiming) using temp vector
      camera.getWorldDirection(tempVec3_1.current);
      tempVec3_1.current.normalize();

      // Calculate how much the aim direction differs from the ship's forward vector
      const aimDivergence = tempVec3_1.current.dot(forward);

      // Scale aim assist based on how much you're aiming away from ship forward
      // Full assist when aiming perpendicular, less when aligned with ship
      const divergenceScale = Math.max(0, 1 - Math.abs(aimDivergence));
      const aimAssistStrength = 0.35 * (0.5 + 0.5 * divergenceScale); // 17.5-35% based on divergence

      // Add thrust in aimed direction using temp vector (no allocations)
      tempVec3_2.current
        .copy(tempVec3_1.current)
        .multiplyScalar(thrustPower * aimAssistStrength);
      acceleration.add(tempVec3_2.current);
    }

    // Get mouse position for look controls
    const mouse = state.mouse;

    // Stop all movement when mining, landing, or landed on surface
    if (isMining || isLanding || isLanded) {
      velocity.set(0, 0, 0);
      acceleration.set(0, 0, 0);
    } else {
      // Apply acceleration to velocity
      tempVec3_1.current.copy(acceleration).multiplyScalar(delta);
      velocity.add(tempVec3_1.current);

      // ===== SIMPLIFIED FRICTION SYSTEM =====
      // Apply smooth friction-based deceleration
      if (!thrusterActive) {
        // Only apply friction when not actively thrusting
        velocity.multiplyScalar(frictionCoefficient);

        // Clamp very small velocities to zero to prevent drift
        if (velocity.length() < minVelocityThreshold) {
          velocity.set(0, 0, 0);
        }
      } else {
        // Apply reduced drag when thrusting (allows momentum buildup)
        velocity.multiplyScalar(dragCoefficient);
      }
    }

    // Planet collision detection - THROTTLED (only check every N frames)
    if (
      !skipHeavyProcessing &&
      frameCount % collisionCheckInterval === 0 &&
      !isAutopilotActive &&
      !isLanding &&
      !isLanded
    ) {
      tempVec3_1.current.copy(velocity).multiplyScalar(delta);
      const proposedPosition = tempVec3_2.current
        .copy(camera.position)
        .add(tempVec3_1.current);

      for (const planetData of planets) {
        // Use cached planet position
        const planetPosition = getCachedPlanetPosition(planetData);

        // Check collision with planet (using planet size as collision radius)
        const collisionRadius = planetData.size * 2.5; // Slightly larger than visual size for safety margin
        const distanceToProposed = proposedPosition.distanceTo(planetPosition);

        if (distanceToProposed < collisionRadius) {
          // Collision detected! Stop movement towards planet
          const directionToPlanet = tempVec3_1.current
            .copy(planetPosition)
            .sub(camera.position)
            .normalize();
          const velocityTowardsPlanet = velocity.dot(directionToPlanet);

          if (velocityTowardsPlanet > 0) {
            // Only prevent movement if heading towards planet
            // Bounce back with reduced velocity
            const bounce = directionToPlanet.multiplyScalar(
              -velocityTowardsPlanet * 0.5,
            );
            velocity.add(bounce);

            // Push camera slightly away from planet surface
            const pushDistance =
              collisionRadius - camera.position.distanceTo(planetPosition);
            if (pushDistance > 0) {
              const pushDirection = tempVec3_1.current
                .copy(camera.position)
                .sub(planetPosition)
                .normalize();
              camera.position.add(
                pushDirection.multiplyScalar(pushDistance + 0.5),
              );
            }

            console.log(
              `Collision with ${planetData.name} prevented at distance ${distanceToProposed.toFixed(1)}`,
            );
          }
        }
      }
    }

    // Landing mode - only allow if close to planet and not recently attempted
    // Disable landing during autopilot to prevent interference
    if (controls.land && selectedPlanet && !isLanding && !isAutopilotActive) {
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

    // Shooting - disable all weapon controls during autopilot to prevent interference
    if (!isAutopilotActive) {
      // Basic shooting
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

      // Torpedo lock-on and fire (T key)
      if (controls && controls.torpedo) {
        const currentTime = state.clock.elapsedTime;
        if (currentTime - lastTorpedoPressRef.current > 0.5) {
          lastTorpedoPressRef.current = currentTime;

          const cameraDirection = cachedDirectionsRef.current.forward.clone();

          if (isLocking && currentTarget && currentTarget.lockProgress >= 1) {
            // Fire torpedo if locked
            fireTorpedo(camera.position.clone(), cameraDirection);
          } else {
            // Start locking
            startLocking(camera.position.clone(), cameraDirection);
          }
        }
      } else if (isLocking && !controls.torpedo) {
        // Release key cancels lock
        cancelLocking();
      }

      // Missile lock-on and fire (M key)
      if (controls && controls.missile) {
        const currentTime = state.clock.elapsedTime;
        if (currentTime - lastMissilePressRef.current > 0.5) {
          lastMissilePressRef.current = currentTime;

          const cameraDirection = cachedDirectionsRef.current.forward.clone();

          if (isLocking && currentTarget && currentTarget.lockProgress >= 1) {
            // Fire missile if locked
            fireMissile(camera.position.clone(), cameraDirection);
          } else {
            // Start locking
            startLocking(camera.position.clone(), cameraDirection);
          }
        }
      } else if (isLocking && !controls.missile) {
        // Release key cancels lock
        cancelLocking();
      }

      // Update weapon systems
      updateCooldowns(delta);
      updateHomingProjectiles(delta);
      if (isLocking) {
        const cameraDirection = cachedDirectionsRef.current.forward.clone();
        updateLocking(delta, camera.position.clone(), cameraDirection);
      }
    } else {
      // Cancel any active lock during autopilot
      if (isLocking) {
        cancelLocking();
      }
    }

    // Mouse and mobile look controls with damping for smoother rotation
    camera.rotation.order = "YXZ";

    // Only apply look controls if not landing, has focus, not paused, AND not in autopilot
    // Autopilot should have full control of camera orientation
    if (!isLanding && hasFocus && !isPaused && !isAutopilotActive) {
      // Combine mouse and mobile rotation inputs
      // Dramatically increased sensitivity for instant, snappy combat aiming
      const mouseX = mouse.x * sensitivity * 20.0; // Increased from 5.0 to 20.0 for instant response
      const mouseY = mouse.y * sensitivity * 20.0 * (invertY ? -1 : 1); // Increased from 5.0 to 20.0
      const mobileX = mobileRotationRef.current.x * 1.0; // Increased mobile rotation sensitivity
      const mobileY = mobileRotationRef.current.y * 1.0 * (invertY ? -1 : 1); // Increased mobile rotation sensitivity

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
    } else if (!hasFocus || isPaused || isAutopilotActive) {
      // Clear mobile rotation when paused, unfocused, or in autopilot
      mobileRotationRef.current.set(0, 0);
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
        // Want the centering to be eased in and always target the last targeted planet if not landed else center on zero

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

        if (distanceToTarget > landingDistance) {
          // Approach phase - fly towards current planet position
          const direction = tempVec3_1.current
            .copy(currentPlanetPosition)
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

          // Check if we've reached landing distance - deactivate autopilot
          if (distanceToTarget <= landingDistance + 5) {
            deactivateAutopilot();
            console.log(
              `Autopilot reached ${selectedPlanet} at ${landingDistance} units`,
            );
          }
        } 
        
        /* ORBITAL FEATURES DISABLED - Not yet implemented in autopilot store
        else if (isOrbiting) {
          // Orbital phase - locked orbit around the moving planet
          const orbitSpeed = 0.15; // Orbital rotation speed
          const currentOrbitAngle =
            useAutopilot.getState().orbitAngle + orbitSpeed * delta;

          // Update orbit angle smoothly without frequent store updates
          useAutopilot.setState({ orbitAngle: currentOrbitAngle });

          // Check if we're tracking a different planet (planet changed)
          if (trackedPlanetNameRef.current !== selectedPlanet) {
            console.log(`[ORBIT] Planet changed from ${trackedPlanetNameRef.current} to ${selectedPlanet}, resetting tracking`);
            previousPlanetPositionRef.current = null;
            trackedPlanetNameRef.current = selectedPlanet;
          }

          // Calculate planet velocity (movement since last frame)
          // Only apply if we have a valid previous position for THIS planet
          let planetVelocity = new THREE.Vector3();
          if (previousPlanetPositionRef.current && trackedPlanetNameRef.current === selectedPlanet) {
            planetVelocity = tempVec3_2.current
              .copy(currentPlanetPosition)
              .sub(previousPlanetPositionRef.current);
          }
          
          // Store current position for next frame
          if (!previousPlanetPositionRef.current) {
            previousPlanetPositionRef.current = new THREE.Vector3();
          }
          previousPlanetPositionRef.current.copy(currentPlanetPosition);

          // Calculate orbital offset (rotation around planet)
          const orbitX = Math.cos(currentOrbitAngle) * orbitRadius;
          const orbitZ = Math.sin(currentOrbitAngle) * orbitRadius;
          const orbitOffset = new THREE.Vector3(orbitX, 0, orbitZ);

          // Target position = planet position + orbit offset
          const targetOrbitPosition = tempVec3_1.current
            .copy(currentPlanetPosition)
            .add(orbitOffset);

          // Apply planet velocity directly to camera (move with planet)
          // Only if we have a valid velocity for the current planet
          if (previousPlanetPositionRef.current && trackedPlanetNameRef.current === selectedPlanet) {
            camera.position.add(planetVelocity);
          }

          // Then smoothly adjust to maintain orbital distance
          const currentPosition = camera.position.clone();
          const smoothFactor = delta * 3.0; // Faster adjustment for tighter orbit
          const newPosition = currentPosition.lerp(
            targetOrbitPosition,
            smoothFactor,
          );

          // Apply the smooth position to camera
          camera.position.copy(newPosition);

          // Only update quaternion slerp on certain frames
          if (!skipHeavyProcessing && frameCount % slerpUpdateInterval === 0) {
            // Smoothly orient camera toward planet with very gentle rotation
            const targetQuaternion = tempQuaternion.current;
            const lookAtMatrix = tempMatrix.current;
            const upVector = new THREE.Vector3(0, 1, 0);

            lookAtMatrix.lookAt(
              camera.position,
              currentPlanetPosition,
              upVector,
            );
            targetQuaternion.setFromRotationMatrix(lookAtMatrix);

            // Very smooth camera rotation for cinematic feel
            camera.quaternion.slerp(targetQuaternion, delta * 1.2);
          }
        } else if (!isOrbiting && previousPlanetPositionRef.current) {
          // Reset tracking when exiting orbit
          console.log('[ORBIT] Exiting orbit, resetting planet tracking');
          previousPlanetPositionRef.current = null;
          trackedPlanetNameRef.current = null;
        }
        */

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
        }

        // Apply ship degradation during autopilot travel
        const travelIntensity = distanceToTarget > landingDistance ? 1.0 : 0.5; // Higher intensity during approach
        applyShipDegradation("autopilot", travelIntensity, delta);
      }
    } else {
      // Reset planet position tracking when autopilot is not active
      previousPlanetPositionRef.current = null;
    }

    // Proximity-based camera behavior - THROTTLED (check every N frames)
    if (
      !skipHeavyProcessing &&
      frameCount % proximityCheckInterval === 0 &&
      !isAutopilotActive &&
      selectedPlanet &&
      !isMining &&
      !isLanding &&
      !isLanded
    ) {
      const planetData = planets.find((p) => p.name === selectedPlanet);
      if (planetData) {
        // Use cached planet position
        const currentPlanetPosition = getCachedPlanetPosition(planetData);

        const distanceToPlanet = camera.position.distanceTo(
          currentPlanetPosition,
        );
        const proximityEnterDistance = planetData.size * 15; // Enter proximity mode a bit further out
        const proximityExitDistance = planetData.size * 18; // Hysteresis to prevent jitter

        // Check proximity with hysteresis
        if (
          !isProximityCameraActive &&
          distanceToPlanet < proximityEnterDistance
        ) {
          setProximityCameraActive(true);
          console.log(
            `[PROXIMITY] Entering proximity camera mode for ${selectedPlanet} (distance: ${Math.round(distanceToPlanet)})`,
          );
        } else if (
          isProximityCameraActive &&
          distanceToPlanet > proximityExitDistance
        ) {
          setProximityCameraActive(false);
          console.log(
            `[PROXIMITY] Exiting proximity camera mode for ${selectedPlanet} (distance: ${Math.round(distanceToPlanet)})`,
          );
        }

        // Apply smooth camera adjustments when in proximity
        if (isProximityCameraActive) {
          // Calculate proximity factor (0 to 1, where 1 is very close)
          const proximityFactor = Math.max(
            0,
            1 -
              (distanceToPlanet - planetData.size * 3) /
                (proximityEnterDistance - planetData.size * 3),
          );

          // Adjust FOV based on proximity (zoom in slightly when close)
          const targetFOV = defaultFOV - proximityFactor * 10; // Max 10 degree reduction
          targetFOVRef.current = targetFOV;

          // Only apply camera adjustments every few frames
          if (frameCount % slerpUpdateInterval === 0) {
            // Subtle camera orientation adjustment towards planet
            const toPlanet = tempVec3_1.current
              .copy(currentPlanetPosition)
              .sub(camera.position)
              .normalize();
            const currentForward = tempVec3_2.current
              .set(0, 0, -1)
              .applyQuaternion(camera.quaternion);

            // Only adjust if not looking directly at planet
            const dotProduct = currentForward.dot(toPlanet);
            if (dotProduct < 0.95) {
              // Not looking directly at planet
              // Create target quaternion that partially looks at planet
              const targetQuaternion = tempQuaternion.current;
              const lookAtMatrix = tempMatrix.current;

              // Blend between current forward and planet direction
              const blendedTarget = currentForward.lerp(
                toPlanet,
                proximityFactor * 0.3,
              );
              const lookTarget = camera.position.clone().add(blendedTarget);

              lookAtMatrix.lookAt(
                camera.position,
                lookTarget,
                new THREE.Vector3(0, 1, 0),
              );
              targetQuaternion.setFromRotationMatrix(lookAtMatrix);

              // Very subtle adjustment
              camera.quaternion.slerp(
                targetQuaternion,
                delta * 0.5 * proximityFactor,
              );
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

    // Update camera position in store (keep this for existing functionality)
    setCameraPosition(camera.position);
    
    // Update ship position/rotation/velocity for save/load, but only every 10 frames to avoid performance issues
    if (frameCount % 10 === 0) {
      setShipPosition(camera.position);
      setShipRotation(camera.rotation);
      setShipVelocity(velocityRef.current);
    }

    // Consume fuel if thrusting (consolidated at end of frame)
    if (thrusterActive && !isAutopilotActive) {
      // Calculate fuel consumption based on mode and efficiency
      const baseFuelRate = isWarpMode ? warpFuelConsumption : 1.0;
      const { getFuelEfficiencyMultiplier } = useEquipment.getState();
      const fuelEfficiency = getFuelEfficiencyMultiplier();

      // Apply crew pilot bonus if available
      const crewState = (window as any).crewManagement;
      const crewFuelBonus = 1 - (crewState?.bonuses?.fuelEfficiency || 0);

      const finalFuelConsumption =
        baseFuelRate * fuelEfficiency * crewFuelBonus * delta;

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

  // Restore saved camera position, rotation, and velocity when hasRestoredState becomes true
  useEffect(() => {
    if (hasRestoredState) {
      try {
        const solarState = useSolarSystem.getState();
        
        console.log('[CameraController] Attempting to restore saved camera state...');
        
        // Restore camera position
        if (solarState.shipPosition) {
          camera.position.copy(solarState.shipPosition);
        }
        
        // Restore camera rotation
        if (solarState.shipRotation) {
          camera.rotation.copy(solarState.shipRotation);
        }
        
        // Restore velocity
        if (solarState.shipVelocity) {
          velocityRef.current.copy(solarState.shipVelocity);
        }
        
        console.log('[CameraController] Successfully restored saved camera state:', {
          position: solarState.shipPosition,
          rotation: solarState.shipRotation,
          velocity: solarState.shipVelocity,
        });
      } catch (error) {
        console.error('[CameraController] Error restoring saved camera state:', error);
      } finally {
        // Always reset the flag after attempting restore
        setHasRestoredState(false);
      }
    }
  }, [hasRestoredState, camera, setHasRestoredState]); // Run when hasRestoredState changes
  
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

  return null; // Component doesn't render anything, only manages camera
}
