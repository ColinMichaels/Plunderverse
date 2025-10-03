// Auth Provider Component
// Wraps the application and manages authentication state

import React, { useEffect, useState } from 'react';
import { useAuthStore, initializeAuth } from '../../lib/stores/auth/useAuthStore';
import { AuthScreen } from './AuthScreen';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, isGuest, isLoading, checkAuth } = useAuthStore();
  
  // Initialize authentication on mount
  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      setIsInitialized(true);
    };
    
    init();
  }, []);
  
  // Auto-refresh check every 30 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    
    const interval = setInterval(() => {
      // Use silent refresh to avoid showing loading screen
      checkAuth(true).catch(console.error);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, isGuest, checkAuth]);
  
  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Initializing systems...</p>
        </div>
      </div>
    );
  }
  
  // Show auth screen if not authenticated and not guest
  if (!isAuthenticated && !isGuest) {
    return <AuthScreen />;
  }
  
  // Render children when authenticated or playing as guest
  return <>{children}</>;
};