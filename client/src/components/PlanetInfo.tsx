import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { planets, moonData } from "../lib/planetData";

export function PlanetInfo() {
  const { selectedPlanet } = useSolarSystem();
  
  if (!selectedPlanet) return null;

  // Check both planets and moon data
  const planet = planets.find((p: any) => p.name === selectedPlanet);
  const celestialBody = planet || (selectedPlanet === "Moon" ? moonData : null);
  
  if (!celestialBody) return null;

  const isMoon = selectedPlanet === "Moon";

  return (
    <div className="absolute top-4 left-4 bg-black/80 text-white p-6 rounded-lg backdrop-blur-sm max-w-sm">
      <h2 className="text-2xl font-bold mb-3 text-blue-400">{celestialBody.name}</h2>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">{isMoon ? "Distance from Earth:" : "Distance from Sun:"}</span>
          <span className="text-white">{celestialBody.realDistance} {isMoon ? "" : "AU"}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Diameter:</span>
          <span className="text-white">{celestialBody.diameter} km</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Orbital Period:</span>
          <span className="text-white">{celestialBody.orbitalPeriod}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Day Length:</span>
          <span className="text-white">{celestialBody.dayLength}</span>
        </div>

        {!isMoon && planet && planet.moons > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-300">Moons:</span>
            <span className="text-white">{planet.moons}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-300">Surface Temperature:</span>
          <span className="text-white">{celestialBody.surfaceTemperature}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-300">Gravity:</span>
          <span className="text-white">{celestialBody.gravity}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-300">Atmosphere:</span>
          <span className="text-white">{celestialBody.atmosphere}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-800 rounded text-xs">
        <p className="text-gray-300">{celestialBody.description}</p>
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Press 'L' to land • Press 'I' to toggle info
      </div>
    </div>
  );
}
