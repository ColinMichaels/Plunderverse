import React, { useState, useEffect } from 'react';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Users, Star, Coins, AlertTriangle, Heart, Shield, Wrench, Crosshair, MessageSquare, Code } from 'lucide-react';

interface CrewRecruitmentInterfaceProps {
  stationFaction?: string;
  onClose?: () => void;
}

export function CrewRecruitmentInterface({ stationFaction = 'independents', onClose }: CrewRecruitmentInterfaceProps) {
  const { availableCrew, hireCrew, checkCompatibility, getCrewForStation, initializeCrew, activeCrew, maxCrewSize } = useCrewManagement();
  const credits = useCreditsStore();
  const player = usePlayer();
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [compatibilityWarnings, setCompatibilityWarnings] = useState<string[]>([]);
  
  // Initialize crew on mount if needed
  useEffect(() => {
    if (availableCrew.length === 0) {
      initializeCrew();
    }
  }, []);
  
  // Get crew available at this station
  const stationCrew = getCrewForStation(stationFaction);
  
  // Check compatibility when selecting crew
  useEffect(() => {
    if (selectedCrew) {
      const { warnings } = checkCompatibility(selectedCrew);
      setCompatibilityWarnings(warnings);
    }
  }, [selectedCrew, checkCompatibility]);
  
  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'pilot': return <Shield className="w-4 h-4" />;
      case 'mechanic': return <Wrench className="w-4 h-4" />;
      case 'medic': return <Heart className="w-4 h-4" />;
      case 'gunner': return <Crosshair className="w-4 h-4" />;
      case 'negotiator': return <MessageSquare className="w-4 h-4" />;
      case 'hacker': return <Code className="w-4 h-4" />;
      default: return null;
    }
  };
  
  const getTopSkill = (skills: Record<string, number>) => {
    return Object.entries(skills).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  };
  
  const handleHire = (crewId: string) => {
    const result = hireCrew(crewId);
    if (result.success) {
      setSelectedCrew(null);
      // Show success message
      console.log(result.message);
    } else {
      // Show error message
      console.error(result.message);
    }
  };
  
  const getReputationColor = (faction: string | null) => {
    if (!faction) return 'text-gray-400';
    const rep = player.reputation[faction as keyof typeof player.reputation];
    if (rep >= 50) return 'text-green-400';
    if (rep >= 0) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <div className="max-w-6xl mx-auto p-4 bg-black/80 rounded-lg backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Crew Recruitment Office
          </h2>
          <p className="text-gray-400 mt-1">
            {stationCrew.length} crew available at this station • {activeCrew.length}/{maxCrewSize} crew slots filled
          </p>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="ghost" className="text-gray-400">
            Close
          </Button>
        )}
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Crew List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
          {stationCrew.map((crew) => {
            const topSkill = getTopSkill(crew.skills);
            const canAfford = credits.credits >= crew.hiringCost;
            const isSelected = selectedCrew === crew.id;
            
            return (
              <Card 
                key={crew.id} 
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-950/50' : 'hover:bg-gray-900/50'
                }`}
                onClick={() => setSelectedCrew(crew.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-white">{crew.name}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1">{crew.title}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={canAfford ? 'default' : 'destructive'}>
                        <Coins className="w-3 h-3 mr-1" />
                        {crew.hiringCost}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">+{crew.dailySalary}/day</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getSkillIcon(topSkill)}
                      <span className="ml-1 capitalize">{topSkill}</span>
                    </Badge>
                    {crew.preferredFaction && (
                      <Badge variant="outline" className={`text-xs ${getReputationColor(crew.preferredFaction)}`}>
                        Prefers {crew.preferredFaction}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Starting Loyalty</span>
                    <div className="flex items-center gap-2">
                      <Progress value={crew.startingLoyalty} className="w-20 h-2" />
                      <span className="text-white">{crew.startingLoyalty}%</span>
                    </div>
                  </div>
                  
                  {/* Top 3 skills preview */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(crew.skills)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([skill, value]) => (
                        <div key={skill} className="flex items-center gap-1">
                          {getSkillIcon(skill)}
                          <span className="text-gray-400">{value}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Crew Details */}
        {selectedCrew && (
          <div className="space-y-4">
            {stationCrew
              .filter(c => c.id === selectedCrew)
              .map(crew => (
                <div key={crew.id} className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-white">{crew.name}</CardTitle>
                      <p className="text-sm text-gray-400">{crew.title}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Background</h4>
                        <p className="text-sm text-gray-300">{crew.background}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Personality</h4>
                        <div className="flex flex-wrap gap-1">
                          {crew.personality.traits.map(trait => (
                            <Badge key={trait} variant="outline" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Skills</h4>
                        <div className="space-y-2">
                          {Object.entries(crew.skills).map(([skill, value]) => (
                            <div key={skill} className="flex items-center gap-2">
                              <div className="flex items-center gap-1 w-24">
                                {getSkillIcon(skill)}
                                <span className="text-xs text-gray-400 capitalize">{skill}</span>
                              </div>
                              <Progress value={value} className="flex-1 h-2" />
                              <span className="text-xs text-white w-8 text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Skill Bonuses</h4>
                        <p className="text-sm text-gray-300">
                          Primary: <span className="text-blue-400">{crew.bonusEffects.primary.replace(/_/g, ' ')}</span>
                        </p>
                        <p className="text-sm text-gray-300">
                          Secondary: <span className="text-green-400">{crew.bonusEffects.secondary.replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Personal Quest</h4>
                        <p className="text-sm text-yellow-400">{crew.personalQuest.title}</p>
                        <p className="text-xs text-gray-400 mt-1">Unlocks at {crew.personalQuest.triggerLoyalty} loyalty</p>
                      </div>
                      
                      {/* Compatibility Warnings */}
                      {compatibilityWarnings.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-semibold mb-1">Compatibility Issues:</p>
                            {compatibilityWarnings.map((warning, i) => (
                              <p key={i} className="text-xs">{warning}</p>
                            ))}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Faction Requirements */}
                      {crew.hatedFaction && player.reputation[crew.hatedFaction as keyof typeof player.reputation] > 50 && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            {crew.name} refuses to work with someone friendly to {crew.hatedFaction}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => handleHire(crew.id)}
                          disabled={
                            !credits.credits || 
                            credits.credits < crew.hiringCost ||
                            activeCrew.length >= maxCrewSize ||
                            (crew.hatedFaction && player.reputation[crew.hatedFaction as keyof typeof player.reputation] > 50)
                          }
                        >
                          <Coins className="w-4 h-4 mr-2" />
                          Hire for {crew.hiringCost} credits
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        )}
        
        {!selectedCrew && (
          <div className="flex items-center justify-center h-[400px] text-gray-500">
            <p>Select a crew member to view details</p>
          </div>
        )}
      </div>
      
      {/* Credits Display */}
      <div className="mt-4 flex justify-between items-center text-sm">
        <p className="text-gray-400">
          Current Credits: <span className="text-white font-semibold">{credits.credits}</span>
        </p>
        {activeCrew.length > 0 && (
          <p className="text-gray-400">
            Daily Salary Costs: <span className="text-yellow-400 font-semibold">
              {activeCrew.reduce((sum, crew) => sum + crew.dailySalary, 0)} credits/day
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

const style = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.7);
  }
`;

// Add styles to document
if (typeof document !== 'undefined' && !document.querySelector('#crew-recruitment-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'crew-recruitment-styles';
  styleSheet.textContent = style;
  document.head.appendChild(styleSheet);
}