import { useState, useEffect } from "react";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { useAutopilot } from "../lib/stores/useAutopilot";
import { useCredits } from "../lib/stores/useCredits";
import { planets, ResourceData } from "../lib/planetData";
import { MiningInterface } from "./MiningInterface";

export function OrbitalInterface() {
  const { selectedPlanet, setIsLanding } = useSolarSystem();
  const { isOrbiting, isActive: isAutopilotActive, deactivate: deactivateAutopilot } = useAutopilot();
  const { credits, earnCredits } = useCredits();
  const [scanResults, setScanResults] = useState<ResourceData[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [bookmarkedPlanets, setBookmarkedPlanets] = useState<string[]>([]);
  const [showMiningInterface, setShowMiningInterface] = useState(false);
  const [showInterface, setShowInterface] = useState(false);

  // Add delay before showing interface after autopilot reaches orbit
  useEffect(() => {
    if (isOrbiting && !isAutopilotActive) {
      // Show interface immediately if autopilot is not active (manual approach)
      console.log("Orbital UI: Manual approach - showing interface immediately");
      setShowInterface(true);
    } else if (isOrbiting && isAutopilotActive) {
      // Add 3-second delay if we just entered orbit via autopilot
      console.log("Orbital UI: Autopilot orbit detected - applying 3s delay");
      const timer = setTimeout(() => {
        console.log("Orbital UI: Delay complete - showing interface");
        setShowInterface(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      // Reset when not orbiting
      setShowInterface(false);
    }
  }, [isOrbiting, isAutopilotActive]);

  // Only show when orbiting a planet and after delay
  if (!isOrbiting || !selectedPlanet || !showInterface) return null;

  const planetData = planets.find(p => p.name === selectedPlanet);
  if (!planetData) return null;

  const isBookmarked = bookmarkedPlanets.includes(selectedPlanet);

  const handleLand = () => {
    setIsLanding(true);
    deactivateAutopilot();
  };

  const handleBookmark = () => {
    if (isBookmarked) {
      setBookmarkedPlanets(prev => prev.filter(name => name !== selectedPlanet));
    } else {
      setBookmarkedPlanets(prev => [...prev, selectedPlanet]);
    }
  };

  const handleScanForResources = () => {
    if (isScanning) return;
    
    setIsScanning(true);
    // Simulate scanning time
    setTimeout(() => {
      setScanResults(planetData.resources);
      setIsScanning(false);
      
      // Award some credits for successful scan
      const scanReward = 25;
      earnCredits(scanReward);
      console.log(`Resource scan complete! Earned ${scanReward} credits.`);
    }, 3000);
  };

  const getRarityColor = (rarity: ResourceData['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'legendary': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityBg = (rarity: ResourceData['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-800/50';
      case 'uncommon': return 'bg-green-900/50';
      case 'rare': return 'bg-blue-900/50';
      case 'legendary': return 'bg-purple-900/50';
      default: return 'bg-gray-800/50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 pointer-events-auto">
      <div className="bg-gray-900 border border-cyan-400 rounded-lg p-6 max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div 
              className="w-8 h-8 rounded-full border-2 border-cyan-400"
              style={{ backgroundColor: planetData.color }}
            />
            <div>
              <h1 className="text-3xl font-bold text-cyan-400">{planetData.name}</h1>
              <p className="text-gray-400">Orbital Analysis Complete</p>
            </div>
          </div>
          <button
            onClick={deactivateAutopilot}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Exit Orbit
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Planet Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">Planet Information</h2>
            
            <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400">Distance from Sun:</span>
                  <div className="text-white">{planetData.realDistance} AU</div>
                </div>
                <div>
                  <span className="text-gray-400">Diameter:</span>
                  <div className="text-white">{planetData.diameter} km</div>
                </div>
                <div>
                  <span className="text-gray-400">Gravity:</span>
                  <div className="text-white">{planetData.gravity}</div>
                </div>
                <div>
                  <span className="text-gray-400">Moons:</span>
                  <div className="text-white">{planetData.moons}</div>
                </div>
                <div>
                  <span className="text-gray-400">Atmosphere:</span>
                  <div className="text-white">{planetData.atmosphere}</div>
                </div>
                <div>
                  <span className="text-gray-400">Temperature:</span>
                  <div className="text-white">{planetData.surfaceTemperature}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-cyan-400 font-semibold mb-2">Description</h3>
              <p className="text-gray-300 text-sm">{planetData.description}</p>
            </div>
          </div>

          {/* Resources & Actions */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">Available Resources</h2>
            
            {scanResults.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 mb-4">
                  🛰️ Resource scan required to identify mineral deposits
                </div>
                <button
                  onClick={handleScanForResources}
                  disabled={isScanning}
                  className={`px-4 py-2 rounded font-semibold ${
                    isScanning 
                      ? 'bg-yellow-600 text-gray-800' 
                      : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
                  }`}
                >
                  {isScanning ? 'Scanning... 🔍' : 'Scan for Resources (+25 Credits)'}
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scanResults.map((resource, index) => (
                  <div 
                    key={index}
                    className={`${getRarityBg(resource.rarity)} border-l-4 border-cyan-400 rounded-lg p-3`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-semibold ${getRarityColor(resource.rarity)}`}>
                        {resource.type}
                      </h4>
                      <span className="text-yellow-400 font-mono text-sm">
                        {resource.value} credits/unit
                      </span>
                    </div>
                    <p className="text-gray-300 text-xs">{resource.description}</p>
                    <div className="mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${getRarityBg(resource.rarity)} ${getRarityColor(resource.rarity)} border`}>
                        {resource.rarity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={handleLand}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center space-x-2"
          >
            <span>🚀</span>
            <span>Land on {planetData.name}</span>
          </button>
          
          <button
            onClick={handleBookmark}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 ${
              isBookmarked 
                ? 'bg-yellow-600 hover:bg-yellow-700 text-gray-900' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <span>{isBookmarked ? '⭐' : '☆'}</span>
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark Planet'}</span>
          </button>
          
          {scanResults.length > 0 && (
            <button
              onClick={() => setShowMiningInterface(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center space-x-2"
            >
              <span>⛏️</span>
              <span>Start Mining</span>
            </button>
          )}
        </div>
      </div>

      {/* Mining Interface */}
      {showMiningInterface && (
        <MiningInterface
          isVisible={showMiningInterface}
          planetName={planetData.name}
          resources={scanResults}
          onClose={() => setShowMiningInterface(false)}
        />
      )}
    </div>
  );
}