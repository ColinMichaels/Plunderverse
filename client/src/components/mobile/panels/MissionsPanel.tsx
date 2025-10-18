import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Trophy,
  Clock,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Package,
  Zap,
  Star,
  ChevronRight,
  Flag,
  TrendingUp,
  Award,
  Gauge
} from 'lucide-react';
import { usePlunderverseMissions } from '../../../lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useCredits } from '../../../lib/stores/economy/useCredits';
import { useSolarSystem } from '../../../lib/stores/space/useSolarSystem';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { useAutoScroll } from '../../../hooks/useAutoScroll';
import { toast } from 'sonner';
import { triggerHaptic } from '../../../utils/hapticFeedback';

interface MissionsPanelProps {
  onClose?: () => void;
}

type TabType = 'active' | 'available' | 'completed';

export const MissionsPanel: React.FC<MissionsPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const { config } = useMobileLayout();
  const missions = usePlunderverseMissions();
  const player = usePlayer();
  const { credits, earnCredits } = useCredits();
  const { selectedPlanet } = useSolarSystem();
  const { isLanded, landedPlanet } = useLandedState();
  
  // Auto-scroll for mobile lists
  const { containerRef, scrollToTop } = useAutoScroll();

  // Scroll to top when tab changes
  useEffect(() => {
    scrollToTop();
  }, [activeTab, scrollToTop]);

  // Get missions by status from store
  const activeMissionsData = missions.activeMissions;
  const availableMissionsData = missions.availableMissions;
  
  // Convert completed mission IDs to an array for display
  const completedMissionsData = useMemo(() => {
    return Array.from(missions.completedMissionIds);
  }, [missions.completedMissionIds]);

  // Check if mission requirements are met
  const canAcceptMission = (mission: any): { canAccept: boolean; reason?: string } => {
    if (!mission.requirements) return { canAccept: true };

    const reqs = mission.requirements;

    // Check rank requirement
    if (reqs.minRank && player.rank < reqs.minRank) {
      return { canAccept: false, reason: `Requires Rank ${reqs.minRank} (Current: ${player.rank})` };
    }

    // Check reputation requirements
    if (reqs.reputation) {
      for (const [faction, minRep] of Object.entries(reqs.reputation)) {
        const currentRep = player.reputation[faction as keyof typeof player.reputation] || 0;
        if (currentRep < (minRep as number)) {
          return {
            canAccept: false,
            reason: `Requires ${faction} reputation ${minRep} (Current: ${currentRep})`
          };
        }
      }
    }

    // Check credits requirement
    if (reqs.credits && credits < reqs.credits) {
      return { canAccept: false, reason: `Requires ${reqs.credits} credits (Have: ${credits})` };
    }

    return { canAccept: true };
  };

  // Calculate mission progress
  const getMissionProgress = (mission: any): number => {
    if (!mission.objectives || mission.objectives.length === 0) return 0;
    
    const completed = mission.objectives.filter((obj: any) => obj.completed).length;
    return Math.round((completed / mission.objectives.length) * 100);
  };

  // Get mission difficulty color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'legendary': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  // Get mission type icon
  const getMissionIcon = (type?: string) => {
    switch (type) {
      case 'combat': return <Target className="w-4 h-4" />;
      case 'delivery': return <Package className="w-4 h-4" />;
      case 'exploration': return <MapPin className="w-4 h-4" />;
      case 'trade': return <TrendingUp className="w-4 h-4" />;
      case 'story': return <Star className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };


  // Accept a mission
  const acceptMission = (mission: any) => {
    const { canAccept, reason } = canAcceptMission(mission);
    
    if (!canAccept) {
      toast.error('Cannot accept mission', { description: reason });
      triggerHaptic(30);
      return;
    }

    missions.acceptMission(mission.id);
    toast.success('Mission accepted', {
      description: mission.title
    });
    triggerHaptic();
    setSelectedMission(null);
    setShowDetails(false);
    setActiveTab('active');
  };

  // Abandon a mission
  const abandonMission = (mission: any) => {
    missions.abandonMission(mission.id);
    toast.info('Mission abandoned', {
      description: mission.title
    });
    triggerHaptic();
    setSelectedMission(null);
    setShowDetails(false);
  };

  // Claim mission rewards
  const claimRewards = (mission: any) => {
    if (!mission.reward) return;

    // Award credits
    if (mission.reward.credits) {
      earnCredits(mission.reward.credits);
    }

    // Award experience
    if (mission.reward.experience) {
      player.addExperience(mission.reward.experience);
    }

    // Update reputation
    if (mission.reward.reputation) {
      for (const [faction, change] of Object.entries(mission.reward.reputation)) {
        player.updateReputation(
          faction as 'corporations' | 'independents' | 'outlaws',
          change as number
        );
      }
    }

    // Note: There's no claimRewards method in the store, rewards are given when mission completes
    toast.success('Rewards claimed!', {
      description: `+${mission.reward.credits}c${
        mission.reward.experience ? ` +${mission.reward.experience}xp` : ''
      }`
    });
    triggerHaptic(20);
    setSelectedMission(null);
    setShowDetails(false);
  };

  // Mission card component
  const MissionCard = ({ mission, type }: { mission: any; type: TabType }) => {
    const progress = getMissionProgress(mission);
    const isSelected = selectedMission?.id === mission.id;

    return (
      <motion.div
        layout
        className={`${config.panel.bg} ${config.panel.border} ${config.panel.radius} p-4
                   ${isSelected ? 'ring-2 ring-orange-600' : ''} cursor-pointer
                   active:scale-98 transition-transform`}
        onClick={() => {
          triggerHaptic();
          setSelectedMission(mission);
          setShowDetails(true);
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getMissionIcon(mission.type)}
            <span className={`text-xs ${getDifficultyColor(mission.difficulty)} font-medium`}>
              {mission.difficulty?.toUpperCase() || 'NORMAL'}
            </span>
          </div>
          {type === 'active' && (
            <div className="text-xs text-gray-400">
              {progress}%
            </div>
          )}
          {type === 'completed' && !mission.rewardsClaimed && (
            <span className="text-xs bg-green-600 text-white px-2 py-1 rounded animate-pulse">
              CLAIM
            </span>
          )}
        </div>

        <h3 className="text-white font-medium mb-1">{mission.title}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{mission.description}</p>

        {type === 'active' && (
          <div className="mb-3">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {mission.reward?.credits && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-cyan-400" />
                <span className="text-cyan-400">{mission.reward.credits}c</span>
              </div>
            )}
            {mission.reward?.experience && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" />
                <span className="text-purple-400">{mission.reward.experience}xp</span>
              </div>
            )}
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${
            isSelected ? 'rotate-90' : ''
          }`} />
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 border-b-2 border-orange-600/30 p-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-base font-bold text-white flex items-center gap-1.5">
            <Target className="w-5 h-5 text-orange-400" />
            Mission Board
          </h1>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Active</p>
            <p className="text-sm font-mono text-orange-400">
              {activeMissionsData.length}/5
            </p>
          </div>
        </div>

        {/* Stats Bar with Tabs */}
        <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-2 py-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 font-semibold">{completedMissionsData.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-400 font-semibold">
                {completedMissionsData.length > 0 
                  ? Math.round((completedMissionsData.length / (completedMissionsData.length + missions.failedMissionIds.size)) * 100)
                  : 0}%
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setActiveTab('active');
                triggerHaptic();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
                        ${activeTab === 'active' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-gray-300'}`}
            >
              Active
            </button>
            <button
              onClick={() => {
                setActiveTab('available');
                triggerHaptic();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
                        ${activeTab === 'available' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-gray-300'}`}
            >
              Available
            </button>
            <button
              onClick={() => {
                setActiveTab('completed');
                triggerHaptic();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
                        ${activeTab === 'completed' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-gray-300'}`}
            >
              Done
            </button>
          </div>
        </div>
      </header>

      {/* Mission List */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'active' && (
          <div className="space-y-3">
            {activeMissionsData.length > 0 ? (
              activeMissionsData.map((mission: any) => (
                <MissionCard key={mission.id} mission={mission} type="active" />
              ))
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No active missions</p>
                <p className="text-gray-500 text-sm mt-1">Accept new missions from the Available tab</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'available' && (
          <div className="space-y-3">
            {availableMissionsData.length > 0 ? (
              availableMissionsData.map((mission: any) => (
                <MissionCard key={mission.id} mission={mission} type="available" />
              ))
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No missions available</p>
                <p className="text-gray-500 text-sm mt-1">Check back later or visit other stations</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completedMissionsData.length > 0 ? (
              <div className="text-center py-4">
                <Trophy className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-gray-400">Completed {completedMissionsData.length} mission{completedMissionsData.length !== 1 ? 's' : ''}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No completed missions yet</p>
                <p className="text-gray-500 text-sm mt-1">Complete missions to see them here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mission Details Modal */}
      <AnimatePresence>
        {showDetails && selectedMission && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-800 border-b-2 border-orange-600/30 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-white">Mission Details</h2>
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      triggerHaptic();
                    }}
                    className="text-gray-400 active:text-white"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getMissionIcon(selectedMission.type)}
                    <span className={`text-sm ${getDifficultyColor(selectedMission.difficulty)} font-medium`}>
                      {selectedMission.difficulty?.toUpperCase() || 'NORMAL'} MISSION
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{selectedMission.title}</h3>
                  <p className="text-gray-300">{selectedMission.description}</p>
                </div>

                {/* Objectives */}
                {selectedMission.objectives && selectedMission.objectives.length > 0 && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-cyan-400 mb-3">OBJECTIVES</h4>
                    <div className="space-y-2">
                      {selectedMission.objectives.map((obj: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                            obj.completed 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-500'
                          }`}>
                            {obj.completed && (
                              <CheckCircle className="w-3 h-3 text-white m-auto" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${obj.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                              {obj.description}
                            </p>
                            {obj.progress !== undefined && !obj.completed && (
                              <div className="mt-1">
                                <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-500"
                                    style={{ width: `${(obj.progress / obj.target) * 100}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {obj.progress}/{obj.target}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {selectedMission.requirements && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-yellow-400 mb-3">REQUIREMENTS</h4>
                    <div className="space-y-2">
                      {selectedMission.requirements.minRank && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Minimum Rank</span>
                          <span className={player.rank >= selectedMission.requirements.minRank ? 'text-green-400' : 'text-red-400'}>
                            Rank {selectedMission.requirements.minRank}
                          </span>
                        </div>
                      )}
                      {selectedMission.requirements.credits && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Credits Required</span>
                          <span className={credits >= selectedMission.requirements.credits ? 'text-green-400' : 'text-red-400'}>
                            {selectedMission.requirements.credits}c
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rewards */}
                {selectedMission.reward && (
                  <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-600/50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-green-400 mb-3">REWARDS</h4>
                    <div className="space-y-2">
                      {selectedMission.reward.credits && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-cyan-400" />
                            <span className="text-gray-300">Credits</span>
                          </div>
                          <span className="text-cyan-400 font-bold">
                            {selectedMission.reward.credits.toLocaleString()}c
                          </span>
                        </div>
                      )}
                      {selectedMission.reward.experience && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-300">Experience</span>
                          </div>
                          <span className="text-purple-400 font-bold">
                            {selectedMission.reward.experience.toLocaleString()}xp
                          </span>
                        </div>
                      )}
                      {selectedMission.reward.reputation && Object.entries(selectedMission.reward.reputation).map(([faction, change]) => {
                        const repChange = Number(change);
                        return (
                          <div key={faction} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-amber-400" />
                              <span className="text-gray-300">{faction}</span>
                            </div>
                            <span className={`font-bold ${repChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {repChange > 0 ? '+' : ''}{repChange}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-900 border-t border-slate-700 p-4">
                {selectedMission.status === 'available' && (
                  <button
                    onClick={() => acceptMission(selectedMission)}
                    disabled={!canAcceptMission(selectedMission).canAccept}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg
                             font-bold active:scale-95 transition-transform disabled:opacity-50"
                  >
                    Accept Mission
                  </button>
                )}
                {selectedMission.status === 'active' && (
                  <button
                    onClick={() => abandonMission(selectedMission)}
                    className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg
                             font-bold active:scale-95 transition-transform"
                  >
                    Abandon Mission
                  </button>
                )}
                {selectedMission.completed && !selectedMission.rewardsClaimed && (
                  <button
                    onClick={() => claimRewards(selectedMission)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg
                             font-bold active:scale-95 transition-transform animate-pulse"
                  >
                    Claim Rewards
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};