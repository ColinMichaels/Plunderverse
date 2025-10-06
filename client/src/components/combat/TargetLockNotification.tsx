import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeaponSystems } from '../../lib/stores/combat/useWeaponSystems';
import { useEnemies } from '../../lib/stores/combat/useEnemies';
import { Target, Lock, Crosshair } from 'lucide-react';

export function TargetLockNotification() {
  const { isLocking, currentTarget, selectedWeapon } = useWeaponSystems();
  const { enemies } = useEnemies();
  const [showLockAcquired, setShowLockAcquired] = useState(false);
  const [prevLockProgress, setPrevLockProgress] = useState(0);

  // Find the target enemy details
  const targetEnemy = currentTarget
    ? enemies.find(e => e.id === currentTarget.enemyId)
    : null;

  // Detect when lock is acquired (progress reaches 100%)
  useEffect(() => {
    if (currentTarget) {
      if (currentTarget.lockProgress >= 1 && prevLockProgress < 1) {
        // Lock just acquired
        setShowLockAcquired(true);
        
        // Hide the notification after 2 seconds
        const timeout = setTimeout(() => {
          setShowLockAcquired(false);
        }, 2000);
        
        return () => clearTimeout(timeout);
      }
      setPrevLockProgress(currentTarget.lockProgress);
    } else {
      setPrevLockProgress(0);
      setShowLockAcquired(false);
    }
  }, [currentTarget, prevLockProgress]);

  return (
    <>
      {/* Target Lock Progress Indicator */}
      <AnimatePresence>
        {isLocking && currentTarget && currentTarget.lockProgress < 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className="relative">
              {/* Animated locking ring */}
              <svg width="200" height="200" className="absolute -top-24 -left-24">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="rgba(255,0,0,0.8)"
                  strokeWidth="2"
                  strokeDasharray={`${currentTarget.lockProgress * 566} 566`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                  className="transition-all duration-100"
                />
              </svg>
              
              {/* Center target indicator */}
              <div className="relative flex items-center justify-center">
                <Crosshair 
                  className="w-12 h-12 text-red-500 animate-pulse" 
                  style={{ 
                    animationDuration: `${1.5 - currentTarget.lockProgress}s` 
                  }}
                />
              </div>
              
              {/* Lock progress text */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 px-3 py-1 rounded">
                <div className="text-red-400 text-sm font-mono">
                  LOCKING... {Math.round(currentTarget.lockProgress * 100)}%
                </div>
              </div>
              
              {/* Target info */}
              {targetEnemy && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 px-3 py-1 rounded">
                  <div className="text-xs text-gray-400">
                    {targetEnemy.faction} {targetEnemy.shipType}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Target Lock Acquired Notification */}
      <AnimatePresence>
        {showLockAcquired && (
          <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className="relative">
              {/* Pulsing glow effect */}
              <div className="absolute inset-0 bg-red-500/30 blur-2xl animate-ping" />
              
              {/* Main notification */}
              <div className="relative bg-gradient-to-r from-red-900/90 via-red-800/90 to-red-900/90 border-2 border-red-500 px-8 py-4 rounded-lg shadow-2xl">
                <div className="flex items-center space-x-3">
                  <Lock className="w-8 h-8 text-red-400 animate-pulse" />
                  <div>
                    <div className="text-2xl font-bold text-red-400 tracking-wider">
                      TARGET LOCKED
                    </div>
                    {targetEnemy && (
                      <div className="text-sm text-red-300">
                        {targetEnemy.faction.toUpperCase()} {targetEnemy.shipType.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Weapon ready indicator */}
                <div className="mt-2 text-center">
                  <div className="text-xs text-red-300 font-mono">
                    {selectedWeapon.toUpperCase()} READY
                  </div>
                </div>
              </div>
              
              {/* Animated corner brackets */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-red-500 animate-pulse" />
              <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-red-500 animate-pulse" />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-red-500 animate-pulse" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-red-500 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Small persistent lock indicator when locked */}
      <AnimatePresence>
        {currentTarget && currentTarget.lockProgress >= 1 && !showLockAcquired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-32 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none"
          >
            <div className="bg-red-900/80 border border-red-500 px-3 py-1 rounded-full flex items-center space-x-2">
              <Target className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-red-400 text-sm font-mono">LOCKED</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}