import { X, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAudio } from '../../../lib/stores/ui/useAudio';
import { useGame } from '../../../lib/stores/ui/useGame';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { triggerHaptic } from '../../../utils/hapticFeedback';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { config } = useMobileLayout();
  const audio = useAudio();
  const { showSplash } = useGame();

  const handleMenuClick = () => {
    triggerHaptic();
    showSplash();
    onClose();
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
          <span className="text-white font-semibold">Settings</span>
          <button 
            onClick={() => { triggerHaptic(); onClose(); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/50 active:scale-95"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <button
            onClick={() => { triggerHaptic(); audio.toggleMasterMute(); }}
            className="w-full p-4 bg-slate-800/50 rounded-lg border border-slate-600/50 flex items-center justify-between active:bg-slate-700/50"
          >
            <div className="flex items-center gap-3">
              {audio.masterMute ? (
                <VolumeX className="w-5 h-5 text-slate-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-cyan-400" />
              )}
              <span className="text-white">Sound</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs ${
              audio.masterMute 
                ? 'bg-slate-600 text-slate-400' 
                : 'bg-cyan-600 text-white'
            }`}>
              {audio.masterMute ? 'OFF' : 'ON'}
            </div>
          </button>

          <button
            onClick={handleMenuClick}
            className="w-full p-4 bg-slate-800/50 rounded-lg border border-slate-600/50 flex items-center gap-3 active:bg-slate-700/50"
          >
            <span className="text-xl">☰</span>
            <span className="text-white">Main Menu</span>
          </button>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <span className="text-white">Controls</span>
            </div>
            <div className="space-y-2 text-sm text-slate-400">
              <div>Touch & hold screen - Thrust forward</div>
              <div>Double tap - Quick thrust burst</div>
              <div>Gyro/Touch - Steering mode</div>
              <div>FIRE button - Shoot lasers</div>
              <div>LAND button - Land on planet</div>
              <div>TRAVEL button - Fast travel menu</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
