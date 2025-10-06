import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutopilot } from '../../lib/stores/navigation/useAutopilot';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useAudio } from '../../lib/stores/ui/useAudio';
import { planets } from '../../lib/planetData';
import * as THREE from 'three';
import {
  Navigation,
  Target,
  Rocket,
  CircleDot,
  AlertCircle,
  Fuel,
  Clock,
  Gauge,
  MapPin,
  XCircle,
  Play,
  Pause,
  AlertTriangle,
  Zap,
  Activity,
  Radio,
  RotateCcw,
  Crosshair,
  Compass,
  Globe
} from 'lucide-react';

interface DestinationInfo {
  name: string;
  distance: number;
  eta: number; // in seconds
  fuelRequired: number;
  isOrbiting: boolean;
  color: string;
}

export const AutopilotPanel: React.FC = () => {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<DestinationInfo[]>([]);
  const [currentDistance, setCurrentDistance] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'engaging'>('offline');
  const [etaSeconds, setEtaSeconds] = useState<number>(0);
  const animationFrameRef = useRef<number>();
  
  const { 
    isActive, 
    target, 
    isOrbiting, 
    approachProgress, 
    activate, 
    deactivate,
    orbitRadius 
  } = useAutopilot();
  
  const { cameraPosition } = useSolarSystem();
  const { isLanded, landedPlanet } = useLandedState();
  const equipment = useEquipment();
  const audio = useAudio();
  
  const fuelTank = equipment.getEquipment('fuel-tank');
  const currentFuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  
  // Calculate destinations and their properties
  useEffect(() => {
    const updateDestinations = () => {
      const dests: DestinationInfo[] = planets.map(planet => {
        const planetPosition = calculatePlanetPosition(planet);
        const distance = cameraPosition.distanceTo(planetPosition);
        const speed = 5; // Base autopilot speed
        const eta = distance / speed; // In seconds
        const fuelPerUnit = 0.1;
        const fuelRequired = Math.min(100, distance * fuelPerUnit);
        
        return {
          name: planet.name,
          distance: Math.round(distance),
          eta: Math.round(eta),
          fuelRequired: Math.round(fuelRequired),
          isOrbiting: false,
          color: planet.color
        };
      });
      
      // Sort by distance
      dests.sort((a, b) => a.distance - b.distance);
      setDestinations(dests);
    };
    
    updateDestinations();
    const interval = setInterval(updateDestinations, 1000);
    return () => clearInterval(interval);
  }, [cameraPosition]);
  
  // Update current distance and speed to target
  useEffect(() => {
    if (target && isActive) {
      let lastDistance = cameraPosition.distanceTo(target);
      let lastTime = Date.now();
      
      const updateMetrics = () => {
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        const dist = cameraPosition.distanceTo(target);
        
        // Calculate speed (distance change per second)
        const speed = Math.abs(lastDistance - dist) / deltaTime;
        
        setCurrentDistance(Math.round(dist));
        setCurrentSpeed(Math.round(speed * 10) / 10); // Round to 1 decimal
        
        // Calculate ETA
        if (speed > 0) {
          setEtaSeconds(Math.round(dist / speed));
        }
        
        lastDistance = dist;
        lastTime = currentTime;
        
        animationFrameRef.current = requestAnimationFrame(updateMetrics);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateMetrics);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      setCurrentSpeed(0);
      setEtaSeconds(0);
    }
  }, [target, isActive, cameraPosition]);
  
  // Update system status
  useEffect(() => {
    if (isActive) {
      setSystemStatus('online');
    } else if (systemStatus === 'engaging') {
      const timeout = setTimeout(() => setSystemStatus('offline'), 1000);
      return () => clearTimeout(timeout);
    } else {
      setSystemStatus('offline');
    }
  }, [isActive]);
  
  const calculatePlanetPosition = (planet: any) => {
    const time = Date.now() * 0.001;
    const angle = time * planet.orbitalSpeed;
    const x = Math.cos(angle) * planet.distance;
    const z = Math.sin(angle) * planet.distance;
    return new THREE.Vector3(x, 0, z);
  };
  
  const handleEngageAutopilot = async () => {
    if (!selectedDestination) return;
    
    const planet = planets.find(p => p.name === selectedDestination);
    if (!planet) return;
    
    setSystemStatus('engaging');
    
    // Play engage sound effect
    try {
      await audio.preloadSounds();
      audio.playLaser(); // Using laser sound as engage effect
      setTimeout(() => {
        audio.playThruster(currentFuel); // Start thruster sound after engage
      }, 200);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
    
    const targetPosition = calculatePlanetPosition(planet);
    activate(targetPosition);
  };
  
  const handleCancelAutopilot = () => {
    // Play disengage sound effect
    audio.playSuccess(); // Using success sound as disengage effect
    audio.stopThruster();
    
    deactivate();
    setSelectedDestination(null);
    setSystemStatus('offline');
  };
  
  const formatETA = (seconds: number): string => {
    if (seconds === 0) return '--:--';
    if (seconds < 60) return `00:${seconds.toString().padStart(2, '0')}`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getSystemStatusColor = () => {
    switch(systemStatus) {
      case 'online': return 'text-green-400 shadow-green-400/50';
      case 'engaging': return 'text-yellow-400 shadow-yellow-400/50 animate-pulse';
      case 'offline': return 'text-gray-500';
    }
  };
  
  const getSystemStatusText = () => {
    if (isOrbiting) return 'ORBITAL LOCK';
    switch(systemStatus) {
      case 'online': return 'AUTOPILOT ENGAGED';
      case 'engaging': return 'SYSTEMS ENGAGING...';
      case 'offline': return 'STANDBY MODE';
    }
  };
  
  return (
    <motion.div 
      className="relative w-96 overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Glassmorphism background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-blue-950/40 to-orange-950/30 backdrop-blur-xl rounded-2xl" />
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl">
        <div className="absolute inset-0 rounded-2xl border-2 border-orange-500/20 animate-pulse" />
        <div className="absolute inset-0 rounded-2xl border border-cyan-500/10" />
      </div>
      
      {/* Holographic scan lines effect */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-line" />
      </div>
      
      <div className="relative p-6 space-y-4">
        {/* Header with system status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Navigation className={`w-6 h-6 text-orange-400 ${isActive ? 'animate-spin-slow' : ''}`} />
                <div className={`absolute inset-0 blur-xl ${isActive ? 'bg-orange-400/30 animate-pulse' : ''}`} />
              </div>
              <div>
                <h3 className="font-mono text-xs text-orange-400/70 tracking-wider">NAVIGATION SYSTEM</h3>
                <p className="font-mono text-lg text-white font-bold tracking-wide">AUTOPILOT CONTROL</p>
              </div>
            </div>
            
            {/* System status indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <CircleDot className={`w-3 h-3 ${getSystemStatusColor()}`} />
              <span className={`text-xs font-mono ${getSystemStatusColor()}`}>
                {getSystemStatusText()}
              </span>
            </div>
          </div>
          
          {/* Status indicators bar */}
          <div className="flex items-center gap-4 px-3 py-2 bg-slate-800/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Radio className={`w-3 h-3 ${isActive ? 'text-green-400' : 'text-gray-500'}`} />
              <span className="text-xs font-mono text-gray-400">COMM</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className={`w-3 h-3 ${currentFuel > 20 ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-xs font-mono text-gray-400">PWR</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className={`w-3 h-3 ${isActive ? 'text-cyan-400 animate-pulse' : 'text-gray-500'}`} />
              <span className="text-xs font-mono text-gray-400">NAV</span>
            </div>
            <div className="flex items-center gap-2">
              <Crosshair className={`w-3 h-3 ${target ? 'text-orange-400' : 'text-gray-500'}`} />
              <span className="text-xs font-mono text-gray-400">LOCK</span>
            </div>
          </div>
        </div>
        
        {/* Unavailable when landed message */}
        {isLanded && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl"
          >
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <span className="font-mono text-sm tracking-wider">SYSTEM LOCKOUT</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Navigation systems offline while docked at <span className="text-orange-400">{landedPlanet || 'surface'}</span>.
              Initiate launch sequence to restore autopilot functionality.
            </p>
          </motion.div>
        )}
        
        {/* Main content when not landed */}
        {!isLanded && (
          <AnimatePresence mode="wait">
            {/* Active autopilot status panel */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 p-4 bg-gradient-to-br from-cyan-500/10 to-orange-500/10 backdrop-blur-md rounded-xl border border-cyan-500/20"
              >
                {/* Destination and trajectory */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400 font-mono">TARGET DESTINATION</p>
                      <p className="text-sm font-bold text-orange-400">{selectedDestination || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-mono">DISTANCE</p>
                    <p className="text-lg font-mono font-bold text-cyan-400">{currentDistance} km</p>
                  </div>
                </div>
                
                {/* Speed and ETA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Gauge className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-gray-400">VELOCITY</span>
                    </div>
                    <p className="text-lg font-mono text-green-400">{currentSpeed} km/s</p>
                  </div>
                  <div className="p-2 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs text-gray-400">ETA</span>
                    </div>
                    <p className="text-lg font-mono text-yellow-400">{formatETA(etaSeconds)}</p>
                  </div>
                </div>
                
                {/* Approach progress with animated trajectory */}
                {!isOrbiting && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-mono">APPROACH VECTOR</span>
                      <span className="text-cyan-400 font-mono">
                        {Math.round(approachProgress * 100)}%
                      </span>
                    </div>
                    <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden">
                      {/* Animated trajectory line */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-slide" />
                      </div>
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-orange-400 relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${approachProgress * 100}%` }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Pulsing endpoint */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-pulse" />
                      </motion.div>
                    </div>
                  </div>
                )}
                
                {/* Orbital status */}
                {isOrbiting && (
                  <div className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-green-400 animate-spin-slow" />
                      <span className="text-xs font-mono text-green-400">STABLE ORBIT ACHIEVED</span>
                    </div>
                    <span className="text-xs font-mono text-white">{orbitRadius} km</span>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Destination selection grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 tracking-wider">NAVIGATION TARGETS</span>
                <span className="text-xs font-mono text-orange-400/60">
                  {destinations.length} AVAILABLE
                </span>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent pr-2">
                {destinations.map((dest) => (
                  <motion.button
                    key={dest.name}
                    onClick={() => setSelectedDestination(dest.name)}
                    className={`w-full group relative overflow-hidden rounded-lg transition-all ${
                      selectedDestination === dest.name
                        ? 'bg-gradient-to-r from-orange-500/20 to-cyan-500/20 border border-orange-500/40'
                        : 'bg-slate-800/20 border border-slate-700/20 hover:bg-slate-800/40 hover:border-cyan-500/30'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Hover effect glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Planet indicator with glow */}
                          <div className="relative">
                            <div 
                              className="w-4 h-4 rounded-full relative z-10"
                              style={{ backgroundColor: dest.color }}
                            />
                            <div 
                              className="absolute inset-0 rounded-full blur-md opacity-60"
                              style={{ backgroundColor: dest.color }}
                            />
                          </div>
                          
                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">{dest.name}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-cyan-400 font-mono">{dest.distance}km</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-400">{formatETA(dest.eta)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <div className={`flex items-center gap-1 ${
                            currentFuel >= dest.fuelRequired ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <Fuel className="w-3 h-3" />
                            <span className="text-xs font-mono">{dest.fuelRequired}%</span>
                          </div>
                          {selectedDestination === dest.name && (
                            <Crosshair className="w-3 h-3 text-orange-400 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Fuel gauge */}
            <div className="p-3 bg-slate-800/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className={`w-4 h-4 ${
                    currentFuel > 50 ? 'text-green-400' : 
                    currentFuel > 20 ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                  <span className="text-xs font-mono text-gray-400">FUEL RESERVES</span>
                </div>
                <span className={`text-sm font-mono font-bold ${
                  currentFuel > 50 ? 'text-green-400' : 
                  currentFuel > 20 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {currentFuel}%
                </span>
              </div>
              <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full relative ${
                    currentFuel > 50 ? 'bg-gradient-to-r from-green-500 to-green-400' : 
                    currentFuel > 20 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 
                    'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentFuel}%` }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Animated fuel particles */}
                  <div className="absolute inset-0 opacity-50">
                    <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-slide" />
                  </div>
                </motion.div>
              </div>
            </div>
            
            {/* Control buttons */}
            <div className="flex gap-3">
              {!isActive ? (
                <motion.button
                  onClick={handleEngageAutopilot}
                  disabled={!selectedDestination || currentFuel < 10}
                  className={`flex-1 relative overflow-hidden rounded-lg font-mono text-sm transition-all ${
                    selectedDestination && currentFuel >= 10
                      ? 'bg-gradient-to-r from-orange-500/80 to-orange-600/80 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50'
                      : 'bg-slate-700/50 text-gray-500 cursor-not-allowed'
                  }`}
                  whileHover={selectedDestination && currentFuel >= 10 ? { scale: 1.02 } : {}}
                  whileTap={selectedDestination && currentFuel >= 10 ? { scale: 0.98 } : {}}
                >
                  {/* Animated background effect */}
                  {selectedDestination && currentFuel >= 10 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide" />
                  )}
                  
                  <div className="relative flex items-center justify-center gap-2 px-4 py-3">
                    <Play className="w-4 h-4" />
                    <span className="tracking-wider">ENGAGE AUTOPILOT</span>
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleCancelAutopilot}
                  className="flex-1 relative overflow-hidden rounded-lg font-mono text-sm bg-gradient-to-r from-red-500/80 to-red-600/80 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Animated warning stripes */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="h-full bg-repeating-linear-gradient-45 animate-slide-slow" />
                  </div>
                  
                  <div className="relative flex items-center justify-center gap-2 px-4 py-3">
                    <XCircle className="w-4 h-4" />
                    <span className="tracking-wider">DISENGAGE SYSTEMS</span>
                  </div>
                </motion.button>
              )}
            </div>
            
            {/* Keyboard shortcut hint */}
            <div className="text-center">
              <span className="text-xs text-gray-500 font-mono">
                HOTKEY: <span className="text-orange-400/70 bg-slate-800/50 px-2 py-0.5 rounded">A</span>
              </span>
            </div>
          </AnimatePresence>
        )}
      </div>
      
      {/* Custom styles for animations */}
      <style jsx>{`
        @keyframes scan-line {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(100vh);
          }
        }
        
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes slide-slow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(50px);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
        
        .animate-slide {
          animation: slide 2s linear infinite;
        }
        
        .animate-slide-slow {
          animation: slide-slow 1s linear infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
        
        .bg-repeating-linear-gradient-45 {
          background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.1) 10px,
            rgba(255,255,255,0.1) 20px
          );
        }
      `}</style>
    </motion.div>
  );
};