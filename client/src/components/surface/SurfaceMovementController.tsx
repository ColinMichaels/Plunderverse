import {useEffect, useRef, useState} from "react";
import {useFrame, useThree} from "@react-three/fiber";
import {INPUT_KEY_EVENT, InputRouter} from "@/lib/InputRouter";
import * as THREE from "three";
import {Logger} from "@/services/Logger";
import {
    useAudio,
    useDestroyedNodes,
    useFlashlight,
    useLandedState,
    useMining,
    useSettings,
    useSurfaceCollision,
    useSurfacePlayer,
    useTerrain
} from "@/lib/stores";

// Ensure global input router is attached once on the client
if (typeof window !== 'undefined') {
    InputRouter.instance().attach();
}

enum SurfaceControls {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  turnLeft = "turnLeft",
  turnRight = "turnRight",
  flashlight = "flashlight",
  charge = "charge",
  shoot = "shoot", // Spacebar for mining/shooting
}

// Function to calculate terrain height at any x,z position (uses new terrain system)
function terrainHeightAt(x: number, z: number): number {
  const terrainStore = useTerrain.getState();
  return terrainStore.getHeightAt(x, z);
}

export interface MiningBeamState {
  active: boolean;
  target: THREE.Vector3 | null;
}

interface SurfaceMovementControllerProps {
  onMiningBeamChange?: (state: MiningBeamState) => void;
}

export function SurfaceMovementController({ onMiningBeamChange }: SurfaceMovementControllerProps = {}) {
  const { camera, gl, scene } = useThree();
  const positionRef = useRef(new THREE.Vector3(0, 1.8, 5));
  const rotationRef = useRef(0); // Yaw (left/right)
  const pitchRef = useRef(0); // Pitch (up/down)
  const velocityRef = useRef(new THREE.Vector3());
  const { sensitivity } = useSettings();
    const {keybinds} = useSettings();
    const pressedCodesRef = useRef<Set<string>>(new Set());

  // Target values for smooth interpolation (initialize to current values)
  const targetRotationRef = useRef(0); // Target yaw for smooth rotation
  const targetPitchRef = useRef(0); // Target pitch for smooth rotation
  const smoothingFactor = 0.12; // Lower = smoother but less responsive (0.12 = smooth cinematic feel)

  // Initialize target values to match current values on mount
  useEffect(() => {
    targetRotationRef.current = rotationRef.current;
    targetPitchRef.current = pitchRef.current;
  }, []);

  // Collision system
  const { checkCollision, getResourceNodes } = useSurfaceCollision();
  const { isActive: isMining, currentNodeId, startMining, performClick } = useMining();
  const { playHit, playLaser } = useAudio();
  const { setPosition, setRotation } = useSurfacePlayer();
  const { landedPlanet } = useLandedState();
  const { isNodeDestroyed } = useDestroyedNodes();
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

  // Spacebar mining system
  const lastShootPressRef = useRef(0);
  const [miningBeamActive, setMiningBeamActive] = useState(false);
  const [miningBeamTarget, setMiningBeamTarget] = useState<THREE.Vector3 | null>(null);
  const miningRange = 10; // Maximum mining range in units
  const currentMiningNodeRef = useRef<any>(null); // Track the node we're actively mining
  const lastSoundPlayRef = useRef(0); // Track when we last played the laser sound

    // Listen to global InputRouter key events and track pressed codes
  useEffect(() => {
      const onKey = (e: Event) => {
          const ce = e as CustomEvent<{ key: string; code: string; domEvent: KeyboardEvent }>;
          const detail = ce.detail as any;
          if (!detail) return;
          const {code, domEvent} = detail;
          if (!code || !domEvent) return;
          // Avoid repeats from keydown auto-repeat
          if (domEvent.type === 'keydown' && domEvent.repeat) return;
          const set = pressedCodesRef.current;
          if (domEvent.type === 'keydown') {
              set.add(code);
          } else if (domEvent.type === 'keyup') {
              set.delete(code);
          }
    };

      window.addEventListener(INPUT_KEY_EVENT, onKey as EventListener, {capture: true});
      return () => window.removeEventListener(INPUT_KEY_EVENT, onKey as EventListener);
  }, []);

    // Mouse look controls while holding primary mouse button (no pointer lock)
  useEffect(() => {
      const canvas = gl.domElement as HTMLCanvasElement;

      let isHeld = false;
      let activePointerId: number | null = null;

      const handlePointerDown = (ev: PointerEvent) => {
          if (ev.button !== 0) return; // Only primary (LMB)
          activePointerId = ev.pointerId;
          try {
              canvas.setPointerCapture(ev.pointerId);
          } catch {
          }
          isHeld = true;
          Logger.info('[Surface] Mouse look engaged (hold LMB)');
      };

      const handlePointerUp = (ev: PointerEvent) => {
          if (ev.button !== 0) return;
          if (activePointerId === ev.pointerId) {
              try {
                  canvas.releasePointerCapture(ev.pointerId);
              } catch {
              }
              activePointerId = null;
          }
          isHeld = false;
          Logger.info('[Surface] Mouse look released');
      };

      const handlePointerMove = (ev: PointerEvent) => {
          if (!isHeld) return;
          const mouseSensitivity = sensitivity * 3.5;
          targetRotationRef.current -= ev.movementX * mouseSensitivity;
          targetPitchRef.current -= ev.movementY * mouseSensitivity;
          const maxPitch = Math.PI / 2.1;
          targetPitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, targetPitchRef.current));
    };

      canvas.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointermove', handlePointerMove);

    return () => {
        canvas.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [gl, sensitivity]);

  useFrame((state, delta) => {
      // Helper to check if any of the key codes bound to an action are currently pressed
      const isActionDown = (action: string) => {
          const codes: string[] = (keybinds as any)?.[action] || [];
          const set = pressedCodesRef.current;
          for (let i = 0; i < codes.length; i++) {
              if (set.has(codes[i])) return true;
          }
          return false;
      };

      const controls = {
          forward: isActionDown('forward'),
          backward: isActionDown('backward'),
          left: isActionDown('left'),
          right: isActionDown('right'),
          turnLeft: isActionDown('turnLeft'),
          turnRight: isActionDown('turnRight'),
          flashlight: isActionDown('flashlight'),
          charge: isActionDown('charge'),
          shoot: isActionDown('shoot'),
      };
    const position = positionRef.current;
    const rotation = rotationRef.current;
    const velocity = velocityRef.current;
    const shake = cameraShakeRef.current;

    const moveSpeed = 6; // Rover movement speed
    const turnSpeed = 0.55; // Reduced turning speed for smoother control (was 0.9)
    const maxVelocity = 15; // Cap velocity to prevent runaway acceleration
    const playerCollisionRadius = 1.5; // Collision detection radius

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

    // Rotation controls - update target rotation for smooth interpolation
    if (controls.turnLeft) {
      targetRotationRef.current += turnSpeed * delta;
    }

    if (controls.turnRight) {
      targetRotationRef.current -= turnSpeed * delta;
    }

      // Smooth interpolation for camera rotation (lerp)
    // Apply easing to both mouse and keyboard rotation
    const lerpFactor = 1 - Math.pow(1 - smoothingFactor, delta * 60); // Frame-rate independent smoothing
    rotationRef.current += (targetRotationRef.current - rotationRef.current) * lerpFactor;
    pitchRef.current += (targetPitchRef.current - pitchRef.current) * lerpFactor;

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

      // Spacebar mining - handle both starting new mining and continuing existing mining
    if (controls.shoot) {
      // If we're already mining, continuously call performClick to progress
      if (isMining && currentMiningNodeRef.current && landedPlanet) {
        // Check if the node still exists (not destroyed)
        if (!isNodeDestroyed(landedPlanet, currentMiningNodeRef.current.id)) {
          // Call performClick every frame to progress mining
          performClick();

            // Keep the mining beam active
          if (!miningBeamActive) {
            setMiningBeamActive(true);
            setMiningBeamTarget(new THREE.Vector3(...currentMiningNodeRef.current.position));
            if (onMiningBeamChange) {
              onMiningBeamChange({ active: true, target: new THREE.Vector3(...currentMiningNodeRef.current.position) });
            }
          }
        } else {
          // Node was destroyed, clear current mining
          currentMiningNodeRef.current = null;
        }
      }

        // Check for new targets (with debounce to prevent rapid switching)
      if (currentTime - lastShootPressRef.current > 200) {
        lastShootPressRef.current = currentTime;

          // Get all resource nodes from the collision system
        const resourceNodes = getResourceNodes ? getResourceNodes() : [];

          // Find the nearest mineral within range
        let nearestNode: any = null;
        let nearestDistance = Infinity;

          resourceNodes.forEach((node: any) => {
          // Skip destroyed nodes
          if (landedPlanet && isNodeDestroyed(landedPlanet, node.id)) {
            return;
          }

              const nodePosition = new THREE.Vector3(...node.position);
          const distance = position.distanceTo(nodePosition);

              // Check if within mining range and if it's closer than previous
          if (distance <= miningRange && distance < nearestDistance) {
            // Check if we have line of sight (simple angle check)
            const toNode = nodePosition.clone().sub(position).normalize();
            const cameraDir = new THREE.Vector3(0, 0, -1);
            cameraDir.applyQuaternion(camera.quaternion);

              const angle = cameraDir.angleTo(toNode);
            if (angle < Math.PI / 4) { // 45 degree cone
              nearestNode = node;
              nearestDistance = distance;
            }
          }
        });

          // If we found a mineral and it's different from what we're mining
        if (nearestNode && landedPlanet) {
          // Check if the node has resource data (safety check)
          if (!nearestNode.resource) {
              Logger.warn(`[Mining] Node ${nearestNode.id} is missing resource data. Skipping.`);
          } else if (!isMining || currentNodeId !== nearestNode.id) {
            // Start mining new node
            startMining(landedPlanet, nearestNode.resource, nearestNode.id);
            currentMiningNodeRef.current = nearestNode;
            playLaser();
            setMiningBeamActive(true);
            setMiningBeamTarget(new THREE.Vector3(...nearestNode.position));
            // Notify parent component about mining beam state
            if (onMiningBeamChange) {
              onMiningBeamChange({ active: true, target: new THREE.Vector3(...nearestNode.position) });
            }
          }
        } else if (!isMining) {
          // No target found and not currently mining
          // Only play sound if we haven't played it recently (prevent spam)
          if (currentTime - lastSoundPlayRef.current > 500) {
            playLaser();
            lastSoundPlayRef.current = currentTime;
          }
        }
      }
    } else {
      // Spacebar released - clear mining state
      if (miningBeamActive) {
        setMiningBeamActive(false);
        setMiningBeamTarget(null);
        currentMiningNodeRef.current = null;
        // Notify parent component about mining beam state
        if (onMiningBeamChange) {
          onMiningBeamChange({ active: false, target: null });
        }
      }
    }

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
          // Removed camera shake - it was disorienting
          // Just play collision sound with cooldown (0.5 seconds)
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

    // Camera shake removed - was causing disorientation on planet surfaces
    // Will be replaced with environmental effects like wind

    // Update camera position and rotation without shake
    camera.position.copy(positionRef.current);
    
    // Apply mouse look rotation (yaw and pitch)
    camera.rotation.order = 'YXZ'; // Yaw-Pitch-Roll order for proper FPS controls
    camera.rotation.y = rotationRef.current; // Yaw (left/right) from mouse or keyboard
    camera.rotation.x = pitchRef.current; // Pitch (up/down) from mouse
    camera.rotation.z = 0; // No roll
    camera.updateMatrixWorld();
  });

  return null;
}
