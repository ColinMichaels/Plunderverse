import React, { useEffect, useState } from 'react';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';

export function MissionContextHUD() {
  const { activeMissions = [] } = usePlunderverseMissions();
  const { credits } = useCreditsStore();
  const { reputation, rank } = usePlayer();
  const { wantedLevel, wantedLevelInfo } = useHeatSystem();
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  
  // Get the current active mission (priority to time-limited missions)
  const currentMission = activeMissions.find(m => m.timeLimit) || activeMissions[0];
  
  // Calculate time remaining for timed missions
  useEffect(() => {
    if (!currentMission?.timeLimit) {
      setTimeLeft(null);
      setIsUrgent(false);
      return;
    }
    
    const interval = setInterval(() => {
      // For now, we'll just show the timeLimit as a static countdown
      // In a real implementation, you'd track when the mission was accepted
      const remaining = Math.max(0, currentMission.timeLimit || 0);
      setTimeLeft(remaining);
      setIsUrgent(remaining < 60000); // Urgent if less than 1 minute
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentMission]);
  
  // Format time remaining
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Get rank icon based on notoriety/reputation
  const getRankIcon = () => {
    const totalRep = Object.values(reputation).reduce((sum, val) => sum + val, 0) / 4;
    if (totalRep > 75) return '⭐⭐⭐';
    if (totalRep > 50) return '⭐⭐';
    if (totalRep > 25) return '⭐';
    return '☆';
  };
  
  const getCreditsColor = () => {
    if (credits > 1000) return 'text-green-400';
    if (credits > 500) return 'text-yellow-400';
    if (credits > 0) return 'text-orange-400';
    return 'text-red-500';
  };
  
  return (
    <div className="fixed top-4 right-16 z-40 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-3 min-w-[250px] max-w-[350px] pointer-events-auto">
        {/* Mission Context Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-cyan-400">MISSION CONTEXT</h3>
          {wantedLevel > 0 && (
            <div className="flex items-center gap-1">
              <span className={`text-xs`} style={{ color: wantedLevelInfo.color }}>
                {wantedLevelInfo.icon}
              </span>
              <span className={`text-xs font-medium`} style={{ color: wantedLevelInfo.color }}>
                LV.{wantedLevel}
              </span>
            </div>
          )}
        </div>
        
        {/* Active Mission */}
        {currentMission ? (
          <div className="space-y-1 mb-2">
            <div className="flex items-start gap-1">
              <span className="text-xs text-cyan-300">📋</span>
              <div className="flex-1">
                <p className="text-xs text-white font-medium line-clamp-1">
                  {currentMission.title}
                </p>
                <p className="text-xs text-gray-400 line-clamp-2">
                  {currentMission.description}
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            {currentMission.progress !== undefined && (
              <div className="mt-1">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${currentMission.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Timer for time-limited missions */}
            {timeLeft !== null && (
              <div className={`flex items-center gap-1 ${isUrgent ? 'animate-pulse' : ''}`}>
                <span className={`text-xs ${isUrgent ? 'text-red-400' : 'text-yellow-400'}`}>
                  ⏱️
                </span>
                <span className={`text-xs font-mono ${isUrgent ? 'text-red-400' : 'text-yellow-400'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-2">
            <p className="text-xs text-gray-500 italic">No active missions</p>
          </div>
        )}
        
        {/* Divider */}
        <div className="border-t border-gray-700 my-2"></div>
        
        {/* Status Row */}
        <div className="flex items-center justify-between">
          {/* Credits */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-yellow-400">💰</span>
            <span className={`text-xs font-semibold ${getCreditsColor()}`}>
              {credits.toLocaleString()} CR
            </span>
          </div>
          
          {/* Rank/Notoriety */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Rank:</span>
            <span className="text-xs text-yellow-400">{getRankIcon()}</span>
          </div>
        </div>
        
        {/* Additional missions indicator */}
        {activeMissions.length > 1 && (
          <div className="mt-1 pt-1 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              +{activeMissions.length - 1} more mission{activeMissions.length > 2 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}