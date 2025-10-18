import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Trophy, Target, Clock, Star, Coins } from 'lucide-react';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { Progress } from './progress';

export function MissionHUD() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load initial state from localStorage
    const saved = localStorage.getItem('missionHUD_collapsed');
    return saved === 'true';
  });

  const {
    activeMissions,
    currentMissionId,
    currentObjectiveProgress,
  } = usePlunderverseMissions();

  const { credits } = useCreditsStore();
  const { reputation } = usePlayer();
  const { wantedLevel, wantedLevelInfo } = useHeatSystem();

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('missionHUD_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Get the primary active mission to display
  const primaryMission = currentMissionId 
    ? activeMissions.find(m => m.id === currentMissionId)
    : activeMissions[0];

  // Auto-hide when no missions are active
  if (activeMissions.length === 0) {
    return null;
  }

  const getMissionTypeIcon = (type: string) => {
    switch (type) {
      case 'exploration': return '🌍';
      case 'delivery': return '📦';
      case 'smuggling': return '🚫';
      case 'bounty': return '💀';
      case 'combat': return '⚔️';
      case 'survival': return '🛡️';
      case 'discovery': return '🔍';
      default: return '📋';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      case 'legendary': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '⭐';
      case 'medium': return '⭐⭐';
      case 'hard': return '⭐⭐⭐';
      case 'legendary': return '👑';
      default: return '⭐';
    }
  };

  const calculateOverallProgress = (missionId: string, objectives: any[]) => {
    const missionProgress = currentObjectiveProgress.get(missionId);
    if (!missionProgress || objectives.length === 0) return 0;

    let totalProgress = 0;
    let completedCount = 0;

    objectives.forEach(obj => {
      if (obj.completed) {
        completedCount++;
        totalProgress += 100;
      } else {
        const progress = missionProgress.get(obj.id) || 0;
        totalProgress += progress;
      }
    });

    return Math.round(totalProgress / objectives.length);
  };

  const formatTimeRemaining = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

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
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="fixed top-0 left-0 right-0 z-30"
    >
      <div className={`bg-black/70 backdrop-blur-md border-b border-orange-600/30 transition-all duration-300 ${
        isCollapsed ? 'h-8' : 'h-20'
      }`}>
        {/* Toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-2 top-1 p-1 text-orange-400 hover:text-orange-300 transition-colors z-10"
          aria-label={isCollapsed ? "Expand mission HUD" : "Collapse mission HUD"}
        >
          {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>

        <AnimatePresence mode="wait">
          {isCollapsed ? (
            // Collapsed view - just show mission count and icon
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center h-full px-4"
            >
              <div className="flex items-center space-x-3 text-orange-400">
                <Target size={18} />
                <span className="text-sm font-medium">
                  {activeMissions.length} Active Mission{activeMissions.length !== 1 ? 's' : ''}
                </span>
                {primaryMission && (
                  <>
                    <span className="text-orange-600">•</span>
                    <span className="text-sm text-gray-300">
                      {getMissionTypeIcon(primaryMission.type)} {primaryMission.title}
                    </span>
                    <div className="ml-2 w-24 bg-gray-800 rounded-full h-2">
                      <div 
                        className="h-full bg-orange-500 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${calculateOverallProgress(primaryMission.id, primaryMission.objectives)}%` 
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ) : primaryMission ? (
            // Expanded view - show full mission details
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full px-4 py-2"
            >
              <div className="flex items-start justify-between h-full">
                {/* Mission Info Section */}
                <div className="flex items-start space-x-4 flex-1">
                  {/* Mission Type & Title */}
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getMissionTypeIcon(primaryMission.type)}</span>
                    <div>
                      <h3 className="text-sm font-bold text-orange-400 flex items-center space-x-2">
                        <span>{primaryMission.title}</span>
                        <span className={`${getDifficultyColor(primaryMission.difficulty)} text-xs`}>
                          {getDifficultyIcon(primaryMission.difficulty)}
                        </span>
                      </h3>
                      {/* Mission description ticker for long text */}
                      <div className="w-64 overflow-hidden">
                        <p className="text-xs text-gray-400 whitespace-nowrap animate-pulse">
                          {primaryMission.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Objectives Section */}
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center space-x-2 mb-1">
                      <Target size={14} className="text-orange-500" />
                      <span className="text-xs font-medium text-gray-300">Objectives</span>
                    </div>
                    <div className="space-y-1">
                      {primaryMission.objectives.slice(0, 2).map((obj) => {
                        const progress = currentObjectiveProgress.get(primaryMission.id)?.get(obj.id) || 0;
                        return (
                          <div key={obj.id} className="flex items-center space-x-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-xs ${obj.completed ? 'text-green-400 line-through' : 'text-gray-300'}`}>
                                  {obj.description.length > 40 
                                    ? obj.description.substring(0, 40) + '...' 
                                    : obj.description}
                                </span>
                                <span className="text-xs text-orange-400 font-mono">
                                  {obj.completed ? '✓' : `${Math.round(progress)}%`}
                                </span>
                              </div>
                              <Progress 
                                value={obj.completed ? 100 : progress} 
                                className="h-1.5 bg-gray-800"
                              />
                            </div>
                          </div>
                        );
                      })}
                      {primaryMission.objectives.length > 2 && (
                        <span className="text-xs text-gray-500 italic">
                          +{primaryMission.objectives.length - 2} more...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rewards Section */}
                  <div className="flex items-start space-x-4 border-l border-gray-700 pl-4">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <Trophy size={14} className="text-yellow-400" />
                        <span className="text-xs font-medium text-gray-300">Rewards</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {primaryMission.rewards?.base?.credits && (
                          <div className="flex items-center space-x-1">
                            <Coins size={12} className="text-yellow-400" />
                            <span className="text-xs font-mono text-yellow-400">
                              {primaryMission.rewards.base.credits}
                            </span>
                          </div>
                        )}
                        {primaryMission.rewards?.base?.reputation && (
                          <div className="flex items-center space-x-1">
                            <Star size={12} className="text-blue-400" />
                            <span className="text-xs text-blue-400">
                              +Rep
                            </span>
                          </div>
                        )}
                        {primaryMission.rewards?.base?.items && primaryMission.rewards.base.items.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-purple-400">
                              {primaryMission.rewards.base.items.length} items
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Time Remaining */}
                    {primaryMission.timeLimit && (
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <Clock size={14} className="text-red-400" />
                          <span className="text-xs font-medium text-gray-300">Time</span>
                        </div>
                        <span className="text-xs font-mono text-red-400">
                          {formatTimeRemaining(primaryMission.timeLimit)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Player Stats Section */}
                  <div className="flex items-start space-x-4 border-l border-gray-700 pl-4">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <Star size={14} className="text-orange-400" />
                        <span className="text-xs font-medium text-gray-300">Player Stats</span>
                      </div>
                      <div className="space-y-1">
                        {/* Credits */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">💰</span>
                          <span className={`text-xs font-mono font-semibold ${getCreditsColor()}`}>
                            {credits.toLocaleString()} CR
                          </span>
                        </div>
                        
                        {/* Rank */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-400">Rank:</span>
                          <span className="text-xs text-yellow-400">{getRankIcon()}</span>
                        </div>

                        {/* Wanted Level */}
                        {wantedLevel > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs" style={{ color: wantedLevelInfo.color }}>
                              {wantedLevelInfo.icon}
                            </span>
                            <span className="text-xs font-medium" style={{ color: wantedLevelInfo.color }}>
                              LV.{wantedLevel}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mission Switcher (if multiple missions) */}
                {activeMissions.length > 1 && (
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-xs text-gray-500">
                      {activeMissions.indexOf(primaryMission) + 1}/{activeMissions.length}
                    </span>
                    <div className="flex flex-col space-y-1">
                      {activeMissions.slice(0, 3).map((mission, index) => (
                        <button
                          key={mission.id}
                          onClick={() => usePlunderverseMissions.setState({ currentMissionId: mission.id })}
                          className={`w-2 h-2 rounded-full transition-all ${
                            mission.id === currentMissionId 
                              ? 'bg-orange-400 w-3' 
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                          title={mission.title}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Overall Progress */}
                <div className="ml-4 mr-12">
                  <div className="text-xs text-gray-400 mb-1">Progress</div>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-gray-800"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - calculateOverallProgress(primaryMission.id, primaryMission.objectives) / 100)}`}
                        className="text-orange-500 transition-all duration-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-orange-400">
                        {calculateOverallProgress(primaryMission.id, primaryMission.objectives)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}