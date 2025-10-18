import { useEffect, useState, useRef } from 'react';
import { useParrot } from '@/lib/stores/useParrot';
import { usePlatform } from '@/lib/stores/ui/usePlatform';

export function ParrotHolographicPopup() {
  const { settings, currentMessage } = useParrot();
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isMobile } = usePlatform();

  useEffect(() => {
    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (settings.isSpeaking && currentMessage) {
      setDisplayText(currentMessage);
      setVisible(true);
    } else {
      // Schedule hide with proper cleanup
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        hideTimeoutRef.current = null;
      }, 1000);
    }

    // Cleanup on unmount
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [settings.isSpeaking, currentMessage]);

  // Only show on desktop
  if (isMobile || !visible || !displayText) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${
        settings.isSpeaking ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl animate-pulse" />
        
        <div className="relative bg-gray-900/95 backdrop-blur-sm border-2 border-cyan-400/60 rounded-lg p-4 shadow-2xl shadow-cyan-500/50 min-w-[300px] max-w-[500px]">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center animate-pulse">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-cyan-400 mb-1 uppercase tracking-wider">
                Ship's Parrot
              </div>
              <div className="text-sm text-white leading-relaxed break-words">
                {displayText}
              </div>
            </div>
          </div>

          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />
        </div>

        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-cyan-500/10 blur-2xl rounded-full animate-pulse" />
      </div>
    </div>
  );
}
