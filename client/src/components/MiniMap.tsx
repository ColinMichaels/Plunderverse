import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { planets } from "../lib/planetData";
import { SpaceUIPanel } from "./SpaceUIPanel";

export function MiniMap() {
  const { time, cameraPosition } = useSolarSystem();
  const playerPos = { x: cameraPosition.x, z: cameraPosition.z };

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
    <SpaceUIPanel
      id="minimap"
      title="NAVIGATION MAP"
      icon="🗺️"
      zone="bottom-left"
      priority={2}
      defaultExpanded={true}
    >
      <div 
        className="relative border border-cyan-400/30 bg-black rounded"
        style={{ width: mapSize, height: mapSize }}
      >
        {/* Grid lines with space theme */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="space-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(6, 182, 212, 0.2)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#space-grid)" />
        </svg>

        {/* Sun at center with glow effect */}
        <div 
          className="absolute w-3 h-3 bg-yellow-400 rounded-full"
          style={{
            left: centerX - 6,
            top: centerY - 6,
            boxShadow: '0 0 8px rgba(255, 255, 0, 0.6)'
          }}
        />

        {/* Planets with enhanced styling */}
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
              className="absolute w-1.5 h-1.5 rounded-full border border-slate-600"
              style={{
                left: mapPos.x - 3,
                top: mapPos.y - 3,
                backgroundColor: planet.color,
                boxShadow: `0 0 4px ${planet.color}40`
              }}
              title={planet.name}
            />
          );
        })}

        {/* Player position with enhanced styling */}
        {(() => {
          const playerMapPos = worldToMap(playerPos.x, playerPos.z);
          
          // Only show player if within map bounds
          if (playerMapPos.x >= 0 && playerMapPos.x <= mapSize && 
              playerMapPos.y >= 0 && playerMapPos.y <= mapSize) {
            return (
              <div 
                className="absolute w-2 h-2 bg-cyan-400 rounded-full border border-white animate-pulse"
                style={{
                  left: playerMapPos.x - 4,
                  top: playerMapPos.y - 4,
                  boxShadow: '0 0 6px rgba(6, 182, 212, 0.8)'
                }}
                title="Your Position"
              />
            );
          }
          return null;
        })()}
      </div>
      
      {/* Legend with space styling */}
      <div className="space-status-bar mt-2">
        <div className="space-status-item">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
            <span className="text-xs font-mono">SOL</span>
          </div>
        </div>
        <div className="space-status-item">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full border border-white"></div>
            <span className="text-xs font-mono">SHIP</span>
          </div>
        </div>
      </div>
    </SpaceUIPanel>
  );
}