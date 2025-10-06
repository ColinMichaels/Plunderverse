import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutopilot } from '../../lib/stores/navigation/useAutopilot';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useAudio } from '../../lib/stores/ui/useAudio';
import { useCreditsStore } from '../../domain/economy/credits.store';
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
  Globe,
  Coins,
  ChevronRight
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

// Constants from original components
const FAST_TRAVEL_BASE_FEE = 50;
const FUEL_COST_PER_100_UNITS = 10;

interface DestinationInfo {
  name: string;
  distance: number;
  eta: number;
  fuelRequired: number;
  isOrbiting: boolean;
  color: string;
}

export const NavigationPanel: React.FC = () => {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<DestinationInfo[]>([]);
  const [currentDistance, setCurrentDistance] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'engaging'>('offline');
  const [etaSeconds, setEtaSeconds] = useState<number>(0);
  const [isTraveling, setIsTraveling] = useState(false);
  const [activeTab, setActiveTab] = useState<'autopilot' | 'fast-travel'>('autopilot');
  const animationFrameRef = useRef<number>();
  
  // Store hooks
  const { 
    isActive, 
    target, 
    isOrbiting, 
    approachProgress, 
    activate, 
    deactivate,
    orbitRadius 
  } = useAutopilot();
  
  const { cameraPosition, shipPosition, setShipPosition, selectedPlanet: currentPlanet } = useSolarSystem();
  const { isLanded, landedPlanet } = useLandedState();
  const { equipment, updateEquipment, getEquipment } = useEquipment();
  const audio = useAudio();
  const shipStatus = useShipStatus();
  const { credits, spendCredits, addCredits } = useCreditsStore();
  
  // Get fuel equipment
  const fuelTank = getEquipment('fuel-tank');
  const currentFuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  const fuelPercentage = Math.round((currentFuel / maxFuel) * 100);
  
  // Calculate planet position
  const calculatePlanetPosition = (planet: any) => {
    const time = Date.now() * 0.001;
    const angle = time * planet.orbitalSpeed;
    const x = Math.cos(angle) * planet.distance;
    const z = Math.sin(angle) * planet.distance;
    return new THREE.Vector3(x, 0, z);
  };
  
  // Calculate destinations and their properties
  useEffect(() => {
    const updateDestinations = () => {
      const dests: DestinationInfo[] = planets.map(planet => {
        const planetPosition = calculatePlanetPosition(planet);
        const distance = cameraPosition.distanceTo(planetPosition);
        const speed = 5; // Base autopilot speed
        const eta = distance / speed;
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
      
      dests.sort((a, b) => a.distance - b.distance);
      setDestinations(dests);
    };
    
    updateDestinations();
    const interval = setInterval(updateDestinations, 1000);
    return () => clearInterval(interval);
  }, [cameraPosition]);
  
  // Update current distance and speed to target (for autopilot)
  useEffect(() => {
    if (target && isActive) {
      let lastDistance = cameraPosition.distanceTo(target);
      let lastTime = Date.now();
      
      const updateMetrics = () => {
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        const dist = cameraPosition.distanceTo(target);
        const speed = Math.abs(lastDistance - dist) / deltaTime;
        
        setCurrentDistance(Math.round(dist));
        setCurrentSpeed(Math.round(speed * 10) / 10);
        
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
  
  // Calculate fast travel costs
  const calculateFastTravelCosts = (targetPlanet: string) => {
    const planet = planets.find(p => p.name === targetPlanet);
    if (!planet) return { distance: 0, fuelCost: 0, creditFee: 0, totalCredits: 0 };
    
    if (!shipPosition || shipPosition.x === undefined) {
      return { distance: 0, fuelCost: 0, creditFee: 0, totalCredits: 0 };
    }

    const planetPos = new THREE.Vector3(planet.position.x, 0, planet.position.z);
    const currentPos = new THREE.Vector3(shipPosition.x, shipPosition.y, shipPosition.z);
    const distance = currentPos.distanceTo(planetPos);

    const fuelCost = Math.ceil((distance / 100) * FUEL_COST_PER_100_UNITS);
    const fuelCostClamped = Math.min(fuelCost, 100);
    const creditFee = FAST_TRAVEL_BASE_FEE;
    const totalCredits = creditFee;

    return { distance, fuelCost: fuelCostClamped, creditFee, totalCredits };
  };
  
  // Check if can afford fast travel
  const canFastTravel = (targetPlanet: string) => {
    const costs = calculateFastTravelCosts(targetPlanet);
    if (!fuelTank) return false;
    return credits >= costs.totalCredits && fuelPercentage >= costs.fuelCost;
  };
  
  // Handle autopilot engagement
  const handleEngageAutopilot = async () => {
    if (!selectedDestination) return;
    
    const planet = planets.find(p => p.name === selectedDestination);
    if (!planet) return;
    
    setSystemStatus('engaging');
    
    try {
      await audio.preloadSounds();
      audio.playLaser();
      setTimeout(() => {
        audio.playThruster(currentFuel);
      }, 200);
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
    
    const targetPosition = calculatePlanetPosition(planet);
    activate(targetPosition);
  };
  
  // Handle autopilot cancellation
  const handleCancelAutopilot = () => {
    audio.playSuccess();
    audio.stopThruster();
    
    deactivate();
    setSelectedDestination(null);
    setSystemStatus('offline');
  };
  
  // Execute fast travel
  const handleFastTravel = async () => {
    if (!selectedDestination) return;

    const planet = planets.find(p => p.name === selectedDestination);
    if (!planet) return;

    if (!canFastTravel(selectedDestination)) {
      if (!fuelTank) {
        alert('Cannot fast travel: No fuel tank equipped!');
      } else {
        alert('Insufficient fuel or credits for fast travel!');
      }
      return;
    }

    const costs = calculateFastTravelCosts(selectedDestination);
    setIsTraveling(true);
    
    let creditsDeducted = false;
    let fuelDeducted = false;
    let originalFuelDurability = fuelTank?.currentDurability || 0;

    try {
      // Deduct credits
      creditsDeducted = spendCredits(costs.totalCredits);
      if (!creditsDeducted) {
        throw new Error('Failed to deduct credits - insufficient funds');
      }
      console.log(`[FAST-TRAVEL] Deducted ${costs.totalCredits} credits`);

      // Deduct fuel
      if (!fuelTank) {
        throw new Error('Fuel equipment missing');
      }
      
      const fuelToDeduct = (costs.fuelCost / 100) * fuelTank.maxDurability;
      const newFuelDurability = Math.max(0, fuelTank.currentDurability - fuelToDeduct);
      
      updateEquipment(fuelTank.id, {
        currentDurability: newFuelDurability
      });
      
      fuelDeducted = true;
      console.log(`[FAST-TRAVEL] Consumed ${costs.fuelCost}% fuel`);

      // Teleport to planet orbit
      const orbitDistance = planet.size * 3;
      const targetPosition = new THREE.Vector3(
        planet.position.x + orbitDistance,
        0,
        planet.position.z
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      setShipPosition(targetPosition.x, targetPosition.y, targetPosition.z);

      console.log(`[FAST-TRAVEL] Traveled to ${selectedDestination} orbit`);
      
      setTimeout(() => {
        setIsTraveling(false);
        setSelectedDestination(null);
      }, 1000);
    } catch (error) {
      console.error('[FAST-TRAVEL] Failed:', error);
      
      // Rollback
      if (creditsDeducted) {
        addCredits(costs.totalCredits);
        console.log(`[FAST-TRAVEL-ROLLBACK] Refunded ${costs.totalCredits} credits`);
      }
      
      if (fuelDeducted && fuelTank) {
        updateEquipment(fuelTank.id, {
          currentDurability: originalFuelDurability
        });
        console.log(`[FAST-TRAVEL-ROLLBACK] Restored fuel`);
      }
      
      setIsTraveling(false);
      alert(`Fast travel failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Format ETA
  const formatETA = (seconds: number): string => {
    if (seconds === 0) return '--:--';
    if (seconds < 60) return `00:${seconds.toString().padStart(2, '0')}`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Get system status color
  const getSystemStatusColor = () => {
    switch(systemStatus) {
      case 'online': return 'text-green-400 shadow-green-400/50';
      case 'engaging': return 'text-yellow-400 shadow-yellow-400/50 animate-pulse';
      case 'offline': return 'text-gray-500';
    }
  };
  
  // Get system status text
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
                <p className="font-mono text-lg text-white font-bold tracking-wide">UNIFIED CONTROL</p>
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
              <span className="font-semibold">Navigation Offline</span>
            </div>
            <p className="text-sm text-red-300/80">
              Navigation systems unavailable while landed on {landedPlanet}. 
              Take off to access navigation controls.
            </p>
          </motion.div>
        )}
        
        {/* Navigation Tabs */}
        {!isLanded && (
          <Tabs defaultValue="autopilot" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
              <TabsTrigger 
                value="autopilot"
                className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"
              >
                <Compass className="w-4 h-4 mr-2" />
                Autopilot
              </TabsTrigger>
              <TabsTrigger 
                value="fast-travel"
                className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
              >
                <Zap className="w-4 h-4 mr-2" />
                Fast Travel
              </TabsTrigger>
            </TabsList>
            
            {/* Autopilot Tab */}
            <TabsContent value="autopilot" className="space-y-4">
              {/* Current flight status */}
              {isActive && target && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-slate-800/30 backdrop-blur-md border border-cyan-500/30 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-400/70">FLIGHT STATUS</span>
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                      <span className="text-xs font-mono text-cyan-400">ACTIVE</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Gauge className="w-3 h-3" />
                        <span className="text-xs">Speed</span>
                      </div>
                      <p className="font-mono text-cyan-400">{currentSpeed} u/s</p>
                    </div>
                    
                    <div className="p-2 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">Distance</span>
                      </div>
                      <p className="font-mono text-cyan-400">{currentDistance} units</p>
                    </div>
                    
                    <div className="p-2 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">ETA</span>
                      </div>
                      <p className="font-mono text-cyan-400">{formatETA(etaSeconds)}</p>
                    </div>
                    
                    <div className="p-2 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Crosshair className="w-3 h-3" />
                        <span className="text-xs">Progress</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                        <div 
                          className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${approachProgress * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {isOrbiting && (
                    <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <Globe className="w-4 h-4 text-green-400 animate-pulse" />
                      <span className="text-sm text-green-400">Maintaining orbital trajectory</span>
                    </div>
                  )}
                </motion.div>
              )}
              
              {/* Destination selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-mono text-orange-400">SELECT DESTINATION</h4>
                  <span className="text-xs text-gray-400">{destinations.length} available</span>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                  {destinations.map((dest) => (
                    <motion.button
                      key={dest.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDestination(dest.name)}
                      disabled={isActive}
                      className={`w-full p-3 rounded-lg transition-all ${
                        selectedDestination === dest.name 
                          ? 'bg-orange-500/20 border-2 border-orange-400' 
                          : 'bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50'
                      } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: dest.color }}
                          />
                          <div className="text-left">
                            <p className="font-mono text-sm text-white">{dest.name}</p>
                            <p className="text-xs text-gray-400">{dest.distance} units away</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-cyan-400 font-mono">
                            ETA: {formatETA(dest.eta)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Fuel: {dest.fuelRequired}%
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
              
              {/* Autopilot controls */}
              <div className="flex gap-3">
                {!isActive ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleEngageAutopilot}
                    disabled={!selectedDestination || isLanded}
                    className={`flex-1 py-3 px-4 rounded-lg font-mono text-sm transition-all ${
                      selectedDestination && !isLanded
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                        : 'bg-slate-800/50 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Play className="w-4 h-4" />
                      <span>ENGAGE AUTOPILOT</span>
                    </div>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCancelAutopilot}
                    className="flex-1 py-3 px-4 rounded-lg font-mono text-sm bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="w-4 h-4" />
                      <span>CANCEL AUTOPILOT</span>
                    </div>
                  </motion.button>
                )}
              </div>
            </TabsContent>
            
            {/* Fast Travel Tab */}
            <TabsContent value="fast-travel" className="space-y-4">
              {/* Resource status */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-gray-400">Credits:</span>
                  <span className="text-cyan-400 font-mono font-bold">{credits}c</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Fuel className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-400">Fuel:</span>
                  <span className={`font-mono font-bold ${fuelPercentage < 20 ? 'text-red-400' : 'text-orange-400'}`}>
                    {fuelPercentage}%
                  </span>
                </div>
              </div>
              
              {/* Fast travel warning */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-cyan-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs text-cyan-400 font-semibold">INSTANT TRAVEL</p>
                    <p className="text-xs text-cyan-300/80">
                      Fast travel consumes fuel and credits but gets you there instantly.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Destination list with costs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-mono text-cyan-400">FAST TRAVEL DESTINATIONS</h4>
                  <span className="text-xs text-gray-400">{destinations.length} available</span>
                </div>
                
                <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                  {destinations.map((dest) => {
                    const costs = calculateFastTravelCosts(dest.name);
                    const canAfford = canFastTravel(dest.name);
                    
                    return (
                      <motion.button
                        key={dest.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedDestination(dest.name)}
                        disabled={isTraveling || !canAfford}
                        className={`w-full p-3 rounded-lg transition-all ${
                          selectedDestination === dest.name 
                            ? 'bg-cyan-500/20 border-2 border-cyan-400' 
                            : canAfford
                              ? 'bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50'
                              : 'bg-slate-900/50 border border-red-500/30 opacity-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: dest.color }}
                            />
                            <div className="text-left">
                              <p className="font-mono text-sm text-white">{dest.name}</p>
                              <p className="text-xs text-gray-400">{dest.distance} units away</p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-2">
                              <Coins className="w-3 h-3 text-cyan-400" />
                              <span className={`text-xs font-mono ${canAfford ? 'text-cyan-400' : 'text-red-400'}`}>
                                {costs.totalCredits}c
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Fuel className="w-3 h-3 text-orange-400" />
                              <span className={`text-xs font-mono ${fuelPercentage >= costs.fuelCost ? 'text-orange-400' : 'text-red-400'}`}>
                                {costs.fuelCost}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {!canAfford && (
                          <div className="mt-2 text-xs text-red-400">
                            {credits < costs.totalCredits && 'Insufficient credits'}
                            {credits >= costs.totalCredits && fuelPercentage < costs.fuelCost && 'Insufficient fuel'}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              
              {/* Fast travel button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFastTravel}
                disabled={!selectedDestination || isTraveling || !canFastTravel(selectedDestination || '')}
                className={`w-full py-3 px-4 rounded-lg font-mono text-sm transition-all ${
                  selectedDestination && canFastTravel(selectedDestination)
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700'
                    : 'bg-slate-800/50 text-gray-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>{isTraveling ? 'TRAVELING...' : 'FAST TRAVEL'}</span>
                  {selectedDestination && canFastTravel(selectedDestination) && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </motion.button>
              
              {selectedDestination && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-slate-800/50 rounded-lg space-y-2"
                >
                  <p className="text-xs text-gray-400">Travel Summary:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Destination:</span>
                      <p className="text-white font-mono">{selectedDestination}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Cost:</span>
                      <p className="text-cyan-400 font-mono">
                        {calculateFastTravelCosts(selectedDestination).totalCredits}c
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Fuel Required:</span>
                      <p className="text-orange-400 font-mono">
                        {calculateFastTravelCosts(selectedDestination).fuelCost}%
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Travel Time:</span>
                      <p className="text-green-400 font-mono">Instant</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </motion.div>
  );
};