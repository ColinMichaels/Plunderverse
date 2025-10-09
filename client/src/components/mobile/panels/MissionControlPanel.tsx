import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Wrench,
  Package,
  Users,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle,
  Circle,
  ChevronRight,
  Flag,
  Trophy,
  AlertTriangle,
  Star,
  Zap
} from 'lucide-react';
import { usePlunderverseMissions } from '../../../lib/stores/economy/usePlunderverseMissions';
import { useCrewManagement } from '../../../lib/stores/ship/useCrewManagement';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../../lib/stores/ship/useEquipment';
import { toast } from 'sonner';
import { triggerHaptic } from '../../../utils/hapticFeedback';

interface MissionControlPanelProps {
  onClose?: () => void;
}

type ObjectiveCategory = 'missions' | 'repairs' | 'collections';

interface UnifiedObjective {
  id: string;
  category: ObjectiveCategory;
  title: string;
  description: string;
  progress: number;
  isCompleted: boolean;
  reward?: string;
  assignedCrew?: string;
  location?: string;
  timeRemaining?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export const MissionControlPanel: React.FC<MissionControlPanelProps> = ({ onClose }) => {
  const [activeCategory, setActiveCategory] = useState<ObjectiveCategory>('missions');
  const [selectedObjective, setSelectedObjective] = useState<UnifiedObjective | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [collectionObjectives, setCollectionObjectives] = useState<any[]>([]);
  
  const missions = usePlunderverseMissions();
  const crewManagement = useCrewManagement();
  const ship = useShipStatus();
  const equipment = useEquipment();
  
  // Load collection objectives from localStorage (synced by Phaser game)
  useEffect(() => {
    const loadCollections = () => {
      const saved = localStorage.getItem('minigame_collection_progress');
      if (saved) {
        try {
          const progress = JSON.parse(saved);
          setCollectionObjectives(progress.objectives || []);
        } catch (error) {
          console.error('Failed to load collection objectives:', error);
        }
      }
    };
    
    // Load initially
    loadCollections();
    
    // Reload periodically to catch updates from Phaser game
    const interval = setInterval(loadCollections, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compile unified objectives from all sources
  const objectives = useMemo(() => {
    const unified: UnifiedObjective[] = [];

    // 1. Active Plunderverse Missions
    missions.activeMissions.forEach(mission => {
      const completedObjectives = mission.objectives?.filter(obj => obj.completed).length || 0;
      const totalObjectives = mission.objectives?.length || 1;
      const progress = Math.round((completedObjectives / totalObjectives) * 100);

      unified.push({
        id: `mission-${mission.id}`,
        category: 'missions',
        title: mission.title,
        description: mission.description,
        progress,
        isCompleted: mission.completed || false,
        reward: mission.rewards?.base?.credits ? `${mission.rewards.base.credits} credits` : undefined,
        location: undefined,
        priority: mission.difficulty === 'hard' || mission.difficulty === 'legendary' ? 'high' : 'medium'
      });
    });

    // 2. Ship Repair Tasks (from crew assignments)
    const engineEquipment = equipment.getEquipment('engine-main');
    const drillEquipment = equipment.getEquipment('drill-mk1');
    const scannerEquipment = equipment.getEquipment('scanner-mk1');

    const repairSystems = [
      { id: 'hull', name: 'Hull Integrity', health: ship.hull, icon: '🛡️' },
      { id: 'shields', name: 'Shield Systems', health: ship.shield, icon: '⚡' },
      { id: 'engine', name: 'Engine Systems', health: engineEquipment?.currentDurability || 100, icon: '🚀' },
      { id: 'weapons', name: 'Drill Systems', health: drillEquipment?.currentDurability || 100, icon: '⚒️' },
      { id: 'navigation', name: 'Navigation Computer', health: scannerEquipment?.currentDurability || 100, icon: '🧭' }
    ];

    repairSystems.forEach(system => {
      const assignedCrew = crewManagement.activeCrew.find(
        crew => crew.currentTask?.id === `repair-${system.id}` && !crew.currentTask?.completed
      );

      if (system.health < 100 || assignedCrew) {
        const progress = assignedCrew?.currentTask?.progress || 0;
        const timeRemaining = assignedCrew?.currentTask 
          ? `${Math.max(0, assignedCrew.currentTask.durationMinutes * (1 - progress / 100)).toFixed(1)}m`
          : undefined;

        unified.push({
          id: `repair-${system.id}`,
          category: 'repairs',
          title: `Repair ${system.name}`,
          description: `${system.icon} System health: ${Math.round(system.health)}%`,
          progress: assignedCrew ? progress : 0,
          isCompleted: system.health >= 100,
          assignedCrew: assignedCrew?.name,
          timeRemaining,
          priority: system.health < 30 ? 'critical' : system.health < 60 ? 'high' : 'medium'
        });
      }
    });

    // 3. Mini-game Collection Objectives (populated from Phaser game via localStorage)
    const collectionObjectiveTypes = [
      { id: 'repair_tools', name: 'Repair Tools', icon: '🔧', description: 'Essential tools for ship maintenance and repairs' },
      { id: 'spare_parts', name: 'Spare Parts', icon: '⚙️', description: 'Critical replacement components for ship systems' },
      { id: 'fuel_cells', name: 'Fuel Cells', icon: '🔋', description: 'Energy cells to refuel ship systems' },
      { id: 'medical_supplies', name: 'Medical Supplies', icon: '💊', description: 'Medical kits for crew health maintenance' }
    ];

    collectionObjectives.forEach(objective => {
      const typeInfo = collectionObjectiveTypes.find(t => t.id === objective.id);
      if (typeInfo && objective.requiredCount) {
        const progress = Math.round((objective.currentCount / objective.requiredCount) * 100);
        
        unified.push({
          id: `collect-${objective.id}`,
          category: 'collections',
          title: typeInfo.name,
          description: `${typeInfo.icon} ${typeInfo.description} (${objective.currentCount}/${objective.requiredCount} collected)`,
          progress: objective.isCompleted ? 100 : progress,
          isCompleted: objective.isCompleted,
          location: 'Station Interior'
        });
      }
    });

    return unified;
  }, [missions.activeMissions, crewManagement.activeCrew, ship.hull, ship.shield, equipment, collectionObjectives]);

  // Filter objectives by category
  const filteredObjectives = objectives.filter(obj => obj.category === activeCategory);

  // Count objectives by category
  const counts = {
    missions: objectives.filter(obj => obj.category === 'missions').length,
    repairs: objectives.filter(obj => obj.category === 'repairs').length,
    collections: objectives.filter(obj => obj.category === 'collections').length
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'text-red-400 border-red-400/50';
      case 'high': return 'text-orange-400 border-orange-400/50';
      case 'medium': return 'text-yellow-400 border-yellow-400/50';
      case 'low': return 'text-green-400 border-green-400/50';
      default: return 'text-gray-400 border-gray-400/50';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: ObjectiveCategory) => {
    switch (category) {
      case 'missions': return <Flag className="w-4 h-4" />;
      case 'repairs': return <Wrench className="w-4 h-4" />;
      case 'collections': return <Package className="w-4 h-4" />;
    }
  };

  const handleObjectiveClick = (objective: UnifiedObjective) => {
    triggerHaptic(10);
    setSelectedObjective(objective);
    setShowDetails(true);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 border-b border-cyan-400/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Mission Control</h2>
          </div>
          <button
            onClick={() => {
              triggerHaptic(10);
              onClose?.();
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              triggerHaptic(10);
              setActiveCategory('missions');
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
              activeCategory === 'missions'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span className="text-sm font-medium">Missions</span>
            {counts.missions > 0 && (
              <span className="bg-cyan-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                {counts.missions}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic(10);
              setActiveCategory('repairs');
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
              activeCategory === 'repairs'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span className="text-sm font-medium">Repairs</span>
            {counts.repairs > 0 && (
              <span className="bg-orange-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                {counts.repairs}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              triggerHaptic(10);
              setActiveCategory('collections');
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
              activeCategory === 'collections'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-sm font-medium">Items</span>
            {counts.collections > 0 && (
              <span className="bg-purple-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                {counts.collections}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Objectives List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filteredObjectives.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-2">
              {getCategoryIcon(activeCategory)}
            </div>
            <p className="text-gray-400 text-sm">
              {activeCategory === 'missions' && 'No active missions'}
              {activeCategory === 'repairs' && 'All systems operational'}
              {activeCategory === 'collections' && 'No collection objectives'}
            </p>
          </div>
        ) : (
          filteredObjectives.map(objective => (
            <motion.div
              key={objective.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-800/50 border rounded-lg p-4 cursor-pointer hover:bg-slate-800 transition-all ${
                getPriorityColor(objective.priority)
              }`}
              onClick={() => handleObjectiveClick(objective)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryIcon(objective.category)}
                    <h3 className="text-white font-medium">{objective.title}</h3>
                  </div>
                  <p className="text-sm text-gray-400">{objective.description}</p>
                </div>
                {objective.isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 ml-2" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-600 flex-shrink-0 ml-2" />
                )}
              </div>

              {/* Progress Bar */}
              {!objective.isCompleted && objective.progress > 0 && (
                <div className="mb-2">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                      style={{ width: `${objective.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{Math.round(objective.progress)}%</span>
                    {objective.timeRemaining && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {objective.timeRemaining}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {objective.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {objective.location}
                  </span>
                )}
                {objective.assignedCrew && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {objective.assignedCrew}
                  </span>
                )}
                {objective.reward && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <DollarSign className="w-3 h-3" />
                    {objective.reward}
                  </span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Objective Details Modal */}
      <AnimatePresence>
        {showDetails && selectedObjective && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-slate-900 border border-cyan-400/30 rounded-t-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(selectedObjective.category)}
                    <h3 className="text-xl font-bold text-white">{selectedObjective.title}</h3>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-gray-400 mb-4">{selectedObjective.description}</p>

                {/* Status */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-medium ${selectedObjective.isCompleted ? 'text-green-400' : 'text-cyan-400'}`}>
                      {selectedObjective.isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                  {!selectedObjective.isCompleted && selectedObjective.progress > 0 && (
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                        style={{ width: `${selectedObjective.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedObjective.location && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <MapPin className="w-4 h-4" />
                        Location
                      </div>
                      <div className="text-white">{selectedObjective.location}</div>
                    </div>
                  )}
                  {selectedObjective.assignedCrew && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Users className="w-4 h-4" />
                        Assigned Crew
                      </div>
                      <div className="text-white">{selectedObjective.assignedCrew}</div>
                    </div>
                  )}
                  {selectedObjective.timeRemaining && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Clock className="w-4 h-4" />
                        Time Remaining
                      </div>
                      <div className="text-white">{selectedObjective.timeRemaining}</div>
                    </div>
                  )}
                  {selectedObjective.reward && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Trophy className="w-4 h-4" />
                        Reward
                      </div>
                      <div className="text-yellow-400">{selectedObjective.reward}</div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowDetails(false)}
                  className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
