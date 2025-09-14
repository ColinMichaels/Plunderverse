import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useMining } from "../lib/stores/useMining";
import { useInventory } from "../lib/stores/useInventory";
import { useCredits } from "../lib/stores/useCredits";
import { ResourceData } from "../lib/planetData";

interface MiningInterfaceProps {
  isVisible: boolean;
  planetName: string;
  resources: ResourceData[];
  onClose: () => void;
}

export function MiningInterface({ isVisible, planetName, resources, onClose }: MiningInterfaceProps) {
  const { 
    isActive, 
    targetResource, 
    progress, 
    miningSpeed,
    miningEfficiency,
    drillPower,
    extractorLevel,
    startMining, 
    stopMining, 
    updateProgress,
    upgradeDrill,
    upgradeExtractor
  } = useMining();
  
  const { addResource, getStorageUsed, storageCapacity } = useInventory();
  const { earnCredits } = useCredits();
  const [selectedResource, setSelectedResource] = useState<ResourceData | null>(null);

  // Mining progress update loop
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      const result = updateProgress(0.1); // Update every 100ms
      
      if (result) {
        // Mining completed, add to inventory
        const success = addResource(result.resource, result.quantity, result.planet || planetName);
        
        if (success) {
          // Award credits for successful mining
          const creditReward = Math.floor(result.resource.value * result.quantity * 0.1);
          earnCredits(creditReward);
          console.log(`Mining reward: ${creditReward} credits`);
        } else {
          console.log("Inventory full! Mining stopped.");
          stopMining();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, updateProgress, addResource, planetName, earnCredits, stopMining]);

  if (!isVisible) return null;

  const handleStartMining = () => {
    if (selectedResource) {
      startMining(planetName, selectedResource);
    }
  };

  const storageUsed = getStorageUsed();
  const storagePercentage = (storageUsed / storageCapacity) * 100;

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
      case 'common': return 'bg-gray-800/50 border-gray-600';
      case 'uncommon': return 'bg-green-900/50 border-green-600';
      case 'rare': return 'bg-blue-900/50 border-blue-600';
      case 'legendary': return 'bg-purple-900/50 border-purple-600';
      default: return 'bg-gray-800/50 border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border border-orange-400 rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-orange-400 text-2xl">⛏️</div>
            <div>
              <h1 className="text-2xl font-bold text-orange-400">Mining Operations</h1>
              <p className="text-gray-400">{planetName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
          >
            Close
          </button>
        </div>

        {/* Storage Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Storage Capacity</span>
            <span className="text-white">{storageUsed}/{storageCapacity} units</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                storagePercentage > 90 ? 'bg-red-500' : storagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
        </div>

        {/* Mining Status */}
        {isActive && targetResource && (
          <div className="mb-6 p-4 bg-orange-900/30 border border-orange-400 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-orange-400 font-semibold">Currently Mining: {targetResource.type}</h3>
              <button
                onClick={stopMining}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Stop Mining
              </button>
            </div>
            
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-300 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
              <div>Speed: {miningSpeed.toFixed(1)}/s</div>
              <div>Efficiency: {Math.round(miningEfficiency * 100)}%</div>
              <div>Drill Power: {drillPower}</div>
              <div>Extractor Lv: {extractorLevel}</div>
            </div>
          </div>
        )}

        {/* Resource Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-orange-400 mb-3">Available Resources</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {resources.map((resource, index) => (
              <div 
                key={index}
                className={`${getRarityBg(resource.rarity)} border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedResource?.type === resource.type 
                    ? 'ring-2 ring-orange-400' 
                    : 'hover:bg-opacity-70'
                }`}
                onClick={() => setSelectedResource(resource)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`font-semibold ${getRarityColor(resource.rarity)}`}>
                      {resource.type}
                    </h4>
                    <p className="text-gray-300 text-xs mt-1">{resource.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-yellow-400 font-mono text-sm">
                      {resource.value} credits/unit
                    </div>
                    <div className={`text-xs px-2 py-1 rounded mt-1 ${getRarityBg(resource.rarity)}`}>
                      {resource.rarity.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mining Equipment Upgrades */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-cyan-400 font-semibold mb-3">Mining Equipment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-300 mb-2">Drill Power: {drillPower}</div>
              <button
                onClick={upgradeDrill}
                className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Upgrade Drill
              </button>
            </div>
            <div>
              <div className="text-sm text-gray-300 mb-2">Extractor Lv: {extractorLevel}</div>
              <button
                onClick={upgradeExtractor}
                className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Upgrade Extractor
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {!isActive ? (
            <button
              onClick={handleStartMining}
              disabled={!selectedResource || storageUsed >= storageCapacity}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 ${
                selectedResource && storageUsed < storageCapacity
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>⛏️</span>
              <span>Start Mining</span>
            </button>
          ) : (
            <button
              onClick={stopMining}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center space-x-2"
            >
              <span>🛑</span>
              <span>Stop Mining</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}