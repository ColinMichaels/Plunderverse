import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutopilot } from '../../lib/stores/navigation/useAutopilot';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useFrame } from '@react-three/fiber';
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
  Pause
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
  const equipment = useEquipment();
  
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
  
  // Update current distance to target
  useEffect(() => {
    if (target && isActive) {
      const interval = setInterval(() => {
        const dist = cameraPosition.distanceTo(target);
        setCurrentDistance(Math.round(dist));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [target, isActive, cameraPosition]);
  
  const calculatePlanetPosition = (planet: any) => {
    const time = Date.now() * 0.001;
    const angle = time * planet.orbitalSpeed;
    const x = Math.cos(angle) * planet.distance;
    const z = Math.sin(angle) * planet.distance;
    return new THREE.Vector3(x, 0, z);
  };
  
  const handleEngageAutopilot = () => {
    if (!selectedDestination) return;
    
    const planet = planets.find(p => p.name === selectedDestination);
    if (!planet) return;
    
    const targetPosition = calculatePlanetPosition(planet);
    activate(targetPosition);
    console.log(`Autopilot engaged to ${selectedDestination}`);
  };
  
  const handleCancelAutopilot = () => {
    deactivate();
    setSelectedDestination(null);
  };
  
  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  const getStatusColor = () => {
    if (isOrbiting) return 'text-green-400';
    if (isActive) return 'text-yellow-400';
    return 'text-gray-400';
  };
  
  const getStatusText = () => {
    if (isOrbiting) return 'In Orbit';
    if (isActive) return 'Autopilot Active';
    return 'Manual Control';
  };
  
  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-lg border border-orange-500/30 p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-orange-500/20">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-orange-400" />
          <h3 className="font-mono text-sm text-orange-400">AUTOPILOT CONTROL</h3>
        </div>
        <div className={`flex items-center gap-1 ${getStatusColor()}`}>
          <CircleDot className="w-4 h-4" />
          <span className="text-xs font-mono">{getStatusText()}</span>
        </div>
      </div>
      
      {/* Current Status */}
      {isActive && (
        <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-orange-500/20">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Target:</span>
              <span className="text-orange-400 font-mono">
                {selectedDestination || 'Unknown'}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Distance:</span>
              <span className="text-cyan-400 font-mono">{currentDistance} km</span>
            </div>
            
            {isOrbiting && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Orbit Radius:</span>
                <span className="text-green-400 font-mono">{orbitRadius} km</span>
              </div>
            )}
            
            {!isOrbiting && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Approach:</span>
                  <span className="text-cyan-400 font-mono">
                    {Math.round(approachProgress * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${approachProgress * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Destination List */}
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500/30">
        <div className="text-xs text-gray-400 mb-2">SELECT DESTINATION:</div>
        {destinations.map((dest) => (
          <motion.button
            key={dest.name}
            onClick={() => setSelectedDestination(dest.name)}
            className={`w-full p-2 rounded-lg border transition-all ${
              selectedDestination === dest.name
                ? 'bg-orange-500/20 border-orange-500/50'
                : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-orange-500/30'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: dest.color }}
                />
                <span className="text-sm font-mono text-gray-200">{dest.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-cyan-400">{dest.distance}km</span>
                <span className="text-gray-500">{formatETA(dest.eta)}</span>
              </div>
            </div>
            
            {selectedDestination === dest.name && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-2 pt-2 border-t border-slate-700/50 space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Fuel className="w-3 h-3" />
                    <span>Fuel Required:</span>
                  </div>
                  <span className={`font-mono ${
                    currentFuel >= dest.fuelRequired ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {dest.fuelRequired}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>ETA:</span>
                  </div>
                  <span className="font-mono text-cyan-400">{formatETA(dest.eta)}</span>
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
      
      {/* Fuel Status */}
      <div className="mb-4 p-2 bg-slate-800/30 rounded-lg">
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="flex items-center gap-1 text-gray-400">
            <Fuel className="w-3 h-3" />
            <span>Fuel Tank:</span>
          </div>
          <span className={`font-mono ${
            currentFuel > 50 ? 'text-green-400' : 
            currentFuel > 20 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {currentFuel}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              currentFuel > 50 ? 'bg-green-500' : 
              currentFuel > 20 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${currentFuel}%` }}
          />
        </div>
      </div>
      
      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isActive ? (
          <motion.button
            onClick={handleEngageAutopilot}
            disabled={!selectedDestination || currentFuel < 10}
            className={`flex-1 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              selectedDestination && currentFuel >= 10
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600'
                : 'bg-slate-700 text-gray-500 cursor-not-allowed'
            }`}
            whileHover={selectedDestination && currentFuel >= 10 ? { scale: 1.05 } : {}}
            whileTap={selectedDestination && currentFuel >= 10 ? { scale: 0.95 } : {}}
          >
            <div className="flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              ENGAGE AUTOPILOT
            </div>
          </motion.button>
        ) : (
          <motion.button
            onClick={handleCancelAutopilot}
            className="flex-1 px-4 py-2 rounded-lg font-mono text-sm bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" />
              CANCEL AUTOPILOT
            </div>
          </motion.button>
        )}
      </div>
      
      {/* Keyboard Shortcut Hint */}
      <div className="mt-2 text-center text-xs text-gray-500">
        Press <span className="text-orange-400 font-mono">A</span> to toggle autopilot
      </div>
    </div>
  );
};