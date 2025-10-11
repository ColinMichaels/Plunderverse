import { create } from "zustand";
import * as THREE from "three";

export interface CollisionObject {
  id: string;
  position: THREE.Vector3;
  radius: number;
  type: "resource" | "rock";
  resource?: any; // Optional resource data for resource nodes
}

interface SurfaceCollisionState {
  collisionObjects: CollisionObject[];
  registerCollisionObject: (obj: CollisionObject) => void;
  unregisterCollisionObject: (id: string) => void;
  clearCollisionObjects: () => void;
  checkCollision: (position: THREE.Vector3, playerRadius: number) => CollisionObject | null;
  getResourceNodes: () => CollisionObject[]; // Get all resource nodes for spacebar mining
}

export const useSurfaceCollision = create<SurfaceCollisionState>((set, get) => ({
  collisionObjects: [],

  registerCollisionObject: (obj: CollisionObject) => {
    set((state) => ({
      collisionObjects: [...state.collisionObjects, obj],
    }));
  },

  unregisterCollisionObject: (id: string) => {
    set((state) => ({
      collisionObjects: state.collisionObjects.filter((obj) => obj.id !== id),
    }));
  },

  clearCollisionObjects: () => {
    set({ collisionObjects: [] });
  },

  checkCollision: (position: THREE.Vector3, playerRadius: number) => {
    const { collisionObjects } = get();
    
    for (const obj of collisionObjects) {
      const distance = position.distanceTo(obj.position);
      const collisionDistance = playerRadius + obj.radius;
      
      if (distance < collisionDistance) {
        return obj;
      }
    }
    
    return null;
  },

  getResourceNodes: () => {
    const { collisionObjects } = get();
    // Return only resource type collision objects
    return collisionObjects.filter(obj => obj.type === "resource");
  },
}));
