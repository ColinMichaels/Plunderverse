import React from 'react';
import { AlertCircle, Monitor, Settings, Book, Home } from 'lucide-react';
import { WebGLSupportStatus } from '../../utils/webglDetection';
import { useGame } from '../../lib/stores/ui/useGame';

interface WebGLFallbackProps {
  status: WebGLSupportStatus;
  showNavigation?: boolean;
}

/**
 * Fallback UI displayed when WebGL is not available
 * Matches the game's dark theme with orange/amber accents
 */
export const WebGLFallback: React.FC<WebGLFallbackProps> = ({ 
  status, 
  showNavigation = true 
}) => {
  const { setPhase } = useGame();
  
  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-orange-900/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-orange-500">Solar Plunder</h1>
          {showNavigation && (
            <button
              onClick={() => setPhase('splash')}
              className="text-gray-400 hover:text-orange-500 transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Error Alert */}
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-4">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-400 mb-2">
                  WebGL Not Available
                </h2>
                <p className="text-gray-300 mb-4">
                  {status.error || 'WebGL is required to render the 3D game environment.'}
                </p>
                <div className="text-sm text-gray-400">
                  <p>Detected: {status.version === 'none' ? 'No WebGL support' : `WebGL ${status.version}`}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Suggestions */}
          {status.suggestions && status.suggestions.length > 0 && (
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                How to Enable WebGL
              </h3>
              <ol className="space-y-3">
                {status.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-500 font-bold mr-3">{index + 1}.</span>
                    <span className="text-gray-300">{suggestion}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          
          {/* Available Features */}
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-orange-400 mb-4">
              Available Features Without WebGL
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Book className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-medium">Game Handbook</h4>
                  <p className="text-sm text-gray-400">
                    Read about game mechanics, lore, and strategies
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Settings className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-medium">Settings</h4>
                  <p className="text-sm text-gray-400">
                    Configure game options and preferences
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Monitor className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-medium">Account Management</h4>
                  <p className="text-sm text-gray-400">
                    Manage your profile and saved games
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Technical Details */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
            <details className="cursor-pointer">
              <summary className="text-sm text-gray-500 hover:text-gray-400">
                Technical Details
              </summary>
              <div className="mt-4 space-y-2 text-xs text-gray-600 font-mono">
                <p>User Agent: {navigator.userAgent}</p>
                <p>Platform: {navigator.platform}</p>
                <p>WebGL Version: {status.version}</p>
                <p>Hardware Concurrency: {navigator.hardwareConcurrency || 'Unknown'}</p>
              </div>
            </details>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-slate-900 border-t border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          <p>Solar Plunder requires WebGL for 3D rendering.</p>
          <p>Please try a different browser or enable hardware acceleration.</p>
        </div>
      </div>
    </div>
  );
};