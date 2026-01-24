import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { useEngine, useEngineUpdate } from '../hooks/useEngine';
import { Color } from '../utils/math';
import { planets, distanceScale } from '@/lib/planetData';
import { useSolarSystem, useDebugTools } from '@/lib/stores';
import { BabylonCameraController } from './BabylonCameraController';

export function BabylonSolarSystem() {
  const { engine, isInitialized } = useEngine();
  const { time, setTime, initializeUniverseTime, updateUniverseTime, getUniverseTime } = useSolarSystem();
  const timeScale = useDebugTools((state) => state.timeScale);
  const timeRef = useRef(time);
  
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  const starPositions = useMemo(() => {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    
    const positions: { x: number; y: number; z: number; size: number; brightness: number }[] = [];
    for (let i = 0; i < 200; i++) {
      const seed = i * 7.31;
      const theta = seededRandom(seed) * Math.PI * 2;
      const phi = Math.acos(2 * seededRandom(seed + 1) - 1);
      const r = 400 + seededRandom(seed + 2) * 200;
      positions.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        size: 0.2 + seededRandom(seed + 3) * 0.5,
        brightness: 0.6 + seededRandom(seed + 4) * 0.4
      });
    }
    return positions;
  }, []);

  useEffect(() => {
    if (!engine || !isInitialized) return;

    console.log('[BabylonSolarSystem] Initializing solar system scene');
    initializeUniverseTime();

    engine.setBackgroundColor(Color.fromHex('#020208'));

    engine.createLight({
      id: 'ambient',
      type: 'hemisphere',
      direction: { x: 0, y: 1, z: 0 },
      color: { r: 0.1, g: 0.1, b: 0.15 },
      intensity: 0.3
    });

    engine.createLight({
      id: 'sun-light',
      type: 'point',
      position: { x: 0, y: 0, z: 0 },
      color: { r: 1, g: 0.9, b: 0.7 },
      intensity: 3.0
    });

    engine.createCamera({
      id: 'main-camera',
      type: 'perspective',
      position: { x: 0, y: 50, z: -150 },
      target: { x: 0, y: 0, z: 0 },
      fov: Math.PI / 3.5,
      near: 0.1,
      far: 3000
    });
    engine.setActiveCamera('main-camera');

    engine.setPostProcessing({
      glow: { enabled: true, intensity: 1.0 },
      bloom: { enabled: true, intensity: 0.5, threshold: 0.6 },
      vignette: { enabled: true, weight: 0.8 }
    });

    engine.createMesh({
      id: 'sun-core',
      type: 'sphere',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 5, y: 5, z: 5 }
      },
      color: { r: 1, g: 0.7, b: 0.2 },
      emissive: { r: 1, g: 0.6, b: 0.15 }
    });

    engine.createMesh({
      id: 'sun-glow',
      type: 'sphere',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 6, y: 6, z: 6 }
      },
      color: { r: 1, g: 0.5, b: 0.1 },
      emissive: { r: 1, g: 0.4, b: 0.1 }
    });

    engine.createParticleSystem({
      id: 'sun-corona',
      emitterPosition: { x: 0, y: 0, z: 0 },
      capacity: 800,
      emitRate: 150,
      minLifeTime: 0.8,
      maxLifeTime: 2.0,
      minSize: 0.3,
      maxSize: 1.0,
      color1: { r: 1, g: 0.85, b: 0.4, a: 0.7 },
      color2: { r: 1, g: 0.3, b: 0.1, a: 0.1 },
      direction1: { x: -1, y: -1, z: -1 },
      direction2: { x: 1, y: 1, z: 1 },
      minEmitPower: 3,
      maxEmitPower: 6,
      gravity: { x: 0, y: 0, z: 0 }
    });
    engine.startParticleSystem('sun-corona');

    planets.forEach((planet, index) => {
      const colorObj = hexToRgb(planet.color);
      engine.createMesh({
        id: `planet-${planet.name}`,
        type: 'sphere',
        transform: {
          position: { x: planet.distance, y: 0, z: 0 },
          scale: { x: planet.size, y: planet.size, z: planet.size }
        },
        color: colorObj
      });
    });

    engine.createMesh({
      id: 'earth-moon',
      type: 'sphere',
      transform: {
        position: { x: 30 * distanceScale + 3, y: 0, z: 0 },
        scale: { x: 0.35, y: 0.35, z: 0.35 }
      },
      color: { r: 0.75, g: 0.75, b: 0.75 }
    });

    starPositions.forEach((star, i) => {
      engine.createMesh({
        id: `star-${i}`,
        type: 'sphere',
        transform: {
          position: { x: star.x, y: star.y, z: star.z },
          scale: { x: star.size, y: star.size, z: star.size }
        },
        emissive: { r: star.brightness, g: star.brightness, b: star.brightness * 0.95 }
      });
    });

    console.log('[BabylonSolarSystem] Scene setup complete');

    return () => {
      console.log('[BabylonSolarSystem] Cleaning up scene');
      engine.clearPostProcessing();
      engine.disposeParticleSystem('sun-corona');
      engine.removeNode('ambient');
      engine.removeNode('sun-light');
      engine.removeNode('main-camera');
      engine.removeNode('sun-core');
      engine.removeNode('sun-glow');
      planets.forEach((planet) => {
        engine.removeNode(`planet-${planet.name}`);
      });
      engine.removeNode('earth-moon');
      starPositions.forEach((_, i) => {
        engine.removeNode(`star-${i}`);
      });
    };
  }, [engine, isInitialized, starPositions, initializeUniverseTime]);

  useEngineUpdate('orbital-motion', useCallback((deltaTime, elapsedTime) => {
    if (!engine) return;

    const dt = deltaTime * timeScale;
    setTime(timeRef.current + dt * 0.1);
    updateUniverseTime(deltaTime);
    const t = elapsedTime * timeScale;

    planets.forEach((planet) => {
      const angle = t * planet.orbitalSpeed;
      const x = Math.cos(angle) * planet.distance;
      const z = Math.sin(angle) * planet.distance;
      const y = Math.sin(angle * 0.3) * planet.size * 0.5;
      
      engine.setNodeTransform(`planet-${planet.name}`, {
        position: { x, y, z },
        rotation: { x: 0, y: t * planet.rotationSpeed * 10, z: 0 }
      });
    });

    const earthData = planets.find(p => p.name === 'Earth');
    if (earthData) {
      const earthAngle = t * earthData.orbitalSpeed;
      const earthX = Math.cos(earthAngle) * earthData.distance;
      const earthZ = Math.sin(earthAngle) * earthData.distance;
      
      const moonOrbitRadius = 3;
      const moonSpeed = 3;
      const moonX = earthX + Math.cos(t * moonSpeed) * moonOrbitRadius;
      const moonZ = earthZ + Math.sin(t * moonSpeed) * moonOrbitRadius;
      const moonY = Math.sin(t * moonSpeed * 0.5) * 0.5;
      
      engine.setNodeTransform('earth-moon', {
        position: { x: moonX, y: moonY, z: moonZ }
      });
    }

    engine.setNodeTransform('sun-core', {
      rotation: { x: 0, y: t * 0.1, z: 0 }
    });
  }, [engine, timeScale, setTime, updateUniverseTime]), [engine, timeScale]);

  return <BabylonCameraController />;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    };
  }
  return { r: 0.5, g: 0.5, b: 0.5 };
}

export default BabylonSolarSystem;
