import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { ActionBar } from './ActionBar';
import { ControlPanel } from './ControlPanel';
import { CleanViewToggle } from './CleanViewToggle';

export function MobileHUD() {
  const { isMobile } = useInput();
  const { config, isCleanViewMode } = useMobileLayout();
  const [showInstructions, setShowInstructions] = useState(true);

  // No need to bind handlers - CameraController handles InputBus binding
  // Mobile components access handlers directly through useInput store

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: config.zIndex.hud }}>
      {/* Top Left - Control Panel */}
      {!isCleanViewMode && (
        <div 
          className="absolute top-4 left-4 pointer-events-auto"
          data-ui
        >
          <ControlPanel />
        </div>
      )}

      {/* Top Right - Clean View Toggle */}
      <div 
        className="absolute top-4 right-4 pointer-events-auto"
        data-ui
      >
        <CleanViewToggle />
      </div>

      {/* Bottom Center - Action Bar */}
      {!isCleanViewMode && (
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto"
          data-ui
        >
          <ActionBar />
        </div>
      )}

      {/* Virtual Joystick removed - replaced by touch-hold propulsion */}

      {/* Instructions */}
      {!isCleanViewMode && showInstructions ? (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.radius} px-3 py-2 ${config.text.label} flex items-center gap-2`}>
            <span>Touch & hold anywhere to thrust • Double tap for quick thrust</span>
            <button
              onClick={() => setShowInstructions(false)}
              className="pointer-events-auto w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded transition-colors active:scale-95"
              title="Hide instructions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : !isCleanViewMode && (
        <button
          onClick={() => setShowInstructions(true)}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-auto w-10 h-10 flex items-center justify-center bg-slate-800/80 border border-slate-600 rounded-full hover:bg-slate-700/80 transition-colors active:scale-95"
          title="Show instructions"
        >
          <Info className="w-5 h-5 text-cyan-400" />
        </button>
      )}
    </div>
  );
}