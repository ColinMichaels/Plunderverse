import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { MobileButton } from './MobileButton';

export function ControlPanel() {
  const { isGyroEnabled, setGyroEnabled, isMobile } = useInput();
  const { config } = useMobileLayout();

  if (!isMobile) return null;

  return (
    <div 
      className="flex flex-col space-y-2" 
      style={{ zIndex: config.zIndex.hud }}
      data-ui
    >
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
  );
}