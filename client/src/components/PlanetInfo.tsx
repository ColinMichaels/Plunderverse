import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { planets } from "../lib/planetData";

export function PlanetInfo() {
  const { selectedPlanet } = useSolarSystem();
  
  if (!selectedPlanet) return null;

  const planet = planets.find((p: any) => p.name === selectedPlanet);
  if (!planet) return null;

  return (
    <div className="absolute top-4 left-4 bg-black/80 text-white p-6 rounded-lg backdrop-blur-sm max-w-sm">
      <h2 className="text-2xl font-bold mb-3 text-blue-400">{planet.name}</h2>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Distance from Sun:</span>
          <span className="text-white">{planet.realDistance} AU</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Diameter:</span>
          <span className="text-white">{planet.diameter} km</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Orbital Period:</span>
          <span className="text-white">{planet.orbitalPeriod}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Day Length:</span>
          <span className="text-white">{planet.dayLength}</span>
        </div>

        {planet.moons > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-300">Moons:</span>
            <span className="text-white">{planet.moons}</span>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-800 rounded text-xs">
        <p className="text-gray-300">{planet.description}</p>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Press 'L' to land • Press 'I' to toggle info
      </div>
    </div>
  );
}
