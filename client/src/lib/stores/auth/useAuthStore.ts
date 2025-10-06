// Authentication Store
// Handles JWT tokens, user session, and authentication state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { gameApi } from '../../../services/gameApi';

interface User {
  id: string;
  email: string;
  username?: string | null;
  createdAt: Date | string;
  lastLoginAt?: Date | string | null;
}

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean; // Separate flag for silent refreshes
  isGuest: boolean;
  isAuthReady: boolean; // Tracks if initial auth check is complete
  rememberMe: boolean;
  tokenRefreshTimeout?: NodeJS.Timeout;
  
  // Actions
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signup: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  checkAuth: (silent?: boolean) => Promise<boolean>; // Add silent parameter
  playAsGuest: () => void;
  setLoading: (loading: boolean) => void;
  scheduleTokenRefresh: () => void;
  clearTokenRefreshTimeout: () => void;
}

const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // Refresh 5 minutes before expiry

// Parse JWT to get expiry time
function parseJWT(token: string): { exp?: number } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = atob(parts[1]);
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isRefreshing: false,
      isGuest: false,
      isAuthReady: false, // Not ready until initial check completes
      rememberMe: false,
      
      // Login action
      login: async (email: string, password: string, remember: boolean) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Login failed');
          }
          
          if (data.success && data.user && data.accessToken) {
            // Store tokens based on remember me preference
            if (remember) {
              localStorage.setItem('accessToken', data.accessToken);
              localStorage.setItem('refreshToken', data.refreshToken);
            } else {
              sessionStorage.setItem('accessToken', data.accessToken);
              sessionStorage.setItem('refreshToken', data.refreshToken);
            }
            
            set({
              user: data.user,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              isAuthenticated: true,
              isGuest: false,
              isAuthReady: true,
              rememberMe: remember,
              isLoading: false,
            });
            
            // Schedule token refresh
            get().scheduleTokenRefresh();
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      // Signup action
      signup: async (email: string, password: string, username?: string) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username }),
            credentials: 'include',
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Signup failed');
          }
          
          if (data.success && data.user && data.accessToken) {
            // Auto-login after signup
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            
            set({
              user: data.user,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              isAuthenticated: true,
              isGuest: false,
              isAuthReady: true,
              rememberMe: true,
              isLoading: false,
            });
            
            // Schedule token refresh
            get().scheduleTokenRefresh();
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      // Logout action
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear all auth state
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('refreshToken');
          
          // Clear token refresh timeout
          get().clearTokenRefreshTimeout();
          
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isGuest: false,
            isAuthReady: true, // Ready to show login screen
            rememberMe: false,
            isLoading: false,
          });
        }
      },
      
      // Refresh token action
      refresh: async () => {
        const { refreshToken, rememberMe } = get();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            credentials: 'include',
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Token refresh failed');
          }
          
          if (data.success && data.accessToken) {
            // Update tokens
            if (rememberMe) {
              localStorage.setItem('accessToken', data.accessToken);
            } else {
              sessionStorage.setItem('accessToken', data.accessToken);
            }
            
            set({ accessToken: data.accessToken });
            
            // Schedule next refresh
            get().scheduleTokenRefresh();
          } else {
            throw new Error('Invalid refresh response');
          }
        } catch (error) {
          // If refresh fails, logout
          console.error('Token refresh failed:', error);
          await get().logout();
          throw error;
        }
      },
      
      // Check authentication status
      checkAuth: async (silent: boolean = false) => {
        const { accessToken } = get();
        
        if (!accessToken) {
          // No token means user needs to login or play as guest
          set({ isAuthReady: true, isLoading: false, isRefreshing: false });
          return false;
        }
        
        // Use isRefreshing for silent checks, isLoading for initial checks
        if (silent) {
          set({ isRefreshing: true });
        } else {
          set({ isLoading: true });
        }
        
        try {
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
          
          const data = await response.json();
          
          if (data.success && data.valid) {
            // Get current user info
            const meResponse = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });
            
            const meData = await meResponse.json();
            
            if (meData.success && meData.user) {
              set({
                user: meData.user,
                isAuthenticated: true,
                isAuthReady: true,
                isLoading: false,
                isRefreshing: false,
              });
              
              // Schedule token refresh
              get().scheduleTokenRefresh();
              
              return true;
            }
          }
          
          // Token invalid, logout (sets isAuthReady)
          await get().logout();
          return false;
        } catch (error) {
          console.error('Auth check failed:', error);
          set({ isLoading: false, isRefreshing: false, isAuthReady: true });
          return false;
        }
      },
      
      // Play as guest (no saving)
      playAsGuest: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isGuest: true,
          isAuthReady: true, // Ready to play as guest
          isLoading: false,
        });
      },
      
      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      // Schedule token refresh before expiry
      scheduleTokenRefresh: () => {
        const { accessToken, tokenRefreshTimeout } = get();
        
        if (!accessToken) return;
        
        // Clear existing timeout
        if (tokenRefreshTimeout) {
          clearTimeout(tokenRefreshTimeout);
        }
        
        // Parse token to get expiry
        const payload = parseJWT(accessToken);
        if (!payload.exp) return;
        
        // Calculate when to refresh (5 minutes before expiry)
        const expiryTime = payload.exp * 1000;
        const refreshTime = expiryTime - Date.now() - TOKEN_REFRESH_BUFFER;
        
        // If token is already expired or about to expire, refresh immediately
        if (refreshTime <= 0) {
          get().refresh().catch(console.error);
          return;
        }
        
        // Schedule refresh
        const timeout = setTimeout(() => {
          get().refresh().catch(console.error);
        }, refreshTime);
        
        set({ tokenRefreshTimeout: timeout });
      },
      
      // Clear token refresh timeout
      clearTokenRefreshTimeout: () => {
        const { tokenRefreshTimeout } = get();
        
        if (tokenRefreshTimeout) {
          clearTimeout(tokenRefreshTimeout);
          set({ tokenRefreshTimeout: undefined });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        rememberMe: state.rememberMe,
      }),
    }
  )
);

// Initialize auth on app start
export const initializeAuth = async () => {
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  
  if (accessToken && refreshToken) {
    useAuthStore.setState({
      accessToken,
      refreshToken,
      rememberMe: !!localStorage.getItem('accessToken'),
    });
    
    await useAuthStore.getState().checkAuth();
  }
};