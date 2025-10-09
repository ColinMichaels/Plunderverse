import React, { useState } from 'react';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { Button } from '../ui/button';
import { X, Users, Briefcase, Wrench, Shield, Heart, TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react';

interface CrewPanelProps {
  onClose: () => void;
}

// Predefined tasks for crew assignment
const AVAILABLE_TASKS = [
  { id: 'repairs', name: 'Ship Repairs', icon: Wrench, skill: 'mechanic' as const, duration: '2h' },
  { id: 'security', name: 'Security Patrol', icon: Shield, skill: 'gunner' as const, duration: '1h' },
  { id: 'medical', name: 'Medical Bay', icon: Heart, skill: 'medic' as const, duration: '3h' },
];

// Portrait emojis for crew members (could be expanded with actual sprites)
const CREW_PORTRAITS: Record<string, string> = {
  default: '👤',
  pilot: '✈️',
  mechanic: '🔧',
  medic: '⚕️',
  gunner: '🎯',
  negotiator: '💼',
  hacker: '💻',
};

// Skill color coding
const SKILL_COLORS = {
  high: 'from-green-500 to-emerald-600',
  medium: 'from-yellow-500 to-orange-600', 
  low: 'from-gray-500 to-gray-600',
};

const getSkillColor = (value: number) => {
  if (value >= 70) return SKILL_COLORS.high;
  if (value >= 40) return SKILL_COLORS.medium;
  return SKILL_COLORS.low;
};

const getLoyaltyStatus = (loyalty: number) => {
  if (loyalty >= 80) return { text: 'Devoted', color: 'text-green-400', icon: TrendingUp };
  if (loyalty >= 60) return { text: 'Loyal', color: 'text-cyan-400', icon: Activity };
  if (loyalty >= 30) return { text: 'Neutral', color: 'text-yellow-400', icon: Activity };
  return { text: 'Unhappy', color: 'text-red-400', icon: TrendingDown };
};

// Calculate crew efficiency based on skills and loyalty
const getCrewEfficiency = (member: any) => {
  const avgSkill = Object.values(member.skills).reduce((sum: number, val) => sum + (val as number), 0) / Object.keys(member.skills).length;
  const efficiency = (avgSkill * 0.7 + member.currentLoyalty * 0.3);
  return Math.round(efficiency);
};

export const CrewPanel: React.FC<CrewPanelProps> = ({ onClose }) => {
  const crew = useCrewManagement();
  const [selectedTab, setSelectedTab] = useState<'active' | 'available'>('active');
  const [assigningTask, setAssigningTask] = useState<{ crewId: string; taskId: string } | null>(null);
  const [expandedCrew, setExpandedCrew] = useState<string | null>(null);

  const handleHire = (crewId: string) => {
    const result = crew.hireCrew(crewId);
    console.log('[CrewPanel] Hire result:', result);
  };

  const handleFire = (crewId: string) => {
    const result = crew.fireCrew(crewId);
    console.log('[CrewPanel] Fire result:', result);
  };

  const handleAssignTask = (crewId: string, taskId: string) => {
    const task = AVAILABLE_TASKS.find(t => t.id === taskId);
    if (task) {
      console.log(`[CrewPanel] Assigning ${task.name} to crew ${crewId}`);
      // TODO: This would call crew.assignTask(crewId, taskId) when the store supports it
      // For now, just log and show feedback
      setAssigningTask({ crewId, taskId });
      setTimeout(() => setAssigningTask(null), 2000);
    }
  };

  const toggleExpanded = (crewId: string) => {
    setExpandedCrew(expandedCrew === crewId ? null : crewId);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-cyan-400/50 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-400/30 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="flex items-center gap-2">
            <Users className="text-cyan-400" size={24} />
            <h2 className="text-xl font-bold text-cyan-400">Crew Management</h2>
          </div>
          <Button
            onClick={onClose}
            className="bg-transparent hover:bg-cyan-400/20 text-cyan-400"
            size="sm"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyan-400/30 bg-gray-800/30">
          <button
            onClick={() => setSelectedTab('active')}
            className={`flex-1 p-3 font-medium transition-all ${
              selectedTab === 'active'
                ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:bg-cyan-400/10 hover:text-cyan-300'
            }`}
          >
            Active Crew ({crew.activeCrew.length}/{crew.maxCrewSize})
          </button>
          <button
            onClick={() => setSelectedTab('available')}
            className={`flex-1 p-3 font-medium transition-all ${
              selectedTab === 'available'
                ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:bg-cyan-400/10 hover:text-cyan-300'
            }`}
          >
            Available ({crew.availableCrew.filter(c => !c.isActive).length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedTab === 'active' ? (
            crew.activeCrew.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No active crew members</p>
                <p className="text-gray-500 text-sm mt-1">Hire crew from the Available tab</p>
              </div>
            ) : (
              crew.activeCrew.map((member) => {
                const loyaltyStatus = getLoyaltyStatus(member.currentLoyalty);
                const StatusIcon = loyaltyStatus.icon;
                const efficiency = getCrewEfficiency(member);
                const isExpanded = expandedCrew === member.id;
                const primarySkill = Object.entries(member.skills).sort(([,a], [,b]) => (b as number) - (a as number))[0];
                const portrait = CREW_PORTRAITS[primarySkill[0]] || CREW_PORTRAITS.default;

                return (
                  <div
                    key={member.id}
                    className="bg-gray-800/50 border border-cyan-400/30 rounded-lg overflow-hidden hover:border-cyan-400/50 transition-all"
                  >
                    {/* Crew Header */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpanded(member.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Portrait */}
                        <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                          {portrait}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <h3 className="text-cyan-400 font-bold text-lg">{member.name}</h3>
                              <p className="text-gray-400 text-sm">{member.title}</p>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFire(member.id);
                              }}
                              className="bg-red-500/20 hover:bg-red-500/40 text-red-400"
                              size="sm"
                            >
                              Fire
                            </Button>
                          </div>

                          {/* Status Row */}
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="bg-gray-900/50 rounded p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <StatusIcon className={`w-3 h-3 ${loyaltyStatus.color}`} />
                                <span className="text-xs text-gray-400">Loyalty</span>
                              </div>
                              <div className={`text-sm font-bold ${loyaltyStatus.color}`}>
                                {member.currentLoyalty}%
                              </div>
                            </div>
                            
                            <div className="bg-gray-900/50 rounded p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs text-gray-400">Efficiency</span>
                              </div>
                              <div className="text-sm font-bold text-yellow-400">
                                {efficiency}%
                              </div>
                            </div>

                            <div className="bg-gray-900/50 rounded p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Briefcase className="w-3 h-3 text-cyan-400" />
                                <span className="text-xs text-gray-400">Salary</span>
                              </div>
                              <div className="text-sm font-bold text-white">
                                {member.dailySalary}c
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-cyan-400/20 p-4 space-y-3 bg-gray-900/30">
                        {/* Skills Breakdown */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Skills</h4>
                          <div className="space-y-2">
                            {Object.entries(member.skills).map(([skill, value]) => (
                              <div key={skill}>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-400 capitalize">{skill}</span>
                                  <span className="text-white font-medium">{value}%</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full bg-gradient-to-r ${getSkillColor(value as number)} transition-all`}
                                    style={{ width: `${value}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Personality */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Traits</h4>
                          <div className="flex flex-wrap gap-1">
                            {member.personality.traits.map((trait) => (
                              <span key={trait} className="text-xs bg-purple-400/20 text-purple-400 px-2 py-1 rounded">
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Task Assignment */}
                        <div className="pt-3 border-t border-cyan-400/20">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Assign Task</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {AVAILABLE_TASKS.map((task) => {
                              const TaskIcon = task.icon;
                              const isAssigning = assigningTask?.crewId === member.id && assigningTask?.taskId === task.id;
                              const skillValue = member.skills[task.skill];
                              
                              return (
                                <button
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignTask(member.id, task.id);
                                  }}
                                  className={`p-3 rounded-lg border transition-all ${
                                    isAssigning
                                      ? 'bg-green-500/30 border-green-500 text-green-400'
                                      : 'bg-gray-700/50 border-gray-600 hover:bg-gray-600 text-gray-300 hover:border-cyan-400'
                                  }`}
                                  title={`${task.name} (${task.duration})\nSkill: ${skillValue}%`}
                                >
                                  <TaskIcon className="w-5 h-5 mx-auto mb-1" />
                                  <div className="text-xs font-medium">{task.name.split(' ')[0]}</div>
                                  <div className="text-xs text-gray-400 mt-1">{skillValue}%</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            crew.availableCrew.filter(c => !c.isActive).length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No crew available for hire</p>
                <p className="text-gray-500 text-sm mt-1">All crew members have been hired</p>
              </div>
            ) : (
              crew.availableCrew.filter(c => !c.isActive).map((member) => {
                const isExpanded = expandedCrew === member.id;
                const primarySkill = Object.entries(member.skills).sort(([,a], [,b]) => (b as number) - (a as number))[0];
                const portrait = CREW_PORTRAITS[primarySkill[0]] || CREW_PORTRAITS.default;
                
                return (
                  <div
                    key={member.id}
                    className="bg-gray-800/50 border border-cyan-400/30 rounded-lg overflow-hidden hover:border-cyan-400/50 transition-all"
                  >
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleExpanded(member.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Portrait */}
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                          {portrait}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-cyan-400 font-bold text-lg">{member.name}</h3>
                              <p className="text-gray-400 text-sm">{member.title}</p>
                            </div>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHire(member.id);
                              }}
                              className="bg-cyan-400/20 hover:bg-cyan-400/40 text-cyan-400 font-semibold"
                              size="sm"
                            >
                              Hire ({member.hiringCost} cr)
                            </Button>
                          </div>
                          
                          {!isExpanded && (
                            <p className="text-gray-400 text-sm line-clamp-2">{member.background}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-cyan-400/20 p-4 space-y-3 bg-gray-900/30">
                        <p className="text-gray-400 text-sm">{member.background}</p>
                        
                        {/* Skills */}
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Skills</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(member.skills).map(([skill, value]) => (
                              <div key={skill} className="flex justify-between text-sm">
                                <span className="text-gray-400 capitalize">{skill}</span>
                                <span className="text-cyan-400 font-medium">{value}%</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Hiring Info */}
                        <div className="pt-3 border-t border-cyan-400/20 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">Hiring Cost:</span>
                            <span className="text-white ml-2 font-semibold">{member.hiringCost} cr</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Daily Salary:</span>
                            <span className="text-white ml-2 font-semibold">{member.dailySalary} cr/day</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-cyan-400/30 p-4 bg-gray-800/50">
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-gray-400">Daily Costs:</span>
              <span className="text-cyan-400 ml-2 font-bold">{crew.dailySalaryCosts} credits/day</span>
            </div>
            <div>
              <span className="text-gray-400">Crew Capacity:</span>
              <span className="text-white ml-2 font-bold">{crew.activeCrew.length}/{crew.maxCrewSize}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
