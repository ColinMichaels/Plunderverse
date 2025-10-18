import { create } from "zustand";

interface DestroyedNodesState {
  // Map of planet name to set of destroyed node IDs
  destroyedNodesByPlanet: Map<string, Set<string>>;
  
  // Actions
  destroyNode: (planetName: string, nodeId: string) => void;
  isNodeDestroyed: (planetName: string, nodeId: string) => boolean;
  getDestroyedNodes: (planetName: string) => Set<string>;
  clearPlanetNodes: (planetName: string) => void;
  clearAllNodes: () => void;
}

export const useDestroyedNodes = create<DestroyedNodesState>((set, get) => ({
  destroyedNodesByPlanet: new Map(),
  
  destroyNode: (planetName: string, nodeId: string) => {
    set((state) => {
      const newMap = new Map(state.destroyedNodesByPlanet);
      const planetNodes = newMap.get(planetName) || new Set();
      const updatedNodes = new Set(planetNodes);
      updatedNodes.add(nodeId);
      newMap.set(planetName, updatedNodes);
      
      console.log(`[DESTROYED-NODES] Node ${nodeId} on ${planetName} marked as destroyed`);
      console.log(`[DESTROYED-NODES] Total destroyed on ${planetName}: ${updatedNodes.size}`);
      
      return { destroyedNodesByPlanet: newMap };
    });
  },
  
  isNodeDestroyed: (planetName: string, nodeId: string) => {
    const state = get();
    const planetNodes = state.destroyedNodesByPlanet.get(planetName);
    return planetNodes?.has(nodeId) || false;
  },
  
  getDestroyedNodes: (planetName: string) => {
    const state = get();
    return state.destroyedNodesByPlanet.get(planetName) || new Set();
  },
  
  clearPlanetNodes: (planetName: string) => {
    set((state) => {
      const newMap = new Map(state.destroyedNodesByPlanet);
      newMap.delete(planetName);
      console.log(`[DESTROYED-NODES] Cleared all destroyed nodes for ${planetName}`);
      return { destroyedNodesByPlanet: newMap };
    });
  },
  
  clearAllNodes: () => {
    set({ destroyedNodesByPlanet: new Map() });
    console.log(`[DESTROYED-NODES] Cleared all destroyed nodes for all planets`);
  }
}));