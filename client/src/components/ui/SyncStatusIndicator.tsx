import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, CloudLightning, Check, AlertCircle } from 'lucide-react';
import MiniGameSyncService from '../../services/MiniGameSyncService';

type SyncStatus = 'connected' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  className = '', 
  showDetails = false 
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [queueSize, setQueueSize] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const syncService = MiniGameSyncService.getInstance();
    
    // Get initial status
    setSyncStatus(syncService.getSyncStatus());
    
    // Listen for sync status changes
    const handleStatusChange = (event: CustomEvent<SyncStatus>) => {
      setSyncStatus(event.detail);
      
      // Update last sync time on successful sync
      if (event.detail === 'synced') {
        setLastSyncTime(new Date());
        
        // Hide indicator after 3 seconds when synced
        setTimeout(() => {
          if (syncService.getSyncStatus() === 'synced') {
            setIsVisible(false);
          }
        }, 3000);
      } else {
        setIsVisible(true);
      }
    };
    
    // Listen for sync events
    window.addEventListener('sync-status-changed', handleStatusChange as any);
    
    // Update queue size periodically
    const queueInterval = setInterval(() => {
      setQueueSize(syncService.getQueueSize());
    }, 1000);
    
    // Add sync service listener
    syncService.addEventListener('status', (status: SyncStatus) => {
      setSyncStatus(status);
    });
    
    return () => {
      window.removeEventListener('sync-status-changed', handleStatusChange as any);
      clearInterval(queueInterval);
    };
  }, []);
  
  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'connected':
        return <Cloud className="w-4 h-4" />;
      case 'syncing':
        return <CloudLightning className="w-4 h-4 animate-pulse" />;
      case 'synced':
        return <Check className="w-4 h-4" />;
      case 'offline':
        return <CloudOff className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };
  
  const getStatusColor = () => {
    switch (syncStatus) {
      case 'connected':
        return 'text-blue-400 bg-blue-900/20';
      case 'syncing':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'synced':
        return 'text-green-400 bg-green-900/20';
      case 'offline':
        return 'text-gray-400 bg-gray-900/20';
      case 'error':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };
  
  const getStatusText = () => {
    switch (syncStatus) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Sync Error';
      default:
        return 'Unknown';
    }
  };
  
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) {
      return `${diff}s ago`;
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    } else {
      return `${Math.floor(diff / 3600)}h ago`;
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`fixed top-4 right-4 z-[9999] ${className}`}
        >
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md border ${getStatusColor()}`}>
            <motion.div
              animate={syncStatus === 'syncing' ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              {getStatusIcon()}
            </motion.div>
            
            <span className="text-sm font-medium">
              {getStatusText()}
            </span>
            
            {queueSize > 0 && (
              <span className="text-xs opacity-75">
                ({queueSize} pending)
              </span>
            )}
            
            {showDetails && lastSyncTime && syncStatus === 'synced' && (
              <span className="text-xs opacity-50">
                {formatTime(lastSyncTime)}
              </span>
            )}
          </div>
          
          {/* Sync progress bar */}
          {syncStatus === 'syncing' && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400/30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          
          {/* Error details */}
          {syncStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 p-2 bg-red-900/20 rounded text-xs text-red-400"
            >
              Failed to sync. Will retry automatically.
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Mini version for mobile
export const MobileSyncIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    const syncService = MiniGameSyncService.getInstance();
    setSyncStatus(syncService.getSyncStatus());
    
    const handleStatusChange = (event: CustomEvent<SyncStatus>) => {
      setSyncStatus(event.detail);
      
      // Animate on sync
      if (event.detail === 'syncing') {
        setIsAnimating(true);
      } else {
        setIsAnimating(false);
      }
    };
    
    window.addEventListener('sync-status-changed', handleStatusChange as any);
    
    return () => {
      window.removeEventListener('sync-status-changed', handleStatusChange as any);
    };
  }, []);
  
  const getIndicatorColor = () => {
    switch (syncStatus) {
      case 'connected':
      case 'synced':
        return 'bg-green-400';
      case 'syncing':
        return 'bg-yellow-400';
      case 'offline':
        return 'bg-gray-400';
      case 'error':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };
  
  return (
    <div className="fixed top-2 right-2 z-[9999]">
      <motion.div
        className={`w-2 h-2 rounded-full ${getIndicatorColor()}`}
        animate={isAnimating ? { scale: [1, 1.5, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    </div>
  );
};

export default SyncStatusIndicator;