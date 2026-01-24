import React, { useRef, useState, useEffect } from 'react';
import { EngineProvider } from '../../engine/hooks/useEngine';
import { TestScene } from '../../engine/components/TestScene';
import type { RenderingEngineType } from '../../engine/interfaces/RenderingEngine';

interface BabylonTestPageProps {
  onBack?: () => void;
}

export function BabylonTestPage({ onBack }: BabylonTestPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineType] = useState<RenderingEngineType>('babylon');

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="absolute top-4 left-4 z-10 flex gap-4 items-center">
        {onBack && (
          <button
            onClick={onBack}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded transition-colors"
          >
            Back to Game
          </button>
        )}
        <div className="text-white bg-black/50 px-3 py-1 rounded">
          Engine: <span className="text-cyan-400 font-bold">{engineType.toUpperCase()}</span>
          {isReady && <span className="ml-2 text-green-400">Ready</span>}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 text-white bg-black/70 p-4 rounded max-w-xs">
        <h3 className="text-cyan-400 font-bold mb-2">Babylon.js Test Scene</h3>
        <p className="text-sm text-gray-300 mb-2">
          This is a test of the new rendering engine abstraction layer.
        </p>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>- Sun with emissive glow</li>
          <li>- 2 orbiting planets</li>
          <li>- 100 background stars</li>
          <li>- Directional + ambient lighting</li>
        </ul>
      </div>

      {error && (
        <div className="absolute top-20 left-4 z-10 bg-red-900/80 text-white p-4 rounded max-w-md">
          <h4 className="font-bold text-red-300">Engine Error</h4>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {canvasRef.current && (
        <EngineProvider
          canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
          engineType={engineType}
          onInitialized={() => {
            console.log('[BabylonTestPage] Engine ready');
            setIsReady(true);
          }}
          onError={(err) => {
            console.error('[BabylonTestPage] Engine error:', err);
            setError(err.message);
          }}
        >
          <TestScene />
        </EngineProvider>
      )}
    </div>
  );
}

export function BabylonTestPageWithMount({ onBack }: BabylonTestPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="absolute top-4 left-4 z-10 flex gap-4 items-center">
        {onBack && (
          <button
            onClick={onBack}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded transition-colors"
          >
            Back to Game
          </button>
        )}
        <div className="text-white bg-black/50 px-3 py-1 rounded">
          Engine: <span className="text-cyan-400 font-bold">BABYLON</span>
          {isReady && <span className="ml-2 text-green-400">Ready</span>}
          {!mounted && <span className="ml-2 text-yellow-400">Mounting...</span>}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 text-white bg-black/70 p-4 rounded max-w-xs">
        <h3 className="text-cyan-400 font-bold mb-2">Babylon.js Test Scene</h3>
        <p className="text-sm text-gray-300 mb-2">
          Testing the new rendering engine abstraction layer.
        </p>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>- Sun with emissive glow</li>
          <li>- 2 orbiting planets</li>
          <li>- 100 background stars</li>
          <li>- Hemisphere + directional lighting</li>
        </ul>
      </div>

      {error && (
        <div className="absolute top-20 left-4 z-10 bg-red-900/80 text-white p-4 rounded max-w-md">
          <h4 className="font-bold text-red-300">Engine Error</h4>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {mounted && canvasRef.current && (
        <EngineProvider
          canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
          engineType="babylon"
          onInitialized={() => {
            console.log('[BabylonTestPage] Engine ready');
            setIsReady(true);
          }}
          onError={(err) => {
            console.error('[BabylonTestPage] Engine error:', err);
            setError(err.message);
          }}
        >
          <TestScene />
        </EngineProvider>
      )}
    </div>
  );
}
