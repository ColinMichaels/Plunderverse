import { useState } from "react";
import { useTradingData } from "../../domain/economy/selectors";
import { useEquipment } from "../../lib/stores/ship/useEquipment";
import { useMining } from "../../lib/stores/economy/useMining";
import { economyService } from "../../domain/economy/economy.service";
import { gameFacade } from "../../lib/plunderverse/gameFacade";

interface TradingInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
}

export function TradingInterface({ isVisible, onClose }: TradingInterfaceProps) {
  const { items, storageCapacity, credits } = useTradingData();
  const { equipment, getConditionStatus, getEquipment } = useEquipment();
  const { drillPower, extractorLevel } = useMining();
  const [activeTab, setActiveTab] = useState<'sell' | 'fuel' | 'repairs' | 'upgrades'>('sell');
  const [selectedQuantity, setSelectedQuantity] = useState<{ [key: string]: number }>({});

  // Check black market access
  const hasBlackMarketAccess = gameFacade.canAccessBlackMarket();
  
  // Define illegal/contraband resources
  const illegalResources = ['crystals', 'alien artifacts', 'quantum cores', 'dark matter'];
  const grayMarketResources = ['rare minerals', 'fusion cells', 'plasma'];
  
  const getResourceLegality = (resourceType: string) => {
    const lowerType = resourceType.toLowerCase();
    if (illegalResources.some(illegal => lowerType.includes(illegal))) return 'illegal';
    if (grayMarketResources.some(gray => lowerType.includes(gray))) return 'gray';
    return 'legal';
  };

  if (!isVisible) return null;

  const handleSellResource = (resourceType: string, value: number, maxQuantity: number) => {
    const quantity = selectedQuantity[resourceType] || 1;
    
    const result = economyService.sellResource(resourceType, quantity);
    if (result.success) {
      // Reset quantity selection
      setSelectedQuantity(prev => ({ ...prev, [resourceType]: 1 }));
      
      // Report interaction trigger progress for missions
      try {
        import("../../lib/stores/economy/useObjectiveTriggers").then(({ useObjectiveTriggers }) => {
          const triggers = useObjectiveTriggers.getState();
          triggers.reportProgress('interaction', { 
            action: 'trade',
            target: 'Trading Station',
            itemType: resourceType
          });
          triggers.reportInteractionProgress('trade');
        });
      } catch (error) {
        console.error('[OBJECTIVE-TRIGGER] Error reporting trade:', error);
      }
    }
  };

  const handleBuyFuel = (amount: number) => {
    economyService.buyFuel(amount);
  };

  const handleRepairEquipment = (equipmentId: string) => {
    economyService.repairEquipment(equipmentId);
  };

  const handleUpgradeDrill = () => {
    economyService.upgradeDrill();
  };

  const handleUpgradeExtractor = () => {
    economyService.upgradeExtractor();
  };

  const handleUpgradeStorage = () => {
    const additionalCapacity = 50;
    economyService.upgradeStorage(additionalCapacity);
  };

  const getQuantityToSell = (resourceType: string, maxQuantity: number) => {
    return Math.min(selectedQuantity[resourceType] || 1, maxQuantity);
  };

  const setQuantityToSell = (resourceType: string, quantity: number) => {
    setSelectedQuantity(prev => ({ ...prev, [resourceType]: quantity }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250]">
      <div className="bg-gray-900 border border-yellow-400 rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">🚀 Trading Station</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Credits Display */}
        <div className="mb-6 p-3 bg-green-900/30 border border-green-400 rounded">
          <div className="flex justify-between items-center">
            <span className="text-green-400 font-semibold">Available Credits:</span>
            <span className="text-green-400 font-mono text-lg">{credits}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 border-b border-gray-700">
          {[
            { id: 'sell', label: '💰 Sell Resources' },
            { id: 'fuel', label: '⛽ Buy Fuel' },
            { id: 'repairs', label: '🔧 Repairs' },
            { id: 'upgrades', label: '⚡ Upgrades' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Sell Resources Tab */}
          {activeTab === 'sell' && (
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Sell Resources</h3>
              {items.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No resources to sell
                </div>
              ) : (
                <div className="space-y-3">
                  {!hasBlackMarketAccess && (
                    <div className="bg-red-900/30 border border-red-400 rounded-lg p-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-400">🔒</span>
                        <span className="text-red-400 text-sm">
                          Black market access required for illegal goods. Need Outlaws reputation ≥10 or Corporation reputation ≤-20
                        </span>
                      </div>
                    </div>
                  )}
                  {items.map((item, index) => {
                    const quantity = getQuantityToSell(item.type, item.quantity);
                    const totalValue = item.value * quantity;
                    const legality = getResourceLegality(item.type);
                    const isBlocked = legality === 'illegal' && !hasBlackMarketAccess;
                    
                    const borderColor = legality === 'illegal' ? 'border-red-600' : 
                                       legality === 'gray' ? 'border-yellow-600' : 
                                       'border-gray-600';
                    
                    return (
                      <div key={index} className={`bg-gray-800 border ${borderColor} rounded-lg p-4 ${isBlocked ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-white">{item.type}</h4>
                              {legality === 'illegal' && <span className="text-red-400 text-xs">☠️ ILLEGAL</span>}
                              {legality === 'gray' && <span className="text-yellow-400 text-xs">⚠️ GRAY</span>}
                            </div>
                            <p className="text-gray-400 text-sm">From {item.planetSource}</p>
                            <p className="text-gray-300 text-xs">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-yellow-400 font-mono">{item.value} credits/unit</div>
                            <div className="text-gray-400 text-sm">Available: {item.quantity}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">Quantity:</span>
                            <input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={quantity}
                              onChange={(e) => setQuantityToSell(item.type, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                            />
                          </div>
                          <div className="flex-1 text-right">
                            <span className="text-yellow-400 font-semibold">Total: {totalValue} credits</span>
                          </div>
                          <button
                            onClick={() => handleSellResource(item.type, item.value, item.quantity)}
                            disabled={isBlocked}
                            className={`px-4 py-2 rounded font-semibold ${
                              isBlocked 
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            }`}
                          >
                            {isBlocked ? 'Locked' : 'Sell'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Buy Fuel Tab */}
          {activeTab === 'fuel' && (
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Fuel Management</h3>
              {(() => {
                const fuelTank = equipment.find(e => e.id === 'fuel-tank');
                if (!fuelTank) return <div className="text-red-400">No fuel tank found!</div>;
                
                const fuelPercentage = (fuelTank.currentDurability / fuelTank.maxDurability) * 100;
                
                return (
                  <div className="space-y-4">
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">Fuel Level</span>
                        <span className="text-white">{fuelTank.currentDurability}/{fuelTank.maxDurability}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            fuelPercentage > 50 ? 'bg-green-500' : fuelPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${fuelPercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { amount: 25, label: 'Quarter Tank' },
                        { amount: 50, label: 'Half Tank' },
                        { amount: 100, label: 'Full Tank' }
                      ].map(({ amount, label }) => {
                        const cost = amount * (fuelTank?.replenishmentCost || 2);
                        const canAfford = credits >= cost;
                        const spaceAvailable = fuelTank.maxDurability - fuelTank.currentDurability;
                        const actualAmount = Math.min(amount, spaceAvailable);
                        const actualCost = actualAmount * (fuelTank?.replenishmentCost || 2);
                        
                        return (
                          <button
                            key={amount}
                            onClick={() => handleBuyFuel(actualAmount)}
                            disabled={!canAfford || actualAmount <= 0}
                            className={`p-3 rounded-lg font-semibold ${
                              canAfford && actualAmount > 0
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <div>{label}</div>
                            <div className="text-sm">{actualCost} credits</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Repairs Tab */}
          {activeTab === 'repairs' && (
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Equipment Repairs</h3>
              <div className="space-y-3">
                {equipment.map(item => {
                  const condition = getConditionStatus(item.id);
                  const needsRepair = condition !== 'excellent';
                  const repairCost = Math.round(item.repairCost * (1 - item.currentDurability / item.maxDurability));
                  
                  const getConditionColor = (condition: string) => {
                    switch (condition) {
                      case 'excellent': return 'text-green-400';
                      case 'good': return 'text-green-300';
                      case 'fair': return 'text-yellow-400';
                      case 'poor': return 'text-orange-400';
                      case 'critical': return 'text-red-400';
                      case 'broken': return 'text-red-500';
                      default: return 'text-gray-400';
                    }
                  };
                  
                  return (
                    <div key={item.id} className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-white">{item.name}</h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className={`text-sm font-semibold ${getConditionColor(condition)}`}>
                              {condition.toUpperCase()}
                            </span>
                            <span className="text-gray-400 text-sm">
                              {item.currentDurability}/{item.maxDurability}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {needsRepair && repairCost > 0 ? (
                            <button
                              onClick={() => handleRepairEquipment(item.id)}
                              disabled={credits < repairCost}
                              className={`px-4 py-2 rounded font-semibold ${
                                credits >= repairCost
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              Repair ({repairCost} credits)
                            </button>
                          ) : (
                            <span className="text-green-400 font-semibold">No repair needed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upgrades Tab */}
          {activeTab === 'upgrades' && (
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Ship Upgrades</h3>
              <div className="space-y-3">
                {/* Drill Upgrade */}
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-white">Mining Drill Upgrade</h4>
                      <p className="text-gray-400 text-sm">Current Power: {drillPower.toFixed(1)}</p>
                      <p className="text-gray-300 text-xs">Increases mining speed</p>
                    </div>
                    <button
                      onClick={handleUpgradeDrill}
                      disabled={credits < (200 + (drillPower - 1) * 150)}
                      className={`px-4 py-2 rounded font-semibold ${
                        credits >= (200 + (drillPower - 1) * 150)
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Upgrade ({200 + (drillPower - 1) * 150} credits)
                    </button>
                  </div>
                </div>

                {/* Extractor Upgrade */}
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-white">Resource Extractor Upgrade</h4>
                      <p className="text-gray-400 text-sm">Current Level: {extractorLevel}</p>
                      <p className="text-gray-300 text-xs">Increases resource yield</p>
                    </div>
                    <button
                      onClick={handleUpgradeExtractor}
                      disabled={credits < (150 + (extractorLevel - 1) * 100)}
                      className={`px-4 py-2 rounded font-semibold ${
                        credits >= (150 + (extractorLevel - 1) * 100)
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Upgrade ({150 + (extractorLevel - 1) * 100} credits)
                    </button>
                  </div>
                </div>

                {/* Storage Upgrade */}
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-white">Cargo Storage Upgrade</h4>
                      <p className="text-gray-400 text-sm">Current Capacity: {storageCapacity}</p>
                      <p className="text-gray-300 text-xs">Adds +50 storage units</p>
                    </div>
                    <button
                      onClick={handleUpgradeStorage}
                      disabled={credits < (300 + Math.floor(storageCapacity / 100) * 200)}
                      className={`px-4 py-2 rounded font-semibold ${
                        credits >= (300 + Math.floor(storageCapacity / 100) * 200)
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Upgrade ({300 + Math.floor(storageCapacity / 100) * 200} credits)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}