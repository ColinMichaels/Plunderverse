import { useDebugTools } from "../../lib/stores/debug/useDebugTools";
import { useSurfaceCollision } from "../../lib/stores/surface/useSurfaceCollision";
import * as THREE from "three";

export function DebugCollisionBoxes() {
  const { showCollisionBoxes } = useDebugTools();
  const { collisionObjects } = useSurfaceCollision();

  if (!showCollisionBoxes) {
    return null;
  }

  return (
    <group>
      {collisionObjects.map((obj) => (
        <group key={obj.id} position={[obj.position.x, obj.position.y, obj.position.z]}>
          {/* Transparent sphere showing collision radius */}
          <mesh>
            <sphereGeometry args={[obj.radius, 16, 16]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.3}
              wireframe
              side={THREE.DoubleSide}
            />
          </mesh>
          
          {/* Small axis helper at center for position reference */}
          <axesHelper args={[obj.radius * 0.5]} />
        </group>
      ))}
    </group>
  );
}
