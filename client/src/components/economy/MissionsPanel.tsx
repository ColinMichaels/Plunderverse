import { useState } from "react";
import { useMissions } from "../../lib/stores/useMissions";
import { useCreditsData } from "../../domain/economy/selectors";
import { useRewards } from "../../lib/stores/useRewards";
import { SpaceUIPanel } from "../ui/SpaceUIPanel";

export function MissionsPanel() {
  const { missions, bounties, completedMissions, completedBounties, generateNewMissions } = useMissions();
  const { credits } = useCreditsData();
  const { totalEarnings, landingCount, visitedPlanets } = useRewards();
  const [activeTab, setActiveTab] = useState<'missions' | 'bounties' | 'stats'>('missions');

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '⭐';
      case 'medium': return '⭐⭐';
      case 'hard': return '⭐⭐⭐';
      default: return '⭐';
    }
  };

  const getMissionTypeIcon = (type: string) => {
    switch (type) {
      case 'exploration': return '🌍';
      case 'delivery': return '📦';
      case 'survival': return '⚔️';
      case 'discovery': return '🔍';
      default: return '📋';
    }
  };

  return (
    <SpaceUIPanel
      id="missions-panel"
      title="MISSION CONTROL"
      icon="📋"
      zone="right-sidebar"
      priority={0}
      defaultExpanded={false}
      canCollapse={true}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="missions-panel-header bg-gray-800 p-4 border-b border-gray-600 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Mission Control</h2>
          </div>
          
          {/* Credits Display */}
          <div className="mt-2 flex items-center space-x-4 text-sm">
            <div className="text-yellow-400 font-mono">💰 {credits} Credits</div>
            <div className="text-green-400 font-mono">📈 {totalEarnings} Earned</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'missions'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Missions ({missions.length})
          </button>
          <button
            onClick={() => setActiveTab('bounties')}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'bounties'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Bounties ({bounties.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Stats
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-3">
          {activeTab === 'missions' && (
            <>
              {missions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">No active missions</div>
                  <button
                    onClick={generateNewMissions}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
                  >
                    Request New Missions
                  </button>
                </div>
              ) : (
                missions.map((mission) => (
                  <div key={mission.id} className="bg-gray-800 p-3 rounded border border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getMissionTypeIcon(mission.type)}</span>
                        <h3 className="font-semibold text-white">{mission.title}</h3>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={getDifficultyColor(mission.difficulty)}>
                          {getDifficultyIcon(mission.difficulty)}
                        </span>
                        <span className="text-yellow-400 font-mono text-sm">+{mission.reward}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2">{mission.description}</p>
                    
                    {mission.target && (
                      <div className="text-xs text-blue-400 mb-2">
                        Target: {mission.target}
                      </div>
                    )}
                    
                    {mission.progress > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{mission.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${mission.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {mission.timeLimit && (
                      <div className="text-xs text-orange-400">
                        ⏱️ Time Limit: {mission.timeLimit} minutes
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {missions.length > 0 && (
                <button
                  onClick={generateNewMissions}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded transition-colors text-sm"
                >
                  Request More Missions
                </button>
              )}
            </>
          )}

          {activeTab === 'bounties' && (
            <>
              {bounties.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No active bounties available
                </div>
              ) : (
                bounties.map((bounty) => (
                  <div key={bounty.id} className="bg-gray-800 p-3 rounded border border-red-600/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">💀</span>
                        <h3 className="font-semibold text-white">{bounty.title}</h3>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={getDifficultyColor(bounty.difficulty)}>
                          {getDifficultyIcon(bounty.difficulty)}
                        </span>
                        <span className="text-yellow-400 font-mono text-sm">+{bounty.reward}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2">{bounty.description}</p>
                    
                    <div className="text-xs text-red-400">
                      Target: {bounty.target}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="bg-gray-800 p-3 rounded border border-gray-600">
                <h3 className="font-semibold text-white mb-2">Career Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Successful Landings:</span>
                    <span className="text-green-400">{landingCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Planets Visited:</span>
                    <span className="text-blue-400">{visitedPlanets.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Earnings:</span>
                    <span className="text-yellow-400">{totalEarnings} Credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Missions Completed:</span>
                    <span className="text-purple-400">{completedMissions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Bounties Completed:</span>
                    <span className="text-red-400">{completedBounties.length}</span>
                  </div>
                </div>
              </div>

              {completedMissions.length > 0 && (
                <div className="bg-gray-800 p-3 rounded border border-gray-600">
                  <h3 className="font-semibold text-white mb-2">Recent Achievements</h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {completedMissions.slice(-5).map((mission) => (
                      <div key={mission.id} className="flex items-center space-x-2 text-xs">
                        <span>{getMissionTypeIcon(mission.type)}</span>
                        <span className="text-gray-300 flex-1">{mission.title}</span>
                        <span className="text-yellow-400">+{mission.reward}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SpaceUIPanel>
  );
}
