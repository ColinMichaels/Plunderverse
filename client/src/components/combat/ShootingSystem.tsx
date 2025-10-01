import { useFrame } from "@react-three/fiber";
import { useShooting } from "../../lib/stores/combat/useShooting";
import { Laser } from "./Laser";

export function ShootingSystem() {
  const { projectiles, updateProjectiles } = useShooting();

  useFrame((state, delta) => {
    updateProjectiles(delta);
  });

  return (
    <group>
      {projectiles.map(projectile => (
        <Laser key={projectile.id} projectile={projectile} />
      ))}
    </group>
  );
}