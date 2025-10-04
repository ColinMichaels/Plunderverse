import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Badge } from './badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { ScrollArea } from './scroll-area';
import { Button } from './button';
import { 
  Trophy, 
  Star, 
  Target, 
  TrendingUp, 
  Award,
  Skull,
  Heart,
  DollarSign,
  Users,
  Shield,
  Zap,
  ChevronRight,
  Lock,
  Unlock,
  BookOpen,
  Flag,
  AlertCircle
} from 'lucide-react';
import { GameFacade } from '../../lib/plunderverse/gameFacade';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';

interface StoryProgressionPanelProps {
  className?: string;
}

export const StoryProgressionPanel: React.FC<StoryProgressionPanelProps> = ({ className = '' }) => {
  const [storyState, setStoryState] = useState<any>(null);
  const [currentAct, setCurrentAct] = useState<any>(null);
  const [rankProgress, setRankProgress] = useState<any>(null);
  const [availableEndings, setAvailableEndings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const player = usePlayer();
  const credits = useCreditsStore();
  const missions = usePlunderverseMissions();
  const gameFacade = GameFacade.getInstance();

  useEffect(() => {
    console.log('[StoryProgressionPanel] Component mounting...');
    console.log('[StoryProgressionPanel] Player state:', player);
    console.log('[StoryProgressionPanel] GameFacade instance:', gameFacade);

    const updateStoryState = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('[StoryProgressionPanel] Starting story state update...');
        
        // Get story progression state with error handling
        console.log('[StoryProgressionPanel] Getting story progression state...');
        const state = gameFacade.getStoryProgressionState();
        console.log('[StoryProgressionPanel] Story progression state received:', state);
        
        if (!state) {
          console.warn('[StoryProgressionPanel] No story state returned from gameFacade');
          setError('Story progression data not available');
          return;
        }
        
        setStoryState(state);
        
        // Get current act info with error handling
        console.log('[StoryProgressionPanel] Getting current act info for act:', state.currentAct);
        try {
          const act = await gameFacade.getCurrentAct();
          console.log('[StoryProgressionPanel] Current act info received:', act);
          
          if (!act) {
            console.warn('[StoryProgressionPanel] No act data returned for act:', state.currentAct);
            // Create a fallback act object
            const fallbackAct = {
              number: state.currentAct || 1,
              title: `Act ${state.currentAct || 1}`,
              subtitle: 'Loading...',
              description: 'Story content is loading...',
              rankRange: { min: 0, max: 10 },
              themes: []
            };
            setCurrentAct(fallbackAct);
          } else {
            setCurrentAct(act);
          }
        } catch (actError) {
          console.error('[StoryProgressionPanel] Error getting current act:', actError);
          // Use fallback act data
          const fallbackAct = {
            number: state.currentAct || 1,
            title: `Act ${state.currentAct || 1}`,
            subtitle: 'Loading...',
            description: 'Story content is loading...',
            rankRange: { min: 0, max: 10 },
            themes: []
          };
          setCurrentAct(fallbackAct);
        }
        
        // Get rank progress with error handling
        console.log('[StoryProgressionPanel] Checking rank progression...');
        try {
          const progress = await gameFacade.checkRankProgression();
          console.log('[StoryProgressionPanel] Rank progress received:', progress);
          setRankProgress(progress);
        } catch (progressError) {
          console.error('[StoryProgressionPanel] Error getting rank progression:', progressError);
          setRankProgress(null);
        }
        
        // Get available endings if in Act 4
        if (state.currentAct === 4) {
          console.log('[StoryProgressionPanel] Act 4 detected, getting available endings...');
          try {
            const endings = await gameFacade.getAvailableEndings();
            console.log('[StoryProgressionPanel] Available endings received:', endings);
            setAvailableEndings(endings || []);
          } catch (endingsError) {
            console.error('[StoryProgressionPanel] Error getting available endings:', endingsError);
            setAvailableEndings([]);
          }
        }
        
        setIsLoading(false);
        console.log('[StoryProgressionPanel] Story state update complete');
        
      } catch (error) {
        console.error('[StoryProgressionPanel] Fatal error updating story state:', error);
        setError(error instanceof Error ? error.message : 'Failed to load story progression');
        setIsLoading(false);
        
        // Try to set minimal fallback data
        if (!storyState) {
          setStoryState({
            currentAct: 1,
            moralityScore: 0,
            moralityAlignment: 'Neutral',
            completedMissions: 0,
            totalStoryMissions: 0,
            nextMilestone: 'Loading...',
            progressionMetrics: {
              creditsEarnedTotal: 0,
              missionsCompleted: 0,
              combatVictories: 0,
              systemsVisited: new Set()
            }
          });
        }
        if (!currentAct) {
          setCurrentAct({
            number: 1,
            title: 'Act 1',
            subtitle: 'The Beginning',
            description: 'Your journey starts here...',
            rankRange: { min: 0, max: 3 },
            themes: []
          });
        }
      }
    };
    
    // Initial load
    updateStoryState();
    
    // Update every 5 seconds
    const interval = setInterval(updateStoryState, 5000);
    
    return () => {
      console.log('[StoryProgressionPanel] Component unmounting, clearing interval');
      clearInterval(interval);
    };
  }, []);

  // Loading state
  if (isLoading && !storyState && !currentAct) {
    return (
      <Card className={`${className} bg-gray-900/95 border-gray-700`}>
        <CardContent className="p-4">
          <div className="text-gray-400">Loading story progression...</div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !storyState && !currentAct) {
    return (
      <Card className={`${className} bg-gray-900/95 border-gray-700`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state (shouldn't happen with fallbacks, but just in case)
  if (!storyState || !currentAct) {
    return (
      <Card className={`${className} bg-gray-900/95 border-gray-700`}>
        <CardContent className="p-4">
          <div className="text-gray-400">Story progression data not available</div>
        </CardContent>
      </Card>
    );
  }

  const getMoralityIcon = () => {
    if (!storyState?.moralityScore) return <Shield className="w-4 h-4 text-gray-400" />;
    if (storyState.moralityScore >= 50) return <Heart className="w-4 h-4 text-green-400" />;
    if (storyState.moralityScore <= -50) return <Skull className="w-4 h-4 text-red-400" />;
    return <Shield className="w-4 h-4 text-gray-400" />;
  };

  const getMoralityColor = () => {
    if (!storyState?.moralityScore) return 'text-gray-400';
    if (storyState.moralityScore >= 50) return 'text-green-400';
    if (storyState.moralityScore <= -50) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <Card className={`${className} bg-gray-900/95 border-gray-700`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-xl">
          <span className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Story Progression
          </span>
          <Badge variant="outline" className="text-purple-400 border-purple-400">
            Act {storyState.currentAct}: {currentAct.title}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="endings">Endings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Current Act Information */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-lg font-semibold text-purple-400">
                {currentAct.title}{currentAct.subtitle ? `: ${currentAct.subtitle}` : ''}
              </h3>
              <p className="text-sm text-gray-300">{currentAct.description}</p>
              
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">
                  Rank Range: {currentAct.rankRange?.min || 0} - {currentAct.rankRange?.max || 10}
                </span>
                <span className="text-gray-400">
                  Current Rank: {player.rank || 0}
                </span>
              </div>
              
              {/* Themes */}
              {currentAct.themes && currentAct.themes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {currentAct.themes.map((theme: string) => (
                    <Badge key={theme} variant="secondary" className="text-xs">
                      {theme.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {/* Morality & Alignment */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Moral Alignment</span>
                <div className="flex items-center gap-2">
                  {getMoralityIcon()}
                  <span className={`font-bold ${getMoralityColor()}`}>
                    {storyState.moralityAlignment || 'Neutral'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Evil</span>
                  <span>Neutral</span>
                  <span>Good</span>
                </div>
                <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`absolute h-full transition-all duration-500 ${
                      (storyState.moralityScore || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{
                      left: (storyState.moralityScore || 0) >= 0 ? '50%' : `${50 + ((storyState.moralityScore || 0) / 2)}%`,
                      width: `${Math.abs(storyState.moralityScore || 0) / 2}%`
                    }}
                  />
                  <div className="absolute left-1/2 top-0 w-px h-full bg-gray-500" />
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                Score: {(storyState.moralityScore || 0) > 0 ? '+' : ''}{storyState.moralityScore || 0}
              </div>
            </div>
            
            {/* Next Milestone */}
            {storyState.nextMilestone && (
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-4 border border-purple-700">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">Next Milestone</span>
                </div>
                <p className="text-sm text-gray-300">{storyState.nextMilestone}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-4 mt-4">
            {/* Rank Progression */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Rank Advancement</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                  {player.rankTitle || 'Unknown'}
                </Badge>
              </div>
              
              {rankProgress && rankProgress.nextRank && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Credits</span>
                      <span className="text-yellow-400">
                        {(rankProgress.progress?.credits || 0).toLocaleString()} / {rankProgress.nextRank ? 
                          (rankProgress.nextRank === 1 ? '5,000' :
                           rankProgress.nextRank === 2 ? '15,000' :
                           rankProgress.nextRank === 3 ? '35,000' :
                           rankProgress.nextRank === 4 ? '60,000' :
                           rankProgress.nextRank === 5 ? '100,000' :
                           rankProgress.nextRank === 6 ? '200,000' :
                           rankProgress.nextRank === 7 ? '350,000' :
                           rankProgress.nextRank === 8 ? '500,000' :
                           rankProgress.nextRank === 9 ? '750,000' : '1,000,000') 
                          : 'MAX'}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, ((rankProgress.progress?.credits || 0) / (
                        rankProgress.nextRank === 1 ? 5000 :
                        rankProgress.nextRank === 2 ? 15000 :
                        rankProgress.nextRank === 3 ? 35000 :
                        rankProgress.nextRank === 4 ? 60000 :
                        rankProgress.nextRank === 5 ? 100000 :
                        rankProgress.nextRank === 6 ? 200000 :
                        rankProgress.nextRank === 7 ? 350000 :
                        rankProgress.nextRank === 8 ? 500000 :
                        rankProgress.nextRank === 9 ? 750000 : 1000000
                      )) * 100)}
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Missions</span>
                      <span className="text-blue-400">
                        {rankProgress.progress?.missions || 0} / {rankProgress.nextRank ? 
                          (rankProgress.nextRank === 1 ? '3' :
                           rankProgress.nextRank === 2 ? '10' :
                           rankProgress.nextRank === 3 ? '20' :
                           rankProgress.nextRank === 4 ? '35' :
                           rankProgress.nextRank === 5 ? '50' :
                           rankProgress.nextRank === 6 ? '75' :
                           rankProgress.nextRank === 7 ? '100' :
                           rankProgress.nextRank === 8 ? '150' :
                           rankProgress.nextRank === 9 ? '200' : '250') 
                          : 'MAX'}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, ((rankProgress.progress?.missions || 0) / (
                        rankProgress.nextRank === 1 ? 3 :
                        rankProgress.nextRank === 2 ? 10 :
                        rankProgress.nextRank === 3 ? 20 :
                        rankProgress.nextRank === 4 ? 35 :
                        rankProgress.nextRank === 5 ? 50 :
                        rankProgress.nextRank === 6 ? 75 :
                        rankProgress.nextRank === 7 ? 100 :
                        rankProgress.nextRank === 8 ? 150 :
                        rankProgress.nextRank === 9 ? 200 : 250
                      )) * 100)}
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Notoriety</span>
                      <span className="text-red-400">
                        {rankProgress.progress?.notoriety || 0} / {rankProgress.nextRank ? 
                          (rankProgress.nextRank === 1 ? '10' :
                           rankProgress.nextRank === 2 ? '25' :
                           rankProgress.nextRank === 3 ? '40' :
                           rankProgress.nextRank === 4 ? '60' :
                           rankProgress.nextRank === 5 ? '75' :
                           rankProgress.nextRank === 6 ? '85' :
                           rankProgress.nextRank === 7 ? '90' :
                           rankProgress.nextRank === 8 ? '95' :
                           rankProgress.nextRank === 9 ? '98' : '100') 
                          : 'MAX'}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, ((rankProgress.progress?.notoriety || 0) / (
                        rankProgress.nextRank === 1 ? 10 :
                        rankProgress.nextRank === 2 ? 25 :
                        rankProgress.nextRank === 3 ? 40 :
                        rankProgress.nextRank === 4 ? 60 :
                        rankProgress.nextRank === 5 ? 75 :
                        rankProgress.nextRank === 6 ? 85 :
                        rankProgress.nextRank === 7 ? 90 :
                        rankProgress.nextRank === 8 ? 95 :
                        rankProgress.nextRank === 9 ? 98 : 100
                      )) * 100)}
                      className="h-2"
                    />
                  </div>
                  
                  {rankProgress.progress?.special && (
                    <div className="pt-2 text-xs text-yellow-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Special: {rankProgress.progress.special}
                    </div>
                  )}
                  
                  {rankProgress.canAdvance && (
                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Advance to Next Rank
                    </Button>
                  )}
                </div>
              )}
              
              {!rankProgress && (
                <div className="text-sm text-gray-400">
                  Rank progression data not available
                </div>
              )}
            </div>
            
            {/* Story Missions Progress */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Story Missions</span>
                <span className="text-xs text-gray-400">
                  {storyState.completedMissions || 0} / {storyState.totalStoryMissions || 0} Complete
                </span>
              </div>
              <Progress 
                value={storyState.totalStoryMissions > 0 ? 
                  ((storyState.completedMissions || 0) / storyState.totalStoryMissions) * 100 : 0}
                className="h-2"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="milestones" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {/* Progression Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-gray-400">Lifetime Earnings</span>
                    </div>
                    <div className="text-lg font-bold text-yellow-400">
                      {(storyState.progressionMetrics?.creditsEarnedTotal || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Missions Complete</span>
                    </div>
                    <div className="text-lg font-bold text-blue-400">
                      {storyState.progressionMetrics?.missionsCompleted || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-gray-400">Combat Victories</span>
                    </div>
                    <div className="text-lg font-bold text-red-400">
                      {storyState.progressionMetrics?.combatVictories || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Systems Visited</span>
                    </div>
                    <div className="text-lg font-bold text-purple-400">
                      {storyState.progressionMetrics?.systemsVisited?.size || 
                       storyState.progressionMetrics?.systemsVisited?.length || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-gray-400">Lives Saved</span>
                    </div>
                    <div className="text-lg font-bold text-green-400">
                      {storyState.progressionMetrics?.livesSaved || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Skull className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-gray-400">Lives Lost</span>
                    </div>
                    <div className="text-lg font-bold text-red-400">
                      {storyState.progressionMetrics?.livesLost || 0}
                    </div>
                  </div>
                </div>
                
                {/* Mission Types */}
                {storyState.progressionMetrics?.missionsByType && 
                 Object.keys(storyState.progressionMetrics.missionsByType).length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Mission Types Completed</h4>
                    <div className="space-y-2">
                      {Object.entries(storyState.progressionMetrics.missionsByType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 capitalize">{type}</span>
                          <Badge variant="secondary" className="text-xs">
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="endings" className="mt-4">
            <ScrollArea className="h-[400px]">
              {(storyState.currentAct || 1) < 4 ? (
                <div className="bg-gray-800 rounded-lg p-4 text-center">
                  <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    Reach Act 4 to unlock ending paths
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Current Act: {storyState.currentAct || 1} / 4
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableEndings.length === 0 ? (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-sm text-gray-400 text-center">
                        No endings currently available based on your choices
                      </p>
                    </div>
                  ) : (
                    availableEndings.map((ending) => (
                      <div 
                        key={ending.id}
                        className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-purple-300">{ending.name}</h4>
                          <Unlock className="w-4 h-4 text-green-400" />
                        </div>
                        <p className="text-xs text-gray-300 mb-3">{ending.description}</p>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-purple-600 text-purple-400 hover:bg-purple-900/50"
                        >
                          <ChevronRight className="w-4 h-4 mr-1" />
                          Choose This Path
                        </Button>
                      </div>
                    ))
                  )}
                  
                  {/* Locked Endings Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Other Possible Endings</h4>
                    <div className="space-y-2 opacity-50">
                      <div className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-400">Requirements not met</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};