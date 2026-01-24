import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { IRenderingEngine, RenderingEngineType, UpdateCallback } from '../interfaces/RenderingEngine';
import { createRenderingEngine, setActiveEngine, getActiveEngine } from '../EngineFactory';

interface EngineContextValue {
  engine: IRenderingEngine | null;
  isInitialized: boolean;
  engineType: RenderingEngineType;
  registerUpdate: (id: string, callback: UpdateCallback) => void;
  unregisterUpdate: (id: string) => void;
}

const EngineContext = createContext<EngineContextValue>({
  engine: null,
  isInitialized: false,
  engineType: 'babylon',
  registerUpdate: () => {},
  unregisterUpdate: () => {}
});

interface EngineProviderProps {
  children: React.ReactNode;
  engineType?: RenderingEngineType;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onInitialized?: () => void;
  onError?: (error: Error) => void;
}

export function EngineProvider({
  children,
  engineType = 'babylon',
  canvasRef,
  onInitialized,
  onError
}: EngineProviderProps) {
  const [engine, setEngine] = useState<IRenderingEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const engineRef = useRef<IRenderingEngine | null>(null);
  const initializingRef = useRef(false);

  console.log('[EngineProvider] Render - canvas:', !!canvasRef.current, 'isInitialized:', isInitialized);

  useEffect(() => {
    const canvas = canvasRef.current;
    console.log('[EngineProvider] useEffect - canvas:', canvas, 'initializing:', initializingRef.current, 'engineRef:', !!engineRef.current);
    if (!canvas) return;
    if (initializingRef.current) return;
    if (engineRef.current) return;

    const initEngine = async () => {
      initializingRef.current = true;
      try {
        console.log(`[EngineProvider] Creating ${engineType} engine...`);
        const newEngine = createRenderingEngine(engineType);
        engineRef.current = newEngine;

        await newEngine.initialize(canvas);
        newEngine.createScene('main');
        newEngine.setActiveScene('main');
        newEngine.startRenderLoop();

        setEngine(newEngine);
        setActiveEngine(newEngine);
        setIsInitialized(true);

        console.log(`[EngineProvider] ${engineType} engine initialized`);
        onInitialized?.();
      } catch (error) {
        console.error('[EngineProvider] Failed to initialize engine:', error);
        onError?.(error as Error);
      } finally {
        initializingRef.current = false;
      }
    };

    initEngine();

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
        setActiveEngine(null);
      }
    };
  }, [canvasRef, engineType, onInitialized, onError]);

  useEffect(() => {
    const handleResize = () => {
      engineRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const registerUpdate = useCallback((id: string, callback: UpdateCallback) => {
    engineRef.current?.registerUpdateCallback(id, callback);
  }, []);

  const unregisterUpdate = useCallback((id: string) => {
    engineRef.current?.unregisterUpdateCallback(id);
  }, []);

  const value: EngineContextValue = {
    engine,
    isInitialized,
    engineType,
    registerUpdate,
    unregisterUpdate
  };

  return (
    <EngineContext.Provider value={value}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine(): EngineContextValue {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context;
}

export function useEngineUpdate(id: string, callback: UpdateCallback, deps: React.DependencyList = []) {
  const { registerUpdate, unregisterUpdate } = useEngine();
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    const wrappedCallback: UpdateCallback = (dt, elapsed) => {
      callbackRef.current(dt, elapsed);
    };

    registerUpdate(id, wrappedCallback);
    return () => unregisterUpdate(id);
  }, [id, registerUpdate, unregisterUpdate]);
}

export function useActiveEngine(): IRenderingEngine | null {
  return getActiveEngine();
}
