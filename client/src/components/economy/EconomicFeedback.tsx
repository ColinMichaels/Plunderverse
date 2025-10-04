import React, { useMemo } from 'react';
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { usePlunderverseEconomy } from '../../lib/stores/economy/usePlunderverseEconomy';
import { GameFacade } from '../../lib/plunderverse/gameFacade';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { calculateFinalPrice } from '../../lib/stores/economy/enhancedMarketData';

interface DailyCostBreakdown {
  crew: number;
  lifeSupport: number;
  docking: number;
  insurance: number;
  supplies: number;
  total: number;
  location: string;
}

export const EconomicFeedback: React.FC = () => {
  const { credits } = useCreditsStore();
  const crewManagement = useCrewManagement();
  const economy = usePlunderverseEconomy();
  const player = usePlayer();
  
  // Calculate daily costs based on current rank
  const dailyCosts = useMemo((): DailyCostBreakdown => {
    const tuning = economy.tuning;
    const rank = player.rank;
    
    // Base costs from tuning
    let baseCosts = {
      crew: 25,
      lifeSupport: 15,
      docking: 10,
      insurance: 10,
      supplies: 10
    };
    
    // Scale costs based on player rank (early/mid/late game)
    let rankMultiplier = 1.0;
    if (rank >= 1 && rank <= 3) {
      // Early game: 50-75 credits/day
      rankMultiplier = 1.0;
    } else if (rank >= 4 && rank <= 6) {
      // Mid game: 100-150 credits/day
      rankMultiplier = 1.75;
    } else if (rank >= 7) {
      // Late game: 200-300 credits/day
      rankMultiplier = 3.0;
    }
    
    // Add crew salaries
    const crewSalaries = crewManagement.dailySalaryCosts || 0;
    
    const costs = {
      crew: Math.round((baseCosts.crew + crewSalaries) * rankMultiplier),
      lifeSupport: Math.round(baseCosts.lifeSupport * rankMultiplier),
      docking: Math.round(baseCosts.docking * rankMultiplier),
      insurance: Math.round(baseCosts.insurance * rankMultiplier),
      supplies: Math.round(baseCosts.supplies * rankMultiplier),
      total: 0,
      location: 'Space'
    };
    
    costs.total = costs.crew + costs.lifeSupport + costs.docking + costs.insurance + costs.supplies;
    
    return costs;
  }, [economy.tuning, player.rank, crewManagement.dailySalaryCosts]);
  
  // Calculate days of survival with current credits
  const daysOfSurvival = useMemo(() => {
    if (dailyCosts.total === 0) return Infinity;
    return Math.floor(credits / dailyCosts.total);
  }, [credits, dailyCosts.total]);
  
  // Determine warning level
  const warningLevel = useMemo(() => {
    if (daysOfSurvival < 1) return 'critical';
    if (daysOfSurvival < 3) return 'warning';
    if (daysOfSurvival < 7) return 'caution';
    return 'safe';
  }, [daysOfSurvival]);
  
  return (
    <div className="bg-black/60 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 space-y-3">
      {/* Credits Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-semibold">{credits} Credits</span>
        </div>
        
        {/* Warning Indicator */}
        {warningLevel !== 'safe' && (
          <div className={`flex items-center gap-2 ${
            warningLevel === 'critical' ? 'text-red-500' :
            warningLevel === 'warning' ? 'text-orange-500' :
            'text-yellow-500'
          }`}>
            {warningLevel === 'critical' ? 
              <AlertTriangle className="w-5 h-5 animate-pulse" /> :
              <AlertCircle className="w-5 h-5" />
            }
            <span className="text-sm">
              {daysOfSurvival === 0 ? 'Bankrupt!' : `${daysOfSurvival} days remaining`}
            </span>
          </div>
        )}
      </div>
      
      {/* Daily Costs Breakdown */}
      <div className="border-t border-cyan-500/20 pt-3">
        <div className="text-sm text-gray-400 mb-2">Daily Operating Costs</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Crew Salaries:</span>
            <span className="text-cyan-400">{dailyCosts.crew}c</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Life Support:</span>
            <span className="text-cyan-400">{dailyCosts.lifeSupport}c</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Docking Fees:</span>
            <span className="text-cyan-400">{dailyCosts.docking}c</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Insurance:</span>
            <span className="text-cyan-400">{dailyCosts.insurance}c</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Supplies:</span>
            <span className="text-cyan-400">{dailyCosts.supplies}c</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t border-cyan-500/20">
            <span className="text-white">Total Daily:</span>
            <span className="text-yellow-400">{dailyCosts.total}c</span>
          </div>
        </div>
      </div>
      
      {/* Economic Tips */}
      {warningLevel !== 'safe' && (
        <div className="border-t border-cyan-500/20 pt-3">
          <div className="text-sm text-orange-400">
            {warningLevel === 'critical' && (
              <div className="space-y-1">
                <p>⚠️ URGENT: Accept any mission immediately!</p>
                <p>Consider trading contraband for quick profits.</p>
              </div>
            )}
            {warningLevel === 'warning' && (
              <div className="space-y-1">
                <p>📊 Low on credits! Take on missions soon.</p>
                <p>Check trade routes for profitable opportunities.</p>
              </div>
            )}
            {warningLevel === 'caution' && (
              <p>💡 Tip: Keep at least 7 days of operating costs in reserve.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Mission Profit Estimator Component
export const MissionProfitEstimator: React.FC<{ 
  missionReward: number;
  estimatedDuration: number;
}> = ({ missionReward, estimatedDuration }) => {
  const economy = usePlunderverseEconomy();
  const player = usePlayer();
  
  // Calculate costs during mission
  const operatingCosts = useMemo(() => {
    const rank = player.rank;
    let dailyCost = 60; // Base minimum
    
    if (rank >= 4 && rank <= 6) {
      dailyCost = 125;
    } else if (rank >= 7) {
      dailyCost = 250;
    }
    
    return Math.round(dailyCost * estimatedDuration);
  }, [player.rank, estimatedDuration]);
  
  const netProfit = missionReward - operatingCosts;
  const profitMargin = (netProfit / missionReward) * 100;
  const isProfitable = netProfit > 0;
  
  return (
    <div className="bg-black/40 rounded p-2 text-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400">Mission Reward:</span>
        <span className="text-cyan-400">+{missionReward}c</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400">Est. Operating Costs:</span>
        <span className="text-red-400">-{operatingCosts}c</span>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-cyan-500/20">
        <span className="text-gray-300 font-semibold">Net Profit:</span>
        <div className="flex items-center gap-1">
          {isProfitable ? 
            <TrendingUp className="w-4 h-4 text-green-400" /> :
            <TrendingDown className="w-4 h-4 text-red-400" />
          }
          <span className={isProfitable ? 'text-green-400' : 'text-red-400'}>
            {netProfit}c ({profitMargin.toFixed(0)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

// Trade Profit Indicator Component
export const TradeProfitIndicator: React.FC<{
  itemId: string;
  buyPrice: number;
  currentPlanet: string;
  targetPlanet?: string;
}> = ({ itemId, buyPrice, currentPlanet, targetPlanet }) => {
  const profitInfo = useMemo(() => {
    if (!targetPlanet) return null;
    
    // Calculate sell price at target
    const sellPrice = calculateFinalPrice(
      { id: itemId, basePrice: buyPrice },
      targetPlanet,
      'independents',
      1.0,
      false // Selling
    );
    
    const profit = sellPrice - buyPrice;
    const profitPercentage = ((profit / buyPrice) * 100).toFixed(0);
    
    return {
      sellPrice,
      profit,
      profitPercentage,
      isProfitable: profit > 0
    };
  }, [itemId, buyPrice, targetPlanet]);
  
  if (!profitInfo) return null;
  
  return (
    <div className={`flex items-center gap-1 text-xs ${
      profitInfo.isProfitable ? 'text-green-400' : 'text-red-400'
    }`}>
      {profitInfo.isProfitable ? 
        <TrendingUp className="w-3 h-3" /> :
        <TrendingDown className="w-3 h-3" />
      }
      <span>
        {profitInfo.profit > 0 ? '+' : ''}{profitInfo.profit}c ({profitInfo.profitPercentage}%)
      </span>
    </div>
  );
};