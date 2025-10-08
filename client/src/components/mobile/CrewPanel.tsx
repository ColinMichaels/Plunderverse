import React, { useState } from 'react';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { Button } from '../ui/button';
import { X, Users, Briefcase, Wrench, Shield, Heart } from 'lucide-react';

interface CrewPanelProps {
  onClose: () => void;
}

// Predefined tasks for crew assignment
const AVAILABLE_TASKS = [
  { id: 'repairs', name: 'Ship Repairs', icon: Wrench, skill: 'mechanic', duration: '2h' },
  { id: 'security', name: 'Security Patrol', icon: Shield, skill: 'gunner', duration: '1h' },
  { id: 'medical', name: 'Medical Bay', icon: Heart, skill: 'medic', duration: '3h' },
];

export const CrewPanel: React.FC<CrewPanelProps> = ({ onClose }) => {
  const crew = useCrewManagement();
  const [selectedTab, setSelectedTab] = useState<'active' | 'available'>('active');
  const [assigningTask, setAssigningTask] = useState<{ crewId: string; taskId: string } | null>(null);

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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-cyan-400/50 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-400/30">
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
        <div className="flex border-b border-cyan-400/30">
          <button
            onClick={() => setSelectedTab('active')}
            className={`flex-1 p-3 ${
              selectedTab === 'active'
                ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:bg-cyan-400/10'
            }`}
          >
            Active Crew ({crew.activeCrew.length}/{crew.maxCrewSize})
          </button>
          <button
            onClick={() => setSelectedTab('available')}
            className={`flex-1 p-3 ${
              selectedTab === 'available'
                ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:bg-cyan-400/10'
            }`}
          >
            Available ({crew.availableCrew.filter(c => !c.isActive).length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedTab === 'active' ? (
            crew.activeCrew.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No active crew members</p>
            ) : (
              crew.activeCrew.map((member) => (
                <div
                  key={member.id}
                  className="bg-gray-800/50 border border-cyan-400/30 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-cyan-400 font-bold">{member.name}</h3>
                      <p className="text-gray-400 text-sm">{member.title}</p>
                    </div>
                    <Button
                      onClick={() => handleFire(member.id)}
                      className="bg-red-500/20 hover:bg-red-500/40 text-red-400"
                      size="sm"
                    >
                      Fire
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div>
                      <span className="text-gray-400">Loyalty:</span>
                      <span className="text-white ml-2">{member.currentLoyalty}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Salary:</span>
                      <span className="text-white ml-2">{member.dailySalary} cr/day</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400">Skills:</span>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(member.skills).slice(0, 3).map(([skill, value]) => (
                          <span key={skill} className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded">
                            {skill}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Task Assignment */}
                  <div className="mt-3 pt-3 border-t border-cyan-400/20">
                    <p className="text-xs text-gray-400 mb-2">Assign Task:</p>
                    <div className="flex gap-2">
                      {AVAILABLE_TASKS.map((task) => {
                        const TaskIcon = task.icon;
                        const isAssigning = assigningTask?.crewId === member.id && assigningTask?.taskId === task.id;
                        return (
                          <Button
                            key={task.id}
                            onClick={() => handleAssignTask(member.id, task.id)}
                            size="sm"
                            className={`flex-1 ${
                              isAssigning
                                ? 'bg-green-500/40 text-green-400'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                            title={`${task.name} (${task.duration})`}
                          >
                            <TaskIcon className="w-3 h-3" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            crew.availableCrew.filter(c => !c.isActive).length === 0 ? (
              <p className="text-gray-400 text-center py-8">No crew available for hire</p>
            ) : (
              crew.availableCrew.filter(c => !c.isActive).map((member) => (
                <div
                  key={member.id}
                  className="bg-gray-800/50 border border-cyan-400/30 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-cyan-400 font-bold">{member.name}</h3>
                      <p className="text-gray-400 text-sm">{member.title}</p>
                    </div>
                    <Button
                      onClick={() => handleHire(member.id)}
                      className="bg-cyan-400/20 hover:bg-cyan-400/40 text-cyan-400"
                      size="sm"
                    >
                      Hire ({member.hiringCost} cr)
                    </Button>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">{member.background}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div className="col-span-2">
                      <span className="text-gray-400">Skills:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(member.skills).slice(0, 4).map(([skill, value]) => (
                          <span key={skill} className="text-xs bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded">
                            {skill}: {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-cyan-400/30 p-4 bg-gray-800/50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Daily Salary Costs:</span>
            <span className="text-cyan-400">{crew.dailySalaryCosts} credits/day</span>
          </div>
        </div>
      </div>
    </div>
  );
};
