import React, { useEffect, useState } from 'react';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { Progress } from './progress';
import { AlertTriangle, Shield, Eye, Target, Skull } from 'lucide-react';
import { cn } from '../../lib/utils';

export const WantedLevelIndicator: React.FC = () => {
  const { currentHeat, wantedLevel, wantedLevelInfo } = useHeatSystem();
  const [isFlashing, setIsFlashing] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(wantedLevel);

  // Flash effect when wanted level changes
  useEffect(() => {
    if (wantedLevel !== previousLevel) {
      setIsFlashing(true);
      setPreviousLevel(wantedLevel);
      const timer = setTimeout(() => setIsFlashing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [wantedLevel, previousLevel]);

  const getWantedIcon = () => {
    switch (wantedLevel) {
      case 0: return <Shield className="h-4 w-4" />;
      case 1: return <Eye className="h-4 w-4" />;
      case 2: return <AlertTriangle className="h-4 w-4" />;
      case 3: return <Target className="h-4 w-4" />;
      case 4: 
      case 5: return <Skull className="h-4 w-4" />;
      default: return null;
    }
  };

  const getHeatColor = () => {
    if (currentHeat <= 10) return 'bg-green-500';
    if (currentHeat <= 30) return 'bg-yellow-500';
    if (currentHeat <= 50) return 'bg-orange-500';
    if (currentHeat <= 70) return 'bg-red-500';
    if (currentHeat <= 90) return 'bg-red-600';
    return 'bg-red-700';
  };

  const getHeatGradient = () => {
    if (currentHeat <= 30) return 'from-green-500 to-yellow-500';
    if (currentHeat <= 50) return 'from-yellow-500 to-orange-500';
    if (currentHeat <= 70) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  };

  return (
    <div 
      className={cn(
        "bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-lg transition-all duration-300",
        isFlashing && "animate-pulse border-2",
        wantedLevel >= 3 && "border-red-500/50",
        wantedLevel >= 5 && "border-red-600 shadow-red-500/20"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div 
            className={cn(
              "p-1.5 rounded",
              `bg-${wantedLevelInfo.color}/20`
            )}
            style={{ color: wantedLevelInfo.color }}
          >
            {getWantedIcon()}
          </div>
          <div>
            <p className="text-xs text-gray-400 font-mono">WANTED LEVEL</p>
            <p 
              className="text-sm font-bold"
              style={{ color: wantedLevelInfo.color }}
            >
              {wantedLevelInfo.name.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: wantedLevelInfo.color }}>
            {wantedLevelInfo.icon}
          </p>
        </div>
      </div>

      {/* Heat Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Heat</span>
          <span className="text-xs font-mono text-white">{Math.round(currentHeat)}/100</span>
        </div>
        <div className="relative">
          <Progress 
            value={currentHeat} 
            className="h-2 bg-slate-800"
          />
          <div 
            className={cn(
              "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
              `bg-gradient-to-r ${getHeatGradient()}`,
              isFlashing && "animate-pulse"
            )}
            style={{ width: `${currentHeat}%` }}
          />
        </div>
      </div>

      {/* Status Description */}
      <p className="text-xs text-gray-400 mt-2 italic">
        {wantedLevelInfo.description}
      </p>

      {/* Consequences */}
      {wantedLevel > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="flex flex-wrap gap-1">
            {wantedLevel >= 1 && (
              <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">
                {Math.round(wantedLevelInfo.encounterChance * 100)}% patrol chance
              </span>
            )}
            {wantedLevel >= 2 && (
              <span className="text-xs px-2 py-0.5 bg-orange-900/30 text-orange-400 rounded">
                +{Math.round(wantedLevelInfo.priceMarkup * 100)}% prices
              </span>
            )}
            {wantedLevel >= 3 && (
              <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded">
                Bounty hunters active
              </span>
            )}
            {wantedLevel >= 4 && (
              <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded">
                Docking restricted
              </span>
            )}
            {wantedLevel >= 5 && (
              <span className="text-xs px-2 py-0.5 bg-red-900/50 text-red-300 rounded animate-pulse">
                SHOOT ON SIGHT
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};