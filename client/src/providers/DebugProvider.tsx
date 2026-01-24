import React, { createContext, useContext, useEffect, useState } from 'react';
import { memoryProfiler } from '../lib/utils/MemoryProfiler';

interface DebugContextValue {
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  verboseLogging: boolean;
  setVerboseLogging: (enabled: boolean) => void;
}

const DebugContext = createContext<DebugContextValue>({
  isDebugMode: false,
  toggleDebugMode: () => {},
  verboseLogging: false,
  setVerboseLogging: () => {}
});

interface DebugProviderProps {
  children: React.ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const [isDebugMode, setIsDebugMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('plunderverse_debug_mode') === 'true';
  });
  
  const [verboseLogging, setVerboseLogging] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('plunderverse_verbose') === 'true';
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    if (typeof window !== 'undefined') {
      (window as any).memoryProfile = () => memoryProfiler.getStats();
      (window as any).forceCleanup = () => memoryProfiler.recordCleanup(0);
      (window as any).showMemoryTrend = () => memoryProfiler.logTrend();
      (window as any).exportMemoryData = () => memoryProfiler.exportData();
      (window as any).resetMemoryProfiler = () => memoryProfiler.reset();
      (window as any).toggleDebugMode = () => setIsDebugMode(prev => !prev);
      (window as any).setVerboseLogging = (enabled: boolean) => setVerboseLogging(enabled);
    }

    console.log('%c[DEBUG] Debug provider initialized', 'color: #00ffff');
    console.log('  - window.toggleDebugMode() : Toggle debug panels');
    console.log('  - window.memoryProfile() : Show memory stats');
  }, []);

  useEffect(() => {
    localStorage.setItem('plunderverse_debug_mode', String(isDebugMode));
  }, [isDebugMode]);

  useEffect(() => {
    localStorage.setItem('plunderverse_verbose', String(verboseLogging));
  }, [verboseLogging]);

  const toggleDebugMode = () => setIsDebugMode(prev => !prev);

  return (
    <DebugContext.Provider value={{ isDebugMode, toggleDebugMode, verboseLogging, setVerboseLogging }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug(): DebugContextValue {
  return useContext(DebugContext);
}
