import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../../lib/stores/ship/useEquipment';
import { useCredits } from '../../../lib/stores/economy/useCredits';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { toast } from 'sonner';
import { 
  Shield, 
  Zap, 
  Cpu, 
  Package, 
  Navigation, 
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ChevronRight,
  Settings,
  Activity,
  Gauge,
  Sparkles,
  WrenchIcon
} from 'lucide-react';

interface SystemInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  currentHealth: number;
  maxHealth: number;
  status: 'operational' | 'damaged' | 'critical' | 'destroyed';
  repairCost: number;
  repairTime: number; // in seconds
  description: string;
  color: string;
  gradientColors: string;
}

interface RepairJob {
  systemId: string;
  progress: number;
  timeRemaining: number;
}

export const ShipRepairPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [repairAllCost, setRepairAllCost] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'schematic'>('list');
  
  const ship = useShipStatus();
  const equipment = useEquipment();
  const { credits, spendCredits } = useCredits();
  const player = usePlayer();
  const { config } = useMobileLayout();

  // Get equipment health data
  const hullEquipment = equipment.getEquipment('hull-primary');
  const engineEquipment = equipment.getEquipment('engine-main');
  const scannerEquipment = equipment.getEquipment('scanner-mk1');
  const drillEquipment = equipment.getEquipment('drill-mk1');
  const maintenanceKit = equipment.getEquipment('maintenance-kit');

  // Define ship systems with real data
  const systems: SystemInfo[] = [
    {
      id: 'hull',
      name: 'Hull Integrity',
      icon: <Shield className="w-5 h-5" />,
      currentHealth: ship.hull,
      maxHealth: 100,
      status: ship.hull > 70 ? 'operational' : ship.hull > 30 ? 'damaged' : ship.hull > 0 ? 'critical' : 'destroyed',
      repairCost: Math.ceil((100 - ship.hull) * 5),
      repairTime: Math.ceil((100 - ship.hull) / 10),
      description: 'Main structural integrity of your ship',
      color: ship.hull > 70 ? 'text-green-400' : ship.hull > 30 ? 'text-yellow-400' : 'text-red-400',
      gradientColors: ship.hull > 70 ? 'from-green-500 to-green-600' : 
                      ship.hull > 30 ? 'from-yellow-500 to-orange-600' : 
                      'from-red-500 to-red-600'
    },
    {
      id: 'shields',
      name: 'Shield Generator',
      icon: <Zap className="w-5 h-5" />,
      currentHealth: ship.shield,
      maxHealth: 100,
      status: ship.shield > 70 ? 'operational' : ship.shield > 30 ? 'damaged' : ship.shield > 0 ? 'critical' : 'destroyed',
      repairCost: Math.ceil((100 - ship.shield) * 3),
      repairTime: Math.ceil((100 - ship.shield) / 20),
      description: 'Energy shields protecting your ship',
      color: ship.shield > 70 ? 'text-cyan-400' : ship.shield > 30 ? 'text-yellow-400' : 'text-red-400',
      gradientColors: ship.shield > 70 ? 'from-cyan-500 to-blue-600' : 
                      ship.shield > 30 ? 'from-yellow-500 to-orange-600' : 
                      'from-red-500 to-red-600'
    },
    {
      id: 'engine',
      name: 'Main Engine',
      icon: <Settings className="w-5 h-5" />,
      currentHealth: engineEquipment ? (engineEquipment.currentDurability / engineEquipment.maxDurability) * 100 : 100,
      maxHealth: 100,
      status: engineEquipment && engineEquipment.performanceLevel > 0.8 ? 'operational' :
              engineEquipment && engineEquipment.performanceLevel > 0.5 ? 'damaged' :
              engineEquipment && engineEquipment.performanceLevel > 0 ? 'critical' : 'destroyed',
      repairCost: engineEquipment ? Math.ceil((engineEquipment.maxDurability - engineEquipment.currentDurability) * 0.5) : 0,
      repairTime: 5,
      description: 'Propulsion system for space travel',
      color: engineEquipment && engineEquipment.performanceLevel > 0.8 ? 'text-purple-400' :
             engineEquipment && engineEquipment.performanceLevel > 0.5 ? 'text-yellow-400' : 'text-red-400',
      gradientColors: engineEquipment && engineEquipment.performanceLevel > 0.8 ? 'from-purple-500 to-pink-600' :
                      engineEquipment && engineEquipment.performanceLevel > 0.5 ? 'from-yellow-500 to-orange-600' :
                      'from-red-500 to-red-600'
    },
    {
      id: 'weapons',
      name: 'Weapon Systems',
      icon: <Activity className="w-5 h-5" />,
      currentHealth: drillEquipment ? (drillEquipment.currentDurability / drillEquipment.maxDurability) * 100 : 100,
      maxHealth: 100,
      status: drillEquipment && drillEquipment.performanceLevel > 0.8 ? 'operational' :
              drillEquipment && drillEquipment.performanceLevel > 0.5 ? 'damaged' :
              drillEquipment && drillEquipment.performanceLevel > 0 ? 'critical' : 'destroyed',
      repairCost: drillEquipment ? Math.ceil((drillEquipment.maxDurability - drillEquipment.currentDurability) * 0.4) : 0,
      repairTime: 4,
      description: 'Mining lasers and defensive weapons',
      color: drillEquipment && drillEquipment.performanceLevel > 0.8 ? 'text-orange-400' :
             drillEquipment && drillEquipment.performanceLevel > 0.5 ? 'text-yellow-400' : 'text-red-400',
      gradientColors: drillEquipment && drillEquipment.performanceLevel > 0.8 ? 'from-orange-500 to-red-600' :
                      drillEquipment && drillEquipment.performanceLevel > 0.5 ? 'from-yellow-500 to-orange-600' :
                      'from-red-500 to-red-600'
    },
    {
      id: 'cargo',
      name: 'Cargo Bay',
      icon: <Package className="w-5 h-5" />,
      currentHealth: 100,
      maxHealth: 100,
      status: 'operational',
      repairCost: 0,
      repairTime: 0,
      description: 'Storage compartment for resources',
      color: 'text-gray-400',
      gradientColors: 'from-gray-500 to-gray-600'
    },
    {
      id: 'navigation',
      name: 'Navigation Systems',
      icon: <Navigation className="w-5 h-5" />,
      currentHealth: scannerEquipment ? (scannerEquipment.currentDurability / scannerEquipment.maxDurability) * 100 : 100,
      maxHealth: 100,
      status: scannerEquipment && scannerEquipment.performanceLevel > 0.8 ? 'operational' :
              scannerEquipment && scannerEquipment.performanceLevel > 0.5 ? 'damaged' :
              scannerEquipment && scannerEquipment.performanceLevel > 0 ? 'critical' : 'destroyed',
      repairCost: scannerEquipment ? Math.ceil((scannerEquipment.maxDurability - scannerEquipment.currentDurability) * 0.3) : 0,
      repairTime: 3,
      description: 'Scanning and navigation computer',
      color: scannerEquipment && scannerEquipment.performanceLevel > 0.8 ? 'text-blue-400' :
             scannerEquipment && scannerEquipment.performanceLevel > 0.5 ? 'text-yellow-400' : 'text-red-400',
      gradientColors: scannerEquipment && scannerEquipment.performanceLevel > 0.8 ? 'from-blue-500 to-indigo-600' :
                      scannerEquipment && scannerEquipment.performanceLevel > 0.5 ? 'from-yellow-500 to-orange-600' :
                      'from-red-500 to-red-600'
    }
  ];

  // Calculate total repair cost - include all equipment durabilities
  useEffect(() => {
    const totalCost = systems.reduce((sum, system) => sum + system.repairCost, 0);
    
    // Ensure repair cost is never zero when damage exists
    const hasDamage = systems.some(system => system.currentHealth < system.maxHealth);
    const finalCost = hasDamage && totalCost === 0 ? 10 : totalCost; // Minimum 10 credits if damaged
    
    setRepairAllCost(finalCost);
  }, [
    ship.hull, 
    ship.shield,
    // Include all equipment durabilities to recalculate when they change
    engineEquipment?.currentDurability,
    engineEquipment?.maxDurability,
    engineEquipment?.performanceLevel,
    scannerEquipment?.currentDurability,
    scannerEquipment?.maxDurability,
    scannerEquipment?.performanceLevel,
    drillEquipment?.currentDurability,
    drillEquipment?.maxDurability,
    drillEquipment?.performanceLevel,
    hullEquipment?.currentDurability,
    hullEquipment?.maxDurability,
    maintenanceKit?.currentDurability,
    maintenanceKit?.maxDurability,
    // Also trigger recalculation when systems array changes
    systems
  ]);

  // Handle repair jobs timer
  useEffect(() => {
    if (repairJobs.length === 0) return;

    const timer = setInterval(() => {
      setRepairJobs(prev => {
        const updated = prev.map(job => ({
          ...job,
          progress: Math.min(100, job.progress + 10),
          timeRemaining: Math.max(0, job.timeRemaining - 0.1)
        })).filter(job => job.progress < 100);

        if (updated.length === 0) {
          setIsRepairing(false);
        }

        return updated;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [repairJobs.length]);

  // Haptic feedback
  const triggerHaptic = (duration = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  // Repair single system
  const handleRepairSystem = (systemId: string) => {
    const system = systems.find(s => s.id === systemId);
    if (!system) return;

    if (credits < system.repairCost) {
      toast.error('Insufficient credits', {
        description: `Need ${system.repairCost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }

    if (system.currentHealth >= system.maxHealth) {
      toast.info('System already at full health');
      return;
    }

    // Start repair animation
    setIsRepairing(true);
    setRepairJobs(prev => [...prev, {
      systemId,
      progress: 0,
      timeRemaining: system.repairTime
    }]);

    // Deduct credits and apply repair
    if (spendCredits(system.repairCost)) {
      setTimeout(() => {
        // Apply repair based on system type
        if (systemId === 'hull') {
          ship.repairHull(100 - ship.hull);
        } else if (systemId === 'shields') {
          ship.rechargeShield(100 - ship.shield);
        } else if (systemId === 'engine' && engineEquipment) {
          equipment.repairEquipment('engine-main');
        } else if (systemId === 'weapons' && drillEquipment) {
          equipment.repairEquipment('drill-mk1');
        } else if (systemId === 'navigation' && scannerEquipment) {
          equipment.repairEquipment('scanner-mk1');
        }

        toast.success(`${system.name} repaired`, {
          description: `System restored to full functionality`
        });
        triggerHaptic();
      }, system.repairTime * 1000);
    }
  };

  // Repair all systems
  const handleRepairAll = () => {
    // Double-check repair cost matches actual damage
    const actualCost = systems.reduce((sum, system) => sum + system.repairCost, 0);
    const hasDamage = systems.some(system => system.currentHealth < system.maxHealth);
    const validatedCost = hasDamage && actualCost === 0 ? 10 : actualCost;
    
    if (!hasDamage) {
      toast.info('All systems are already at full health');
      return;
    }
    
    if (credits < validatedCost) {
      toast.error('Insufficient credits', {
        description: `Need ${validatedCost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }

    // Update repair cost to validated amount
    setRepairAllCost(validatedCost);
    setShowConfirmDialog(true);
  };

  const confirmRepairAll = () => {
    setShowConfirmDialog(false);
    setIsRepairing(true);

    // Start all repair jobs
    const damagedSystems = systems.filter(s => s.currentHealth < s.maxHealth);
    const jobs = damagedSystems.map(system => ({
      systemId: system.id,
      progress: 0,
      timeRemaining: system.repairTime
    }));
    setRepairJobs(jobs);

    // Deduct credits and apply repairs
    if (spendCredits(repairAllCost)) {
      // Apply all repairs after animation
      const maxTime = Math.max(...damagedSystems.map(s => s.repairTime));
      setTimeout(() => {
        ship.repairHull(100 - ship.hull);
        ship.rechargeShield(100 - ship.shield);
        
        if (engineEquipment) equipment.repairEquipment('engine-main');
        if (drillEquipment) equipment.repairEquipment('drill-mk1');
        if (scannerEquipment) equipment.repairEquipment('scanner-mk1');

        toast.success('All systems repaired', {
          description: 'Ship restored to full operational status'
        });
        triggerHaptic();
      }, maxTime * 1000);
    }
  };

  // System card component
  const SystemCard = ({ system }: { system: SystemInfo }) => {
    const isRepairing = repairJobs.some(job => job.systemId === system.id);
    const repairJob = repairJobs.find(job => job.systemId === system.id);
    const isSelected = selectedSystem === system.id;

    return (
      <motion.div
        layout
        className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4
                   ${isSelected ? 'ring-2 ring-orange-500' : ''} 
                   ${!isRepairing ? 'cursor-pointer active:scale-98' : ''}
                   transition-all`}
        onClick={() => !isRepairing && setSelectedSystem(isSelected ? null : system.id)}
      >
        {/* System Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${system.gradientColors}`}>
              {system.icon}
            </div>
            <div>
              <h3 className="font-semibold text-white">{system.name}</h3>
              <p className={`text-xs uppercase tracking-wider ${system.color}`}>
                {system.status}
              </p>
            </div>
          </div>
          {!isRepairing && (
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
          )}
        </div>

        {/* Health Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Health</span>
            <span className={system.color}>
              {Math.round(system.currentHealth)}%
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            {isRepairing ? (
              <motion.div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600"
                initial={{ width: `${system.currentHealth}%` }}
                animate={{ width: `${system.currentHealth + (repairJob?.progress || 0) * (100 - system.currentHealth) / 100}%` }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <div 
                className={`h-full bg-gradient-to-r ${system.gradientColors}`}
                style={{ width: `${system.currentHealth}%` }}
              />
            )}
          </div>
        </div>

        {/* Repair Progress */}
        {isRepairing && repairJob && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-3 bg-green-900/30 border border-green-600/30 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-400 animate-pulse" />
                <span className="text-sm text-green-400">Repairing...</span>
              </div>
              <span className="text-xs text-gray-400">
                {repairJob.timeRemaining.toFixed(1)}s
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-green-400 to-green-600"
                initial={{ width: 0 }}
                animate={{ width: `${repairJob.progress}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Expanded Details */}
        <AnimatePresence>
          {isSelected && !isRepairing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-700 space-y-3"
            >
              <p className="text-sm text-gray-400">{system.description}</p>
              
              {system.currentHealth < 100 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Repair Cost</span>
                    <span className="text-cyan-400 font-mono">{system.repairCost}c</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Repair Time</span>
                    <span className="text-gray-400">{system.repairTime}s</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic();
                      handleRepairSystem(system.id);
                    }}
                    disabled={isRepairing || credits < system.repairCost}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg
                             font-semibold active:scale-95 transition-transform
                             disabled:opacity-50 disabled:active:scale-100"
                  >
                    Repair System ({system.repairCost}c)
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Ship schematic view
  const SchematicView = () => (
    <div className="relative w-full h-96 bg-slate-900/50 rounded-xl border border-slate-700">
      {/* Ship outline (simplified 2D view) */}
      <svg viewBox="0 0 300 400" className="w-full h-full">
        {/* Ship body */}
        <path
          d="M 150 50 L 200 150 L 200 300 L 150 380 L 100 300 L 100 150 Z"
          fill="none"
          stroke="#475569"
          strokeWidth="2"
        />
        
        {/* Hull indicator */}
        <rect
          x="120" y="150" width="60" height="100"
          fill={ship.hull > 70 ? '#10b981' : ship.hull > 30 ? '#f59e0b' : '#ef4444'}
          opacity={ship.hull / 100 * 0.5}
          onClick={() => setSelectedSystem('hull')}
          className="cursor-pointer"
        />
        <text x="150" y="200" textAnchor="middle" fill="white" fontSize="12">
          Hull {Math.round(ship.hull)}%
        </text>

        {/* Shield bubble */}
        <ellipse
          cx="150" cy="215" rx="80" ry="140"
          fill="none"
          stroke={ship.shield > 70 ? '#06b6d4' : ship.shield > 30 ? '#f59e0b' : '#ef4444'}
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity={ship.shield / 100}
        />
        <text x="150" y="80" textAnchor="middle" fill="#06b6d4" fontSize="10">
          Shield {Math.round(ship.shield)}%
        </text>

        {/* Engine */}
        <circle
          cx="150" cy="320" r="25"
          fill={engineEquipment && engineEquipment.performanceLevel > 0.8 ? '#a855f7' : 
                engineEquipment && engineEquipment.performanceLevel > 0.5 ? '#f59e0b' : '#ef4444'}
          opacity="0.6"
          onClick={() => setSelectedSystem('engine')}
          className="cursor-pointer"
        />
        <text x="150" y="325" textAnchor="middle" fill="white" fontSize="10">
          Engine
        </text>

        {/* Weapons */}
        <rect
          x="90" y="180" width="20" height="40"
          fill={drillEquipment && drillEquipment.performanceLevel > 0.8 ? '#fb923c' :
                drillEquipment && drillEquipment.performanceLevel > 0.5 ? '#f59e0b' : '#ef4444'}
          opacity="0.6"
          onClick={() => setSelectedSystem('weapons')}
          className="cursor-pointer"
        />
        <rect
          x="190" y="180" width="20" height="40"
          fill={drillEquipment && drillEquipment.performanceLevel > 0.8 ? '#fb923c' :
                drillEquipment && drillEquipment.performanceLevel > 0.5 ? '#f59e0b' : '#ef4444'}
          opacity="0.6"
          onClick={() => setSelectedSystem('weapons')}
          className="cursor-pointer"
        />

        {/* Navigation */}
        <circle
          cx="150" cy="100" r="20"
          fill={scannerEquipment && scannerEquipment.performanceLevel > 0.8 ? '#3b82f6' :
                scannerEquipment && scannerEquipment.performanceLevel > 0.5 ? '#f59e0b' : '#ef4444'}
          opacity="0.6"
          onClick={() => setSelectedSystem('navigation')}
          className="cursor-pointer"
        />
        <text x="150" y="105" textAnchor="middle" fill="white" fontSize="10">
          Nav
        </text>
      </svg>

      {/* Damage indicators */}
      {ship.hull < 70 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-900/50 px-3 py-1 rounded-full">
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-xs text-red-400">Hull Damage</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 border-b-2 border-orange-600/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-400" />
            Ship Repair Bay
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-mono">{credits}c</span>
            </div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400">Lv.{player.level}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors
                        ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-gray-300'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('schematic')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors
                        ${viewMode === 'schematic' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-gray-300'}`}
            >
              Schematic
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {/* System Cards */}
            <div className="space-y-3">
              {systems.map(system => (
                <SystemCard key={system.id} system={system} />
              ))}
            </div>

            {/* Maintenance Schedule */}
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Maintenance Schedule</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Next scheduled maintenance</span>
                  <span className="text-yellow-400 text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {player.totalJumps % 10} / 10 jumps
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Efficiency degradation</span>
                  <span className="text-orange-400 text-sm">
                    -{Math.round((100 - (engineEquipment?.performanceLevel || 1) * 100))}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Estimated cost</span>
                  <span className="text-cyan-400 text-sm font-mono">
                    ~{Math.round(repairAllCost * 0.3)}c
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <SchematicView />
            {selectedSystem && (
              <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
                <SystemCard system={systems.find(s => s.id === selectedSystem)!} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      <footer className="bg-slate-900 border-t-2 border-slate-700 p-4">
        <div className="flex gap-3">
          <button
            onClick={() => {
              triggerHaptic();
              handleRepairAll();
            }}
            disabled={isRepairing || repairAllCost === 0 || credits < repairAllCost}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg
                     font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:active:scale-100"
          >
            <WrenchIcon className="w-5 h-5" />
            <span>Repair All ({repairAllCost}c)</span>
          </button>
        </div>
      </footer>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-6 max-w-sm w-full`}
            >
              <h3 className="text-lg font-bold text-white mb-3">Confirm Repair All</h3>
              <p className="text-gray-400 mb-6">
                Repair all damaged systems for {repairAllCost} credits?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 bg-slate-700 text-white py-2 rounded-lg font-semibold active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRepairAll}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg
                           font-semibold active:scale-95"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};