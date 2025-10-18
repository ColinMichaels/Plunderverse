import React, { useEffect, useState } from 'react';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { 
  Gauge, Shield, Heart, Target, TrendingUp, Eye,
  Wrench, Fuel, DollarSign, Users, AlertTriangle
} from 'lucide-react';

interface CrewBonus {
  name: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export function CrewBonusDisplay() {
  const { currentBonuses } = useCrewManagement();
  const [bonuses, setBonuses] = useState<CrewBonus[]>([]);

  useEffect(() => {
    const activeBonuses: CrewBonus[] = [];

    // Pilot bonuses
    if (currentBonuses.navigationSpeed > 0) {
      activeBonuses.push({
        name: 'Navigation Speed',
        value: currentBonuses.navigationSpeed * 100,
        icon: <Gauge className="w-4 h-4" />,
        color: 'text-blue-400',
        description: 'Autopilot speed'
      });
    }
    
    if (currentBonuses.fuelEfficiency > 0) {
      activeBonuses.push({
        name: 'Fuel Efficiency',
        value: currentBonuses.fuelEfficiency * 100,
        icon: <Fuel className="w-4 h-4" />,
        color: 'text-yellow-400',
        description: 'Reduced fuel use'
      });
    }

    if (currentBonuses.evasion > 0) {
      activeBonuses.push({
        name: 'Evasion',
        value: currentBonuses.evasion * 100,
        icon: <Shield className="w-4 h-4" />,
        color: 'text-cyan-400',
        description: 'Dodge chance'
      });
    }

    // Mechanic bonuses
    if (currentBonuses.repairCost < 0) {
      activeBonuses.push({
        name: 'Repair Cost',
        value: -currentBonuses.repairCost * 100,
        icon: <Wrench className="w-4 h-4" />,
        color: 'text-orange-400',
        description: 'Cheaper repairs'
      });
    }

    if (currentBonuses.maintenanceEfficiency > 0) {
      activeBonuses.push({
        name: 'Maintenance',
        value: currentBonuses.maintenanceEfficiency * 100,
        icon: <Wrench className="w-4 h-4" />,
        color: 'text-green-400',
        description: 'Equipment durability'
      });
    }

    // Medic bonuses
    if (currentBonuses.healthRegen > 0) {
      activeBonuses.push({
        name: 'Hull Regen',
        value: currentBonuses.healthRegen,
        icon: <Heart className="w-4 h-4" />,
        color: 'text-red-400',
        description: 'HP/sec out of combat'
      });
    }

    // Gunner bonuses
    if (currentBonuses.combatDamage > 0) {
      activeBonuses.push({
        name: 'Weapon Damage',
        value: currentBonuses.combatDamage * 100,
        icon: <Target className="w-4 h-4" />,
        color: 'text-red-500',
        description: 'Combat damage'
      });
    }

    if (currentBonuses.accuracy > 0) {
      activeBonuses.push({
        name: 'Accuracy',
        value: currentBonuses.accuracy * 100,
        icon: <Target className="w-4 h-4" />,
        color: 'text-purple-400',
        description: 'Hit chance'
      });
    }

    // Negotiator bonuses
    if (currentBonuses.tradePrices < 0) {
      activeBonuses.push({
        name: 'Trade Prices',
        value: -currentBonuses.tradePrices * 100,
        icon: <DollarSign className="w-4 h-4" />,
        color: 'text-green-400',
        description: 'Better prices'
      });
    }

    if (currentBonuses.reputationGain > 0) {
      activeBonuses.push({
        name: 'Reputation',
        value: currentBonuses.reputationGain * 100,
        icon: <Users className="w-4 h-4" />,
        color: 'text-blue-400',
        description: 'Rep gains'
      });
    }

    // Hacker bonuses
    if (currentBonuses.heatReduction > 0) {
      activeBonuses.push({
        name: 'Heat Reduction',
        value: currentBonuses.heatReduction * 100,
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-indigo-400',
        description: 'Less heat gain'
      });
    }

    if (currentBonuses.intelGathering > 0) {
      activeBonuses.push({
        name: 'Stealth',
        value: currentBonuses.intelGathering * 50,
        icon: <Eye className="w-4 h-4" />,
        color: 'text-gray-400',
        description: 'Detection reduction'
      });
    }

    setBonuses(activeBonuses);
  }, [currentBonuses]);

  if (bonuses.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 
                    border border-cyan-500/30 max-w-sm z-50">
      <div className="text-xs font-semibold text-cyan-400 mb-2">CREW BONUSES</div>
      <div className="grid grid-cols-2 gap-2">
        {bonuses.map((bonus, index) => (
          <div key={index} className="flex items-center gap-1">
            <span className={bonus.color}>{bonus.icon}</span>
            <div>
              <div className="text-xs text-gray-300">
                {bonus.name}
              </div>
              <div className={`text-xs font-semibold ${bonus.color}`}>
                +{bonus.value.toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}