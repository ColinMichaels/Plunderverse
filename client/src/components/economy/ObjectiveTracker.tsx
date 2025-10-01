import React, { useEffect, useState } from 'react';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { useObjectiveTriggers } from '../../lib/stores/economy/useObjectiveTriggers';
import { Mission, MissionObjective } from '../../lib/plunderverse/types';

interface ObjectiveWithProgress {
  missionId: string;
  missionTitle: string;
  objective: MissionObjective;
  progress: number;
  currentValue?: number;
  targetValue?: number;
  isCompleted: boolean;
  completedAt?: number;
}

export function ObjectiveTracker() {
  const { activeMissions, currentObjectiveProgress } = usePlunderverseMissions();
  const { progressData } = useObjectiveTriggers();
  const [visibleObjectives, setVisibleObjectives] = useState<ObjectiveWithProgress[]>([]);
  const [fadeOutObjectives, setFadeOutObjectives] = useState<Set<string>>(new Set());

  // Process objectives and their progress
  useEffect(() => {
    const processedObjectives: ObjectiveWithProgress[] = [];
    
    activeMissions.forEach((mission) => {
      const missionProgress = currentObjectiveProgress.get(mission.id);
      
      mission.objectives.forEach((objective) => {
        const progress = missionProgress?.get(objective.id) || 0;
        const triggerData = progressData.get(objective.id);
        const isCompleted = progress >= 100 || objective.completed;
        
        processedObjectives.push({
          missionId: mission.id,
          missionTitle: mission.title,
          objective,
          progress,
          currentValue: triggerData?.currentValue,
          targetValue: triggerData?.targetValue,
          isCompleted,
          completedAt: isCompleted ? Date.now() : undefined
        });
      });
    });
    
    setVisibleObjectives(processedObjectives);
  }, [activeMissions, currentObjectiveProgress, progressData]);

  // Auto-hide completed objectives after 3 seconds
  useEffect(() => {
    const completedObjectives = visibleObjectives.filter(o => o.isCompleted);
    
    completedObjectives.forEach(obj => {
      if (obj.completedAt) {
        const timeSinceCompletion = Date.now() - obj.completedAt;
        if (timeSinceCompletion < 3000) {
          const timeoutId = setTimeout(() => {
            setFadeOutObjectives(prev => new Set(prev).add(obj.objective.id));
          }, 3000 - timeSinceCompletion);
          
          return () => clearTimeout(timeoutId);
        } else {
          setFadeOutObjectives(prev => new Set(prev).add(obj.objective.id));
        }
      }
    });
  }, [visibleObjectives]);

  // Filter out faded objectives
  const displayObjectives = visibleObjectives.filter(
    obj => !fadeOutObjectives.has(obj.objective.id)
  );

  if (displayObjectives.length === 0) {
    return null;
  }

  // Get color based on progress
  const getProgressColor = (progress: number, isCompleted: boolean) => {
    if (isCompleted) return 'bg-green-500';
    if (progress > 0) return 'bg-yellow-500';
    return 'bg-gray-600';
  };

  const getTextColor = (progress: number, isCompleted: boolean) => {
    if (isCompleted) return 'text-green-400';
    if (progress > 0) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getIcon = (type: string, isCompleted: boolean) => {
    if (isCompleted) return '✅';
    
    switch (type) {
      case 'collection':
      case 'delivery':
        return '📦';
      case 'combat':
        return '⚔️';
      case 'travel':
      case 'location':
        return '🧭';
      case 'interaction':
      case 'investigation':
        return '🔍';
      case 'escort':
        return '🛡️';
      case 'race':
        return '🏁';
      default:
        return '📋';
    }
  };

  const formatProgressText = (obj: ObjectiveWithProgress) => {
    if (obj.currentValue !== undefined && obj.targetValue !== undefined) {
      // For collection/combat objectives, show "X/Y" format
      if (obj.objective.type === 'collection' || obj.objective.type === 'combat' || obj.objective.type === 'delivery') {
        const itemName = obj.objective.target || obj.objective.type;
        return `${Math.floor(obj.currentValue)}/${Math.floor(obj.targetValue)} ${itemName}`;
      }
    }
    
    // For location/interaction objectives, just show description
    return obj.objective.description;
  };

  return (
    <div className="fixed top-32 left-4 z-40 pointer-events-none">
      <div className="space-y-2 max-w-[280px]">
        {/* Header */}
        <div className="bg-black/70 backdrop-blur-sm border border-cyan-400/30 rounded-lg px-3 py-2 pointer-events-auto">
          <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
            Mission Objectives
          </h3>
        </div>
        
        {/* Objectives */}
        {displayObjectives.map((obj) => (
          <div
            key={obj.objective.id}
            className={`bg-black/70 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-3 pointer-events-auto transition-all duration-300 ${
              obj.isCompleted ? 'animate-pulse' : ''
            }`}
          >
            {/* Mission Title */}
            <div className="text-xs text-gray-500 mb-1 truncate">
              {obj.missionTitle}
            </div>
            
            {/* Objective */}
            <div className="flex items-start gap-2 mb-2">
              <span className="text-sm mt-0.5">
                {getIcon(obj.objective.type || '', obj.isCompleted)}
              </span>
              <div className="flex-1">
                <p className={`text-xs font-medium ${getTextColor(obj.progress, obj.isCompleted)}`}>
                  {formatProgressText(obj)}
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            {!obj.isCompleted && obj.targetValue && obj.targetValue > 1 && (
              <div className="relative">
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(obj.progress, obj.isCompleted)} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, obj.progress)}%` }}
                  />
                </div>
                {/* Progress percentage text */}
                {obj.progress > 0 && obj.progress < 100 && (
                  <div className="absolute -top-1 right-0">
                    <span className="text-[10px] text-gray-500 font-mono">
                      {Math.floor(obj.progress)}%
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Completion indicator */}
            {obj.isCompleted && (
              <div className="mt-1 text-[10px] text-green-400 font-semibold animate-bounce">
                COMPLETE!
              </div>
            )}
          </div>
        ))}
        
        {/* Multiple missions indicator */}
        {activeMissions.length > 1 && (
          <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1 text-center pointer-events-auto">
            <p className="text-[10px] text-gray-500">
              {activeMissions.length} active missions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}