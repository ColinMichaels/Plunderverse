import React, { useEffect, useState, useRef } from 'react';
import Phaser from 'phaser';
import { StationDashboard } from './StationDashboard';
import { MobileMinigame } from './MobileMinigame';
import { MobileSplashScene } from './minigame/MobileSplashScene';
import { MobileHUD } from './MobileHUD';
import { ParrotControls } from '../parrot/ParrotControls';
import { ParrotTextDisplay } from '../parrot/ParrotTextDisplay';
import { MusicPlayer } from '../screens/MusicPlayer';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useGame } from '../../lib/stores/ui/useGame';
import { useAuthStore } from '../../lib/stores/auth/useAuthStore';
import { useCloudSync } from '../../services/CloudSyncManager';
import { useParrot } from '../../lib/stores/useParrot';
import { useParrotEvents } from '../../hooks/useParrotEvents';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';

type MobileViewState = 'status' | 'station' | 'minigame';

/**
 * MobileGame - Main entry point for mobile experience
 * Renders as a transparent overlay in space (Babylon canvas from App.tsx shows behind)
 * and as a full-screen UI when landed at a station or in the mini-game.
 */
export const MobileGame: React.FC = () => {
  const [viewState, setViewState] = useState<MobileViewState>('status');
  const [isLoadingSave, setIsLoadingSave] = useState(true);
  const splashGameRef = useRef<HTMLDivElement>(null);
  const phaserSplashRef = useRef<Phaser.Game | null>(null);

  const { phase, start } = useGame();
  const { isLanded } = useLandedState();
  const { isAuthenticated, isGuest, isAuthReady } = useAuthStore();
  const { status: cloudSyncStatus, isInitialized } = useCloudSync();
  const { initialize: initializeParrot } = useParrot();
  const crewManagement = useCrewManagement();

  // Update crew task progress every second
  useEffect(() => {
    const interval = setInterval(() => {
      crewManagement.updateTaskProgress();
    }, 1000);
    return () => clearInterval(interval);
  }, [crewManagement]);

  // Wait for CloudSync to load save data before showing UI
  useEffect(() => {
    console.log('[MobileGame] CloudSync status:', { cloudSyncStatus, isInitialized, isAuthenticated, isGuest, isAuthReady });

    if (!isAuthReady) {
      console.log('[MobileGame] Auth not ready yet, waiting...');
      return;
    }

    if (!isAuthenticated || isGuest) {
      console.log('[MobileGame] Not authenticated or guest, skipping save load');
      setIsLoadingSave(false);
      return;
    }

    if (isInitialized || cloudSyncStatus === 'synced' || cloudSyncStatus === 'idle' || cloudSyncStatus === 'offline') {
      console.log('[MobileGame] CloudSync initialized, showing game UI');
      setIsLoadingSave(false);
    } else if (cloudSyncStatus === 'error') {
      console.warn('[MobileGame] CloudSync error, continuing with local state');
      setIsLoadingSave(false);
    }
  }, [cloudSyncStatus, isInitialized, isAuthenticated, isGuest, isAuthReady]);

  // Initialize Parrot on mobile
  useEffect(() => {
    initializeParrot();
  }, [initializeParrot]);

  // Enable Parrot event hooks on mobile
  useParrotEvents();

  // Keep viewState in sync with landing status
  useEffect(() => {
    if (isLanded && viewState === 'status') {
      setViewState('station');
    } else if (!isLanded && viewState === 'station') {
      setViewState('status');
    }
  }, [isLanded, viewState]);

  // Initialize Phaser splash screen
  useEffect(() => {
    if (phase !== 'splash' || !splashGameRef.current || phaserSplashRef.current) return;

    console.log('[MobileGame] Initializing Phaser splash screen...');

    class MainSplashScene extends MobileSplashScene {
      startGame() {
        console.log('[MainSplashScene] Starting game...');
        start();
        if (phaserSplashRef.current) {
          phaserSplashRef.current.destroy(true);
          phaserSplashRef.current = null;
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: splashGameRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#000000',
      scene: [MainSplashScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    phaserSplashRef.current = new Phaser.Game(config);

    return () => {
      if (phaserSplashRef.current) {
        phaserSplashRef.current.destroy(true);
        phaserSplashRef.current = null;
      }
    };
  }, [phase, start]);

  // Mobile splash screen (Phaser-based, full-screen)
  if (phase === 'splash') {
    return (
      <div ref={splashGameRef} className="fixed inset-0 bg-black" />
    );
  }

  // Loading save data screen
  if (isLoadingSave) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center px-8">
          <img
            src="/media/Plunderverse_logo.png"
            alt="Plunderverse"
            className="w-32 h-32 mx-auto mb-6 object-contain animate-pulse"
          />
          <h2 className="text-2xl font-bold text-cyan-400 mb-2">
            Loading Commander Data
          </h2>
          <p className="text-gray-400">Syncing with cloud saves...</p>
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // Space flight view — MobileHUD overlays transparently over the Babylon canvas
  if (!isLanded) {
    return (
      <>
        <MobileHUD />
        <ParrotControls />
        <ParrotTextDisplay />
        <div className="fixed bottom-20 left-2 z-30">
          <MusicPlayer />
        </div>
      </>
    );
  }

  // Mini-game (full-screen Phaser)
  if (viewState === 'minigame') {
    return (
      <>
        <MobileMinigame
          onBack={() => setViewState(isLanded ? 'station' : 'status')}
        />
        <ParrotControls />
        <ParrotTextDisplay />
      </>
    );
  }

  // Station view (full-screen dashboard)
  return (
    <>
      <StationDashboard
        onOpenMinigame={() => setViewState('minigame')}
      />
      <ParrotControls />
      <ParrotTextDisplay />
      <div className="fixed bottom-20 left-2 z-30">
        <MusicPlayer />
      </div>
    </>
  );
};
