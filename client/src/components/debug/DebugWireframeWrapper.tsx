import * as THREE from "three";
import { useDebugTools } from "../../lib/stores/debug/useDebugTools";

/**
 * Hook to get the current wireframe debug state
 * Use this in mesh components to conditionally enable wireframe rendering
 */
export function useDebugWireframe() {
  return useDebugTools((state) => state.showWireframes);
}

/**
 * Component for rendering edge overlays on geometry (alternative approach)
 * Usage: <DebugWireframeOverlay geometry={geometryRef.current} />
 */
export function DebugWireframeOverlay({ geometry }: { geometry: THREE.BufferGeometry }) {
  const showWireframes = useDebugWireframe();
  
  if (!showWireframes) return null;
  
  return (
    <lineSegments>
      <edgesGeometry args={[geometry]} />
      <lineBasicMaterial color="cyan" />
    </lineSegments>
  );
}
