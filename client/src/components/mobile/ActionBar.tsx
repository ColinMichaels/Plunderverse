import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useInput } from '../../stores/useInput';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { MobileButton } from './MobileButton';
import { FastTravelMenu } from '../navigation/FastTravelMenu';

export function ActionBar() {
  const { shoot, land, isMobile } = useInput();
  const { config } = useMobileLayout();
  const [isShooting, setIsShooting] = useState(false);
  const [showFastTravel, setShowFastTravel] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

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
      <div className="flex flex-col items-center h-40 justify-end" style={{ zIndex: config.zIndex.hud }}>
        {isMinimized ? (
          /* Minimized view - toggle button anchored to bottom */
          <button
            onClick={() => setIsMinimized(false)}
            className="w-16 h-12 flex items-center justify-center bg-slate-800/80 border border-slate-600 rounded-t-lg hover:bg-slate-700/80 transition-colors active:scale-95"
            aria-label="Show action bar"
          >
            <ChevronUp className="w-5 h-5 text-cyan-400" />
          </button>
        ) : (
          /* Expanded view */
          <>
            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="w-16 h-11 flex items-center justify-center bg-slate-800/60 border-t border-x border-slate-600 rounded-t-lg hover:bg-slate-700/60 transition-colors mb-[-1px]"
              aria-label="Hide action bar"
            >
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </button>
            
            {/* Action buttons */}
            <div 
              className="flex items-center justify-center space-x-4 bg-slate-900/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-600" 
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
          </>
        )}
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