import { useState, useMemo } from 'react';
import { X, Navigation, MapPin, Compass, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolarSystem, vec3Distance } from '../../../lib/stores/space/useSolarSystem';
import { useCreditsData } from '../../../domain/economy/selectors';
import { useAutopilot } from '../../../lib/stores/navigation/useAutopilot';
import { useRewards } from '../../../lib/stores/ui/useRewards';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { planets } from '../../../lib/planetData';
import * as THREE from 'three';
import { triggerHaptic } from '../../../utils/hapticFeedback';

interface NavigationPanelProps {
  onClose: () => void;
}

export function NavigationPanel({ onClose }: NavigationPanelProps) {
  const { config } = useMobileLayout();
  const { 
    selectedPlanet, 
    cameraPosition, 
    distanceToTarget,
    time, 
    setSelectedPlanet 
  } = useSolarSystem();
  const { credits, spendCredits } = useCreditsData();
  const { activateCinematic: activateAutopilot, isActive: isAutopilotActive } = useAutopilot();
  const { visitedPlanets } = useRewards();

  const planetsWithDistance = useMemo(() => {
    return planets
      .map((planet) => {
        const angle = time * planet.orbitalSpeed;
        const planetX = Math.cos(angle) * planet.distance;
        const planetZ = Math.sin(angle) * planet.distance;
        const planetPosition = new THREE.Vector3(planetX, 0, planetZ);
        const distance = vec3Distance(cameraPosition, planetPosition);

        return {
          ...planet,
          currentDistance: distance,
          position: planetPosition,
        };
      })
      .filter((planet) => planet.currentDistance <= 2000)
      .sort((a, b) => a.currentDistance - b.currentDistance);
  }, [cameraPosition, time]);

  const selectedPlanetData = selectedPlanet
    ? planets.find((p) => p.name === selectedPlanet)
    : null;

  const handleSelectPlanet = (planetName: string) => {
    if (planetName === "Sun") return;
    triggerHaptic();
    setSelectedPlanet(planetName);
  };

  const handleAutopilot = (planet: typeof planetsWithDistance[0]) => {
    const autopilotCost = 100;
    if (credits < autopilotCost || isAutopilotActive) return;

    triggerHaptic();
    if (spendCredits(autopilotCost)) {
      setSelectedPlanet(planet.name);
      
      const camVec = new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z);
      const approachDirection = camVec.sub(planet.position).normalize();
      const safeDistance = planet.size * 4;
      const targetPosition = planet.position
        .clone()
        .add(approachDirection.multiplyScalar(safeDistance));

      activateAutopilot(targetPosition);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
      />
      
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className={`relative w-full max-h-[80vh] ${config.panel.bg} ${config.panel.border} rounded-t-2xl overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-600/50">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-semibold">Navigation</span>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/50 active:scale-95"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400">CURRENT POSITION</span>
            </div>
            <div className="font-mono text-sm text-white">
              X: {Math.round(cameraPosition.x)} | Y: {Math.round(cameraPosition.y)} | Z: {Math.round(cameraPosition.z)}
            </div>
          </div>

          {selectedPlanet && selectedPlanetData && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-cyan-400/30">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-cyan-400">TARGET: {selectedPlanet}</span>
              </div>
              <div className="text-sm text-slate-300">{selectedPlanetData.description}</div>
              <div className="text-xs text-slate-400 mt-1">
                Distance: {Math.round(distanceToTarget)} units
                {visitedPlanets.has(selectedPlanet) && ' • Visited'}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">PLANETS IN RANGE</span>
            <span className="text-xs text-cyan-400">Autopilot: 100 credits</span>
          </div>

          <div className="space-y-2">
            {planetsWithDistance.length > 0 ? (
              planetsWithDistance.map((planet) => (
                <div
                  key={planet.name}
                  className={`p-3 rounded-lg border transition-colors ${
                    planet.name === selectedPlanet
                      ? 'bg-cyan-900/30 border-cyan-400/50'
                      : 'bg-slate-800/50 border-slate-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleSelectPlanet(planet.name)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: planet.color }}
                        />
                        <span className={`font-medium ${
                          planet.name === selectedPlanet ? 'text-cyan-400' : 'text-white'
                        }`}>
                          {planet.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {Math.round(planet.currentDistance)} units
                        {visitedPlanets.has(planet.name) && ' • Visited'}
                      </div>
                    </button>

                    <button
                      onClick={() => handleAutopilot(planet)}
                      disabled={credits < 100 || isAutopilotActive}
                      className={`ml-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                        credits < 100 || isAutopilotActive
                          ? 'bg-slate-600 text-slate-400'
                          : 'bg-cyan-600 text-white active:bg-cyan-500'
                      }`}
                    >
                      <Rocket className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 py-8">
                No planets within range
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
