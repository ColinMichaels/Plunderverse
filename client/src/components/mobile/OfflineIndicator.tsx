import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudUpload, CloudOff, Clock, AlertTriangle, Minimize2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MiniGameSyncService from '../../services/MiniGameSyncService';
import OfflineStorageService from '../../services/OfflineStorageService';
import { cn } from '../../lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className, compact = false }) => {
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [storageQuota, setStorageQuota] = useState({ used: 0, total: 0, percentage: 0 });
  const [showDetails, setShowDetails] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const syncService = MiniGameSyncService.getInstance();
    const offlineStorage = OfflineStorageService.getInstance();

    // Initial status check
    updateStatus();

    // Check storage quota
    checkStorageQuota();

    // Listen for connection status changes
    const handleConnectionChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const isOnline = customEvent.detail?.online;
      setConnectionStatus(isOnline ? 'online' : 'offline');
      updateStatus();
    };

    // Listen for sync status changes
    const handleSyncStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const status = customEvent.detail;
      
      if (status === 'syncing') {
        setConnectionStatus('syncing');
      } else if (status === 'synced') {
        setConnectionStatus('online');
        setLastSyncTime(Date.now());
      } else if (status === 'offline') {
        setConnectionStatus('offline');
      }
      
      updateStatus();
    };

    window.addEventListener('connection-status-changed', handleConnectionChange);
    window.addEventListener('sync-status-changed', handleSyncStatusChange);
    
    // Update status periodically
    const statusInterval = setInterval(() => {
      updateStatus();
    }, 5000);

    // Check storage quota periodically
    const quotaInterval = setInterval(() => {
      checkStorageQuota();
    }, 30000);

    function updateStatus() {
      const status = syncService.getOfflineStatus();
      setQueueSize(status.queueSize);
      if (status.lastSync > 0) {
        setLastSyncTime(status.lastSync);
      }
      
      if (!navigator.onLine) {
        setConnectionStatus('offline');
      } else if (status.syncing) {
        setConnectionStatus('syncing');
      }
    }

    async function checkStorageQuota() {
      const quota = await offlineStorage.getStorageQuota();
      setStorageQuota(quota);
    }

    return () => {
      window.removeEventListener('connection-status-changed', handleConnectionChange);
      window.removeEventListener('sync-status-changed', handleSyncStatusChange);
      clearInterval(statusInterval);
      clearInterval(quotaInterval);
    };
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'offline':
        return <WifiOff className="w-4 h-4" />;
      case 'syncing':
        return <CloudUpload className="w-4 h-4 animate-pulse" />;
      case 'online':
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'offline':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'syncing':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'online':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'offline':
        return 'Offline Mode';
      case 'syncing':
        return 'Syncing...';
      case 'online':
        return 'Online';
    }
  };

  const formatLastSync = () => {
    if (lastSyncTime === 0) return 'Never';
    
    try {
      return formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const handleForceSync = async () => {
    const syncService = MiniGameSyncService.getInstance();
    await syncService.forceOfflineSync();
  };

  // Minimized view - compact status indicator optimized for mobile touch
  if (isMinimized) {
    return (
      <div 
        className={cn(
          "fixed top-4 right-4 w-10 h-10 rounded-full border-2 cursor-pointer z-50 transition-all duration-300 active:scale-95 flex items-center justify-center shadow-lg",
          connectionStatus === 'offline' ? 'bg-red-500/90 border-red-400' : 
          connectionStatus === 'syncing' ? 'bg-yellow-500/90 border-yellow-400 animate-pulse' : 
          'bg-green-500/90 border-green-400',
          className
        )}
        onClick={() => setIsMinimized(false)}
        title="Tap to expand sync status"
      >
        <div className="w-2 h-2 bg-white/80 rounded-full" />
      </div>
    );
  }

  if (compact) {
    return (
      <div 
        className={cn(
          "fixed top-4 right-4 rounded-lg border backdrop-blur-sm transition-all duration-300 z-50",
          getStatusColor(),
          className
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div 
            className="flex items-center gap-2 cursor-pointer flex-1"
            onClick={() => setShowDetails(!showDetails)}
          >
            {getStatusIcon()}
            {queueSize > 0 && (
              <span className="text-xs font-mono bg-black/30 px-1.5 py-0.5 rounded">
                {queueSize} pending
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
              setShowDetails(false);
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
        </div>
        
        {showDetails && (
          <div className="absolute top-full right-0 mt-2 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl min-w-[200px]">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status:</span>
                <span className={cn("font-medium", 
                  connectionStatus === 'offline' ? 'text-red-400' : 
                  connectionStatus === 'syncing' ? 'text-yellow-400' : 
                  'text-green-400'
                )}>
                  {getStatusText()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Last Sync:</span>
                <span className="text-gray-200 text-xs">{formatLastSync()}</span>
              </div>
              
              {queueSize > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Pending:</span>
                  <span className="text-yellow-400">{queueSize} items</span>
                </div>
              )}
              
              {storageQuota.percentage > 80 && (
                <div className="flex items-center gap-1 text-orange-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs">Storage {Math.round(storageQuota.percentage)}% full</span>
                </div>
              )}
              
              {connectionStatus === 'offline' && queueSize > 0 && (
                <button
                  onClick={handleForceSync}
                  className="w-full mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                >
                  Try Sync Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-4 left-4 right-4 p-4 rounded-lg border backdrop-blur-sm transition-all duration-300",
      getStatusColor(),
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <div className="font-medium">{getStatusText()}</div>
            {connectionStatus === 'offline' && (
              <div className="text-xs mt-1 opacity-80">
                Game progress is being saved locally
              </div>
            )}
            {connectionStatus === 'syncing' && (
              <div className="text-xs mt-1 opacity-80">
                Uploading {queueSize} changes...
              </div>
            )}
            {connectionStatus === 'online' && lastSyncTime > 0 && (
              <div className="text-xs mt-1 opacity-80">
                Last synced {formatLastSync()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {queueSize > 0 && (
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4" />
              <span className="text-sm font-mono">{queueSize}</span>
            </div>
          )}
          
          {lastSyncTime > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs">{formatLastSync()}</span>
            </div>
          )}

          {storageQuota.percentage > 80 && (
            <div className="flex items-center gap-1 text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-mono">{Math.round(storageQuota.percentage)}%</span>
            </div>
          )}
        </div>
      </div>

      {connectionStatus === 'offline' && queueSize > 0 && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <button
            onClick={handleForceSync}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
          >
            Attempt Manual Sync
          </button>
        </div>
      )}
    </div>
  );
};