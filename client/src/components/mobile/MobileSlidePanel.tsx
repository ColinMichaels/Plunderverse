import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { triggerHaptic } from '../../utils/hapticFeedback';

interface MobileSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: 'full' | 'auto' | '3/4' | '1/2';
  showHandle?: boolean;
}

/**
 * Mobile-optimized slide-up panel component
 * Features:
 * - Smooth slide-up animation
 * - Swipe down to close gesture
 * - Touch-optimized close button
 * - Backdrop click to close
 * - Configurable height
 */
export const MobileSlidePanel: React.FC<MobileSlidePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = '3/4',
  showHandle = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle drag end to determine if panel should close
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    // Close if dragged down more than 100px or with enough velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      triggerHaptic();
      onClose();
    }
  };
  
  const getHeightClass = () => {
    switch (height) {
      case 'full': return 'h-full';
      case '3/4': return 'h-3/4';
      case '1/2': return 'h-1/2';
      case 'auto': return 'h-auto max-h-[85vh]';
      default: return 'h-3/4';
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      triggerHaptic();
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
          />
          
          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            transition={{ 
              type: 'spring', 
              damping: 30, 
              stiffness: 400,
              mass: 0.8
            }}
            className={`fixed inset-x-0 bottom-0 z-[70] ${getHeightClass()}
                      bg-gradient-to-b from-slate-900 to-slate-800 
                      border-t-2 border-orange-600/30 rounded-t-2xl
                      shadow-2xl flex flex-col ${isDragging ? 'cursor-grabbing' : ''}`}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div className="flex justify-center py-2 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
              </div>
            )}
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <button
                onClick={() => {
                  triggerHaptic();
                  onClose();
                }}
                className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center
                         active:bg-slate-600/50 transition-colors"
                aria-label="Close panel"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};