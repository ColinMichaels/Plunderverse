import {create} from "zustand";
import * as THREE from "three";
import {SpatialGrid} from "@/lib/utils/SpatialGrid.ts";

export interface CollisionObject {
  id: string;
  position: THREE.Vector3;
  radius: number;
  type: "resource" | "rock";
  resource?: any; // Optional resource data for resource nodes
}

interface SurfaceCollisionState {
  collisionObjects: CollisionObject[];
  spatialGrid: SpatialGrid<CollisionObject>;
  registerCollisionObject: (obj: CollisionObject) => void;
  unregisterCollisionObject: (id: string) => void;
  clearCollisionObjects: () => void;
  checkCollision: (position: THREE.Vector3, playerRadius: number) => CollisionObject | null;
  getResourceNodes: () => CollisionObject[]; // Get all resource nodes for spacebar mining
  getNearbyObjects: (position: THREE.Vector3, radius: number) => CollisionObject[];
}

export const useSurfaceCollision = create<SurfaceCollisionState>((set, get) => ({
  collisionObjects: [],
  spatialGrid: new SpatialGrid<CollisionObject>(10), // 10 unit cells

  registerCollisionObject: (obj: CollisionObject) => {
    const {spatialGrid} = get();
    spatialGrid.insert(obj);

    set((state) => ({
      collisionObjects: [...state.collisionObjects, obj],
    }));
  },

  unregisterCollisionObject: (id: string) => {
    const {spatialGrid} = get();
    spatialGrid.remove(id);

    set((state) => ({
      collisionObjects: state.collisionObjects.filter((obj) => obj.id !== id),
    }));
  },

  clearCollisionObjects: () => {
    const {spatialGrid} = get();
    spatialGrid.clear();
    set({collisionObjects: []});
  },

  checkCollision: (position: THREE.Vector3, playerRadius: number) => {
    const {spatialGrid} = get();

    // Use spatial grid for optimized collision detection
    return spatialGrid.checkCollision(position, playerRadius);
  },

  getNearbyObjects: (position: THREE.Vector3, radius: number) => {
    const {spatialGrid} = get();
    return spatialGrid.getNearby(position, radius);
  },

  getResourceNodes: () => {
    const {spatialGrid} = get();
    // Use spatial grid to efficiently get all resource nodes
    return spatialGrid.getByType("resource");
  },
}));
