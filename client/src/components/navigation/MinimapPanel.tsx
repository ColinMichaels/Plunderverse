import React from "react";
import { motion } from "framer-motion";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useUILayout } from "../ui/UILayoutManager";
import { usePanelManager } from "../../lib/stores/ui/usePanelManager";
import { planets } from "../../lib/planetData";
import { Map, Navigation2, Zap } from "lucide-react";

export const MinimapPanel: React.FC = () => {
  const { time, cameraPosition } = useSolarSystem();
  const { togglePanel } = useUILayout();
  const { openPanel } = usePanelManager();
  
  const playerPos = { x: cameraPosition.x, z: cameraPosition.z };
  
  // Calculate scale factor based on largest planet distance
  const maxPlanetDistance = Math.max(...planets.map((p) => p.distance));
  const mapSize = 180; // Slightly larger for sidebar
  const padding = 15;
  const scale = (mapSize / 2 - padding) / maxPlanetDistance;
  const centerX = mapSize / 2;
  const centerY = mapSize / 2;

  // Convert world coordinates to minimap coordinates
  const worldToMap = (worldX: number, worldZ: number) => ({
    x: centerX + worldX * scale,
    y: centerY + worldZ * scale,
  });
  
  // Handle minimap click to show navigation options
  const handleMapClick = (e: React.MouseEvent) => {
    // Prevent event bubbling
    e.stopPropagation();
    
    // Show a quick menu for navigation options
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicked near a planet
    const clickedPlanet = planets.find(planet => {
      const angle = time * planet.orbitalSpeed;
      const worldX = Math.cos(angle) * planet.distance;
      const worldZ = Math.sin(angle) * planet.distance;
      const mapPos = worldToMap(worldX, worldZ);
      
      const distance = Math.sqrt(
        Math.pow(mapPos.x - x, 2) + Math.pow(mapPos.y - y, 2)
      );
      
      return distance < 10; // Within 10px of planet
    });
    
    if (clickedPlanet) {
      console.log(`Clicked on planet: ${clickedPlanet.name}`);
      // Could open autopilot with this planet selected
      togglePanel('autopilot');
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Quick Navigation Button - Opens unified navigation panel */}
      <div className="mb-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => togglePanel('autopilot')}
          className="w-full px-3 py-2 bg-gradient-to-r from-orange-500/20 to-cyan-600/20 hover:from-orange-500/30 hover:to-cyan-600/30 border border-cyan-500/30 rounded-lg text-xs font-mono text-cyan-400 flex items-center justify-center gap-2 transition-all"
        >
          <Navigation2 className="w-3 h-3" />
          <span>OPEN NAVIGATION</span>
        </motion.button>
      </div>
      
      {/* Minimap Display */}
      <div className="relative">
        <div 
          className="bg-gray-900/90 border border-cyan-400/50 rounded-lg p-2 cursor-pointer hover:border-cyan-400/70 transition-colors"
          onClick={handleMapClick}
          title="Click on planets to set autopilot destination"
        >
          <div
            className="relative border border-cyan-400/30 bg-black rounded"
            style={{ width: mapSize, height: mapSize }}
          >
            {/* Grid lines with space theme */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <pattern
                  id="space-grid-sidebar"
                  width="30"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 30 0 L 0 0 0 30"
                    fill="none"
                    stroke="rgba(6, 182, 212, 0.15)"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#space-grid-sidebar)" />
              
              {/* Orbital paths */}
              {planets.map((planet) => (
                <circle
                  key={`orbit-${planet.name}`}
                  cx={centerX}
                  cy={centerY}
                  r={planet.distance * scale}
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.1)"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                />
              ))}
            </svg>

            {/* Sun at center with enhanced glow */}
            <div
              className="absolute w-4 h-4 bg-yellow-400 rounded-full z-20"
              style={{
                left: centerX - 8,
                top: centerY - 8,
                boxShadow: "0 0 12px rgba(255, 255, 0, 0.8), 0 0 24px rgba(255, 200, 0, 0.4)",
              }}
            />

            {/* Planets with enhanced styling and hover effects */}
            {planets.map((planet) => {
              const angle = time * planet.orbitalSpeed;
              const worldX = Math.cos(angle) * planet.distance;
              const worldZ = Math.sin(angle) * planet.distance;
              const mapPos = worldToMap(worldX, worldZ);

              // Only show planets that are within the map bounds
              if (
                mapPos.x < 0 ||
                mapPos.x > mapSize ||
                mapPos.y < 0 ||
                mapPos.y > mapSize
              ) {
                return null;
              }

              return (
                <motion.div
                  key={planet.name}
                  className="absolute w-2 h-2 rounded-full border border-slate-600 cursor-pointer z-10"
                  style={{
                    left: mapPos.x - 4,
                    top: mapPos.y - 4,
                    backgroundColor: planet.color,
                    boxShadow: `0 0 6px ${planet.color}60`,
                  }}
                  whileHover={{ 
                    scale: 1.5,
                    boxShadow: `0 0 12px ${planet.color}`,
                  }}
                  title={`${planet.name} - Click to set autopilot`}
                />
              );
            })}

            {/* Player position with enhanced styling */}
            {(() => {
              const playerMapPos = worldToMap(playerPos.x, playerPos.z);

              // Only show player if within map bounds
              if (
                playerMapPos.x >= 0 &&
                playerMapPos.x <= mapSize &&
                playerMapPos.y >= 0 &&
                playerMapPos.y <= mapSize
              ) {
                return (
                  <div
                    className="absolute w-3 h-3 bg-cyan-400 rounded-full border-2 border-white animate-pulse z-30"
                    style={{
                      left: playerMapPos.x - 6,
                      top: playerMapPos.y - 6,
                      boxShadow: "0 0 8px rgba(6, 182, 212, 1), 0 0 16px rgba(6, 182, 212, 0.5)",
                    }}
                    title="Your Position"
                  />
                );
              }
              return null;
            })()}
          </div>

          {/* Compact legend with space styling */}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs font-mono">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"></div>
              <span className="text-yellow-400">SOL</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-cyan-400 rounded-full border border-white shadow-lg shadow-cyan-400/50"></div>
              <span className="text-cyan-400">SHIP</span>
            </div>
          </div>
        </div>
        
        {/* Interaction hint */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          <span className="flex items-center justify-center gap-1">
            <Map className="w-3 h-3" />
            Click planets to navigate
          </span>
        </div>
      </div>
      
    </div>
  );
};