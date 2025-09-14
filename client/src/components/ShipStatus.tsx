import { useEquipment } from "../lib/stores/useEquipment";
import { useCredits } from "../lib/stores/useCredits";

export function ShipStatus() {
  const { equipment, repairEquipment, replenishFuel, getConditionStatus, getPerformanceMultiplier } = useEquipment();
  const { credits, spendCredits } = useCredits();

  // Get ship components only
  const shipComponents = equipment.filter(eq => 
    eq.type === 'hull' || eq.type === 'engine' || eq.type === 'fuel' || eq.type === 'maintenance'
  );

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

  const getSystemIcon = (type: string) => {
    switch (type) {
      case 'hull': return '🛡️';
      case 'engine': return '🚀';
      case 'fuel': return '⛽';
      case 'maintenance': return '🔧';
      default: return '❓';
    }
  };

  const handleRepairShipComponent = (equipmentId: string) => {
    const result = repairEquipment(equipmentId, undefined, credits);
    if (result.success) {
      spendCredits(result.cost);
      console.log(`Repaired ship component for ${result.cost} credits`);
      
      // Apply maintenance kit degradation when repairing ship components
      const maintenanceKit = equipment.find(eq => eq.id === 'maintenance-kit');
      if (maintenanceKit && equipmentId !== 'maintenance-kit') {
        const { applyShipDegradation } = useEquipment.getState();
        applyShipDegradation('repair', 1.0, 1.0);
      }
    } else {
      console.log(`Failed to repair ship component. Need ${result.cost} credits, have ${credits}`);
    }
  };

  const handleRefuelShip = () => {
    const fuelTank = equipment.find(eq => eq.id === 'fuel-tank');
    if (!fuelTank) return;

    const maxRefuel = fuelTank.maxDurability - fuelTank.currentDurability;
    const result = replenishFuel(maxRefuel, credits);
    if (result.success) {
      spendCredits(result.cost);
      console.log(`Refueled ship for ${result.cost} credits`);
    } else {
      console.log(`Failed to refuel. Need ${result.cost} credits, have ${credits}`);
    }
  };

  if (shipComponents.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-20 max-w-sm">
      <div className="bg-gray-900/95 border border-gray-600 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-blue-400 text-lg">🚢</span>
          <h3 className="text-blue-400 font-semibold">Ship Status</h3>
        </div>

        <div className="space-y-3">
          {shipComponents.map((component) => {
            const condition = getConditionStatus(component.id);
            const performance = getPerformanceMultiplier(component.id);
            const durabilityPercent = (component.currentDurability / component.maxDurability) * 100;
            
            return (
              <div key={component.id} className="p-3 bg-gray-800/70 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getSystemIcon(component.type)}</span>
                    <div>
                      <h4 className="text-white font-medium text-sm">{component.name}</h4>
                      <div className={`text-xs ${getConditionColor(condition)}`}>
                        {getConditionIcon(condition)} {condition.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    {component.isConsumable ? (
                      <div className="text-cyan-300">
                        <div>Fuel: {Math.round(component.currentDurability)}/{component.maxDurability}</div>
                        <div>{Math.round(durabilityPercent)}%</div>
                      </div>
                    ) : (
                      <div className="text-gray-300">
                        <div>Integrity: {Math.round(durabilityPercent)}%</div>
                        <div>Performance: {Math.round(performance * 100)}%</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      component.isConsumable
                        ? 'bg-cyan-500' // Fuel bar
                        : durabilityPercent > 80 ? 'bg-green-500' : 
                          durabilityPercent > 60 ? 'bg-yellow-500' : 
                          durabilityPercent > 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${durabilityPercent}%` }}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex space-x-2">
                  {component.isConsumable ? (
                    // Fuel refill button
                    component.currentDurability < component.maxDurability && (
                      <button
                        onClick={handleRefuelShip}
                        disabled={credits < Math.ceil((component.maxDurability - component.currentDurability) * (component.replenishmentCost || 2))}
                        className={`flex-1 px-2 py-1 rounded text-xs ${
                          credits >= Math.ceil((component.maxDurability - component.currentDurability) * (component.replenishmentCost || 2))
                            ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        ⛽ Refuel ({Math.ceil((component.maxDurability - component.currentDurability) * (component.replenishmentCost || 2))} credits)
                      </button>
                    )
                  ) : (
                    // Repair button for non-consumable components
                    component.currentDurability < component.maxDurability && (
                      <button
                        onClick={() => handleRepairShipComponent(component.id)}
                        disabled={credits < Math.ceil(((component.maxDurability - component.currentDurability) / component.maxDurability) * component.repairCost)}
                        className={`flex-1 px-2 py-1 rounded text-xs ${
                          credits >= Math.ceil(((component.maxDurability - component.currentDurability) / component.maxDurability) * component.repairCost)
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        🔧 Repair ({Math.ceil(((component.maxDurability - component.currentDurability) / component.maxDurability) * component.repairCost)} credits)
                      </button>
                    )
                  )}
                </div>

                {/* Critical warnings */}
                {(condition === 'critical' || condition === 'broken') && (
                  <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded p-1">
                    {condition === 'broken' 
                      ? `❌ ${component.name} is completely broken!`
                      : `⚠️ ${component.name} needs immediate attention!`
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall ship status summary */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Overall Ship Condition: {
              shipComponents.every(c => getConditionStatus(c.id) === 'excellent') ? '🟢 Excellent' :
              shipComponents.some(c => getConditionStatus(c.id) === 'broken') ? '🔴 Critical' :
              shipComponents.some(c => getConditionStatus(c.id) === 'critical') ? '🟠 Poor' : 
              '🟡 Good'
            }
          </div>
        </div>
      </div>
    </div>
  );
}