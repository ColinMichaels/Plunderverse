import { X, Shield, Heart, Fuel, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../../lib/stores/ship/useEquipment';
import { useCreditsData } from '../../../domain/economy/selectors';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { triggerHaptic } from '../../../utils/hapticFeedback';

interface ShipStatusPanelProps {
  onClose: () => void;
}

export function ShipStatusPanel({ onClose }: ShipStatusPanelProps) {
  const { config } = useMobileLayout();
  const { shield, hull, isThrusting, isWarpMode } = useShipStatus();
  const { getEquipment } = useEquipment();
  const { credits } = useCreditsData();

  const fuelTank = getEquipment("fuel-tank");
  const fuel = fuelTank
    ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100
    : 0;

  const getStatusColor = (value: number, thresholds: [number, number] = [30, 60]) => {
    if (value > thresholds[1]) return 'text-green-400';
    if (value > thresholds[0]) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBarColor = (value: number, thresholds: [number, number] = [30, 60]) => {
    if (value > thresholds[1]) return 'bg-green-400';
    if (value > thresholds[0]) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className={`relative w-full ${config.panel.bg} ${config.panel.border} rounded-t-2xl overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-600/50">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-semibold">Ship Status</span>
          </div>
          <button 
            onClick={() => { triggerHaptic(); onClose(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/50 active:scale-95"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-slate-400">SHIELDS</span>
              <span className={`ml-auto font-mono text-lg ${getStatusColor(shield, [25, 50])}`}>
                {Math.round(shield)}%
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${getBarColor(shield, [25, 50])}`}
                style={{ width: `${shield}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-slate-400">HULL INTEGRITY</span>
              <span className={`ml-auto font-mono text-lg ${getStatusColor(hull)}`}>
                {Math.round(hull)}%
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${getBarColor(hull)}`}
                style={{ width: `${hull}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="w-5 h-5 text-green-400" />
              <span className="text-sm text-slate-400">FUEL</span>
              <span className={`ml-auto font-mono text-lg ${getStatusColor(fuel, [15, 30])}`}>
                {Math.round(fuel)}%
              </span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${getBarColor(fuel, [15, 30])}`}
                style={{ width: `${fuel}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/50 text-center">
              <div className="text-xs text-slate-400 mb-1">THRUST</div>
              <div className={`font-mono ${isWarpMode ? 'text-cyan-400' : isThrusting ? 'text-orange-400' : 'text-slate-500'}`}>
                {isWarpMode ? 'WARP' : isThrusting ? 'ACTIVE' : 'IDLE'}
              </div>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/50 text-center">
              <div className="text-xs text-slate-400 mb-1">CREDITS</div>
              <div className="font-mono text-cyan-400">{credits.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
