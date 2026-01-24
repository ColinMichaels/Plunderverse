import React, { useRef, useEffect } from 'react';
import { EngineProvider } from '../hooks/useEngine';
import type { RenderingEngineType } from '../interfaces/RenderingEngine';

interface BabylonCanvasProps {
  children?: React.ReactNode;
  engineType?: RenderingEngineType;
  className?: string;
  style?: React.CSSProperties;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function BabylonCanvas({
  children,
  engineType = 'babylon',
  className = '',
  style,
  onReady,
  onError
}: BabylonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />
      {canvasRef.current && (
        <EngineProvider
          canvasRef={canvasRef}
          engineType={engineType}
          onInitialized={onReady}
          onError={onError}
        >
          {children}
        </EngineProvider>
      )}
    </div>
  );
}

export function BabylonCanvasWithInit({
  children,
  engineType = 'babylon',
  className = '',
  style,
  onReady,
  onError
}: BabylonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    console.log('[BabylonCanvasWithInit] Component mounted, canvas ref:', canvasRef.current);
    setMounted(true);
  }, []);

  console.log('[BabylonCanvasWithInit] Render - mounted:', mounted, 'canvasRef.current:', !!canvasRef.current);

  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />
      {mounted && canvasRef.current && (
        <EngineProvider
          canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
          engineType={engineType}
          onInitialized={onReady}
          onError={onError}
        >
          {children}
        </EngineProvider>
      )}
    </div>
  );
}
