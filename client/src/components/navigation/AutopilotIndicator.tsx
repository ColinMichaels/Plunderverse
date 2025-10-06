import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutopilot } from '@/lib/stores/navigation/useAutopilot';
import { Lock, Navigation, Satellite, Circle, Activity, Radio, Target } from 'lucide-react';

export function AutopilotIndicator() {
  const { isActive, isOrbiting, target } = useAutopilot();
  const [visible, setVisible] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1);
  
  useEffect(() => {
    // Show indicator when autopilot is active
    if (isActive) {
      setVisible(true);
      // Vary pulse intensity for more dynamic effect
      const interval = setInterval(() => {
        setPulseIntensity(Math.random() * 0.5 + 0.5);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      // Delay hiding to show a smooth transition
      const timeout = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [isActive]);
  
  if (!visible && !isActive) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50`}
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ 
          opacity: isActive ? 1 : 0, 
          y: isActive ? 0 : -20,
          scale: isActive ? 1 : 0.9
        }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Main glassmorphism container */}
        <div className="relative">
          {/* Glow effect behind the panel */}
          {isActive && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-orange-500/30 to-cyan-500/30 blur-2xl animate-pulse"
              style={{ animationDuration: `${2 / pulseIntensity}s` }}
            />
          )}
          
          <div className="relative bg-gradient-to-br from-slate-900/80 via-blue-950/60 to-orange-950/40 backdrop-blur-xl rounded-2xl border border-orange-500/30 shadow-2xl overflow-hidden">
            {/* Animated scan line effect */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div className="h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-line" />
            </div>
            
            {/* Holographic grid pattern overlay */}
            <div className="absolute inset-0 opacity-5">
              <div 
                className="w-full h-full"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 10px,
                    rgba(0,255,255,0.1) 10px,
                    rgba(0,255,255,0.1) 11px
                  ), repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 10px,
                    rgba(255,165,0,0.1) 10px,
                    rgba(255,165,0,0.1) 11px
                  )`
                }}
              />
            </div>
            
            <div className="relative px-6 py-4">
              <div className="flex items-center gap-4">
                {/* Animated Navigation Icon with orbital effect */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Circle className="w-12 h-12 text-orange-400/20 animate-spin-slow" />
                  </div>
                  <div className="relative flex items-center justify-center w-12 h-12">
                    <Navigation 
                      className={`w-8 h-8 ${
                        isOrbiting 
                          ? 'text-green-400 animate-spin' 
                          : 'text-cyan-400 animate-pulse'
                      }`}
                      style={!isOrbiting ? { animationDuration: '1.5s' } : {}}
                    />
                    {isActive && !isOrbiting && (
                      <motion.div 
                        className="absolute inset-0"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Navigation className="w-8 h-8 text-cyan-400/30" />
                      </motion.div>
                    )}
                  </div>
                </div>
                
                {/* Status Information */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-bold text-orange-400 font-mono tracking-wider uppercase">
                      Autopilot System
                    </h3>
                    <Lock className="w-4 h-4 text-orange-400/60" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${
                      isOrbiting 
                        ? 'bg-green-500/20 border border-green-500/40'
                        : 'bg-cyan-500/20 border border-cyan-500/40'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isOrbiting ? 'bg-green-400' : 'bg-cyan-400'
                      } animate-pulse`} />
                      <span className={`text-xs font-mono ${
                        isOrbiting ? 'text-green-400' : 'text-cyan-400'
                      }`}>
                        {isOrbiting ? 'ORBITAL LOCK' : 'APPROACHING'}
                      </span>
                    </div>
                    
                    {target && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800/50 rounded-md border border-slate-700/50">
                        <Target className="w-3 h-3 text-orange-400" />
                        <span className="text-xs font-mono text-gray-400">LOCKED</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* System Status Indicators */}
                <div className="flex flex-col gap-1.5 px-4 py-2 bg-slate-800/30 rounded-lg border-l-2 border-orange-500/40">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-3 h-3 ${isActive ? 'text-green-400' : 'text-gray-500'}`} />
                    <span className="text-xs font-mono text-gray-400">NAV</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className={`w-3 h-3 ${isActive ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} />
                    <span className="text-xs font-mono text-gray-400">AUTO</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Satellite className={`w-3 h-3 ${isOrbiting ? 'text-green-400' : 'text-yellow-400'}`} />
                    <span className="text-xs font-mono text-gray-400">CTRL</span>
                  </div>
                </div>
              </div>
              
              {/* Progress indicator bar */}
              {isActive && !isOrbiting && (
                <motion.div 
                  className="mt-3 h-1 bg-slate-800/50 rounded-full overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div 
                    className="h-full relative overflow-hidden bg-gradient-to-r from-cyan-400 via-cyan-300 to-orange-400"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{ width: '50%' }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  </motion.div>
                </motion.div>
              )}
              
              {/* Manual control disabled warning */}
              <motion.div 
                className="mt-3 flex items-center justify-center gap-2 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className={`w-2 h-2 rounded-full ${
                  isActive ? 'bg-red-400 animate-pulse' : 'bg-green-400'
                }`} />
                <span className="font-mono text-gray-400">
                  MANUAL CONTROL {isActive ? 'DISABLED' : 'READY'}
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}