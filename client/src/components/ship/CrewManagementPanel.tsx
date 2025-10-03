import React, { useState, useEffect } from 'react';
import { useCrewManagement, CrewMember } from '../../lib/stores/ship/useCrewManagement';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Users, 
  Star, 
  Coins, 
  AlertTriangle, 
  Heart, 
  Shield, 
  Wrench, 
  Crosshair, 
  MessageSquare, 
  Code,
  TrendingUp,
  TrendingDown,
  Clock,
  Award,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface CrewManagementPanelProps {
  onClose?: () => void;
  onOpenRecruitment?: () => void;
}

export function CrewManagementPanel({ onClose, onOpenRecruitment }: CrewManagementPanelProps) {
  const { 
    activeCrew, 
    maxCrewSize,
    dailySalaryCosts,
    currentBonuses,
    payCrew,
    fireCrew,
    checkDesertion,
    getCrewDialogue,
    crewEvents,
    initializeCrew
  } = useCrewManagement();
  
  const credits = useCreditsStore();
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [showConfirmFire, setShowConfirmFire] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  
  // Initialize crew if needed
  useEffect(() => {
    if (activeCrew.length === 0) {
      initializeCrew();
    }
  }, []);
  
  // Check for desertion periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const deserters = checkDesertion();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [checkDesertion]);
  
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
  
  const getLoyaltyStatus = (loyalty: number) => {
    if (loyalty >= 95) return { label: 'Devoted', color: 'text-purple-400', icon: <Sparkles className="w-4 h-4" /> };
    if (loyalty >= 80) return { label: 'Loyal', color: 'text-green-400', icon: <Heart className="w-4 h-4" /> };
    if (loyalty >= 60) return { label: 'Neutral', color: 'text-yellow-400', icon: <Star className="w-4 h-4" /> };
    if (loyalty >= 30) return { label: 'Unhappy', color: 'text-orange-400', icon: <TrendingDown className="w-4 h-4" /> };
    return { label: 'Hostile', color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> };
  };
  
  const handlePayCrew = () => {
    const result = payCrew();
    setPaymentMessage(result.message);
    setTimeout(() => setPaymentMessage(null), 5000);
  };
  
  const handleFireCrew = (crewId: string) => {
    const result = fireCrew(crewId);
    setShowConfirmFire(null);
    setSelectedCrew(null);
  };
  
  const getTopSkill = (skills: Record<string, number>) => {
    return Object.entries(skills).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  };
  
  const formatBonus = (value: number, type: string) => {
    if (type.includes('cost') || type.includes('price')) {
      return `${(value * 100).toFixed(0)}%`;
    }
    if (type.includes('efficiency') || type.includes('speed')) {
      return `+${(value * 100).toFixed(0)}%`;
    }
    return `+${(value * 100).toFixed(0)}%`;
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 bg-black/90 rounded-lg backdrop-blur-md">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Crew Management
          </h2>
          <p className="text-gray-400 mt-1">
            {activeCrew.length}/{maxCrewSize} crew members • Daily wages: {dailySalaryCosts} credits
          </p>
        </div>
        <div className="flex gap-2">
          {onOpenRecruitment && (
            <Button onClick={onOpenRecruitment} variant="outline">
              Recruit Crew
            </Button>
          )}
          <Button 
            onClick={handlePayCrew}
            disabled={credits.credits < dailySalaryCosts}
            className={credits.credits < dailySalaryCosts ? 'bg-red-900' : ''}
          >
            <Coins className="w-4 h-4 mr-2" />
            Pay Crew ({dailySalaryCosts} credits)
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="ghost" className="text-gray-400">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      {paymentMessage && (
        <Alert className="mb-4" variant={paymentMessage.includes('Cannot') ? 'destructive' : 'default'}>
          <AlertDescription>{paymentMessage}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="crew" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="crew">Crew Roster</TabsTrigger>
          <TabsTrigger value="bonuses">Active Bonuses</TabsTrigger>
          <TabsTrigger value="events">Crew Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="crew" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Crew List */}
            <div className="space-y-3">
              {activeCrew.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-gray-400 mb-4">No crew members hired yet</p>
                  {onOpenRecruitment && (
                    <Button onClick={onOpenRecruitment}>
                      Visit Recruitment Office
                    </Button>
                  )}
                </Card>
              ) : (
                activeCrew.map((crew) => {
                  const loyaltyStatus = getLoyaltyStatus(crew.currentLoyalty);
                  const topSkill = getTopSkill(crew.skills as unknown as Record<string, number>);
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
                            <p className="text-sm text-gray-400">{crew.title}</p>
                          </div>
                          <Badge variant="secondary" className={loyaltyStatus.color}>
                            {loyaltyStatus.icon}
                            <span className="ml-1">{loyaltyStatus.label}</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Loyalty</span>
                            <span className={loyaltyStatus.color}>{crew.currentLoyalty}%</span>
                          </div>
                          <Progress value={crew.currentLoyalty} className="h-2" />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className="text-xs">
                            {getSkillIcon(topSkill)}
                            <span className="ml-1 capitalize">{topSkill} Expert</span>
                          </Badge>
                          <span className="text-xs text-gray-400">
                            <Coins className="w-3 h-3 inline mr-1" />
                            {crew.dailySalary}/day
                          </span>
                        </div>
                        
                        {crew.personalQuest?.active && (
                          <Badge variant="default" className="text-xs bg-yellow-900">
                            <Award className="w-3 h-3 mr-1" />
                            Personal Quest Active
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            
            {/* Crew Details */}
            {selectedCrew && (
              <div className="space-y-4">
                {activeCrew
                  .filter(c => c.id === selectedCrew)
                  .map(crew => {
                    const loyaltyStatus = getLoyaltyStatus(crew.currentLoyalty);
                    
                    return (
                      <Card key={crew.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-white">{crew.name}</CardTitle>
                              <p className="text-sm text-gray-400">{crew.title}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={loyaltyStatus.color}>
                                {loyaltyStatus.icon}
                                <span className="ml-1">{loyaltyStatus.label}</span>
                              </Badge>
                              <p className="text-xs text-gray-500 mt-1">
                                {crew.daysInCrew || 0} days in crew
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Current Mood</h4>
                            <p className="text-sm text-gray-300 italic">
                              "{crew.currentLoyalty >= 60 ? crew.dialogue.highMorale : crew.dialogue.lowMorale}"
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Skills</h4>
                            <div className="space-y-2">
                              {Object.entries(crew.skills)
                                .sort(([,a], [,b]) => b - a)
                                .map(([skill, value]) => (
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
                          
                          {crew.personalQuest && (
                            <div>
                              <h4 className="text-sm font-semibold text-white mb-2">Personal Quest</h4>
                              <div className="space-y-2">
                                <p className="text-sm text-yellow-400">{crew.personalQuest.title}</p>
                                {!crew.personalQuest.active && !crew.personalQuest.completed && (
                                  <p className="text-xs text-gray-400">
                                    Requires {crew.personalQuest.triggerLoyalty} loyalty (current: {crew.currentLoyalty})
                                  </p>
                                )}
                                {crew.personalQuest.active && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-400">
                                      Stage {(crew.personalQuest.currentStage || 0) + 1} of {crew.personalQuest.stages.length}
                                    </p>
                                    <p className="text-xs text-blue-400">
                                      {crew.personalQuest.stages[crew.personalQuest.currentStage || 0]}
                                    </p>
                                  </div>
                                )}
                                {crew.personalQuest.completed && (
                                  <Badge variant="default" className="text-xs bg-green-900">
                                    <Award className="w-3 h-3 mr-1" />
                                    Quest Completed
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            {showConfirmFire === crew.id ? (
                              <>
                                <Button 
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => handleFireCrew(crew.id)}
                                >
                                  Confirm Dismissal
                                </Button>
                                <Button 
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setShowConfirmFire(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="destructive"
                                className="w-full"
                                onClick={() => setShowConfirmFire(crew.id)}
                              >
                                Dismiss Crew Member
                              </Button>
                            )}
                          </div>
                          
                          {crew.currentLoyalty < 30 && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Desertion Risk</AlertTitle>
                              <AlertDescription>
                                This crew member may desert due to low loyalty!
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
            
            {!selectedCrew && activeCrew.length > 0 && (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                <p>Select a crew member to view details</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="bonuses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Active Crew Bonuses</CardTitle>
              <p className="text-sm text-gray-400">
                Bonuses are based on crew skills and loyalty levels
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(currentBonuses)
                  .filter(([_, value]) => value !== 0)
                  .map(([bonus, value]) => (
                    <div key={bonus} className="flex items-center justify-between p-3 bg-gray-900/50 rounded">
                      <span className="text-sm text-gray-400 capitalize">
                        {bonus.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant="default" className="text-xs">
                        {formatBonus(value, bonus)}
                      </Badge>
                    </div>
                  ))}
              </div>
              
              {Object.values(currentBonuses).every(v => v === 0) && (
                <p className="text-center text-gray-500 py-4">
                  No active bonuses. Crew need higher loyalty levels to provide bonuses.
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Special Abilities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Special Abilities</CardTitle>
              <p className="text-sm text-gray-400">
                Unlocked at high loyalty levels
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeCrew
                  .filter(crew => crew.currentLoyalty >= 95)
                  .map(crew => (
                    <div key={crew.id} className="flex items-center justify-between p-3 bg-purple-900/20 rounded">
                      <div>
                        <p className="text-sm text-white">{crew.name}</p>
                        <p className="text-xs text-purple-400 capitalize">
                          {crew.bonusEffects.special.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                  ))}
              </div>
              
              {!activeCrew.some(c => c.currentLoyalty >= 95) && (
                <p className="text-center text-gray-500 py-4">
                  No special abilities unlocked yet. Reach 95+ loyalty with crew members.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Crew Log</CardTitle>
              <p className="text-sm text-gray-400">
                Recent crew events and activities
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {crewEvents
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map(event => {
                    const crew = [...activeCrew, ...useCrewManagement.getState().availableCrew]
                      .find(c => c.id === event.crewId);
                    
                    return (
                      <div key={event.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                        <div className="mt-1">
                          {event.type === 'hired' && <Users className="w-4 h-4 text-green-400" />}
                          {event.type === 'fired' && <X className="w-4 h-4 text-red-400" />}
                          {event.type === 'deserted' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                          {event.type === 'loyalty_change' && (
                            event.details.includes('+') ? 
                              <TrendingUp className="w-4 h-4 text-green-400" /> :
                              <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          {event.type === 'quest_progress' && <Award className="w-4 h-4 text-yellow-400" />}
                          {event.type === 'payment' && <Coins className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-300">
                            {crew?.name && <span className="text-white font-medium">{crew.name}: </span>}
                            {event.details}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {crewEvents.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No crew events recorded yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}