/**
 * Example usage of the ResourceManager utility
 * This demonstrates how to properly integrate ResourceManager into React Three Fiber components
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Howl } from 'howler';
import { resourceManager } from './ResourceManager';

/**
 * Example component showing ResourceManager integration
 */
export function ResourceManagedMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const audioRef = useRef<Howl | null>(null);

  useEffect(() => {
    // Create and register a mesh with its resources
    if (meshRef.current) {
      const mesh = meshRef.current;
      
      // Register the mesh (automatically registers its geometry and materials)
      resourceManager.registerMesh('player-ship', mesh, ['game-scene', 'player']);
      
      // Register a custom texture separately
      const texture = new THREE.TextureLoader().load('/textures/planets/2k_earth_daymap.jpg', (loadedTexture) => {
        resourceManager.registerTexture('earth-texture', loadedTexture, ['textures', 'planets']);
      });
    }

    // Create and register audio
    const backgroundMusic = new Howl({
      src: ['/sounds/music/ES_Orbit - Van Sandano.mp3'],
      loop: true,
      volume: 0.5
    });
    audioRef.current = backgroundMusic;
    resourceManager.registerAudio('background-music', backgroundMusic, ['audio', 'music']);

    // Cleanup function - dispose resources when component unmounts
    return () => {
      // Dispose specific resources
      resourceManager.disposeResource('player-ship');
      resourceManager.disposeResource('earth-texture');
      resourceManager.disposeResource('background-music');
      
      // Or dispose by tag (e.g., when leaving a scene)
      // resourceManager.disposeByTag('game-scene');
    };
  }, []);

  // Example of dynamic resource creation/disposal
  useFrame((state) => {
    // Create temporary resources that need cleanup
    if (state.clock.elapsedTime % 10 < 0.016) { // Every 10 seconds
      // Log memory status for debugging
      resourceManager.logMemoryStatus();
      
      // Clean up old resources (older than 5 minutes)
      resourceManager.cleanupOldResources(5 * 60 * 1000);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
}

/**
 * Example: Scene-level resource management
 */
export function GameScene({ sceneName }: { sceneName: string }) {
  useEffect(() => {
    const sceneTag = `scene-${sceneName}`;
    
    // Create scene-specific resources
    const createSceneResources = () => {
      // Create terrain geometry
      const terrainGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
      resourceManager.registerGeometry(`${sceneName}-terrain-geo`, terrainGeometry, [sceneTag, 'terrain']);

      // Create shared materials
      const sharedMaterial = new THREE.MeshStandardMaterial({ color: '#8C7853' });
      resourceManager.registerMaterial(`${sceneName}-shared-mat`, sharedMaterial, [sceneTag, 'materials']);

      // Create multiple textures
      const textures = ['grass', 'sand', 'rock'].map(type => {
        const texture = new THREE.TextureLoader().load(`/textures/terrain/${type}.jpg`);
        resourceManager.registerTexture(`${sceneName}-${type}-texture`, texture, [sceneTag, 'textures']);
        return texture;
      });

      // Create scene audio
      const ambientSound = new Howl({
        src: ['/sounds/space-ambience.mp3'],
        loop: true,
        volume: 0.3
      });
      ambientSound.play();
      resourceManager.registerAudio(`${sceneName}-ambient`, ambientSound, [sceneTag, 'ambient']);
    };

    createSceneResources();

    // Cleanup entire scene when unmounting
    return () => {
      console.log(`Cleaning up scene: ${sceneName}`);
      const disposed = resourceManager.disposeByTag(sceneTag);
      console.log(`Disposed ${disposed} resources from scene: ${sceneName}`);
    };
  }, [sceneName]);

  return null;
}

/**
 * Example: Resource pooling for frequently created/destroyed objects
 */
export class BulletPool {
  private poolTag = 'bullet-pool';
  private availableBullets: string[] = [];
  private activeBullets: Set<string> = new Set();
  private poolSize = 50;

  constructor() {
    this.initializePool();
  }

  private initializePool() {
    // Pre-create bullet geometries and materials
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000
    });

    // Register shared resources with high reference count
    resourceManager.registerGeometry('bullet-shared-geo', bulletGeometry, [this.poolTag, 'shared']);
    resourceManager.registerMaterial('bullet-shared-mat', bulletMaterial, [this.poolTag, 'shared']);

    // Create pool of bullet IDs
    for (let i = 0; i < this.poolSize; i++) {
      this.availableBullets.push(`bullet-${i}`);
    }
  }

  getBullet(): string | null {
    if (this.availableBullets.length === 0) {
      console.warn('Bullet pool exhausted!');
      return null;
    }

    const bulletId = this.availableBullets.pop()!;
    this.activeBullets.add(bulletId);
    
    // Create mesh using shared resources
    const bulletMesh = new THREE.Mesh(
      resourceManager.getResource<THREE.BufferGeometry>('bullet-shared-geo')!,
      resourceManager.getResource<THREE.Material>('bullet-shared-mat')!
    );
    
    // Register the mesh instance
    resourceManager.registerMesh(bulletId, bulletMesh, [this.poolTag, 'active']);
    
    return bulletId;
  }

  returnBullet(bulletId: string) {
    if (!this.activeBullets.has(bulletId)) return;

    // Dispose only the mesh instance, not shared resources
    resourceManager.disposeResource(bulletId);
    
    this.activeBullets.delete(bulletId);
    this.availableBullets.push(bulletId);
  }

  cleanup() {
    // Dispose entire pool
    resourceManager.disposeByTag(this.poolTag);
  }
}

/**
 * Example: Integration with existing stores
 */
export function useResourceTracking() {
  useEffect(() => {
    // Set up periodic memory monitoring
    const interval = setInterval(() => {
      const stats = resourceManager.getStats();
      
      // Alert if memory usage is high
      if (stats.totalMemoryEstimate > 500 * 1024 * 1024) { // 500MB
        console.warn('High memory usage detected:', {
          memoryMB: (stats.totalMemoryEstimate / 1024 / 1024).toFixed(2),
          resources: {
            geometries: stats.geometries,
            materials: stats.materials,
            textures: stats.textures,
            meshes: stats.meshes,
            audio: stats.audio
          }
        });
        
        // Trigger cleanup of old resources
        resourceManager.cleanupOldResources(2 * 60 * 1000); // 2 minutes
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);
}