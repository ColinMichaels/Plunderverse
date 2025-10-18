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
    const {camera, gl, scene} = useThree();
    const positionRef = useRef(new THREE.Vector3(0, 1.8, 5));
    const rotationRef = useRef(0); // Yaw (left/right)
    const pitchRef = useRef(0); // Pitch (up/down)
    const velocityRef = useRef(new THREE.Vector3());
    const {sensitivity} = useSettings();
    const {keybinds} = useSettings();
    const pressedCodesRef = useRef<Set<string>>(new Set());
    const prevControlsRef = useRef({
        forward: false, backward: false,
        left: false, right: false,
        turnLeft: false, turnRight: false,
        flashlight: false, charge: false, shoot: false
    });
    const motorPlayingRef = useRef(false);

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
    const {checkCollision, getResourceNodes} = useSurfaceCollision();
    const {isActive: isMining, currentNodeId, startMining, performClick} = useMining();
    const {playHit, playLaser, playMotor, stopMotor} = useAudio();
    const {setPosition, setRotation} = useSurfacePlayer();
    const {landedPlanet} = useLandedState();
    const {isNodeDestroyed} = useDestroyedNodes();
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
        const handleBlur = () => {
            pressedCodesRef.current.clear();
            Logger.info('[Surface] Input blur – cleared pressed codes');
        };
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener(INPUT_KEY_EVENT, onKey as EventListener);
            window.removeEventListener('blur', handleBlur);
        };
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
                // Silence
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
                    // Silence
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

        // Flashlight toggle only on transition false→true
        if (controls.flashlight) {
            toggleFlashlight();
            Logger.info('[Surface] Flashlight toggle triggered');
        }

        // Charge toggle only on transition false→true
        if (controls.charge) {
            if (isCharging) {
                stopCharging();
                Logger.info('[Surface] Charging stopped');
            } else {
                startCharging();
                Logger.info('[Surface] Charging started');
            }
        }

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

        // Surface movement controls
        if (controls.forward) {
            const forwardVec = new THREE.Vector3(0, 0, -1);
            forwardVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            velocity.add(forwardVec.multiplyScalar(moveSpeed));
        }
        if (controls.backward) {
            const backwardVec = new THREE.Vector3(0, 0, 1);
            backwardVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            velocity.add(backwardVec.multiplyScalar(moveSpeed));
        }
        if (controls.left) {
            const leftVec = new THREE.Vector3(-1, 0, 0);
            leftVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            velocity.add(leftVec.multiplyScalar(moveSpeed));
        }
        if (controls.right) {
            const rightVec = new THREE.Vector3(1, 0, 0);
            rightVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            velocity.add(rightVec.multiplyScalar(moveSpeed));
        }

        // Rotation controls – update target rotation for smooth interpolation
        if (controls.turnLeft) {
            targetRotationRef.current += turnSpeed * delta;
        }
        if (controls.turnRight) {
            targetRotationRef.current -= turnSpeed * delta;
        }

        const moving = controls.forward || controls.backward || controls.left || controls.right;
        if (moving && !motorPlayingRef.current) {
            playMotor(0.05);
            motorPlayingRef.current = true;
        } else if (!moving && motorPlayingRef.current) {
            stopMotor();
            motorPlayingRef.current = false;
        }

        // Smooth interpolation for camera rotation (lerp)
        const lerpFactor = 1 - Math.pow(1 - smoothingFactor, delta * 60);
        rotationRef.current += (targetRotationRef.current - rotationRef.current) * lerpFactor;
        pitchRef.current += (targetPitchRef.current - pitchRef.current) * lerpFactor;

        // Flashlight battery update
        updateBattery(delta);

        // Spacebar mining logic
        if (controls.shoot) {
            if (isMining && currentMiningNodeRef.current && landedPlanet) {
                if (!isNodeDestroyed(landedPlanet, currentMiningNodeRef.current.id)) {
                    performClick();
                    if (!miningBeamActive) {
                        setMiningBeamActive(true);
                        setMiningBeamTarget(new THREE.Vector3(...currentMiningNodeRef.current.position));
                        if (onMiningBeamChange) {
                            onMiningBeamChange({
                                active: true,
                                target: new THREE.Vector3(...currentMiningNodeRef.current.position)
                            });
                        }
                    }
                } else {
                    currentMiningNodeRef.current = null;
                }
            }

            if (performance.now() - lastShootPressRef.current > 200) {
                lastShootPressRef.current = performance.now();
                const resourceNodes = getResourceNodes ? getResourceNodes() : [];
                let nearestNode: any = null;
                let nearestDistance = Infinity;

                resourceNodes.forEach((node: any) => {
                    if (landedPlanet && isNodeDestroyed(landedPlanet, node.id)) {
                        return;
                    }
                    const nodePos = new THREE.Vector3(...node.position);
                    const distance = position.distanceTo(nodePos);
                    if (distance <= miningRange && distance < nearestDistance) {
                        const toNode = nodePos.clone().sub(position).normalize();
                        const cameraDir = new THREE.Vector3(0, 0, -1);
                        cameraDir.applyQuaternion(camera.quaternion);
                        const angle = cameraDir.angleTo(toNode);
                        if (angle < Math.PI / 4) {
                            nearestNode = node;
                            nearestDistance = distance;
                        }
                    }
                });

                if (nearestNode && landedPlanet) {
                    if (!nearestNode.resource) {
                        Logger.warn(`[Mining] Node ${nearestNode.id} is missing resource data. Skipping.`);
                    } else if (!isMining || currentNodeId !== nearestNode.id) {
                        startMining(landedPlanet, nearestNode.resource, nearestNode.id);
                        currentMiningNodeRef.current = nearestNode;
                        playLaser();
                        setMiningBeamActive(true);
                        setMiningBeamTarget(new THREE.Vector3(...nearestNode.position));
                        if (onMiningBeamChange) {
                            onMiningBeamChange({active: true, target: new THREE.Vector3(...nearestNode.position)});
                        }
                    }
                } else if (!isMining) {
                    if (performance.now() - lastSoundPlayRef.current > 500) {
                        playLaser();
                        lastSoundPlayRef.current = performance.now();
                    }
                }
            }
        } else {
            if (miningBeamActive) {
                setMiningBeamActive(false);
                setMiningBeamTarget(null);
                currentMiningNodeRef.current = null;
                if (onMiningBeamChange) {
                    onMiningBeamChange({active: false, target: null});
                }
            }
        }

        // Save this controls state for next frame transition detection
        prevControlsRef.current = controls;

        // Clamp velocity
        velocity.clampLength(0, maxVelocity);

        // Calculate new position
        const newPosition = position.clone().add(velocity.clone().multiplyScalar(delta));
        newPosition.x = Math.max(-80, Math.min(80, newPosition.x));
        newPosition.z = Math.max(-80, Math.min(80, newPosition.z));
        newPosition.y = terrainHeightAt(newPosition.x, newPosition.z) + 1.8;

        const collision = checkCollision(newPosition, playerCollisionRadius);
        if (collision) {

            const miningCurrentNode = isMining && collision.type === "resource" && collision.id === currentNodeId;
            if (!miningCurrentNode) {
                const velocityMagnitude = velocity.length();
                const collisionIntensity = Math.min(velocityMagnitude / maxVelocity, 1.0);
                if (velocityMagnitude > 0.5 && performance.now() - lastCollisionTimeRef.current > 100) {
                    if (performance.now() - lastCollisionSoundRef.current > 500) {
                        playHit();
                        lastCollisionSoundRef.current = performance.now();
                    }
                    lastCollisionTimeRef.current = performance.now();
                }
                const directionToObject = new THREE.Vector3().subVectors(newPosition, collision.position).normalize();
                const velocityProjected = velocity.clone().projectOnPlane(directionToObject);
                const slidingPosition = position.clone().add(velocityProjected.multiplyScalar(delta * 0.3));
                slidingPosition.y = terrainHeightAt(slidingPosition.x, slidingPosition.z) + 1.8;
                positionRef.current.copy(slidingPosition);
            } else {
                positionRef.current.copy(newPosition);
            }
        } else {
            positionRef.current.copy(newPosition);
        }

        // Update global surface player position
        setPosition(positionRef.current);
        setRotation(rotationRef.current);

        // Camera positioning and rotation
        camera.position.copy(positionRef.current);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = rotationRef.current;
        camera.rotation.x = pitchRef.current;
        camera.rotation.z = 0;
        camera.updateMatrixWorld();
    });

    return null;
}
