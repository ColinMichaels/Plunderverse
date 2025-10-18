import React, { useEffect, useState } from 'react';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useSurvival } from '../../lib/stores/economy/useSurvival';
import { GameFacade } from '../../lib/plunderverse/gameFacade';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Fuel, DollarSign, Heart, Wind, Droplet, Package, AlertTriangle } from 'lucide-react';

interface DailyCosts {
  crew: number;
  lifeSupport: number;
  docking: number;
  insurance: number;
  supplies: number;
  total: number;
  location: string;
}

export function EconomicPressureHUD() {
  const credits = useCreditsStore(state => state.credits);
  const equipment = useEquipment(state => state.equipment);
  const [dailyCosts, setDailyCosts] = useState<DailyCosts | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [survivalStatus, setSurvivalStatus] = useState<{ resource: string; status: 'critical' | 'warning' | 'normal'; percentage: number }[]>([]);
  
  // Get fuel tank
  const fuelTank = equipment.find(eq => eq.id === 'fuel-tank');
  const fuelPercentage = fuelTank ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100 : 0;
  
  // Get maintenance status
  const maintenanceNeeded = equipment.filter(eq => {
    const condition = (eq.currentDurability / eq.maxDurability) * 100;
    return condition < 30 && condition > 0;
  });
  
  // Load daily costs and survival status
  useEffect(() => {
    const loadCosts = async () => {
      const facade = GameFacade.getInstance();
      const costs = await facade.calculateDailyCosts();
      setDailyCosts(costs);
    };
    
    const updateSurvivalStatus = () => {
      const status = useSurvival.getState().getResourceStatus();
      setSurvivalStatus(status);
    };
    
    loadCosts();
    updateSurvivalStatus();
    
    const costsInterval = setInterval(loadCosts, 60000); // Update every minute
    const survivalInterval = setInterval(updateSurvivalStatus, 5000); // Update every 5 seconds
    
    return () => {
      clearInterval(costsInterval);
      clearInterval(survivalInterval);
    };
  }, []);
  
  // Check for warnings
  useEffect(() => {
    const newWarnings: string[] = [];
    
    // Fuel warnings
    if (fuelPercentage < 10) {
      newWarnings.push('CRITICAL: Fuel reserves critical!');
    } else if (fuelPercentage < 20) {
      newWarnings.push('Warning: Low fuel');
    }
    
    // Credit warnings
    if (credits < -200) {
      newWarnings.push('CRITICAL: Severe debt! Ship repossession imminent!');
    } else if (credits < 0) {
      newWarnings.push('IN DEBT: Find work immediately!');
    } else if (credits < 50) {
      newWarnings.push('CRITICAL: Credits dangerously low!');
    } else if (credits < 200) {
      newWarnings.push('Warning: Low credits');
    }
    
    // Maintenance warnings
    if (maintenanceNeeded.length > 3) {
      newWarnings.push('CRITICAL: Multiple systems need maintenance!');
    } else if (maintenanceNeeded.length > 0) {
      newWarnings.push(`Maintenance needed: ${maintenanceNeeded.map(eq => eq.name).join(', ')}`);
    }
    
    // Survival warnings
    const criticalResources = survivalStatus.filter(r => r.status === 'critical');
    if (criticalResources.length > 0) {
      criticalResources.forEach(r => {
        newWarnings.push(`CRITICAL: ${r.resource} at ${r.percentage.toFixed(0)}%!`);
      });
    }
    
    setWarnings(newWarnings);
  }, [credits, fuelPercentage, maintenanceNeeded, survivalStatus]);
  
  const getFuelColor = () => {
    if (fuelPercentage > 50) return 'bg-green-500';
    if (fuelPercentage > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getCreditsColor = () => {
    if (credits > 500) return 'text-green-400';
    if (credits > 200) return 'text-yellow-400';
    if (credits > 0) return 'text-orange-400';
    return 'text-red-500';
  };
  
  const getResourceColor = (status: 'critical' | 'warning' | 'normal') => {
    switch(status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-green-400';
    }
  };
  
  const getResourceIcon = (resource: string) => {
    switch(resource) {
      case 'oxygen': return <Wind className="w-3 h-3" />;
      case 'water': return <Droplet className="w-3 h-3" />;
      case 'food': return <Package className="w-3 h-3" />;
      case 'medical': return <Heart className="w-3 h-3" />;
      default: return null;
    }
  };
  
  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 pointer-events-auto">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1 max-w-sm">
          {warnings.map((warning, i) => (
            <Alert 
              key={i} 
              className={`
                ${warning.includes('CRITICAL') ? 'border-red-500 bg-red-950/90' : 'border-yellow-500 bg-yellow-950/90'}
                animate-pulse
              `}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
      
      {/* Fuel Gauge */}
      <div className="bg-black/80 backdrop-blur border border-gray-700 rounded-lg p-3 w-64">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-gray-300">FUEL</span>
          </div>
          <span className="text-xs text-gray-400">
            {fuelTank ? `${fuelTank.currentDurability.toFixed(0)}/${fuelTank.maxDurability}` : '0/0'}
          </span>
        </div>
        <div className="relative">
          <Progress 
            value={fuelPercentage} 
            className="h-2 bg-gray-800"
          />
          <div 
            className={`absolute inset-0 h-2 rounded-full ${getFuelColor()} transition-all`}
            style={{ width: `${fuelPercentage}%` }}
          />
        </div>
        {fuelPercentage < 20 && (
          <p className="text-xs text-red-400 mt-1 animate-pulse">⚠ Refuel immediately!</p>
        )}
      </div>
      
      {/* Credits & Daily Costs */}
      <div className="bg-black/80 backdrop-blur border border-gray-700 rounded-lg p-3 w-64">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-gray-300">ECONOMICS</span>
          </div>
          <span className={`text-sm font-bold ${getCreditsColor()}`}>
            {credits.toFixed(0)} CR
          </span>
        </div>
        
        {dailyCosts && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Daily Costs:</span>
              <span className="text-orange-400">{dailyCosts.total} CR/day</span>
            </div>
            <div className="pl-2 space-y-0.5 text-gray-500">
              <div className="flex justify-between">
                <span>• Crew</span>
                <span>{dailyCosts.crew} CR</span>
              </div>
              <div className="flex justify-between">
                <span>• Life Support</span>
                <span>{dailyCosts.lifeSupport} CR</span>
              </div>
              {dailyCosts.docking > 0 && (
                <div className="flex justify-between">
                  <span>• Docking</span>
                  <span>{dailyCosts.docking} CR</span>
                </div>
              )}
            </div>
            <div className="pt-1 border-t border-gray-700">
              <div className="flex justify-between text-gray-400">
                <span>Days sustainable:</span>
                <span className={credits > 0 ? 'text-green-400' : 'text-red-400'}>
                  {credits > 0 ? Math.floor(credits / dailyCosts.total) : 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Survival Resources */}
      <div className="bg-black/80 backdrop-blur border border-gray-700 rounded-lg p-3 w-64">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-300">SURVIVAL</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {survivalStatus.map(resource => (
            <div key={resource.resource} className="flex items-center gap-1">
              {getResourceIcon(resource.resource)}
              <span className="text-xs capitalize text-gray-400">{resource.resource}:</span>
              <span className={`text-xs font-semibold ${getResourceColor(resource.status)}`}>
                {resource.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Maintenance Status */}
      {maintenanceNeeded.length > 0 && (
        <div className="bg-red-950/80 backdrop-blur border border-red-700 rounded-lg p-3 w-64">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-300">MAINTENANCE REQUIRED</span>
          </div>
          <div className="space-y-1">
            {maintenanceNeeded.map(eq => (
              <div key={eq.id} className="flex justify-between text-xs">
                <span className="text-gray-400">{eq.name}</span>
                <span className="text-red-400">
                  {((eq.currentDurability / eq.maxDurability) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}