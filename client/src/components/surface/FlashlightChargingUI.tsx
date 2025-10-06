import { useState, useRef, useEffect } from "react";
import { useFlashlight } from "../../lib/stores/surface/useFlashlight";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { motion, AnimatePresence } from "framer-motion";

export function FlashlightChargingUI() {
  const {
    batteryLevel,
    isCharging,
    startCharging,
    stopCharging,
    getBatteryStatus,
    isOn: isFlashlightOn,
  } = useFlashlight();
  
  const { playSoundEffect } = useAudio();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const chargingSoundRef = useRef<HTMLAudioElement | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize charging sound
  useEffect(() => {
    const audio = new Audio('/sounds/zap.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    chargingSoundRef.current = audio;
    
    return () => {
      if (chargingSoundRef.current) {
        chargingSoundRef.current.pause();
        chargingSoundRef.current = null;
      }
    };
  }, []);

  // Handle charging sound
  useEffect(() => {
    if (isCharging && chargingSoundRef.current) {
      chargingSoundRef.current.play().catch(e => console.log("Could not play charging sound:", e));
    } else if (!isCharging && chargingSoundRef.current) {
      chargingSoundRef.current.pause();
      chargingSoundRef.current.currentTime = 0;
    }
  }, [isCharging]);

  // Show UI when battery is low or when hovering
  useEffect(() => {
    const status = getBatteryStatus();
    setShowUI(isHovered || batteryLevel < 50 || status === "low" || status === "critical");
  }, [batteryLevel, isHovered, getBatteryStatus]);

  const handleMouseDown = () => {
    if (batteryLevel >= 100) return;
    
    setIsPressed(true);
    startCharging();
    
    // Visual feedback
    if (playSoundEffect) {
      playSoundEffect('success');
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    stopCharging();
    
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    if (isCharging) {
      stopCharging();
    }
  };

  // Get color based on battery status
  const getBatteryColor = () => {
    const status = getBatteryStatus();
    if (status === "critical" || status === "dead") return "#ef4444"; // red
    if (status === "low") return "#f59e0b"; // amber
    if (isCharging) return "#06b6d4"; // cyan
    return "#10b981"; // green
  };

  // Calculate glow intensity based on battery level
  const getGlowIntensity = () => {
    if (isCharging) return "0 0 30px rgba(251, 146, 60, 0.8)";
    if (batteryLevel < 25) return "0 0 20px rgba(239, 68, 68, 0.6)";
    return "0 0 15px rgba(251, 146, 60, 0.3)";
  };

  return (
    <div 
      className="fixed bottom-32 right-8 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Charging Station Icon - Always visible */}
      <motion.div
        className="relative cursor-pointer"
        animate={{
          scale: isHovered ? 1.1 : 1,
        }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, rgba(251, 146, 60, ${isHovered ? 0.3 : 0.2}), rgba(217, 70, 15, ${isHovered ? 0.3 : 0.1}))`,
            backdropFilter: "blur(10px)",
            border: `2px solid rgba(251, 146, 60, ${isHovered ? 0.8 : 0.4})`,
            boxShadow: getGlowIntensity(),
          }}
        >
          <span className="text-3xl">⚡</span>
          
          {/* Battery indicator ring */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 64 64"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={getBatteryColor()}
              strokeWidth="3"
              strokeDasharray={`${batteryLevel * 1.76} 176`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{
                transition: "stroke-dasharray 0.3s ease",
              }}
            />
          </svg>
        </div>

        {/* Pulse animation when charging */}
        {isCharging && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
            style={{
              background: "radial-gradient(circle, rgba(251, 146, 60, 0.4), transparent)",
            }}
          />
        )}
      </motion.div>

      {/* Expanded UI Panel */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="absolute bottom-20 right-0 p-4 rounded-2xl min-w-[280px]"
            style={{
              background: "linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(17, 24, 39, 0.95))",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(251, 146, 60, 0.3)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <span className="text-sm font-semibold text-orange-400">
                  Flashlight Station
                </span>
              </div>
              {isFlashlightOn && (
                <span className="text-xs text-yellow-400 animate-pulse">ON</span>
              )}
            </div>

            {/* Battery Status */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Battery Level</span>
                <span style={{ color: getBatteryColor() }} className="font-bold">
                  {Math.round(batteryLevel)}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="relative w-full h-6 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-0 h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${getBatteryColor()}, rgba(251, 146, 60, 0.8))`,
                    width: `${batteryLevel}%`,
                  }}
                  animate={{
                    opacity: isCharging ? [0.7, 1, 0.7] : 1,
                  }}
                  transition={{
                    opacity: isCharging ? { duration: 1, repeat: Infinity } : {},
                  }}
                />
                
                {/* Animated charging particles */}
                {isCharging && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{
                      x: [-100, 100],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className="text-yellow-400 text-xs mx-1 opacity-50"
                      >
                        ⚡
                      </span>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Status Text */}
            <div className="text-center mb-3">
              <p className="text-xs text-gray-400">
                {getBatteryStatus() === "full" ? (
                  <span className="text-green-400">✓ Fully Charged</span>
                ) : isCharging ? (
                  <span className="text-cyan-400 animate-pulse">Charging...</span>
                ) : (
                  <span>Status: {getBatteryStatus()}</span>
                )}
              </p>
            </div>

            {/* Charge Button */}
            <motion.button
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: isPressed 
                  ? "linear-gradient(135deg, rgba(251, 146, 60, 0.8), rgba(217, 70, 15, 0.8))"
                  : batteryLevel >= 100
                  ? "linear-gradient(135deg, rgba(75, 85, 99, 0.5), rgba(55, 65, 81, 0.5))"
                  : "linear-gradient(135deg, rgba(251, 146, 60, 0.6), rgba(217, 70, 15, 0.6))",
                border: "1px solid rgba(251, 146, 60, 0.5)",
                color: batteryLevel >= 100 ? "#9ca3af" : "#fff",
                cursor: batteryLevel >= 100 ? "not-allowed" : "pointer",
                boxShadow: isPressed ? "0 0 20px rgba(251, 146, 60, 0.5)" : "none",
              }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={batteryLevel >= 100}
              whileHover={batteryLevel < 100 ? { scale: 1.02 } : {}}
              whileTap={batteryLevel < 100 ? { scale: 0.98 } : {}}
            >
              {batteryLevel >= 100 ? (
                "Fully Charged"
              ) : isCharging ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ⚡
                  </motion.span>
                  Hold to Charge
                </span>
              ) : (
                "🔋 Click & Hold to Charge"
              )}
            </motion.button>

            {/* Tips */}
            <div className="mt-2 text-xs text-gray-500 text-center">
              Press F to toggle flashlight
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}