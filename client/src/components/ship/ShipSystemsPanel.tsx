import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useCredits } from '../../lib/stores/economy/useCredits';
import { toast } from 'sonner';
import {
  Shield,
  Zap,
  Settings,
  Activity,
  Package,
  Navigation,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  DollarSign
} from 'lucide-react';

interface SystemData {
  id: string;
  name: string;
  icon: React.ReactNode;
  health: number;
  maxHealth: number;
  status: 'operational' | 'damaged' | 'critical' | 'offline';
  description: string;
  repairCost: number;
  equipment?: any;
}

export const ShipSystemsPanel: React.FC = () => {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const { hull, shield, repairHull, rechargeShield } = useShipStatus();
  const equipment = useEquipment();
  const { credits, spendCredits } = useCredits();
  
  const getSystemStatus = (health: number, max: number): 'operational' | 'damaged' | 'critical' | 'offline' => {
    const percentage = (health / max) * 100;
    if (percentage > 70) return 'operational';
    if (percentage > 30) return 'damaged';
    if (percentage > 0) return 'critical';
    return 'offline';
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-400';
      case 'damaged': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };
  
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500/20 border-green-500/30';
      case 'damaged': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'critical': return 'bg-red-500/20 border-red-500/30';
      case 'offline': return 'bg-gray-500/20 border-gray-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };
  
  const systems: SystemData[] = [
    {
      id: 'hull',
      name: 'Hull Integrity',
      icon: <Shield className="w-4 h-4" />,
      health: hull,
      maxHealth: 100,
      status: getSystemStatus(hull, 100),
      description: 'Structural integrity of the ship hull',
      repairCost: Math.ceil((100 - hull) * 2)
    },
    {
      id: 'shields',
      name: 'Shield Generator',
      icon: <Zap className="w-4 h-4" />,
      health: shield,
      maxHealth: 100,
      status: getSystemStatus(shield, 100),
      description: 'Energy shields protecting from damage',
      repairCost: Math.ceil((100 - shield) * 1.5)
    },
    {
      id: 'engine',
      name: 'Main Engine',
      icon: <Settings className="w-4 h-4" />,
      health: equipment.getEquipment('engine-main')?.currentDurability || 0,
      maxHealth: equipment.getEquipment('engine-main')?.maxDurability || 100,
      status: getSystemStatus(
        equipment.getEquipment('engine-main')?.currentDurability || 0,
        equipment.getEquipment('engine-main')?.maxDurability || 100
      ),
      description: 'Primary propulsion system',
      repairCost: Math.ceil(
        (equipment.getEquipment('engine-main')?.maxDurability || 100) - 
        (equipment.getEquipment('engine-main')?.currentDurability || 0)
      ),
      equipment: equipment.getEquipment('engine-main')
    },
    {
      id: 'weapons',
      name: 'Weapon Systems',
      icon: <Activity className="w-4 h-4" />,
      health: equipment.getEquipment('drill-mk1')?.currentDurability || 0,
      maxHealth: equipment.getEquipment('drill-mk1')?.maxDurability || 100,
      status: getSystemStatus(
        equipment.getEquipment('drill-mk1')?.currentDurability || 0,
        equipment.getEquipment('drill-mk1')?.maxDurability || 100
      ),
      description: 'Combat and mining laser systems',
      repairCost: Math.ceil(
        (equipment.getEquipment('drill-mk1')?.maxDurability || 100) - 
        (equipment.getEquipment('drill-mk1')?.currentDurability || 0)
      ),
      equipment: equipment.getEquipment('drill-mk1')
    },
    {
      id: 'scanner',
      name: 'Scanner Array',
      icon: <Navigation className="w-4 h-4" />,
      health: equipment.getEquipment('scanner-mk1')?.currentDurability || 0,
      maxHealth: equipment.getEquipment('scanner-mk1')?.maxDurability || 100,
      status: getSystemStatus(
        equipment.getEquipment('scanner-mk1')?.currentDurability || 0,
        equipment.getEquipment('scanner-mk1')?.maxDurability || 100
      ),
      description: 'Long-range detection and navigation',
      repairCost: Math.ceil(
        (equipment.getEquipment('scanner-mk1')?.maxDurability || 100) - 
        (equipment.getEquipment('scanner-mk1')?.currentDurability || 0)
      ),
      equipment: equipment.getEquipment('scanner-mk1')
    },
    {
      id: 'cargo',
      name: 'Cargo Bay',
      icon: <Package className="w-4 h-4" />,
      health: 100,
      maxHealth: 100,
      status: 'operational',
      description: 'Storage capacity for resources',
      repairCost: 0
    }
  ];
  
  const handleQuickRepair = (system: SystemData) => {
    if (credits < system.repairCost) {
      toast.error(`Insufficient credits! Need ${system.repairCost} credits`);
      return;
    }
    
    if (system.repairCost === 0) {
      toast.info(`${system.name} is already fully operational`);
      return;
    }
    
    // Perform repair based on system type
    if (system.id === 'hull') {
      repairHull(100 - hull);
      spendCredits(system.repairCost);
      toast.success(`Hull repaired for ${system.repairCost} credits`);
    } else if (system.id === 'shields') {
      rechargeShield(100 - shield);
      spendCredits(system.repairCost);
      toast.success(`Shields repaired for ${system.repairCost} credits`);
    } else if (system.equipment) {
      equipment.repairEquipment(system.equipment.id);
      spendCredits(system.repairCost);
      toast.success(`${system.name} repaired for ${system.repairCost} credits`);
    }
  };
  
  const handleRepairAll = () => {
    const totalCost = systems.reduce((sum, sys) => sum + sys.repairCost, 0);
    
    if (totalCost === 0) {
      toast.info('All systems are already operational');
      return;
    }
    
    if (credits < totalCost) {
      toast.error(`Insufficient credits! Need ${totalCost} credits`);
      return;
    }
    
    // Repair all systems
    systems.forEach(sys => {
      if (sys.repairCost > 0) {
        handleQuickRepair(sys);
      }
    });
  };
  
  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-lg border border-cyan-500/30 p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-mono text-sm text-cyan-400">SHIP SYSTEMS</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <DollarSign className="w-3 h-3" />
          <span className="font-mono">{credits}</span>
        </div>
      </div>
      
      {/* Systems Overview */}
      <div className="space-y-2 mb-4">
        {systems.map((system) => (
          <motion.div
            key={system.id}
            onClick={() => setSelectedSystem(selectedSystem === system.id ? null : system.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedSystem === system.id
                ? getStatusBgColor(system.status)
                : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={getStatusColor(system.status)}>
                  {system.icon}
                </div>
                <div>
                  <div className="text-xs font-mono text-gray-200">{system.name}</div>
                  <div className={`text-xs ${getStatusColor(system.status)}`}>
                    {system.status.toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xs font-mono text-gray-400">
                  {system.health}/{system.maxHealth}
                </div>
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full transition-all ${
                      system.status === 'operational' ? 'bg-green-500' :
                      system.status === 'damaged' ? 'bg-yellow-500' :
                      system.status === 'critical' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${(system.health / system.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Expanded Details */}
            {selectedSystem === system.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 pt-3 border-t border-slate-700/50 space-y-2"
              >
                <p className="text-xs text-gray-400">{system.description}</p>
                
                {system.repairCost > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Wrench className="w-3 h-3" />
                      <span>Repair Cost:</span>
                    </div>
                    <span className={`text-xs font-mono ${
                      credits >= system.repairCost ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {system.repairCost} credits
                    </span>
                  </div>
                )}
                
                {system.repairCost > 0 && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickRepair(system);
                    }}
                    className={`w-full px-3 py-1.5 rounded text-xs font-mono transition-all ${
                      credits >= system.repairCost
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30'
                        : 'bg-slate-700/30 border border-slate-600/30 text-gray-500 cursor-not-allowed'
                    }`}
                    whileHover={credits >= system.repairCost ? { scale: 1.05 } : {}}
                    whileTap={credits >= system.repairCost ? { scale: 0.95 } : {}}
                  >
                    QUICK REPAIR
                  </motion.button>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Repair All Button */}
      <motion.button
        onClick={handleRepairAll}
        className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-mono text-sm hover:from-cyan-600 hover:to-blue-600 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" />
          REPAIR ALL SYSTEMS
        </div>
      </motion.button>
      
      {/* Warning Indicators */}
      {systems.some(s => s.status === 'critical' || s.status === 'offline') && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-red-400">
              Critical systems need immediate attention!
            </p>
          </div>
        </div>
      )}
      
      {/* Keyboard Shortcut */}
      <div className="mt-2 text-center text-xs text-gray-500">
        Press <span className="text-cyan-400 font-mono">S</span> to toggle systems panel
      </div>
    </div>
  );
};