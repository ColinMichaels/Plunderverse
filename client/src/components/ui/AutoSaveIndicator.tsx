import React, { useState, useEffect, useRef } from 'react';
import { useAutoSaveState } from '../../hooks/useAutoSave';

export const AutoSaveIndicator: React.FC = () => {
  // Use the lightweight state-only hook to avoid creating duplicate timers
  const { isSaving, saveMessage, lastSaveTime } = useAutoSaveState();
  const [isVisible, setIsVisible] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    if (isSaving || saveMessage) {
      setIsVisible(true);
      setDisplayMessage(isSaving ? 'Saving...' : saveMessage);

      // Auto-hide after showing message
      if (!isSaving) {
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, saveMessage.includes('failed') ? 5000 : 2000);
      }
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isSaving, saveMessage]);

  // Don't render anything if not visible
  if (!isVisible && !isSaving) {
    return null;
  }

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 pointer-events-none
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div 
        className={`
          px-3 py-1.5 rounded-md backdrop-blur-sm
          flex items-center gap-2 text-xs font-medium
          shadow-lg border transition-colors duration-200
          ${isSaving 
            ? 'bg-blue-900/30 border-blue-500/30 text-blue-300' 
            : saveMessage.includes('failed')
            ? 'bg-red-900/30 border-red-500/30 text-red-300'
            : saveMessage.includes('saved') || saveMessage.includes('Saved')
            ? 'bg-green-900/30 border-green-500/30 text-green-300'
            : 'bg-amber-900/30 border-amber-500/30 text-amber-300'
          }
        `}
        style={{ opacity: 0.9 }}
      >
        {/* Spinner or icon */}
        {isSaving ? (
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 border-2 border-current opacity-20 rounded-full" />
            <div className="absolute inset-0 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        ) : saveMessage.includes('failed') ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        
        {/* Message */}
        <span>{displayMessage}</span>
      </div>
    </div>
  );
};