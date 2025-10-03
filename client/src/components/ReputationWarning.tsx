import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, Skull, Users } from 'lucide-react';
import { usePlayer } from '../lib/stores/player/usePlayer';
import { useLandedState } from '../lib/stores/surface/useLandedState';
import { useSolarSystem } from '../lib/stores/space/useSolarSystem';

const ReputationWarning: React.FC = () => {
  const player = usePlayer();
  const { landedPlanet } = useLandedState();
  const { selectedPlanet } = useSolarSystem();
  const [warning, setWarning] = useState<{ message: string; severity: 'low' | 'medium' | 'high' } | null>(null);
  
  useEffect(() => {
    // Determine current faction based on location
    let locationFaction: 'corporations' | 'independents' | 'outlaws' = 'independents';
    const location = landedPlanet || selectedPlanet;
    
    if (!location) {
      setWarning(null);
      return;
    }
    
    // Determine faction of current location
    if (location === 'Earth' || location === 'Mars' || location === 'Earth Station' || location === 'Mars Station') {
      locationFaction = 'corporations';
    } else if (location === 'Uranus' || location === 'Neptune' || location === 'Uranus Station' || location === 'Neptune Station') {
      locationFaction = 'outlaws';
    } else {
      locationFaction = 'independents';
    }
    
    // Check reputation with current faction
    const factionRep = player.reputation[locationFaction] || 0;
    
    // Generate warning based on reputation
    if (factionRep <= -50) {
      setWarning({
        message: `⚠️ HOSTILE TERRITORY: ${locationFaction.toUpperCase()} forces will attack on sight!`,
        severity: 'high'
      });
    } else if (factionRep <= -20) {
      setWarning({
        message: `⚠️ UNFRIENDLY TERRITORY: ${locationFaction} services limited, prices increased`,
        severity: 'medium'
      });
    } else if (factionRep >= 75) {
      setWarning({
        message: `✅ ALLIED TERRITORY: ${locationFaction} welcomes you with special discounts`,
        severity: 'low'
      });
    } else {
      setWarning(null);
    }
    
  }, [landedPlanet, selectedPlanet, player.reputation]);
  
  if (!warning) return null;
  
  const bgColor = warning.severity === 'high' ? 'bg-red-900/80' :
                 warning.severity === 'medium' ? 'bg-orange-900/80' :
                 'bg-green-900/80';
  
  const borderColor = warning.severity === 'high' ? 'border-red-600' :
                     warning.severity === 'medium' ? 'border-orange-600' :
                     'border-green-600';
  
  const textColor = warning.severity === 'high' ? 'text-red-300' :
                   warning.severity === 'medium' ? 'text-orange-300' :
                   'text-green-300';
  
  const Icon = warning.severity === 'high' ? Skull :
              warning.severity === 'medium' ? AlertTriangle :
              Shield;
  
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-pulse">
      <div className={`${bgColor} ${borderColor} border-2 rounded-lg px-6 py-3 shadow-2xl`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${textColor}`} />
          <p className={`${textColor} font-bold text-sm`}>
            {warning.message}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReputationWarning;