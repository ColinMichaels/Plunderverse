import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Rocket, MapPin, Shield, Fuel } from "lucide-react";

interface GameTransitionOverlayProps {
  isVisible: boolean;
  status: string;
  subtitle?: string;
  progress?: number;
}

export function GameTransitionOverlay({
  isVisible,
  status,
  subtitle,
  progress,
}: GameTransitionOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
        >
          {/* Animated space background effect */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="stars-bg absolute inset-0" />
            <motion.div
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-gradient-radial from-cyan-900/20 via-transparent to-transparent"
            />
          </div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative z-10 text-center max-w-md px-8"
          >
            {/* Loading spinner with ship icon */}
            <div className="mb-8 relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-24 h-24 mx-auto border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Rocket className="w-10 h-10 text-orange-400" />
              </div>
            </div>

            {/* Status text */}
            <motion.h2
              key={status}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl font-bold text-cyan-400 mb-3"
            >
              {status}
            </motion.h2>

            {subtitle && (
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-slate-400 mb-6"
              >
                {subtitle}
              </motion.p>
            )}

            {/* Progress bar */}
            {progress !== undefined && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-6"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-orange-500"
                />
              </motion.div>
            )}

            {/* Loading tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5 }}
              className="space-y-2 text-sm text-slate-500"
            >
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Shields Online</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Fuel className="w-4 h-4" />
                <span>Fuel Systems Ready</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Navigation Calibrated</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
