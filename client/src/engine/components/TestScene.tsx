import React, { useEffect } from 'react';
import { useEngine, useEngineUpdate } from '../hooks/useEngine';
import { Vec3, Color } from '../utils/math';

export function TestScene() {
  const { engine, isInitialized } = useEngine();

  useEffect(() => {
    if (!engine || !isInitialized) return;

    console.log('[TestScene] Setting up Babylon.js test scene');

    engine.setBackgroundColor(Color.fromHex('#0a0a20'));

    engine.createLight({
      id: 'ambient',
      type: 'hemisphere',
      direction: { x: 0, y: 1, z: 0 },
      color: { r: 0.4, g: 0.4, b: 0.6 },
      intensity: 0.5
    });

    engine.createLight({
      id: 'sun',
      type: 'directional',
      direction: { x: 0.5, y: -1, z: 0.5 },
      color: { r: 1, g: 0.9, b: 0.7 },
      intensity: 1.0
    });

    engine.createCamera({
      id: 'main-camera',
      type: 'perspective',
      position: { x: 0, y: 5, z: -10 },
      target: { x: 0, y: 0, z: 0 },
      fov: Math.PI / 4,
      near: 0.1,
      far: 1000
    });
    engine.setActiveCamera('main-camera');

    engine.createMesh({
      id: 'sun-sphere',
      type: 'sphere',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 2, z: 2 }
      },
      color: { r: 1, g: 0.8, b: 0.2 },
      emissive: { r: 1, g: 0.6, b: 0.1 }
    });

    engine.createMesh({
      id: 'planet-1',
      type: 'sphere',
      transform: {
        position: { x: 5, y: 0, z: 0 },
        scale: { x: 0.5, y: 0.5, z: 0.5 }
      },
      color: { r: 0.2, g: 0.5, b: 0.8 }
    });

    engine.createMesh({
      id: 'planet-2',
      type: 'sphere',
      transform: {
        position: { x: -7, y: 1, z: 2 },
        scale: { x: 0.7, y: 0.7, z: 0.7 }
      },
      color: { r: 0.8, g: 0.3, b: 0.2 }
    });

    for (let i = 0; i < 100; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 50;
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const size = 0.02 + Math.random() * 0.05;

      engine.createMesh({
        id: `star-${i}`,
        type: 'sphere',
        transform: {
          position: { x, y, z },
          scale: { x: size, y: size, z: size }
        },
        emissive: { r: 1, g: 1, b: 1 }
      });
    }

    console.log('[TestScene] Test scene setup complete');

    return () => {
      console.log('[TestScene] Cleaning up test scene');
      engine.removeNode('ambient');
      engine.removeNode('sun');
      engine.removeNode('main-camera');
      engine.removeNode('sun-sphere');
      engine.removeNode('planet-1');
      engine.removeNode('planet-2');
      for (let i = 0; i < 100; i++) {
        engine.removeNode(`star-${i}`);
      }
    };
  }, [engine, isInitialized]);

  useEngineUpdate('orbital-motion', (deltaTime, elapsedTime) => {
    if (!engine) return;

    const planet1 = engine.getNode('planet-1');
    if (planet1) {
      const radius = 5;
      const speed = 0.5;
      engine.setNodeTransform('planet-1', {
        position: {
          x: Math.cos(elapsedTime * speed) * radius,
          y: 0,
          z: Math.sin(elapsedTime * speed) * radius
        }
      });
    }

    const planet2 = engine.getNode('planet-2');
    if (planet2) {
      const radius = 7;
      const speed = 0.3;
      engine.setNodeTransform('planet-2', {
        position: {
          x: Math.cos(elapsedTime * speed + Math.PI) * radius,
          y: Math.sin(elapsedTime * 0.2),
          z: Math.sin(elapsedTime * speed + Math.PI) * radius
        }
      });
    }
  }, [engine]);

  if (!isInitialized) {
    return null;
  }

  return null;
}
