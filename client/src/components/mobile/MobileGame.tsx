import React, { useEffect } from 'react';
import { StationDashboard } from './StationDashboard';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useGame } from '../../lib/stores/ui/useGame';
import { usePlatform } from '../../lib/stores/ui/usePlatform';

/**
 * MobileGame - Main entry point for mobile experience
 * Provides a station-focused interface optimized for touch devices
 */
export const MobileGame: React.FC = () => {
  const { phase } = useGame();
  const { isLanded, landedPlanet } = useLandedState();
  const { viewport, orientation } = usePlatform();

  // Log mobile platform initialization
  useEffect(() => {
    console.log('[MOBILE-GAME] Initialized mobile experience', {
      viewport,
      orientation,
      isLanded,
      landedPlanet
    });
  }, []);

  // Mobile splash screen
  if (phase === 'splash') {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center px-8">
          <h1 className="text-4xl font-bold text-orange-500 mb-4">
            Solar Plunder
          </h1>
          <p className="text-gray-400 mb-8">Mobile Commander Interface</p>
          <button
            onClick={() => useGame.getState().start()}
            className="px-8 py-4 bg-orange-600 text-white rounded-lg font-semibold
                     active:bg-orange-700 transition-colors min-h-[44px]"
          >
            Launch Game
          </button>
        </div>
      </div>
    );
  }

  // Show landing screen if not at a station
  if (!isLanded) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Solar Plunder Mobile</h2>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-sm">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-600/20 
                          border-2 border-orange-600 flex items-center justify-center">
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              Ship in Transit
            </h3>
            <p className="text-gray-400 mb-6">
              The mobile interface is available when docked at a station. 
              Use the desktop version to pilot your ship and land at a station.
            </p>
            
            <div className="bg-slate-800 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-300 mb-2">Current Status:</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span className="text-cyan-400">Deep Space</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ship Status:</span>
                  <span className="text-green-400">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom info */}
        <div className="bg-slate-900 border-t border-slate-700 px-4 py-3">
          <p className="text-xs text-center text-gray-500">
            Land at any station to access mobile features
          </p>
        </div>
      </div>
    );
  }

  // Main mobile game interface when landed
  return <StationDashboard />;
};