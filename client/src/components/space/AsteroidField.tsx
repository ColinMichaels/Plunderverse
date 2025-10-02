import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useAsteroids } from "../../lib/stores/space/useAsteroids";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useShooting } from "../../lib/stores/combat/useShooting";
import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useAutopilot } from "../../lib/stores/navigation/useAutopilot";
import { Asteroid } from "./Asteroid";

export function AsteroidField() {
  const { asteroids, updateAsteroids, spawnRandomAsteroid, damageAsteroid, clearAsteroids, processPendingSpawns } = useAsteroids();
  const { cameraPosition } = useSolarSystem();
  const { projectiles, removeProjectile } = useShooting();
  const { takeDamage } = useShipStatus();
  const { isActive: isAutopilotActive } = useAutopilot();
  const lastSpawnTime = useRef(0);
  const previousAutopilotState = useRef(false);
  const initialSpawnComplete = useRef(false);

  useFrame((state, delta) => {
    // Process pending asteroid spawns (for staggered spawning)
    processPendingSpawns(delta);

    // Check if autopilot just activated - clear asteroids for clean warp effect
    if (isAutopilotActive && !previousAutopilotState.current) {
      clearAsteroids();
      console.log("Autopilot activated - clearing asteroids for clean travel");
      initialSpawnComplete.current = false; // Reset initial spawn flag
    }
    previousAutopilotState.current = isAutopilotActive;

    // Update asteroid positions
    updateAsteroids(delta, cameraPosition);

    // Initial staggered spawn when scene loads (only once)
    if (!isAutopilotActive && !initialSpawnComplete.current && asteroids.length === 0) {
      const initialAsteroidCount = 3; // Start with 3 asteroids
      for (let i = 0; i < initialAsteroidCount; i++) {
        // Stagger spawn times between 0.2s and 1.5s
        const staggerDelay = 0.2 + (i * 0.4);
        spawnRandomAsteroid(cameraPosition, staggerDelay);
      }
      initialSpawnComplete.current = true;
      console.log("Initial asteroids queued with staggered spawning");
    }

    // Spawn new asteroids periodically (but NOT during autopilot)
    if (!isAutopilotActive) {
      const currentTime = state.clock.elapsedTime;
      if (currentTime - lastSpawnTime.current > 5 && asteroids.length < 8) { // Max 8 asteroids, spawn every 5 seconds
        // Use slight stagger delay for new spawns too (0.1 to 0.3 seconds)
        const staggerDelay = 0.1 + Math.random() * 0.2;
        spawnRandomAsteroid(cameraPosition, staggerDelay);
        lastSpawnTime.current = currentTime;
      }
    }

    // Check collisions between projectiles and asteroids
    projectiles.forEach(projectile => {
      asteroids.forEach(asteroid => {
        const distance = projectile.position.distanceTo(asteroid.position);
        const visualSize = asteroid.size * 0.15; // Match the visual scale from Asteroid.tsx
        if (distance < visualSize + 0.5) { // Hit detection with smaller radius
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
      const visualSize = asteroid.size * 0.15; // Match the visual scale from Asteroid.tsx
      if (distance < visualSize + 1) { // Ship collision radius adjusted for visual size
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