import { useThree } from "@react-three/fiber";
import { useState, useEffect } from "react";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { planets } from "../lib/planetData";

export function MiniMap() {
  const { camera } = useThree();
  const { time } = useSolarSystem();
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0 });

  useEffect(() => {
    const updatePlayerPosition = () => {
      setPlayerPos({
        x: camera.position.x,
        z: camera.position.z
      });
    };

    const interval = setInterval(updatePlayerPosition, 100);
    return () => clearInterval(interval);
  }, [camera]);

  // Scale factor for the minimap (smaller = more zoomed out)
  const scale = 0.8;
  const mapSize = 120; // Size of the minimap in pixels
  const centerX = mapSize / 2;
  const centerY = mapSize / 2;

  // Convert world coordinates to minimap coordinates
  const worldToMap = (worldX: number, worldZ: number) => ({
    x: centerX + (worldX * scale),
    y: centerY + (worldZ * scale)
  });

  return (
    <div className="absolute bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg backdrop-blur-sm">
      <h3 className="text-xs font-bold mb-2 text-blue-400">SOLAR SYSTEM MAP</h3>
      
      <div 
        className="relative border border-gray-600 bg-black"
        style={{ width: mapSize, height: mapSize }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#333" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Sun at center */}
        <div 
          className="absolute w-3 h-3 bg-yellow-400 rounded-full"
          style={{
            left: centerX - 6,
            top: centerY - 6,
          }}
        />

        {/* Planets */}
        {planets.map((planet, index) => {
          const angle = time * planet.orbitalSpeed;
          const worldX = Math.cos(angle) * planet.distance;
          const worldZ = Math.sin(angle) * planet.distance;
          const mapPos = worldToMap(worldX, worldZ);

          // Only show planets that are within the map bounds
          if (mapPos.x < 0 || mapPos.x > mapSize || mapPos.y < 0 || mapPos.y > mapSize) {
            return null;
          }

          return (
            <div
              key={planet.name}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: mapPos.x - 3,
                top: mapPos.y - 3,
                backgroundColor: planet.color,
              }}
              title={planet.name}
            />
          );
        })}

        {/* Player position */}
        {(() => {
          const playerMapPos = worldToMap(playerPos.x, playerPos.z);
          
          // Only show player if within map bounds
          if (playerMapPos.x >= 0 && playerMapPos.x <= mapSize && 
              playerMapPos.y >= 0 && playerMapPos.y <= mapSize) {
            return (
              <div 
                className="absolute w-2 h-2 bg-cyan-400 rounded-full border border-white"
                style={{
                  left: playerMapPos.x - 4,
                  top: playerMapPos.y - 4,
                }}
                title="Your Position"
              />
            );
          }
          return null;
        })()}
      </div>
      
      <div className="text-xs text-gray-400 mt-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
          <span>Sun</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full border border-white"></div>
          <span>You</span>
        </div>
      </div>
    </div>
  );
}