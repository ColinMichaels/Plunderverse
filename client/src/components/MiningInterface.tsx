import { useEffect, useState, useMemo } from "react";
import { useMining } from "../lib/stores/useMining";
import { useInventory } from "../lib/stores/useInventory";
import { useCredits } from "../lib/stores/useCredits";
import { useAudio } from "../lib/stores/useAudio";
import { useEquipment } from "../lib/stores/useEquipment";
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
  const { earnCredits, spendCredits, credits } = useCredits();
  const { playHit, playSuccess } = useAudio();
  const { equipment, repairEquipment, getConditionStatus } = useEquipment();
  const [selectedResource, setSelectedResource] = useState<ResourceData | null>(null);

  // Precompute particle parameters to avoid Math.random in render
  const particleParams = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDelay: i * 0.5,
      animationDuration: 2 + Math.random() * 2
    }));
  }, [isActive]); // Regenerate when mining state changes

  // Remove duplicate sound effect - only play in handleStartMining

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

          // Play success sound
          playSuccess();
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
      // Check if drill is broken before starting
      const drillCondition = getConditionStatus('drill-mk1');
      if (drillCondition === 'broken') {
        console.warn("Cannot start mining: drill is broken and needs repair!");
        return;
      }
      
      startMining(planetName, selectedResource);
      
      // Play resource-specific start sound
      if (selectedResource.type === 'Rare Earth Elements') {
        playSuccess();
      } else {
        playHit();
      }
    }
  };

  const storageUsed = getStorageUsed();
  const storagePercentage = (storageUsed / storageCapacity) * 100;

  // Equipment condition helpers
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-green-300';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      case 'broken': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'fair': return '🟠';
      case 'poor': return '🔴';
      case 'critical': return '⚠️';
      case 'broken': return '💥';
      default: return '❓';
    }
  };

  const handleRepairEquipment = (equipmentId: string) => {
    const result = repairEquipment(equipmentId, undefined, credits);
    if (result.success) {
      spendCredits(result.cost);
      console.log(`Repaired equipment for ${result.cost} credits`);
    } else {
      console.log(`Failed to repair equipment. Need ${result.cost} credits, have ${credits}`);
    }
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
      case 'common': return 'bg-gray-800/50 border-gray-600';
      case 'uncommon': return 'bg-green-900/50 border-green-600';
      case 'rare': return 'bg-blue-900/50 border-blue-600';
      case 'legendary': return 'bg-purple-900/50 border-purple-600';
      default: return 'bg-gray-800/50 border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-auto">
      {/* Background Mining Animation */}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Animated mining particles using CSS only */}
          <div className="mining-particles absolute inset-0">
            {particleParams.map((particle) => (
              <div
                key={particle.id}
                className="particle absolute w-2 h-2 bg-orange-400 rounded-full"
                style={{
                  left: `${particle.left}%`,
                  animationDelay: `${particle.animationDelay}s`,
                  animationDuration: `${particle.animationDuration}s`
                }}
              />
            ))}
          </div>
          
          {/* Mining beam effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/10 to-transparent animate-pulse" />
          
          {/* Drilling indicators */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '0.8s'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Inline CSS for mining particle animation */}
      <style>{`
        .mining-particles .particle {
          animation: mining-particle linear infinite;
        }
        
        @keyframes mining-particle {
          0% {
            transform: translateY(100vh);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-20px);
            opacity: 0;
          }
        }
      `}</style>

      <div className="bg-gray-900 border border-orange-400 rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        
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

        {/* Equipment Status and Maintenance */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-cyan-400 font-semibold mb-3">Equipment Status</h3>
          <div className="space-y-3">
            {equipment.filter(eq => eq.type === 'drill' || eq.type === 'extractor').map((item) => {
              const condition = getConditionStatus(item.id);
              const durabilityPercent = (item.currentDurability / item.maxDurability) * 100;
              return (
                <div key={item.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <div className={`text-sm ${getConditionColor(condition)}`}>
                        {getConditionIcon(condition)} {condition.toUpperCase()} 
                        ({Math.round(item.performanceLevel * 100)}% efficiency)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Durability</div>
                      <div className="text-sm text-white">
                        {Math.round(item.currentDurability)}/{item.maxDurability}
                      </div>
                    </div>
                  </div>
                  
                  {/* Durability bar */}
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        durabilityPercent > 80 ? 'bg-green-500' : 
                        durabilityPercent > 60 ? 'bg-yellow-500' : 
                        durabilityPercent > 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${durabilityPercent}%` }}
                    />
                  </div>

                  {/* Repair button */}
                  {item.currentDurability < item.maxDurability && (
                    <button
                      onClick={() => handleRepairEquipment(item.id)}
                      disabled={credits < Math.ceil(((item.maxDurability - item.currentDurability) / item.maxDurability) * item.repairCost)}
                      className={`w-full px-3 py-1 rounded text-sm ${
                        credits >= Math.ceil(((item.maxDurability - item.currentDurability) / item.maxDurability) * item.repairCost)
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      🔧 Repair ({Math.ceil(((item.maxDurability - item.currentDurability) / item.maxDurability) * item.repairCost)} credits)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mining Equipment Upgrades */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-cyan-400 font-semibold mb-3">Equipment Upgrades</h3>
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
            <div className="text-center">
              <button
                onClick={handleStartMining}
                disabled={
                  !selectedResource || 
                  storageUsed >= storageCapacity || 
                  getConditionStatus('drill-mk1') === 'broken'
                }
                className={`px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-all ${
                  selectedResource && 
                  storageUsed < storageCapacity && 
                  getConditionStatus('drill-mk1') !== 'broken'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white transform hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>⛏️</span>
                <span>Start Mining</span>
              </button>
              
              {/* Warning messages */}
              {getConditionStatus('drill-mk1') === 'broken' && (
                <div className="text-red-400 text-sm mt-2">
                  ⚠️ Drill is broken! Repair required to mine.
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={stopMining}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center space-x-2 transform hover:scale-105 transition-all"
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