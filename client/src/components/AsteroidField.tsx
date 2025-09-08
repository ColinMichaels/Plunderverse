import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useAsteroids } from "../lib/stores/useAsteroids";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useShooting } from "../lib/stores/useShooting";
import { useShipStatus } from "../lib/stores/useShipStatus";
import { Asteroid } from "./Asteroid";

export function AsteroidField() {
  const { asteroids, updateAsteroids, spawnRandomAsteroid, damageAsteroid } = useAsteroids();
  const { cameraPosition } = useSolarSystem();
  const { projectiles, removeProjectile } = useShooting();
  const { takeDamage } = useShipStatus();
  const lastSpawnTime = useRef(0);

  useFrame((state, delta) => {
    // Update asteroid positions
    updateAsteroids(delta, cameraPosition);

    // Spawn new asteroids periodically
    const currentTime = state.clock.elapsedTime;
    if (currentTime - lastSpawnTime.current > 5 && asteroids.length < 8) { // Max 8 asteroids, spawn every 5 seconds
      spawnRandomAsteroid(cameraPosition);
      lastSpawnTime.current = currentTime;
    }

    // Check collisions between projectiles and asteroids
    projectiles.forEach(projectile => {
      asteroids.forEach(asteroid => {
        const distance = projectile.position.distanceTo(asteroid.position);
        if (distance < asteroid.size + 1) { // Hit detection
          // Damage asteroid
          const destroyed = damageAsteroid(asteroid.id, 1);
          
          // Remove projectile
          removeProjectile(projectile.id);
          
          if (destroyed) {
            console.log("Asteroid destroyed by laser!");
          }
        }
      });
    });

    // Check collisions between asteroids and ship
    asteroids.forEach(asteroid => {
      const distance = cameraPosition.distanceTo(asteroid.position);
      if (distance < asteroid.size + 2) { // Ship collision radius
        // Ship takes damage
        takeDamage(15, "Asteroid Impact");
        
        // Remove or damage the asteroid
        damageAsteroid(asteroid.id, 1);
      }
    });
  });

  return (
    <group>
      {asteroids.map(asteroid => (
        <Asteroid key={asteroid.id} asteroid={asteroid} />
      ))}
    </group>
  );
}