import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { MobileButton } from './MobileButton';

export function ControlPanel() {
  const { isGyroEnabled, setGyroEnabled, isMobile } = useInput();
  const { config } = useMobileLayout();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isMobile) return null;

  return (
    <div 
      className="flex flex-col h-32 justify-start" 
      style={{ zIndex: config.zIndex.hud }}
      data-ui
    >
      {isMinimized ? (
        /* Minimized view - compact toggle button */
        <button
          onClick={() => setIsMinimized(false)}
          className="w-12 h-12 flex items-center justify-center bg-slate-800/80 border border-slate-600 rounded-r-lg hover:bg-slate-700/80 transition-colors active:scale-95"
          aria-label="Show control panel"
        >
          <ChevronRight className="w-5 h-5 text-cyan-400" />
        </button>
      ) : (
        /* Expanded view */
        <div className="flex items-start space-x-1">
          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="w-11 h-16 flex items-center justify-center bg-slate-800/60 border-r border-y border-slate-600 rounded-l-lg hover:bg-slate-700/60 transition-colors mr-[-1px]"
            aria-label="Hide control panel"
          >
            <ChevronDown className="w-5 h-5 text-slate-400 rotate-90" />
          </button>
          
          {/* Control buttons */}
          <div className="flex flex-col space-y-2">
            <MobileButton
              variant={isGyroEnabled ? 'primary' : 'secondary'}
              size="small"
              icon="🌐"
              label="Gyro"
              onClick={() => setGyroEnabled(!isGyroEnabled)}
              className="w-16"
            />
            
            <MobileButton
              variant={!isGyroEnabled ? 'primary' : 'secondary'}
              size="small"
              icon="👆"
              label="Touch"
              onClick={() => setGyroEnabled(false)}
              className="w-16"
            />
          </div>
        </div>
      )}
    </div>
  );
}