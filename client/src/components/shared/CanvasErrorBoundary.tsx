import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { checkWebGLSupport } from '../../utils/webglDetection';
import { WebGLFallback } from './WebGLFallback';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isWebGLError: boolean;
}

/**
 * Error boundary specifically for Canvas components
 * Catches WebGL context creation errors and other rendering failures
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isWebGLError: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a WebGL-related error
    const isWebGLError = 
      error.message.toLowerCase().includes('webgl') ||
      error.message.toLowerCase().includes('context') ||
      error.message.toLowerCase().includes('gl') ||
      error.message.toLowerCase().includes('canvas');

    return {
      hasError: true,
      isWebGLError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Canvas Error Boundary] Caught error:', error);
    console.error('[Canvas Error Boundary] Error info:', errorInfo);
    
    // Log to external error tracking service in production
    if (import.meta.env.PROD) {
      // Log to error tracking service
      console.error('[Canvas Error Boundary] Production error logged');
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isWebGLError: false
    });
  };

  render() {
    if (this.state.hasError) {
      // If it's a WebGL error, show the WebGL fallback
      if (this.state.isWebGLError) {
        const webGLStatus = checkWebGLSupport();
        if (!webGLStatus.supported) {
          return <WebGLFallback status={webGLStatus} />;
        }
      }

      // For other errors, show a generic error UI
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-slate-900 border border-red-900/50 rounded-lg p-8">
            <div className="flex items-start space-x-4 mb-6">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-400 mb-2">
                  3D Rendering Error
                </h2>
                <p className="text-gray-300 mb-4">
                  {this.props.fallbackMessage || 
                   'An error occurred while rendering the 3D scene. This might be due to graphics driver issues or browser limitations.'}
                </p>
                {this.state.error && (
                  <div className="bg-black/50 rounded p-3 mb-4">
                    <p className="text-xs text-gray-500 font-mono">
                      {this.state.error.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 
                         text-white rounded-lg transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 
                         text-gray-300 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
            
            {/* Technical details (collapsible) */}
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-6 cursor-pointer">
                <summary className="text-sm text-gray-500 hover:text-gray-400">
                  Stack Trace (Development Only)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 font-mono overflow-auto max-h-40 bg-black/30 p-2 rounded">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}