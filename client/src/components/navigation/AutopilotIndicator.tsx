import React, { useEffect, useState } from 'react';
import { useAutopilot } from '@/lib/stores/navigation/useAutopilot';
import { Lock, Navigation } from 'lucide-react';

export function AutopilotIndicator() {
  const { isActive, isOrbiting, target } = useAutopilot();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Show indicator when autopilot is active
    if (isActive) {
      setVisible(true);
    } else {
      // Delay hiding to show a smooth transition
      const timeout = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [isActive]);
  
  if (!visible && !isActive) return null;
  
  return (
    <div 
      className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
        isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-slate-900/95 backdrop-blur-md border-2 border-cyan-400/50 rounded-lg px-6 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Animated Icon */}
          <div className="relative">
            <Navigation 
              className={`w-6 h-6 text-cyan-400 ${isOrbiting ? 'animate-spin' : 'animate-pulse'}`}
            />
            {isActive && !isOrbiting && (
              <div className="absolute inset-0 animate-ping">
                <Navigation className="w-6 h-6 text-cyan-400 opacity-50" />
              </div>
            )}
          </div>
          
          {/* Status Text */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">
                Autopilot Engaged
              </span>
              <Lock className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-xs text-slate-400">
              {isOrbiting 
                ? 'Maintaining Orbit' 
                : 'Approaching Target'}
            </span>
          </div>
          
          {/* Controls Disabled Indicator */}
          <div className="ml-4 pl-4 border-l border-slate-700">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-orange-400' : 'bg-green-400'} animate-pulse`} />
              <span className="text-xs text-slate-400">
                Controls {isActive ? 'Disabled' : 'Enabled'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isActive && !isOrbiting && (
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full animate-pulse"
              style={{
                width: '100%',
                animation: 'autopilot-progress 3s ease-in-out infinite'
              }}
            />
          </div>
        )}
      </div>
      
      {/* Additional styling for the progress animation */}
      <style jsx>{`
        @keyframes autopilot-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}