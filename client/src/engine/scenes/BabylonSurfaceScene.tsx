import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useEngine, useEngineUpdate } from '../hooks/useEngine';
import { useLandedState } from '@/lib/stores/surface/useLandedState';
import { useTerrain } from '@/lib/stores/surface/useTerrain';
import { useSolarSystem } from '@/lib/stores/space/useSolarSystem';
import { useMining } from '@/lib/stores/economy/useMining';
import { useFlashlight } from '@/lib/stores/surface/useFlashlight';
import { planets, ResourceData } from '@/lib/planetData';
import { useDestroyedNodes } from '@/lib/stores/surface/useDestroyedNodes';

interface ResourceNodeData {
  id: string;
  position: { x: number; y: number; z: number };
  resource: ResourceData;
  color: { r: number; g: number; b: number };
}

export function BabylonSurfaceScene() {
  const { engine, isInitialized } = useEngine();
  const { isLanded, landedPlanet } = useLandedState();
  const { currentTerrainData, loadTerrainForPlanet, getHeightAt } = useTerrain();
  const { getUniverseTime, updateUniverseTime } = useSolarSystem();
  const { isActive: isMiningActive, targetResource, currentNodeId } = useMining();
  const { isOn: isFlashlightOn, batteryLevel } = useFlashlight();
  const { isNodeDestroyed } = useDestroyedNodes();
  
  const sceneSetup = useRef(false);
  const resourceNodes = useRef<ResourceNodeData[]>([]);

  const planet = useMemo(() => {
    return planets.find(p => p.name === landedPlanet);
  }, [landedPlanet]);

  const surfaceColor = useMemo(() => {
    if (!planet) return { r: 0.55, g: 0.47, b: 0.33 };
    return hexToRgb(planet.color);
  }, [planet]);

  useEffect(() => {
    if (!engine || !isInitialized || !isLanded || !landedPlanet) return;
    if (sceneSetup.current) return;

    console.log('[BabylonSurfaceScene] Initializing surface scene for', landedPlanet);
    sceneSetup.current = true;

    loadTerrainForPlanet(landedPlanet);

    const skyColor = getSkyColorForPlanet(landedPlanet);
    engine.setBackgroundColor({ r: skyColor.r, g: skyColor.g, b: skyColor.b });

    engine.createLight({
      id: 'surface-ambient',
      type: 'hemisphere',
      direction: { x: 0, y: 1, z: 0 },
      color: { r: 0.4, g: 0.4, b: 0.5 },
      intensity: 0.4
    });

    engine.createLight({
      id: 'surface-sun',
      type: 'directional',
      position: { x: 50, y: 100, z: 50 },
      direction: { x: -0.5, y: -1, z: -0.5 },
      color: { r: 1, g: 0.95, b: 0.8 },
      intensity: 1.2
    });

    engine.createCamera({
      id: 'surface-camera',
      type: 'perspective',
      position: { x: 0, y: 5, z: -10 },
      target: { x: 0, y: 2, z: 0 },
      fov: Math.PI / 3,
      near: 0.1,
      far: 1000
    });
    engine.setActiveCamera('surface-camera');

    engine.setPostProcessing({
      glow: { enabled: true, intensity: 0.5 },
      bloom: { enabled: true, intensity: 0.3, threshold: 0.7 },
      vignette: { enabled: true, weight: 1.0 }
    });

    engine.createMesh({
      id: 'surface-ground',
      type: 'plane',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 400, y: 400, z: 1 }
      },
      color: surfaceColor
    });

    engine.createMesh({
      id: 'surface-sky-dome',
      type: 'sphere',
      transform: {
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 500, y: 500, z: 500 }
      },
      color: skyColor,
      opacity: 0.8
    });

    generateResourceNodes(engine, planet, landedPlanet, isNodeDestroyed, resourceNodes, getHeightAt);

    console.log('[BabylonSurfaceScene] Scene setup complete');

    return () => {
      console.log('[BabylonSurfaceScene] Cleaning up surface scene');
      sceneSetup.current = false;
      
      engine.clearPostProcessing();
      engine.removeNode('surface-ambient');
      engine.removeNode('surface-sun');
      engine.removeNode('surface-camera');
      engine.removeNode('surface-ground');
      engine.removeNode('surface-sky-dome');
      engine.removeNode('surface-flashlight');
      
      resourceNodes.current.forEach(node => {
        engine.removeNode(`resource-${node.id}`);
        engine.removeNode(`resource-glow-${node.id}`);
      });
      resourceNodes.current = [];
    };
  }, [engine, isInitialized, isLanded, landedPlanet, loadTerrainForPlanet, planet, surfaceColor, isNodeDestroyed]);

  useEffect(() => {
    if (!engine || !isFlashlightOn || !sceneSetup.current) return;
    
    const existingNode = engine.getNode('surface-flashlight');
    if (!existingNode) {
      engine.createLight({
        id: 'surface-flashlight',
        type: 'spot',
        position: { x: 0, y: 5, z: -8 },
        direction: { x: 0, y: -0.3, z: 1 },
        color: { r: 1, g: 0.95, b: 0.8 },
        intensity: batteryLevel / 100 * 2
      });
    }

    return () => {
      engine.removeNode('surface-flashlight');
    };
  }, [engine, isFlashlightOn, batteryLevel]);

  useEngineUpdate('surface-update', useCallback((deltaTime, elapsedTime) => {
    if (!engine || !sceneSetup.current) return;

    updateUniverseTime(deltaTime);
    const universeTime = getUniverseTime();

    const dayProgress = (universeTime % 86400) / 86400;
    const sunAngle = dayProgress * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle) * 100;
    const sunX = Math.cos(sunAngle) * 100;
    
    const sunIntensity = Math.max(0.2, Math.sin(sunAngle));
    
    engine.setNodeTransform('surface-sun', {
      position: { x: sunX, y: Math.max(20, sunHeight), z: 50 }
    });

    resourceNodes.current.forEach(node => {
      if (landedPlanet && isNodeDestroyed(landedPlanet, node.id)) {
        engine.removeNode(`resource-${node.id}`);
        engine.removeNode(`resource-glow-${node.id}`);
        return;
      }

      const isBeingMined = isMiningActive && currentNodeId === node.id;
      const nodeHash = hashString(node.id);
      const pulseScale = isBeingMined 
        ? 1 + Math.sin(elapsedTime * 10) * 0.2 
        : 1 + Math.sin(elapsedTime * 2 + nodeHash * 0.01) * 0.05;

      const baseScale = getResourceScale(node.resource.rarity);
      engine.setNodeTransform(`resource-${node.id}`, {
        scale: { 
          x: baseScale * pulseScale, 
          y: baseScale * pulseScale, 
          z: baseScale * pulseScale 
        }
      });

      if (isBeingMined) {
        const glowNode = engine.getNode(`resource-glow-${node.id}`);
        if (!glowNode) {
          engine.createMesh({
            id: `resource-glow-${node.id}`,
            type: 'sphere',
            transform: {
              position: node.position,
              scale: { x: baseScale * 2, y: baseScale * 2, z: baseScale * 2 }
            },
            color: node.color,
            emissive: node.color,
            opacity: 0.3
          });
        }
      } else {
        engine.removeNode(`resource-glow-${node.id}`);
      }
    });

  }, [engine, updateUniverseTime, getUniverseTime, isMiningActive, currentNodeId, isNodeDestroyed]), [engine, isMiningActive, currentNodeId]);

  if (!isLanded || !landedPlanet) return null;

  return null;
}

function generateResourceNodes(
  engine: any, 
  planet: any, 
  planetName: string,
  isNodeDestroyed: (planetName: string, id: string) => boolean,
  resourceNodesRef: React.MutableRefObject<ResourceNodeData[]>,
  getHeightAt: (x: number, z: number) => number
) {
  if (!planet?.resources) return;

  const nodes: ResourceNodeData[] = [];
  let nodeIndex = 0;
  
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  planet.resources.forEach((resource: ResourceData, resourceIndex: number) => {
    const nodeCount = getNodeCountForRarity(resource.rarity);
    
    for (let i = 0; i < nodeCount; i++) {
      const id = `${planet.name}-${resourceIndex}-${i}`;
      
      if (isNodeDestroyed(planetName, id)) continue;

      const seed = resourceIndex * 100 + i * 7.31;
      const angle = (nodeIndex / 20) * Math.PI * 2 + seededRandom(seed) * 0.5;
      const radius = 20 + seededRandom(seed + 1) * 80;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const terrainHeight = getHeightAt(x, z);
      const y = terrainHeight + 0.5 + getResourceScale(resource.rarity) / 2;

      const color = getResourceColor(resource.rarity);
      const scale = getResourceScale(resource.rarity);

      const nodeData: ResourceNodeData = {
        id,
        position: { x, y, z },
        resource,
        color
      };
      nodes.push(nodeData);

      engine.createMesh({
        id: `resource-${id}`,
        type: 'sphere',
        transform: {
          position: { x, y, z },
          scale: { x: scale, y: scale, z: scale }
        },
        color,
        emissive: { r: color.r * 0.5, g: color.g * 0.5, b: color.b * 0.5 }
      });

      nodeIndex++;
    }
  });

  resourceNodesRef.current = nodes;
  console.log(`[BabylonSurfaceScene] Created ${nodes.length} resource nodes`);
}

function getNodeCountForRarity(rarity: string): number {
  switch (rarity) {
    case 'common': return 8;
    case 'uncommon': return 5;
    case 'rare': return 3;
    case 'legendary': return 1;
    default: return 5;
  }
}

function getResourceScale(rarity: string): number {
  switch (rarity) {
    case 'common': return 0.8;
    case 'uncommon': return 1.0;
    case 'rare': return 1.3;
    case 'legendary': return 1.8;
    default: return 1.0;
  }
}

function getResourceColor(rarity: string): { r: number; g: number; b: number } {
  switch (rarity) {
    case 'common': return { r: 0.6, g: 0.6, b: 0.5 };
    case 'uncommon': return { r: 0.2, g: 0.7, b: 0.3 };
    case 'rare': return { r: 0.3, g: 0.4, b: 0.9 };
    case 'legendary': return { r: 0.9, g: 0.6, b: 0.1 };
    default: return { r: 0.5, g: 0.5, b: 0.5 };
  }
}

function getSkyColorForPlanet(planetName: string): { r: number; g: number; b: number } {
  switch (planetName.toLowerCase()) {
    case 'earth': return { r: 0.4, g: 0.6, b: 0.9 };
    case 'mars': return { r: 0.8, g: 0.5, b: 0.3 };
    case 'venus': return { r: 0.9, g: 0.7, b: 0.4 };
    case 'mercury': return { r: 0.1, g: 0.1, b: 0.1 };
    case 'jupiter': return { r: 0.7, g: 0.6, b: 0.5 };
    case 'saturn': return { r: 0.8, g: 0.7, b: 0.5 };
    case 'uranus': return { r: 0.5, g: 0.7, b: 0.8 };
    case 'neptune': return { r: 0.3, g: 0.4, b: 0.7 };
    case 'moon': return { r: 0.05, g: 0.05, b: 0.08 };
    default: return { r: 0.2, g: 0.2, b: 0.3 };
  }
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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default BabylonSurfaceScene;
