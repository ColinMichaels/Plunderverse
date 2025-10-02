import { useEffect, useState } from 'react';
import { memoryProfiler } from '../../lib/utils/MemoryProfiler';
import ResourceManager from '../../lib/utils/ResourceManager';

/**
 * MemoryStatsOverlay - Development-only overlay showing real-time memory statistics
 * Provides visual feedback of memory usage and resource tracking
 */
export function MemoryStatsOverlay() {
  const [stats, setStats] = useState({
    currentMemory: 0,
    peakMemory: 0,
    memoryUsage: 0,
    resourceCount: 0,
    lastCleanup: 0,
    cleanupCount: 0,
    isVisible: true
  });

  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  useEffect(() => {
    const updateStats = () => {
      const profilerStats = memoryProfiler.getStats();
      const resourceManager = ResourceManager.getInstance();
      const resourceStats = resourceManager.getStats();
      
      setStats({
        currentMemory: profilerStats.current,
        peakMemory: profilerStats.peak,
        memoryUsage: profilerStats.usage,
        resourceCount: resourceStats.geometries + 
                      resourceStats.materials + 
                      resourceStats.textures + 
                      resourceStats.meshes + 
                      resourceStats.audio,
        lastCleanup: profilerStats.lastCleanup,
        cleanupCount: profilerStats.cleanupCount,
        isVisible: true
      });
    };

    // Update stats every 2 seconds
    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, []);

  // Format memory value in MB
  const formatMemory = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number): string => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Get usage color based on percentage
  const getUsageColor = (usage: number): string => {
    if (usage > 0.9) return '#ff4444';
    if (usage > 0.7) return '#ffaa00';
    if (usage > 0.5) return '#ffdd00';
    return '#44ff44';
  };

  // Toggle visibility with keyboard shortcut (Ctrl+Shift+M)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setStats(prev => ({ ...prev, isVisible: !prev.isVisible }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!stats.isVisible) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          color: '#00ff00',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 100000,
          cursor: 'pointer'
        }}
        onClick={() => setStats(prev => ({ ...prev, isVisible: true }))}
      >
        Memory Stats [Hidden]
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#ffffff',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        minWidth: '250px',
        zIndex: 100000,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '8px'
      }}>
        <span style={{ 
          color: '#00ff00', 
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          MEMORY PROFILER
        </span>
        <button
          onClick={() => setStats(prev => ({ ...prev, isVisible: false }))}
          style={{
            background: 'none',
            border: 'none',
            color: '#888888',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            marginLeft: '10px'
          }}
        >
          ×
        </button>
      </div>

      {/* Memory Usage Bar */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <span style={{ color: '#aaaaaa' }}>Memory Usage</span>
          <span style={{ color: getUsageColor(stats.memoryUsage) }}>
            {(stats.memoryUsage * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(100, stats.memoryUsage * 100)}%`,
            height: '100%',
            backgroundColor: getUsageColor(stats.memoryUsage),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Current Memory */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
        <span style={{ color: '#aaaaaa' }}>Current:</span>
        <span style={{ color: '#ffffff' }}>
          {formatMemory(stats.currentMemory)} MB
        </span>
      </div>

      {/* Peak Memory */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
        <span style={{ color: '#aaaaaa' }}>Peak:</span>
        <span style={{ color: '#ffa500' }}>
          {formatMemory(stats.peakMemory)} MB
        </span>
      </div>

      {/* Resources Count */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
        <span style={{ color: '#aaaaaa' }}>Resources:</span>
        <span style={{ color: '#00aaff' }}>
          {stats.resourceCount}
        </span>
      </div>

      {/* Cleanup Info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '6px'
      }}>
        <span style={{ color: '#aaaaaa' }}>Cleanups:</span>
        <span style={{ color: '#00ff00' }}>
          {stats.cleanupCount}
        </span>
      </div>

      {/* Last Cleanup */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <span style={{ color: '#aaaaaa' }}>Last Cleanup:</span>
        <span style={{ color: '#888888', fontSize: '11px' }}>
          {formatTimeAgo(stats.lastCleanup)}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        paddingTop: '8px',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            memoryProfiler.logCurrentStatus('Manual Check');
            ResourceManager.getInstance().logMemoryStatus();
          }}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 170, 255, 0.2)',
            border: '1px solid #00aaff',
            color: '#00aaff',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 170, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 170, 255, 0.2)';
          }}
        >
          Profile
        </button>
        
        <button
          onClick={() => {
            const resourceManager = ResourceManager.getInstance();
            const cleaned = resourceManager.cleanupOldResources(5 * 60 * 1000);
            memoryProfiler.recordCleanup(cleaned);
            console.log(`Cleaned ${cleaned} resources`);
          }}
          style={{
            flex: 1,
            backgroundColor: 'rgba(255, 170, 0, 0.2)',
            border: '1px solid #ffaa00',
            color: '#ffaa00',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 170, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 170, 0, 0.2)';
          }}
        >
          Cleanup
        </button>

        <button
          onClick={() => memoryProfiler.logTrend()}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            border: '1px solid #00ff00',
            color: '#00ff00',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
          }}
        >
          Trend
        </button>
      </div>

      {/* Shortcut hint */}
      <div style={{ 
        marginTop: '8px',
        color: '#666666',
        fontSize: '10px',
        textAlign: 'center'
      }}>
        Ctrl+Shift+M to toggle
      </div>
    </div>
  );
}