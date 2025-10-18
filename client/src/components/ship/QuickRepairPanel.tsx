import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useCredits } from '../../lib/stores/economy/useCredits';
import { toast } from 'sonner';
import {
  Wrench,
  Shield,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  DollarSign,
  Timer,
  Gauge,
  Battery
} from 'lucide-react';

interface RepairOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  cost: number;
  time: number; // seconds
  description: string;
  action: () => void;
  available: boolean;
  healthGain?: number;
  currentHealth?: number;
  maxHealth?: number;
}

export const QuickRepairPanel: React.FC = () => {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairProgress, setRepairProgress] = useState(0);
  const { hull, shield, repairHull, rechargeShield } = useShipStatus();
  const equipment = useEquipment();
  const { credits, spendCredits } = useCredits();
  
  const repairOptions: RepairOption[] = [
    {
      id: 'hull-emergency',
      name: 'Emergency Hull Repair',
      icon: <Shield className="w-4 h-4" />,
      cost: 50,
      time: 2,
      description: 'Quick patch repair restores 25 hull points',
      healthGain: 25,
      currentHealth: hull,
      maxHealth: 100,
      available: hull < 100 && credits >= 50,
      action: () => {
        if (spendCredits(50)) {
          repairHull(25);
          toast.success('Emergency hull repair complete! +25 hull');
        }
      }
    },
    {
      id: 'shield-recharge',
      name: 'Shield Quick Recharge',
      icon: <Zap className="w-4 h-4" />,
      cost: 30,
      time: 1,
      description: 'Fast shield recharge restores 30 shield points',
      healthGain: 30,
      currentHealth: shield,
      maxHealth: 100,
      available: shield < 100 && credits >= 30,
      action: () => {
        if (spendCredits(30)) {
          rechargeShield(30);
          toast.success('Shield recharged! +30 shield');
        }
      }
    },
    {
      id: 'full-repair',
      name: 'Complete Repair',
      icon: <RefreshCw className="w-4 h-4" />,
      cost: 200,
      time: 5,
      description: 'Full system restoration to 100%',
      available: (hull < 100 || shield < 100) && credits >= 200,
      action: () => {
        if (spendCredits(200)) {
          repairHull(100 - hull);
          rechargeShield(100 - shield);
          
          // Repair all equipment - repair the main ones we know about
          const equipmentIds = ['drill-mk1', 'extractor-basic', 'scanner-mk1', 'hull-primary', 'engine-main', 'maintenance-kit'];
          equipmentIds.forEach(id => {
            equipment.repairEquipment(id);
          });
          
          toast.success('Complete repair finished! All systems at 100%');
        }
      }
    },
    {
      id: 'engine-boost',
      name: 'Engine Maintenance',
      icon: <Activity className="w-4 h-4" />,
      cost: 40,
      time: 2,
      description: 'Restore engine to peak performance',
      available: equipment.getEquipment('engine-main')?.currentDurability! < 
                 equipment.getEquipment('engine-main')?.maxDurability! && 
                 credits >= 40,
      action: () => {
        if (spendCredits(40)) {
          equipment.repairEquipment('engine-main');
          toast.success('Engine maintenance complete!');
        }
      }
    },
    {
      id: 'battery-replace',
      name: 'Battery Replacement',
      icon: <Battery className="w-4 h-4" />,
      cost: 20,
      time: 1,
      description: 'Replace depleted battery systems',
      available: equipment.getEquipment('battery')?.currentDurability! < 50 && credits >= 20,
      action: () => {
        if (spendCredits(20)) {
          equipment.repairEquipment('battery');
          toast.success('Battery replaced!');
        }
      }
    }
  ];
  
  const handleQuickRepair = async (option: RepairOption) => {
    if (!option.available) {
      if (credits < option.cost) {
        toast.error(`Insufficient credits! Need ${option.cost} credits`);
      } else {
        toast.info('This repair is not needed');
      }
      return;
    }
    
    setIsRepairing(true);
    setRepairProgress(0);
    
    // Simulate repair progress
    const interval = setInterval(() => {
      setRepairProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRepairing(false);
          option.action();
          return 0;
        }
        return prev + (100 / (option.time * 10)); // Update every 100ms
      });
    }, 100);
  };
  
  const getCriticalSystems = () => {
    const critical = [];
    if (hull < 30) critical.push('Hull critical!');
    if (shield < 20) critical.push('Shields failing!');
    
    const engine = equipment.getEquipment('engine-main');
    if (engine && engine.currentDurability < engine.maxDurability * 0.3) {
      critical.push('Engine damaged!');
    }
    
    return critical;
  };
  
  const criticalSystems = getCriticalSystems();
  
  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-lg border border-green-500/30 p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-green-500/20">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-green-400" />
          <h3 className="font-mono text-sm text-green-400">QUICK REPAIR</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <DollarSign className="w-3 h-3" />
          <span className="font-mono">{credits}</span>
        </div>
      </div>
      
      {/* Critical Warnings */}
      {criticalSystems.length > 0 && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
            <div className="space-y-1">
              {criticalSystems.map((warning, idx) => (
                <p key={idx} className="text-xs text-red-400">{warning}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Current Status */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2 bg-slate-800/30 rounded border border-slate-700/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Hull:</span>
            <span className={`font-mono ${
              hull > 70 ? 'text-green-400' :
              hull > 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {hull}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all ${
                hull > 70 ? 'bg-green-500' :
                hull > 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${hull}%` }}
            />
          </div>
        </div>
        
        <div className="p-2 bg-slate-800/30 rounded border border-slate-700/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Shield:</span>
            <span className={`font-mono ${
              shield > 70 ? 'text-cyan-400' :
              shield > 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {shield}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all ${
                shield > 70 ? 'bg-cyan-500' :
                shield > 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${shield}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Repair Progress */}
      {isRepairing && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-green-400">Repairing...</span>
            <span className="text-green-400 font-mono">{Math.round(repairProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${repairProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Repair Options */}
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/30">
        {repairOptions.map((option) => (
          <motion.button
            key={option.id}
            onClick={() => handleQuickRepair(option)}
            disabled={!option.available || isRepairing}
            className={`w-full p-3 rounded-lg border transition-all ${
              option.available && !isRepairing
                ? 'bg-slate-800/30 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 cursor-pointer'
                : 'bg-slate-800/20 border-slate-700/20 cursor-not-allowed opacity-50'
            }`}
            whileHover={option.available && !isRepairing ? { scale: 1.02 } : {}}
            whileTap={option.available && !isRepairing ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={option.available ? 'text-green-400' : 'text-gray-500'}>
                  {option.icon}
                </div>
                <div className="text-left">
                  <div className="text-xs font-mono text-gray-200">{option.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-xs font-mono ${
                  credits >= option.cost ? 'text-green-400' : 'text-red-400'
                }`}>
                  {option.cost}c
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Timer className="w-3 h-3" />
                  <span>{option.time}s</span>
                </div>
              </div>
            </div>
            
            {option.healthGain && option.currentHealth !== undefined && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-gray-500">Effect:</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">{option.currentHealth}%</span>
                  <span className="text-green-400">→</span>
                  <span className="text-green-400">
                    {Math.min((option.currentHealth || 0) + option.healthGain, option.maxHealth || 100)}%
                  </span>
                </div>
              </div>
            )}
          </motion.button>
        ))}
      </div>
      
      {/* Emergency Repair Hint */}
      <div className="mt-4 p-2 bg-slate-800/30 rounded border border-slate-700/30">
        <div className="flex items-start gap-2">
          <Gauge className="w-4 h-4 text-yellow-400 mt-0.5" />
          <div className="text-xs text-gray-400">
            <p>Quick repairs are instant but cost more than station repairs.</p>
            <p className="mt-1">Visit a station for cheaper maintenance.</p>
          </div>
        </div>
      </div>
      
      {/* Keyboard Shortcut */}
      <div className="mt-2 text-center text-xs text-gray-500">
        Press <span className="text-green-400 font-mono">R</span> to toggle repair panel
      </div>
    </div>
  );
};