import { Html } from "@react-three/drei";
import { Enemy as EnemyType } from "@/lib/stores/combat/useEnemies";

interface EnemyHealthBarProps {
  enemy: EnemyType;
}

export function EnemyHealthBar({ enemy }: EnemyHealthBarProps) {
  const healthPercentage = (enemy.hull / enemy.maxHull) * 100;
  const shieldPercentage = (enemy.shield / enemy.maxShield) * 100;

  // Don't show health bar for dying enemies
  if (enemy.isDying) return null;

  // Calculate color gradient from red to green based on health
  const healthColor =
    healthPercentage > 50
      ? `rgb(${255 - (healthPercentage - 50) * 5.1}, 255, 0)` // Green to yellow
      : `rgb(255, ${healthPercentage * 5.1}, 0)`; // Red to yellow

  return (
    <Html
      position={[0, 1.5, 0]} // Position above enemy
      center
      distanceFactor={10}
      occlude={false}
      style={{
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div className="flex flex-col gap-0.5">
        {/* Shield bar (if has shield) */}
        {enemy.maxShield > 0 && (
          <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
            <div
              className="h-full bg-blue-400 transition-all duration-100"
              style={{ width: `${shieldPercentage}%` }}
            />
          </div>
        )}

        {/* Health bar */}
        <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${healthPercentage}%`,
              backgroundColor: healthColor,
              boxShadow: `0 0 4px ${healthColor}`,
            }}
          />
        </div>

        {/* Health text */}
        <div
          className="text-center text-xs font-bold text-white"
          style={{
            textShadow: "0 0 4px rgba(0,0,0,0.8)",
          }}
        >
          {enemy.hull}/{enemy.maxHull}
        </div>
      </div>
    </Html>
  );
}
