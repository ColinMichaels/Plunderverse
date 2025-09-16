import { useEffect, useState, useMemo } from "react";
import { useMining } from "../lib/stores/useMining";
import { useStorageInfo, useCreditsData } from "../domain/economy/selectors";
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
    clicksCompleted,
    clicksRequired,
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
  
  // Calculate progress from clicks
  const progress = clicksRequired > 0 ? (clicksCompleted / clicksRequired) * 100 : 0;
  
  const { used: storageUsed, capacity: storageCapacity } = useStorageInfo();
  const { earnCredits, spendCredits, credits } = useCreditsData();
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

  // Stop mining when interface is closed
  useEffect(() => {
    if (!isVisible && isActive) {
      console.log("Mining interface closed, stopping mining operation");
      stopMining();
    }
  }, [isVisible, isActive, stopMining]);

  // Mining progress update loop
  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      const result = updateProgress(0.1); // Update every 100ms
      
      if (result) {
        // Mining completed - EconomyService has already processed everything
        if (result.success) {
          console.log(`Mining successful: ${result.message}`);
          // Success sound and other processing already handled by EconomyService
        } else {
          console.log(`Mining failed: ${result.message}`);
          stopMining();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, updateProgress, stopMining]);

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

  // storageUsed is now obtained from useStorageInfo selector
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
      
      // Apply maintenance kit degradation when repairing
      const { applyShipDegradation } = useEquipment.getState();
      applyShipDegradation('repair', 1.0, 1.0); // Fixed intensity and duration for repairs
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
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Background Mining Animation - takes up full screen */}
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
          <div className="absolute bottom-1/2 left-1/2 transform -translate-x-1/2">
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

      {/* Mining Interface - positioned in bottom half */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-center justify-center">
        <div className="bg-gray-900/95 border border-orange-400 rounded-lg p-4 max-w-4xl mx-4 max-h-full overflow-y-auto backdrop-blur-sm relative z-10">
        
          {/* Header - Compact */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="text-orange-400 text-lg">⛏️</div>
              <div>
                <h1 className="text-lg font-bold text-orange-400">Mining Operations</h1>
                <p className="text-gray-400 text-sm">{planetName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
            >
              Close
            </button>
          </div>

          {/* Compact layout with multiple columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* Left Column: Storage & Mining Status */}
            <div className="space-y-3">
              {/* Storage Status */}
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300 text-sm">Storage</span>
                  <span className="text-white text-sm">{storageUsed}/{storageCapacity}</span>
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
                <div className="p-3 bg-orange-900/30 border border-orange-400 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-orange-400 font-semibold text-sm">Mining: {targetResource.type}</h3>
                    <button
                      onClick={stopMining}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                    >
                      Stop
                    </button>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-300 mb-1">
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

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>Speed: {miningSpeed.toFixed(1)}/s</div>
                    <div>Efficiency: {Math.round(miningEfficiency * 100)}%</div>
                    <div>Drill: {drillPower}</div>
                    <div>Extractor: {extractorLevel}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Middle Column: Resource Selection */}
            <div>
              <h3 className="text-sm font-semibold text-orange-400 mb-2">Available Resources</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {resources.map((resource, index) => (
                  <div 
                    key={index}
                    className={`${getRarityBg(resource.rarity)} border rounded-lg p-2 cursor-pointer transition-all ${
                      selectedResource?.type === resource.type 
                        ? 'ring-2 ring-orange-400' 
                        : 'hover:bg-opacity-70'
                    }`}
                    onClick={() => setSelectedResource(resource)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`font-semibold text-xs ${getRarityColor(resource.rarity)}`}>
                          {resource.type}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-mono text-xs">
                          {resource.value} credits
                        </div>
                        <div className={`text-xs px-1 py-0.5 rounded ${getRarityBg(resource.rarity)}`}>
                          {resource.rarity.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Equipment & Controls */}
            <div className="space-y-3">
              {/* Equipment Status */}
              <div className="p-3 bg-gray-800 rounded-lg">
                <h3 className="text-cyan-400 font-semibold mb-2 text-sm">Equipment</h3>
                <div className="space-y-2">
                  {equipment.filter(eq => eq.type === 'drill' || eq.type === 'extractor').map((item) => {
                    const condition = getConditionStatus(item.id);
                    const durabilityPercent = (item.currentDurability / item.maxDurability) * 100;
                    return (
                      <div key={item.id} className="p-2 bg-gray-700 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-white text-xs font-medium">{item.name.split(' ')[0]}</h4>
                          <div className={`text-xs ${getConditionColor(condition)}`}>
                            {getConditionIcon(condition)}
                          </div>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                          <div 
                            className={`h-1 rounded-full transition-all ${
                              durabilityPercent > 80 ? 'bg-green-500' : 
                              durabilityPercent > 60 ? 'bg-yellow-500' : 
                              durabilityPercent > 40 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${durabilityPercent}%` }}
                          />
                        </div>
                        {item.currentDurability < item.maxDurability && (
                          <button
                            onClick={() => handleRepairEquipment(item.id)}
                            disabled={credits < Math.ceil(((item.maxDurability - item.currentDurability) / item.maxDurability) * item.repairCost)}
                            className={`w-full px-2 py-1 rounded text-xs ${
                              credits >= Math.ceil(((item.maxDurability - item.currentDurability) / item.maxDurability) * item.repairCost)
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            🔧 Repair ({Math.ceil(((item.maxDurability - item.currentDurability) / item.maxDurability) * item.repairCost)})
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Equipment Upgrades & Controls */}
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={upgradeDrill}
                    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs"
                  >
                    Drill +{drillPower}
                  </button>
                  <button
                    onClick={upgradeExtractor}
                    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs"
                  >
                    Extract Lv{extractorLevel}
                  </button>
                </div>

                {/* Action Button */}
                {!isActive ? (
                  <button
                    onClick={handleStartMining}
                    disabled={
                      !selectedResource || 
                      storageUsed >= storageCapacity || 
                      getConditionStatus('drill-mk1') === 'broken'
                    }
                    className={`w-full px-3 py-2 rounded font-semibold text-sm flex items-center justify-center space-x-1 transition-all ${
                      selectedResource && 
                      storageUsed < storageCapacity && 
                      getConditionStatus('drill-mk1') !== 'broken'
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
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm flex items-center justify-center space-x-1"
                  >
                    <span>🛑</span>
                    <span>Stop Mining</span>
                  </button>
                )}
                
                {/* Compact warnings */}
                {getConditionStatus('drill-mk1') === 'broken' && (
                  <div className="text-red-400 text-xs mt-1">
                    ⚠️ Drill broken! Repair needed.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}