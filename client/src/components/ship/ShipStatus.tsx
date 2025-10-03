import { useState } from "react";
import { useEquipment } from "../../lib/stores/ship/useEquipment";
import { useCreditsData } from "../../domain/economy/selectors";

export function ShipStatus() {
  const { equipment, repairEquipment, replenishFuel, getConditionStatus, getPerformanceMultiplier } = useEquipment();
  const { credits, spendCredits } = useCreditsData();

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
      
      // Apply maintenance kit degradation when repairing ship components
      const maintenanceKit = equipment.find(eq => eq.id === 'maintenance-kit');
      if (maintenanceKit && equipmentId !== 'maintenance-kit') {
        const { applyShipDegradation } = useEquipment.getState();
        applyShipDegradation('repair', 1.0, 1.0);
      }
    }
  };

  const handleRefuelShip = () => {
    const fuelTank = equipment.find(eq => eq.id === 'fuel-tank');
    if (!fuelTank) return;

    const maxRefuel = fuelTank.maxDurability - fuelTank.currentDurability;
    const result = replenishFuel(maxRefuel, credits);
    if (result.success) {
      spendCredits(result.cost);
    }
  };

  if (shipComponents.length === 0) return null;

  // Create compact status summary for collapsed view
  const criticalCount = shipComponents.filter(c => getConditionStatus(c.id) === 'critical' || getConditionStatus(c.id) === 'broken').length;

  return (
    <div className="space-y-3">
        {/* System status overview */}
        <div className="space-status-bar grid-cols-2">
          {shipComponents.map((component) => {
            const condition = getConditionStatus(component.id);
            const durabilityPercent = (component.currentDurability / component.maxDurability) * 100;
            const performance = getPerformanceMultiplier(component.id);
            
            return (
              <div key={component.id} className="space-status-item">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getSystemIcon(component.type)}</span>
                  <span className="text-xs">{component.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`text-xs ${getConditionColor(condition)}`}>
                    {Math.round(durabilityPercent)}%
                  </span>
                  {(condition === 'critical' || condition === 'broken') && (
                    <span className="text-red-400 animate-pulse">⚠️</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed component status */}
        <div className="space-y-2">
          {shipComponents.map((component) => {
            const condition = getConditionStatus(component.id);
            const performance = getPerformanceMultiplier(component.id);
            const durabilityPercent = (component.currentDurability / component.maxDurability) * 100;
            
            return (
              <div key={component.id} className="p-2 rounded border border-slate-600/50 bg-slate-800/30">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getSystemIcon(component.type)}</span>
                    <div>
                      <h4 className="text-cyan-300 font-medium text-xs font-mono">{component.name}</h4>
                      <div className={`text-xs ${getConditionColor(condition)}`}>
                        {getConditionIcon(condition)} {condition.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono">
                    {component.isConsumable ? (
                      <div className="text-cyan-300">
                        <div>FUEL: {Math.round(component.currentDurability)}/{component.maxDurability}</div>
                        <div>{Math.round(durabilityPercent)}%</div>
                      </div>
                    ) : (
                      <div className="text-slate-300">
                        <div>INT: {Math.round(durabilityPercent)}%</div>
                        <div>PERF: {Math.round(performance * 100)}%</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar with space styling */}
                <div className="space-progress-bar mb-2">
                  <div 
                    className={`space-progress-fill ${
                      component.isConsumable ? '' : 
                      durabilityPercent > 80 ? '' : 
                      durabilityPercent > 60 ? 'bg-yellow-400' : 
                      durabilityPercent > 40 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${durabilityPercent}%` }}
                  />
                </div>

                {/* Action buttons with space styling */}
                <div className="flex space-x-1">
                  {component.isConsumable ? (
                    component.currentDurability < component.maxDurability && (
                      <button
                        onClick={handleRefuelShip}
                        disabled={credits < Math.ceil((component.maxDurability - component.currentDurability) * (component.replenishmentCost || 2))}
                        className={`space-button text-xs px-2 py-1 ${
                          credits >= Math.ceil((component.maxDurability - component.currentDurability) * (component.replenishmentCost || 2))
                            ? ''
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        ⛽ REFUEL ({Math.ceil((component.maxDurability - component.currentDurability) * (component.replenishmentCost || 2))}cr)
                      </button>
                    )
                  ) : (
                    component.currentDurability < component.maxDurability && (
                      <button
                        onClick={() => handleRepairShipComponent(component.id)}
                        disabled={credits < Math.ceil(((component.maxDurability - component.currentDurability) / component.maxDurability) * component.repairCost)}
                        className={`space-button text-xs px-2 py-1 ${
                          credits >= Math.ceil(((component.maxDurability - component.currentDurability) / component.maxDurability) * component.repairCost)
                            ? ''
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        🔧 REPAIR ({Math.ceil(((component.maxDurability - component.currentDurability) / component.maxDurability) * component.repairCost)}cr)
                      </button>
                    )
                  )}
                </div>

                {/* Critical warnings */}
                {(condition === 'critical' || condition === 'broken') && (
                  <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded p-1 font-mono">
                    {condition === 'broken' 
                      ? `❌ SYSTEM FAILURE: ${component.name.toUpperCase()}`
                      : `⚠️ CRITICAL: ${component.name.toUpperCase()} NEEDS ATTENTION`
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall ship condition with space styling */}
        <div className="space-status-bar">
          <div className="space-status-item col-span-2">
            <span className="text-cyan-400 font-mono">SHIP CONDITION:</span>
            <span className={`font-mono ${
              shipComponents.every(c => getConditionStatus(c.id) === 'excellent') ? 'text-green-400' :
              shipComponents.some(c => getConditionStatus(c.id) === 'broken') ? 'text-red-400' :
              shipComponents.some(c => getConditionStatus(c.id) === 'critical') ? 'text-orange-400' : 
              'text-yellow-400'
            }`}>
              {shipComponents.every(c => getConditionStatus(c.id) === 'excellent') ? 'EXCELLENT' :
               shipComponents.some(c => getConditionStatus(c.id) === 'broken') ? 'CRITICAL' :
               shipComponents.some(c => getConditionStatus(c.id) === 'critical') ? 'POOR' : 
               'GOOD'}
            </span>
          </div>
      </div>
    </div>
  );
}