import { useState } from 'react';
import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { MobileButton } from './MobileButton';
import { FastTravelMenu } from '../navigation/FastTravelMenu';

export function ActionBar() {
  const { shoot, land, isMobile } = useInput();
  const { config } = useMobileLayout();
  const [isShooting, setIsShooting] = useState(false);
  const [showFastTravel, setShowFastTravel] = useState(false);

  if (!isMobile) return null;

  const handleShootStart = () => {
    setIsShooting(true);
    shoot();
  };

  const handleShootEnd = () => {
    setIsShooting(false);
  };

  const handleLand = () => {
    land();
  };

  return (
    <>
      <div 
        className="flex items-center justify-center space-x-4" 
        style={{ zIndex: config.zIndex.hud }}
        data-ui
      >
        <MobileButton
          variant={isShooting ? 'danger' : 'secondary'}
          icon="🔥"
          label="FIRE"
          onPointerDown={handleShootStart}
          onPointerUp={handleShootEnd}
          onPointerLeave={handleShootEnd}
          className={isShooting ? 'scale-95' : ''}
        />
        
        <MobileButton
          variant="secondary"
          icon="🛬"
          label="LAND"
          onClick={handleLand}
        />
        
        <MobileButton
          variant="secondary"
          icon="⚡"
          label="TRAVEL"
          onClick={() => setShowFastTravel(true)}
        />
      </div>
      
      {/* Fast Travel Menu */}
      {showFastTravel && (
        <FastTravelMenu 
          onClose={() => setShowFastTravel(false)}
        />
      )}
    </>
  );
}