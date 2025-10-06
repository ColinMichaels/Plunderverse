import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { usePlunderverseEconomy } from '../../lib/stores/economy/usePlunderverseEconomy';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCredits } from '../../lib/stores/economy/useCredits';
import { useInventory } from '../../lib/stores/economy/useInventory';
import { Button } from '../ui/button';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { MobileSyncIndicator } from '../ui/SyncStatusIndicator';
import { useMiniGameSync } from '../../hooks/useMiniGameSync';

// Import Phaser scenes
import { BootScene } from './minigame/BootScene.js';
import { MainGameScene } from './minigame/MainGameScene.js';
import { UIOverlayScene } from './minigame/UIOverlayScene.js';

interface MobileMinigameProps {
  onBack: () => void;
}

/**
 * MobileMinigame - 2D RPG Station Exploration mini-game
 * Built with Phaser 3 for mobile touch interaction
 * Syncs with main game state through Zustand stores
 */
export const MobileMinigame: React.FC<MobileMinigameProps> = ({ onBack }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );
  
  // Access game state from Zustand stores
  const player = usePlayer();
  const { credits } = useCredits();
  const inventory = useInventory();
  const economy = usePlunderverseEconomy();
  const { forceSync, getSyncStatus } = useMiniGameSync();

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
      
      // Resize Phaser game on orientation change
      if (phaserGameRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight - 60; // Account for header
        phaserGameRef.current.scale.resize(width, height);
      }
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Initialize Phaser game
  useEffect(() => {
    if (!gameRef.current) return;

    // Calculate game dimensions (full viewport minus header)
    const width = window.innerWidth;
    const height = window.innerHeight - 60; // Account for header

    // Phaser game configuration optimized for mobile
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO, // Will use WebGL with Canvas fallback
      parent: gameRef.current,
      width: width,
      height: height,
      backgroundColor: '#1a1a2e',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      input: {
        touch: {
          target: gameRef.current,
          capture: true
        },
        activePointers: 3 // Support multi-touch
      },
      fps: {
        target: 60,
        forceSetTimeOut: false
      },
      scene: [BootScene, MainGameScene, UIOverlayScene],
      callbacks: {
        preBoot: (game) => {
          // Pass game state to Phaser scenes through registry
          game.registry.set('playerData', {
            level: player.level,
            experience: player.experience,
            credits: credits,
            notoriety: player.notoriety,
            reputation: player.reputation,
            inventory: inventory.items
          });
        }
      }
    };

    // Create Phaser game instance
    console.log('[MobileMinigame] Initializing Phaser game...');
    phaserGameRef.current = new Phaser.Game(config);

    // Listen for boot complete event
    phaserGameRef.current.events.once('ready', () => {
      console.log('[MobileMinigame] Phaser game ready');
      setIsLoading(false);
    });

    // Prevent default touch behaviors
    const preventDefaultTouch = (e: TouchEvent) => {
      e.preventDefault();
    };
    
    gameRef.current.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    gameRef.current.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    // Cleanup on unmount
    return () => {
      if (phaserGameRef.current) {
        console.log('[MobileMinigame] Destroying Phaser game...');
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
      
      if (gameRef.current) {
        gameRef.current.removeEventListener('touchstart', preventDefaultTouch);
        gameRef.current.removeEventListener('touchmove', preventDefaultTouch);
      }
    };
  }, []);

  // Sync game state changes back to Phaser
  useEffect(() => {
    if (!phaserGameRef.current) return;

    // Update player data in Phaser registry whenever it changes
    phaserGameRef.current.registry.set('playerData', {
      level: player.level,
      experience: player.experience,
      credits: credits,
      notoriety: player.notoriety,
      reputation: player.reputation,
      inventory: inventory.items
    });
  }, [player, credits, inventory]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header with controls */}
      <div className="h-[60px] bg-gradient-to-b from-slate-900 to-slate-800 border-b border-cyan-600/30 
                      flex items-center justify-between px-4 z-20">
        <Button
          onClick={onBack}
          size="sm"
          variant="ghost"
          className="text-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-400">Credits</p>
            <p className="text-sm font-mono text-cyan-400">{credits.toLocaleString()}</p>
          </div>
          
          {orientation === 'portrait' && (
            <div className="flex items-center gap-2 text-xs text-orange-400">
              <RotateCw className="w-4 h-4" />
              <span>Rotate for better view</span>
            </div>
          )}
        </div>
      </div>

      {/* Phaser game container */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={gameRef} 
          className="w-full h-full"
          style={{ 
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        />
        
        {/* Sync indicator */}
        <MobileSyncIndicator />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 font-medium">Loading Station Explorer...</p>
              <p className="text-gray-500 text-sm mt-2">Preparing 2D environment</p>
            </div>
          </div>
        )}
      </div>

      {/* Touch hint overlay for first-time players */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/60 rounded-lg p-3 
                      border border-cyan-600/30 pointer-events-none z-10"
           style={{ display: isLoading ? 'none' : 'block' }}>
        <p className="text-xs text-cyan-300 text-center">
          Touch and drag to move • Tap to interact • Pinch to zoom
        </p>
      </div>
    </div>
  );
};