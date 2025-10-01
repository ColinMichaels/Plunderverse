import React from 'react';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { Progress } from './progress';

export function ShipCoreStatus() {
  const { shield, hull, isCritical } = useShipStatus();
  const { equipment, getEquipment } = useEquipment();
  const { 
    activeCrew = [], 
    maxCrewSize = 4, 
    currentBonuses = {
      combatDamage: 0,
      missionRewards: 0,
      navigationSpeed: 0,
      repairCost: 0
    } 
  } = useCrewManagement();
  
  // Get fuel from equipment
  const fuelTank = getEquipment('fuel-tank');
  const fuelPercentage = fuelTank ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100 : 0;
  
  // Check for critical equipment
  const criticalEquipment = equipment.filter(eq => {
    const condition = (eq.currentDurability / eq.maxDurability) * 100;
    return condition < 20 && condition > 0;
  });
  
  // Determine status colors
  const getStatusColor = (value: number) => {
    if (value > 70) return 'bg-green-500';
    if (value > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getFuelColor = () => {
    if (fuelPercentage > 50) return 'bg-cyan-500';
    if (fuelPercentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="fixed top-4 left-4 z-40 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-3 w-52 pointer-events-auto">
        {/* Ship Name Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-cyan-400">SHIP STATUS</h3>
          {isCritical && (
            <span className="text-red-500 text-xs animate-pulse">⚠ CRITICAL</span>
          )}
        </div>
        
        {/* Core Status Bars */}
        <div className="space-y-2">
          {/* Shield Bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">🛡️ Shield</span>
              <span className="text-xs text-gray-300">{Math.round(shield)}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getStatusColor(shield)} transition-all duration-300`}
                style={{ width: `${shield}%` }}
              />
            </div>
          </div>
          
          {/* Hull Bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">🚀 Hull</span>
              <span className="text-xs text-gray-300">{Math.round(hull)}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getStatusColor(hull)} transition-all duration-300`}
                style={{ width: `${hull}%` }}
              />
            </div>
          </div>
          
          {/* Fuel Bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">⚡ Fuel</span>
              <span className="text-xs text-gray-300">{Math.round(fuelPercentage)}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getFuelColor()} transition-all duration-300`}
                style={{ width: `${fuelPercentage}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Crew Status */}
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">👥</span>
              <span className="text-xs text-gray-300">{activeCrew.length}/{maxCrewSize}</span>
            </div>
            
            {/* Crew Bonuses Icons */}
            <div className="flex items-center gap-1">
              {currentBonuses.combatDamage > 0 && (
                <span className="text-xs" title={`Combat +${Math.round(currentBonuses.combatDamage * 100)}%`}>⚔️</span>
              )}
              {currentBonuses.missionRewards > 0 && (
                <span className="text-xs" title={`Rewards +${Math.round(currentBonuses.missionRewards * 100)}%`}>💰</span>
              )}
              {currentBonuses.navigationSpeed > 0 && (
                <span className="text-xs" title={`Navigation +${Math.round(currentBonuses.navigationSpeed * 100)}%`}>🧭</span>
              )}
              {currentBonuses.repairCost < 0 && (
                <span className="text-xs" title={`Repair -${Math.round(Math.abs(currentBonuses.repairCost) * 100)}%`}>🔧</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Critical Equipment Warnings */}
        {criticalEquipment.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="space-y-1">
              {criticalEquipment.slice(0, 2).map(eq => (
                <div key={eq.id} className="flex items-center gap-1 text-xs">
                  <span className="text-red-500 animate-pulse">⚠</span>
                  <span className="text-red-400">{eq.name}</span>
                  <span className="text-red-300">
                    {Math.round((eq.currentDurability / eq.maxDurability) * 100)}%
                  </span>
                </div>
              ))}
              {criticalEquipment.length > 2 && (
                <span className="text-xs text-red-400">
                  +{criticalEquipment.length - 2} more...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}