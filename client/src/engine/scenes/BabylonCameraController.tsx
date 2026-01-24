import { useEffect, useRef, useCallback } from 'react';
import { useEngine, useEngineUpdate } from '../hooks/useEngine';
import { useShipStatus, useSettings, useSolarSystem } from '@/lib/stores';
import { useFocusState } from '@/lib/stores/ui/useFocusState';
import { useInput } from '@/stores/useInput';

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  rotateUp: boolean;
  rotateDown: boolean;
  boost: boolean;
}

export function BabylonCameraController() {
  const { engine, isInitialized } = useEngine();
  const { setThrusting, isWarpMode } = useShipStatus();
  const { hasFocus, isPaused } = useFocusState();
  const { sensitivity } = useSettings();
  const { setCameraPositionRaw, setShipPositionRaw, setShipRotationRaw, setShipVelocityRaw } = useSolarSystem();
  const { isDragging } = useInput();

  const keyStateRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rotateLeft: false,
    rotateRight: false,
    rotateUp: false,
    rotateDown: false,
    boost: false
  });

  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  const positionRef = useRef({ x: 0, y: 50, z: -150 });
  const targetRef = useRef({ x: 0, y: 0, z: 0 });
  const boostMeterRef = useRef(100);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || isDragging) return;
      
      const key = e.key.toLowerCase();
      const keys = keyStateRef.current;
      
      if (key === 'w' || key === 'arrowup') keys.forward = true;
      if (key === 's' || key === 'arrowdown') keys.backward = true;
      if (key === 'a' || key === 'arrowleft') keys.left = true;
      if (key === 'd' || key === 'arrowright') keys.right = true;
      if (key === 'q') keys.up = true;
      if (key === 'e') keys.down = true;
      if (key === 'j') keys.rotateLeft = true;
      if (key === 'l') keys.rotateRight = true;
      if (key === 'i') keys.rotateUp = true;
      if (key === 'k') keys.rotateDown = true;
      if (key === 'shift') keys.boost = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const keys = keyStateRef.current;
      
      if (key === 'w' || key === 'arrowup') keys.forward = false;
      if (key === 's' || key === 'arrowdown') keys.backward = false;
      if (key === 'a' || key === 'arrowleft') keys.left = false;
      if (key === 'd' || key === 'arrowright') keys.right = false;
      if (key === 'q') keys.up = false;
      if (key === 'e') keys.down = false;
      if (key === 'j') keys.rotateLeft = false;
      if (key === 'l') keys.rotateRight = false;
      if (key === 'i') keys.rotateUp = false;
      if (key === 'k') keys.rotateDown = false;
      if (key === 'shift') keys.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, isDragging]);

  useEngineUpdate('camera-controller', useCallback((deltaTime: number, elapsedTime: number) => {
    if (!engine || isPaused) return;

    const keys = keyStateRef.current;
    const velocity = velocityRef.current;
    const rotation = rotationRef.current;
    const position = positionRef.current;

    const baseSpeed = isWarpMode ? 200 : 50;
    const boostMultiplier = keys.boost && boostMeterRef.current > 0 ? 2.5 : 1;
    const acceleration = baseSpeed * boostMultiplier * deltaTime;
    const rotationSpeed = 1.5 * (sensitivity / 50) * deltaTime;
    const friction = 0.98;

    if (keys.boost && boostMeterRef.current > 0) {
      boostMeterRef.current = Math.max(0, boostMeterRef.current - 20 * deltaTime);
    } else if (!keys.boost && boostMeterRef.current < 100) {
      boostMeterRef.current = Math.min(100, boostMeterRef.current + 10 * deltaTime);
    }

    const isThrusting = keys.forward || keys.backward || keys.left || keys.right || keys.up || keys.down;
    setThrusting(isThrusting);

    const forwardDir = {
      x: Math.sin(rotation.y),
      y: 0,
      z: Math.cos(rotation.y)
    };
    const rightDir = {
      x: Math.cos(rotation.y),
      y: 0,
      z: -Math.sin(rotation.y)
    };

    if (keys.forward) {
      velocity.x += forwardDir.x * acceleration;
      velocity.z += forwardDir.z * acceleration;
    }
    if (keys.backward) {
      velocity.x -= forwardDir.x * acceleration;
      velocity.z -= forwardDir.z * acceleration;
    }
    if (keys.left) {
      velocity.x -= rightDir.x * acceleration;
      velocity.z -= rightDir.z * acceleration;
    }
    if (keys.right) {
      velocity.x += rightDir.x * acceleration;
      velocity.z += rightDir.z * acceleration;
    }
    if (keys.up) {
      velocity.y += acceleration;
    }
    if (keys.down) {
      velocity.y -= acceleration;
    }

    if (keys.rotateLeft) rotation.y -= rotationSpeed;
    if (keys.rotateRight) rotation.y += rotationSpeed;
    if (keys.rotateUp) rotation.x = Math.max(-Math.PI / 2.5, rotation.x - rotationSpeed);
    if (keys.rotateDown) rotation.x = Math.min(Math.PI / 2.5, rotation.x + rotationSpeed);

    velocity.x *= friction;
    velocity.y *= friction;
    velocity.z *= friction;

    const maxSpeed = isWarpMode ? 500 : 100;
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      velocity.x *= scale;
      velocity.y *= scale;
      velocity.z *= scale;
    }

    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;
    position.z += velocity.z * deltaTime;

    const lookDistance = 100;
    targetRef.current = {
      x: position.x + Math.sin(rotation.y) * Math.cos(rotation.x) * lookDistance,
      y: position.y - Math.sin(rotation.x) * lookDistance,
      z: position.z + Math.cos(rotation.y) * Math.cos(rotation.x) * lookDistance
    };

    engine.setCameraTransform('main-camera', {
      position: position,
      target: targetRef.current
    });

    setCameraPositionRaw(position.x, position.y, position.z);
    setShipPositionRaw(position.x, position.y, position.z);
    setShipRotationRaw(rotation.x, rotation.y, rotation.z);
    setShipVelocityRaw(velocity.x, velocity.y, velocity.z);
  }, [engine, isPaused, isDragging, isWarpMode, sensitivity, setThrusting, setCameraPositionRaw, setShipPositionRaw, setShipRotationRaw, setShipVelocityRaw]), [engine, isPaused, isDragging, isWarpMode, sensitivity]);

  return null;
}

export default BabylonCameraController;
