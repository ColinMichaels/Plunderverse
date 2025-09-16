import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { ActionBar } from './ActionBar';
import { VirtualJoystick } from './VirtualJoystick';
import { ControlPanel } from './ControlPanel';

export function MobileHUD() {
  const { isMobile } = useInput();
  const { config } = useMobileLayout();

  // No need to bind handlers - CameraController handles InputBus binding
  // Mobile components access handlers directly through useInput store

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: config.zIndex.hud }}>
      {/* Top Left - Control Panel */}
      <div 
        className="absolute top-4 left-4 pointer-events-auto"
        data-ui
      >
        <ControlPanel />
      </div>

      {/* Bottom Center - Action Bar */}
      <div 
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto"
        data-ui
      >
        <ActionBar />
      </div>

      {/* Virtual Joystick removed - replaced by touch-hold propulsion */}

      {/* Instructions */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.radius} px-3 py-2 ${config.text.label}`}>
          Touch & hold anywhere to thrust • Double tap for quick thrust
        </div>
      </div>
    </div>
  );
}