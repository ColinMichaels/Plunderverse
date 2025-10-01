import React, { useState, useEffect } from 'react';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useCreditsData } from '../../domain/economy/selectors';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Shield, AlertTriangle, DollarSign, Zap } from 'lucide-react';

export const PatrolEncounter: React.FC = () => {
  const { 
    patrolEncounter, 
    resolveEncounter, 
    wantedLevelInfo,
    currentHeat 
  } = useHeatSystem();
  const { credits } = useCreditsData();
  const { shield, hull } = useShipStatus();
  const [isProcessing, setIsProcessing] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  // Reset state when encounter changes
  useEffect(() => {
    if (!patrolEncounter) {
      setIsProcessing(false);
      setOutcome(null);
    }
  }, [patrolEncounter]);

  if (!patrolEncounter?.active) return null;

  const handleChoice = async (choice: 'submit' | 'bribe' | 'flee' | 'fight') => {
    setIsProcessing(true);
    
    // Add visual delay for tension
    setTimeout(() => {
      resolveEncounter(choice);
      
      // Set outcome message
      switch (choice) {
        case 'submit':
          setOutcome('Submitting to inspection...');
          break;
        case 'bribe':
          setOutcome(`Attempting to bribe patrol for ${patrolEncounter.bribeCost} credits...`);
          break;
        case 'flee':
          setOutcome('Attempting to escape...');
          break;
        case 'fight':
          setOutcome('Engaging hostile protocols...');
          break;
      }
      
      // Clear outcome after delay
      setTimeout(() => {
        setOutcome(null);
        setIsProcessing(false);
      }, 3000);
    }, 1000);
  };

  const getEncounterColor = () => {
    switch (patrolEncounter.encounterType) {
      case 'routine': return 'border-blue-500';
      case 'suspicious': return 'border-yellow-500';
      case 'hostile': return 'border-orange-500';
      case 'extreme': return 'border-red-500';
      default: return 'border-gray-500';
    }
  };

  const getEncounterIcon = () => {
    switch (patrolEncounter.encounterType) {
      case 'routine': return '🔍';
      case 'suspicious': return '⚠️';
      case 'hostile': return '🚨';
      case 'extreme': return '☠️';
      default: return '👁️';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`max-w-lg w-full mx-4 border-2 ${getEncounterColor()} rounded-lg bg-slate-900/95 p-6 shadow-2xl animate-pulse-slow`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getEncounterIcon()}</span>
            <h2 className="text-xl font-bold text-white">PATROL ENCOUNTER</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-mono bg-${wantedLevelInfo.color}/20 text-${wantedLevelInfo.color}`}>
            HEAT: {Math.round(currentHeat)}
          </div>
        </div>

        {/* Encounter Details */}
        <Alert className={`mb-4 ${getEncounterColor()} bg-slate-800/50`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-white">
            {patrolEncounter.patrolFaction.toUpperCase()} PATROL
          </AlertTitle>
          <AlertDescription className="text-gray-300 mt-2">
            <div className="space-y-1 text-sm">
              <p>Type: <span className="font-mono text-yellow-400">{patrolEncounter.encounterType.toUpperCase()}</span></p>
              <p>Inspection Risk: <span className="font-mono text-orange-400">{Math.round(patrolEncounter.inspectionRisk * 100)}%</span></p>
              {patrolEncounter.canBribe && (
                <p>Bribe Cost: <span className="font-mono text-green-400">{patrolEncounter.bribeCost} credits</span></p>
              )}
            </div>
          </AlertDescription>
        </Alert>

        {/* Current Status */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-cyan-400" />
            <p className="text-gray-400">Shield</p>
            <p className="font-mono text-cyan-400">{shield}%</p>
          </div>
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-400" />
            <p className="text-gray-400">Hull</p>
            <p className="font-mono text-yellow-400">{hull}%</p>
          </div>
          <div className="bg-slate-800/50 rounded p-2 text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-green-400" />
            <p className="text-gray-400">Credits</p>
            <p className="font-mono text-green-400">{credits}</p>
          </div>
        </div>

        {/* Outcome Message */}
        {outcome && (
          <Alert className="mb-4 border-blue-500 bg-blue-900/20">
            <AlertDescription className="text-blue-300 text-center font-mono">
              {outcome}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {!isProcessing && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleChoice('submit')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isProcessing}
            >
              <Shield className="h-4 w-4 mr-2" />
              Submit to Scan
            </Button>

            {patrolEncounter.canBribe && (
              <Button
                onClick={() => handleChoice('bribe')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
                disabled={isProcessing || credits < patrolEncounter.bribeCost}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Bribe ({patrolEncounter.bribeCost}cr)
              </Button>
            )}

            {patrolEncounter.canFlee && (
              <Button
                onClick={() => handleChoice('flee')}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                disabled={isProcessing}
              >
                <Zap className="h-4 w-4 mr-2" />
                Attempt Escape
              </Button>
            )}

            <Button
              onClick={() => handleChoice('fight')}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isProcessing || shield < 20}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Fight
            </Button>
          </div>
        )}

        {/* Warning Text */}
        <p className="text-xs text-gray-500 text-center mt-4 italic">
          {patrolEncounter.encounterType === 'extreme' 
            ? "⚠️ EXTREME DANGER - Combat highly likely!"
            : patrolEncounter.encounterType === 'hostile'
            ? "⚠️ Hostile patrol - Be careful!"
            : "Choose your response carefully..."}
        </p>
      </div>
    </div>
  );
};