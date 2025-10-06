import { useEffect, useState } from "react";
import { useFocusState } from "@/lib/stores/ui/useFocusState";
import { motion, AnimatePresence } from "framer-motion";

export function FocusIndicator() {
  const { hasFocus } = useFocusState();
  const [showMessage, setShowMessage] = useState(!hasFocus);

  useEffect(() => {
    if (!hasFocus) {
      setShowMessage(true);
    } else {
      // Keep the message visible for a moment after regaining focus
      const timer = setTimeout(() => setShowMessage(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [hasFocus]);

  return (
    <AnimatePresence>
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className={`
            px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm
            flex items-center gap-2 text-sm font-medium
            ${hasFocus 
              ? 'bg-green-900/80 text-green-200 border border-green-600/50' 
              : 'bg-orange-900/80 text-orange-200 border border-orange-600/50'
            }
          `}>
            <div className={`
              w-2 h-2 rounded-full animate-pulse
              ${hasFocus ? 'bg-green-400' : 'bg-orange-400'}
            `} />
            {hasFocus 
              ? "Controls Active" 
              : "Click Game to Enable Controls"
            }
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Small persistent indicator in the corner
export function FocusStatusIndicator() {
  const { hasFocus } = useFocusState();

  return (
    <div className="fixed top-4 right-4 z-40">
      <motion.div 
        animate={{ 
          scale: hasFocus ? 1 : 1.1,
          opacity: hasFocus ? 0.7 : 1 
        }}
        transition={{ duration: 0.3 }}
        className={`
          px-3 py-1.5 rounded-full backdrop-blur-sm text-xs font-medium
          flex items-center gap-2 shadow-lg
          ${hasFocus 
            ? 'bg-green-900/60 text-green-300 border border-green-600/30' 
            : 'bg-red-900/60 text-red-300 border border-red-600/30'
          }
        `}
      >
        <div className={`
          w-1.5 h-1.5 rounded-full
          ${hasFocus 
            ? 'bg-green-400 animate-pulse' 
            : 'bg-red-400 animate-ping'
          }
        `} />
        <span>{hasFocus ? 'Controls On' : 'Controls Off'}</span>
      </motion.div>
    </div>
  );
}