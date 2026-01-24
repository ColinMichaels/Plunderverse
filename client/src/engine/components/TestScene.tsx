import React, { useEffect, useMemo } from 'react';
import { useEngine, useEngineUpdate } from '../hooks/useEngine';
import { Color } from '../utils/math';

interface TestSceneProps {
  enablePostProcessing?: boolean;
  enableParticles?: boolean;
}

export function TestScene({ enablePostProcessing = true, enableParticles = true }: TestSceneProps) {
  const { engine, isInitialized } = useEngine();

  const starPositions = useMemo(() => {
    const positions: { x: number; y: number; z: number; size: number; brightness: number }[] = [];
    for (let i = 0; i < 150; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 60 + Math.random() * 80;
      positions.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        size: 0.03 + Math.random() * 0.08,
        brightness: 0.6 + Math.random() * 0.4
      });
    }
    return positions;
  }, []);

  const asteroidData = useMemo(() => {
    const data: { theta: number; r: number; size: number; yOffset: number; rotX: number; rotY: number }[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        theta: Math.random() * Math.PI * 2,
        r: 15 + Math.random() * 5,
        size: 0.1 + Math.random() * 0.3,
        yOffset: (Math.random() - 0.5) * 2,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI
      });
    }
    return data;
  }, []);

  useEffect(() => {
    if (!engine || !isInitialized) return;

    console.log('[TestScene] Setting up enhanced Babylon.js test scene');

    engine.setBackgroundColor(Color.fromHex('#050510'));

    engine.createLight({
      id: 'ambient',
      type: 'hemisphere',
      direction: { x: 0, y: 1, z: 0 },
      color: { r: 0.3, g: 0.3, b: 0.5 },
      intensity: 0.4
    });

    engine.createLight({
      id: 'sun-light',
      type: 'point',
      position: { x: 0, y: 0, z: 0 },
      color: { r: 1, g: 0.9, b: 0.7 },
      intensity: 2.0
    });

    engine.createCamera({
      id: 'main-camera',
      type: 'perspective',
      position: { x: 0, y: 8, z: -15 },
      target: { x: 0, y: 0, z: 0 },
      fov: Math.PI / 3.5,
      near: 0.1,
      far: 2000
    });
    engine.setActiveCamera('main-camera');

    if (enablePostProcessing) {
      engine.setPostProcessing({
        glow: { enabled: true, intensity: 0.8 },
        bloom: { enabled: true, intensity: 0.4, threshold: 0.7 },
        vignette: { enabled: true, weight: 1.2 }
      });
    }

    engine.createMesh({
      id: 'sun-sphere',
      type: 'sphere',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 2.5, y: 2.5, z: 2.5 }
      },
      color: { r: 1, g: 0.7, b: 0.2 },
      emissive: { r: 1, g: 0.5, b: 0.1 }
    });

    engine.createMesh({
      id: 'planet-1',
      type: 'sphere',
      transform: {
        position: { x: 6, y: 0, z: 0 },
        scale: { x: 0.6, y: 0.6, z: 0.6 }
      },
      color: { r: 0.2, g: 0.5, b: 0.9 }
    });

    engine.createMesh({
      id: 'planet-1-moon',
      type: 'sphere',
      transform: {
        position: { x: 7, y: 0.5, z: 0 },
        scale: { x: 0.15, y: 0.15, z: 0.15 }
      },
      color: { r: 0.7, g: 0.7, b: 0.7 }
    });

    engine.createMesh({
      id: 'planet-2',
      type: 'sphere',
      transform: {
        position: { x: -9, y: 0.5, z: 3 },
        scale: { x: 0.9, y: 0.9, z: 0.9 }
      },
      color: { r: 0.9, g: 0.4, b: 0.2 }
    });

    engine.createMesh({
      id: 'planet-3',
      type: 'sphere',
      transform: {
        position: { x: 4, y: -1, z: -12 },
        scale: { x: 1.2, y: 1.2, z: 1.2 }
      },
      color: { r: 0.6, g: 0.8, b: 0.5 }
    });

    if (enableParticles) {
      engine.createParticleSystem({
        id: 'sun-corona',
        emitterPosition: { x: 0, y: 0, z: 0 },
        capacity: 500,
        emitRate: 100,
        minLifeTime: 0.5,
        maxLifeTime: 1.5,
        minSize: 0.1,
        maxSize: 0.4,
        color1: { r: 1, g: 0.8, b: 0.3, a: 0.8 },
        color2: { r: 1, g: 0.4, b: 0.1, a: 0.2 },
        direction1: { x: -1, y: -1, z: -1 },
        direction2: { x: 1, y: 1, z: 1 },
        minEmitPower: 2,
        maxEmitPower: 4,
        gravity: { x: 0, y: 0, z: 0 }
      });
      engine.startParticleSystem('sun-corona');
    }

    starPositions.forEach((star, i) => {
      engine.createMesh({
        id: `star-${i}`,
        type: 'sphere',
        transform: {
          position: { x: star.x, y: star.y, z: star.z },
          scale: { x: star.size, y: star.size, z: star.size }
        },
        emissive: { r: star.brightness, g: star.brightness, b: star.brightness * 0.9 }
      });
    });

    asteroidData.forEach((asteroid, i) => {
      const x = Math.cos(asteroid.theta) * asteroid.r;
      const z = Math.sin(asteroid.theta) * asteroid.r;

      engine.createMesh({
        id: `asteroid-${i}`,
        type: 'box',
        transform: {
          position: { x, y: asteroid.yOffset, z },
          scale: { x: asteroid.size, y: asteroid.size * 0.7, z: asteroid.size * 0.8 },
          rotation: { x: asteroid.rotX, y: asteroid.rotY, z: 0 }
        },
        color: { r: 0.4, g: 0.35, b: 0.3 }
      });
    });

    console.log('[TestScene] Enhanced test scene setup complete');

    return () => {
      console.log('[TestScene] Cleaning up test scene');
      engine.clearPostProcessing();
      if (enableParticles) {
        engine.disposeParticleSystem('sun-corona');
      }
      engine.removeNode('ambient');
      engine.removeNode('sun-light');
      engine.removeNode('main-camera');
      engine.removeNode('sun-sphere');
      engine.removeNode('planet-1');
      engine.removeNode('planet-1-moon');
      engine.removeNode('planet-2');
      engine.removeNode('planet-3');
      for (let i = 0; i < 150; i++) {
        engine.removeNode(`star-${i}`);
      }
      for (let i = 0; i < 20; i++) {
        engine.removeNode(`asteroid-${i}`);
      }
    };
  }, [engine, isInitialized, enablePostProcessing, enableParticles, starPositions, asteroidData]);

  useEngineUpdate('orbital-motion', (deltaTime, elapsedTime) => {
    if (!engine) return;

    const planet1Radius = 6;
    const planet1Speed = 0.4;
    engine.setNodeTransform('planet-1', {
      position: {
        x: Math.cos(elapsedTime * planet1Speed) * planet1Radius,
        y: Math.sin(elapsedTime * 0.15) * 0.3,
        z: Math.sin(elapsedTime * planet1Speed) * planet1Radius
      }
    });

    const moonRadius = 1.2;
    const moonSpeed = 2.5;
    const planet1X = Math.cos(elapsedTime * planet1Speed) * planet1Radius;
    const planet1Z = Math.sin(elapsedTime * planet1Speed) * planet1Radius;
    engine.setNodeTransform('planet-1-moon', {
      position: {
        x: planet1X + Math.cos(elapsedTime * moonSpeed) * moonRadius,
        y: 0.3,
        z: planet1Z + Math.sin(elapsedTime * moonSpeed) * moonRadius
      }
    });

    const planet2Radius = 9;
    const planet2Speed = 0.25;
    engine.setNodeTransform('planet-2', {
      position: {
        x: Math.cos(elapsedTime * planet2Speed + Math.PI) * planet2Radius,
        y: Math.sin(elapsedTime * 0.1) * 0.5,
        z: Math.sin(elapsedTime * planet2Speed + Math.PI) * planet2Radius
      }
    });

    const planet3Radius = 14;
    const planet3Speed = 0.15;
    engine.setNodeTransform('planet-3', {
      position: {
        x: Math.cos(elapsedTime * planet3Speed + Math.PI / 2) * planet3Radius,
        y: Math.sin(elapsedTime * 0.08) * 0.8 - 1,
        z: Math.sin(elapsedTime * planet3Speed + Math.PI / 2) * planet3Radius
      }
    });

    for (let i = 0; i < 20; i++) {
      const baseTheta = (i / 20) * Math.PI * 2;
      const asteroidSpeed = 0.1;
      const r = 15 + (i % 5) * 1;
      engine.setNodeTransform(`asteroid-${i}`, {
        position: {
          x: Math.cos(baseTheta + elapsedTime * asteroidSpeed) * r,
          y: Math.sin(elapsedTime * 0.5 + i) * 0.3,
          z: Math.sin(baseTheta + elapsedTime * asteroidSpeed) * r
        },
        rotation: {
          x: elapsedTime * 0.5 + i,
          y: elapsedTime * 0.3 + i * 0.5,
          z: 0
        }
      });
    }

    const camRadius = 18;
    const camSpeed = 0.05;
    engine.updateCamera('main-camera', {
      position: {
        x: Math.sin(elapsedTime * camSpeed) * camRadius,
        y: 8 + Math.sin(elapsedTime * 0.1) * 2,
        z: -Math.cos(elapsedTime * camSpeed) * camRadius
      },
      target: { x: 0, y: 0, z: 0 }
    });
  }, [engine]);

  if (!isInitialized) {
    return null;
  }

  return null;
}
