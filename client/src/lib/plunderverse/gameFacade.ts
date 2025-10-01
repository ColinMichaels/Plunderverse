import { usePlayer } from '../stores/player/usePlayer';
import { usePlunderverseMissions } from '../stores/economy/usePlunderverseMissions';
import { usePlunderverseEconomy } from '../stores/economy/usePlunderverseEconomy';
import { useMissions } from '../stores/economy/useMissions';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { ContentRegistry } from './contentRegistry';
import { 
  StarNode, 
  Mission, 
  MissionRewards, 
  FactionId,
  Rank,
  ChoiceOutcome
} from './types';

/**
 * GameFacade - Central coordinator for the Plunderverse mission engine
 * Manages travel, missions, economy, and progression
 */
export class GameFacade {
  private static instance: GameFacade;
  private contentRegistry: ContentRegistry;
  private initialized: boolean = false;
  private currentLocation: string = 'Earth';
  private playerId: string | null = null;
  private gameDay: number = 1; // Tracks in-game day for seed stability
  
  private constructor() {
    this.contentRegistry = new ContentRegistry();
  }
  
  static getInstance(): GameFacade {
    if (!GameFacade.instance) {
      GameFacade.instance = new GameFacade();
    }
    return GameFacade.instance;
  }
  
  /**
   * Get or create persistent player ID
   */
  private getPlayerId(): string {
    if (this.playerId) return this.playerId;
    
    // Try to get from localStorage first
    let playerId = localStorage.getItem('plunderverse_player_id');
    
    if (!playerId) {
      // Generate a stable ID based on timestamp and random value
      playerId = `player_${Math.floor(Math.random() * 1000000)}_${new Date().getTime()}`;
      localStorage.setItem('plunderverse_player_id', playerId);
      console.log('Generated new player ID:', playerId);
    } else {
      console.log('Using existing player ID:', playerId);
    }
    
    this.playerId = playerId;
    return playerId;
  }
  
  /**
   * Get current game day (increments on travel)
   */
  private getGameDay(): number {
    const savedDay = localStorage.getItem('plunderverse_game_day');
    if (savedDay) {
      this.gameDay = parseInt(savedDay, 10);
    }
    return this.gameDay;
  }
  
  /**
   * Increment game day (on travel or time passage)
   */
  private incrementGameDay(): void {
    this.gameDay++;
    localStorage.setItem('plunderverse_game_day', this.gameDay.toString());
    console.log('Game day incremented to:', this.gameDay);
  }
  
  /**
   * Initialize the game facade
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load content from registry
      await this.contentRegistry.loadContent();
      
      // Load economy tuning
      await usePlunderverseEconomy.getState().loadTuning();
      
      // Initialize economy with persistent player seed
      const playerId = this.getPlayerId();
      const gameDay = this.getGameDay();
      usePlunderverseEconomy.getState().initializeRNG(playerId);
      
      // Generate initial missions for starting location
      const player = usePlayer.getState();
      const seed = `${playerId}:${this.currentLocation}:${gameDay}`;
      console.log(`[GameFacade] Generating initial missions with seed: ${seed}`);
      usePlunderverseMissions.getState().generateMissions(this.currentLocation, player.rank, seed);
      
      this.initialized = true;
      console.log('[GameFacade] Initialized successfully with deterministic seeding');
    } catch (error) {
      console.error('[GameFacade] Failed to initialize:', error);
      throw error;
    }
  }
  
  /**
   * List available star nodes for travel
   */
  async listNodes(): Promise<StarNode[]> {
    await this.ensureInitialized();
    const content = await this.contentRegistry.loadContent();
    return content.starNodes || [];
  }
  
  /**
   * Travel to a star node
   * Handles fuel consumption, mission generation, and location updates
   */
  async travelTo(nodeKey: string): Promise<{
    success: boolean;
    message: string;
    missionsGenerated?: number;
    fuelConsumed?: number;
  }> {
    await this.ensureInitialized();
    
    const content = await this.contentRegistry.loadContent();
    const node = content.starNodes.find(n => n.id === nodeKey);
    
    if (!node) {
      return { success: false, message: 'Invalid destination' };
    }
    
    // Check fuel (would need ship status store)
    const fuelNeeded = this.calculateFuelNeeded(nodeKey);
    // For now, assume we have enough fuel
    
    // Update player location
    const player = usePlayer.getState();
    player.visitPlanet(node.name);
    
    // Increment game day on travel
    this.incrementGameDay();
    
    // Generate missions for this location with deterministic seed
    const playerId = this.getPlayerId();
    const gameDay = this.getGameDay();
    const seed = `${playerId}:${nodeKey}:${gameDay}`;
    console.log(`[GameFacade] Travel to ${node.name}, generating missions with seed: ${seed}`);
    usePlunderverseMissions.getState().generateMissions(node.name, player.rank, seed);
    
    // Update current location
    this.currentLocation = node.name;
    
    // Apply faction-specific effects
    this.applyLocationEffects(node);
    
    const missionsState = usePlunderverseMissions.getState();
    
    return {
      success: true,
      message: `Arrived at ${node.name}`,
      missionsGenerated: missionsState.availableMissions.length,
      fuelConsumed: fuelNeeded
    };
  }
  
  /**
   * Accept a mission
   */
  async acceptMission(missionId: string): Promise<{
    success: boolean;
    message: string;
    mission?: Mission;
  }> {
    await this.ensureInitialized();
    
    const missionsStore = usePlunderverseMissions.getState();
    const mission = missionsStore.getMissionById(missionId);
    
    if (!mission) {
      return { success: false, message: 'Mission not found' };
    }
    
    // Check requirements
    const playerState = this.getPlayerState();
    if (!missionsStore.checkMissionRequirements(mission, playerState)) {
      return { success: false, message: 'Requirements not met' };
    }
    
    // Accept the mission
    const accepted = missionsStore.acceptMission(missionId);
    
    if (!accepted) {
      return { success: false, message: 'Failed to accept mission' };
    }
    
    // Apply initial effects (e.g., receiving cargo)
    if (mission.type === 'delivery' || mission.type === 'smuggling') {
      // Would add cargo to ship
      console.log(`Received cargo for ${mission.title}`);
    }
    
    return {
      success: true,
      message: `Mission accepted: ${mission.title}`,
      mission
    };
  }
  
  /**
   * Resolve a mission with optional choice
   */
  async resolveMission(missionId: string, choiceId?: string): Promise<{
    success: boolean;
    message: string;
    rewards?: MissionRewards;
    consequences?: ChoiceOutcome[];
  }> {
    await this.ensureInitialized();
    
    const missionsStore = usePlunderverseMissions.getState();
    const mission = missionsStore.getMissionById(missionId);
    
    if (!mission) {
      return { success: false, message: 'Mission not found' };
    }
    
    let consequences: ChoiceOutcome[] = [];
    
    // Handle choice if provided
    if (choiceId) {
      const outcomes = missionsStore.makeChoice(missionId, choiceId);
      if (outcomes) {
        consequences = outcomes;
        
        // Apply choice outcomes
        for (const outcome of outcomes) {
          await this.applyOutcome(outcome);
        }
      }
    }
    
    // Complete the mission
    const rewards = missionsStore.completeMission(missionId);
    
    if (!rewards) {
      return { success: false, message: 'Failed to complete mission' };
    }
    
    // Apply rewards
    await this.applyRewards(rewards, mission);
    
    // Update player progression
    this.checkRankProgression();
    
    // Update legacy missions if needed
    const legacyMissions = useMissions.getState();
    legacyMissions.completeMission(`legacy_${missionId}`);
    
    return {
      success: true,
      message: `Mission completed: ${mission.title}`,
      rewards,
      consequences
    };
  }
  
  /**
   * Update objective progress
   */
  async updateObjectiveProgress(
    missionId: string, 
    objectiveId: string, 
    progress: number
  ): Promise<void> {
    await this.ensureInitialized();
    
    const missionsStore = usePlunderverseMissions.getState();
    missionsStore.updateObjectiveProgress(missionId, objectiveId, progress);
    
    // Check for automatic mission completion
    const mission = missionsStore.getMissionById(missionId);
    if (mission && mission.active) {
      const allComplete = mission.objectives.every(o => o.completed);
      if (allComplete && mission.choices.length === 0) {
        // Auto-complete if no choices needed
        await this.resolveMission(missionId);
      }
    }
  }
  
  /**
   * Get current mission state for UI
   */
  async getMissionState(): Promise<{
    available: Mission[];
    active: Mission[];
    playerRank: { level: number; title: string };
    reputation: Record<FactionId, number>;
    heat: number;
    notoriety: number;
  }> {
    await this.ensureInitialized();
    
    const missionsStore = usePlunderverseMissions.getState();
    const player = usePlayer.getState();
    
    return {
      available: missionsStore.availableMissions,
      active: missionsStore.activeMissions,
      playerRank: { level: player.rank, title: player.rankTitle },
      reputation: player.reputation,
      heat: player.heat,
      notoriety: player.notoriety
    };
  }
  
  /**
   * Apply heat decay (call periodically) with faction modifiers
   */
  async applyHeatDecay(): Promise<void> {
    const player = usePlayer.getState();
    const economy = usePlunderverseEconomy.getState();
    
    let newHeat = economy.calculateHeatDecay(player.heat);
    
    // Modify heat decay based on corporation reputation
    const corpModifier = this.getFactionHeatModifier('corporations');
    const decayAmount = player.heat - newHeat;
    const modifiedDecay = decayAmount * corpModifier;
    newHeat = player.heat - modifiedDecay;
    
    player.updateHeat(newHeat - player.heat);
  }
  
  /**
   * Apply reputation decay toward neutral
   */
  async applyReputationDecay(): Promise<void> {
    const player = usePlayer.getState();
    const tuning = usePlunderverseEconomy.getState().tuning;
    
    if (!tuning?.reputation_system?.decay) return;
    
    const decayRate = tuning.reputation_system.decay.rate_per_day;
    const target = tuning.reputation_system.decay.target;
    const minThreshold = tuning.reputation_system.decay.min_threshold;
    
    // Apply decay to each faction
    Object.keys(player.reputation).forEach((faction) => {
      const currentRep = player.reputation[faction as keyof typeof player.reputation];
      
      // Only decay if above threshold
      if (Math.abs(currentRep - target) > minThreshold) {
        const newRep = currentRep > target 
          ? Math.max(target, currentRep - decayRate)
          : Math.min(target, currentRep + decayRate);
          
        if (newRep !== currentRep) {
          player.updateReputation(faction as 'corporations' | 'independents' | 'outlaws', newRep - currentRep);
          console.log(`[GameFacade] ${faction} reputation decayed from ${currentRep} to ${newRep}`);
        }
      }
    });
  }
  
  /**
   * Get reputation level for a faction
   */
  getReputationLevel(faction: FactionId): string {
    const player = usePlayer.getState();
    const tuning = usePlunderverseEconomy.getState().tuning;
    const rep = player.reputation[faction];
    
    if (!tuning?.reputation_system?.thresholds) return 'neutral';
    
    for (const [level, threshold] of Object.entries(tuning.reputation_system.thresholds)) {
      if (rep >= threshold.min && rep <= threshold.max) {
        return level;
      }
    }
    
    return 'neutral';
  }
  
  /**
   * Get faction-based price modifier
   */
  getFactionPriceModifier(faction: FactionId): number {
    const level = this.getReputationLevel(faction);
    const tuning = usePlunderverseEconomy.getState().tuning;
    
    if (!tuning?.reputation_system?.price_modifiers) return 1.0;
    
    return tuning.reputation_system.price_modifiers[level] || 1.0;
  }
  
  /**
   * Get faction-based mission reward modifier
   */
  getFactionRewardModifier(faction: FactionId): number {
    const level = this.getReputationLevel(faction);
    const tuning = usePlunderverseEconomy.getState().tuning;
    
    if (!tuning?.reputation_system?.mission_reward_modifiers) return 1.0;
    
    return tuning.reputation_system.mission_reward_modifiers[level] || 1.0;
  }
  
  /**
   * Get faction-based heat reduction modifier
   */
  getFactionHeatModifier(faction: FactionId): number {
    const level = this.getReputationLevel(faction);
    
    // Allied with law enforcement (corporations) reduces heat faster
    if (faction === 'corporations') {
      switch(level) {
        case 'revered': return 3.0;
        case 'allied': return 2.0;
        case 'friendly': return 1.5;
        case 'neutral': return 1.0;
        case 'unfriendly': return 0.8;
        case 'hostile': return 0.5;
        case 'hated': return 0.25;
        default: return 1.0;
      }
    }
    
    return 1.0;
  }
  
  /**
   * Check if player can access black market
   */
  canAccessBlackMarket(): boolean {
    const player = usePlayer.getState();
    const tuning = usePlunderverseEconomy.getState().tuning;
    
    if (!tuning?.reputation_system?.black_market_access) return false;
    
    const outlawRep = player.reputation.outlaws;
    const corpRep = player.reputation.corporations;
    
    // Need minimum reputation with outlaws OR be hostile with corporations
    return outlawRep >= tuning.reputation_system.black_market_access.outlaws_min_reputation ||
           corpRep <= tuning.reputation_system.black_market_access.corporations_max_reputation;
  }
  
  /**
   * Log reputation change with reason
   */
  logReputationChange(faction: FactionId, change: number, reason: string): void {
    const player = usePlayer.getState();
    const oldRep = player.reputation[faction];
    const oldLevel = this.getReputationLevel(faction);
    
    player.updateReputation(faction, change);
    const newRep = player.reputation[faction];
    const newLevel = this.getReputationLevel(faction);
    
    console.log(`[GameFacade] Reputation change: ${faction} ${change > 0 ? '+' : ''}${change} (${reason})`);
    console.log(`[GameFacade] ${faction}: ${oldRep} → ${newRep} (${oldLevel} → ${newLevel})`);
    
    // Alert on major threshold crossings
    if (oldLevel !== newLevel) {
      console.log(`[GameFacade] ⚡ ${faction} reputation level changed: ${oldLevel} → ${newLevel}`);
      // Could trigger UI notification here
    }
  }
  
  // ============================================================================
  // INTEGRATION POINTS
  // ============================================================================
  
  /**
   * Hook for mining success
   */
  async onMiningSuccess(resourceType: string, quantity: number): Promise<void> {
    const missionsStore = usePlunderverseMissions.getState();
    const activeMissions = missionsStore.getActiveMissionsByType('exploration');
    
    for (const mission of activeMissions) {
      const miningObjective = mission.objectives.find(o => 
        o.type === 'investigation' && o.target?.includes('mining')
      );
      
      if (miningObjective) {
        await this.updateObjectiveProgress(mission.id, miningObjective.id, 100);
      }
    }
    
    // Update player stats
    const player = usePlayer.getState();
    player.incrementMiningOperations();
  }
  
  /**
   * Hook for combat victory
   */
  async onCombatVictory(enemyType: string): Promise<void> {
    const missionsStore = usePlunderverseMissions.getState();
    const activeMissions = missionsStore.activeMissions;
    
    for (const mission of activeMissions) {
      if (mission.type === 'bounty' || mission.type === 'combat') {
        const combatObjective = mission.objectives.find(o => 
          o.type === 'combat' && (!o.target || o.target === enemyType)
        );
        
        if (combatObjective) {
          const currentProgress = missionsStore.currentObjectiveProgress
            .get(mission.id)?.get(combatObjective.id) || 0;
          await this.updateObjectiveProgress(
            mission.id, 
            combatObjective.id, 
            Math.min(100, currentProgress + 20)
          );
        }
      }
    }
    
    // Update notoriety
    const player = usePlayer.getState();
    player.updateNotoriety(2);
    
    // Apply heat for combat
    const economy = usePlunderverseEconomy.getState();
    const heat = economy.calculateHeatFromAction('combat', this.getCurrentFaction());
    player.updateHeat(heat);
  }
  
  /**
   * Hook for delivery completion
   */
  async onDeliveryComplete(destination: string): Promise<void> {
    const missionsStore = usePlunderverseMissions.getState();
    const activeMissions = missionsStore.getActiveMissionsByType('delivery');
    
    for (const mission of activeMissions) {
      const deliveryObjective = mission.objectives.find(o => 
        o.type === 'delivery' && o.locations?.includes(destination)
      );
      
      if (deliveryObjective) {
        await this.updateObjectiveProgress(mission.id, deliveryObjective.id, 100);
      }
    }
  }
  
  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================
  
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  
  private calculateFuelNeeded(destination: string): number {
    // Simple distance calculation (would be more complex in reality)
    const distances: Record<string, number> = {
      'Mercury': 10,
      'Venus': 15,
      'Earth': 0,
      'Mars': 20,
      'Jupiter': 40,
      'Saturn': 60,
      'Uranus': 80,
      'Neptune': 100
    };
    
    return distances[destination] || 50;
  }
  
  private applyLocationEffects(node: StarNode): void {
    const player = usePlayer.getState();
    
    // Apply faction-specific effects
    if (node.faction === 'corporations') {
      // Corporations reduce heat but cost more
      player.updateHeat(-5);
    } else if (node.faction === 'outlaws') {
      // Outlaws increase notoriety
      player.updateNotoriety(1);
    }
    
    // Apply security-based effects instead of tags
    if (node.security?.level === 'low') {
      player.updateHeat(-10);
      player.updateNotoriety(2);
    }
    
    if (node.security?.level === 'high') {
      // Can't reduce heat below detection threshold in high security
      if (player.heat > 30) {
        console.log('Warning: High heat in high security zone!');
      }
    }
  }
  
  private async applyOutcome(outcome: ChoiceOutcome): Promise<void> {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    
    console.log('[GameFacade] Applying choice outcome:', outcome);
    
    // Apply credits
    if (outcome.credits) {
      if (outcome.credits > 0) {
        credits.earnCredits(outcome.credits);
        console.log(`[GameFacade] Credits earned: ${outcome.credits}`);
      } else {
        credits.spendCredits(Math.abs(outcome.credits));
        console.log(`[GameFacade] Credits spent: ${Math.abs(outcome.credits)}`);
      }
    }
    
    // Apply reputation changes
    if (outcome.reputation) {
      for (const [faction, change] of Object.entries(outcome.reputation)) {
        const oldRep = player.reputation[faction as FactionId];
        player.updateReputation(faction as FactionId, change);
        const newRep = player.reputation[faction as FactionId];
        console.log(`[GameFacade] Reputation change for ${faction}: ${oldRep} -> ${newRep} (${change > 0 ? '+' : ''}${change})`);
      }
    }
    
    // Apply effects
    if (outcome.effects) {
      if (outcome.effects.notoriety) {
        const oldNotoriety = player.notoriety;
        player.updateNotoriety(outcome.effects.notoriety);
        console.log(`[GameFacade] Notoriety change: ${oldNotoriety} -> ${player.notoriety} (+${outcome.effects.notoriety})`);
      }
      if (outcome.effects.heatLevel) {
        const oldHeat = player.heat;
        player.updateHeat(outcome.effects.heatLevel);
        console.log(`[GameFacade] Heat change: ${oldHeat} -> ${player.heat} (+${outcome.effects.heatLevel})`);
      }
    }
    
    // Handle combat outcomes
    if (outcome.combat) {
      // Trigger combat (would interface with combat system)
      console.log('[GameFacade] Combat triggered:', outcome.enemies);
    }
    
    // Add items to inventory (would interface with inventory system)
    if (outcome.items && outcome.items.length > 0) {
      console.log('[GameFacade] Items received:', outcome.items);
    }
  }
  
  private async applyRewards(rewards: MissionRewards, mission: Mission): Promise<void> {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const economy = usePlunderverseEconomy.getState();
    
    console.log(`[GameFacade] Applying rewards for mission: ${mission.title}`, rewards);
    
    // Calculate payout with modifiers
    let creditReward = rewards.base?.credits || 0;
    const payoutModifier = economy.calculateMissionPayoutModifier(
      mission.type,
      player.reputation
    );
    creditReward = Math.round(creditReward * payoutModifier);
    
    // Apply credits
    if (creditReward > 0) {
      const oldCredits = credits.credits;
      credits.earnCredits(creditReward);
      console.log(`[GameFacade] Credits earned: ${oldCredits} -> ${credits.credits} (+${creditReward}, modifier: ${payoutModifier.toFixed(2)}x)`);
    }
    
    // Apply reputation changes
    if (rewards.base?.reputation) {
      for (const [faction, change] of Object.entries(rewards.base.reputation)) {
        const oldRep = player.reputation[faction as FactionId];
        player.updateReputation(faction as FactionId, change);
        const newRep = player.reputation[faction as FactionId];
        console.log(`[GameFacade] Mission reward - Reputation ${faction}: ${oldRep} -> ${newRep} (${change > 0 ? '+' : ''}${change})`);
      }
    }
    
    // Apply items
    if (rewards.base?.items) {
      // Would add to inventory
      console.log('[GameFacade] Items received:', rewards.base.items);
    }
    
    // Update stats - use player.rank consistently
    const expGain = 100 * (mission.difficulty === 'hard' ? 2 : 1);
    player.addExperience(expGain);
    console.log(`[GameFacade] Experience gained: ${expGain}`);
    
    // Apply heat/notoriety based on mission type
    if (mission.type === 'smuggling') {
      const heat = economy.calculateHeatFromAction('smuggling', this.getCurrentFaction());
      const oldHeat = player.heat;
      const oldNotoriety = player.notoriety;
      player.updateHeat(heat);
      player.updateNotoriety(3);
      console.log(`[GameFacade] Smuggling mission - Heat: ${oldHeat} -> ${player.heat} (+${heat}), Notoriety: ${oldNotoriety} -> ${player.notoriety} (+3)`);
    } else if (mission.type === 'bounty') {
      const oldNotoriety = player.notoriety;
      player.updateNotoriety(5);
      console.log(`[GameFacade] Bounty mission - Notoriety: ${oldNotoriety} -> ${player.notoriety} (+5)`);
    }
  }
  
  private checkRankProgression(): void {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missionsStore = usePlunderverseMissions.getState();
    
    // Load rank data
    this.contentRegistry.loadContent().then(content => {
      const ranks = content.ranks;
      const currentRank = ranks.find(r => r.level === player.rank);
      const nextRank = ranks.find(r => r.level === player.rank + 1);
      
      if (!nextRank) {
        console.log(`[GameFacade] Player at max rank: ${currentRank?.title || player.rank}`);
        return;
      }
      
      // Check if player meets requirements for next rank
      const completedMissions = missionsStore.completedMissionIds.size;
      const meetsCredits = credits.credits >= nextRank.requirements.credits;
      const meetsNotoriety = player.notoriety >= nextRank.requirements.notoriety;
      const meetsMissions = completedMissions >= (nextRank.requirements.missionsCompleted || 0);
      
      console.log(`[GameFacade] Rank progression check for ${nextRank.title}:`, {
        currentRank: player.rank,
        credits: `${credits.credits}/${nextRank.requirements.credits} (${meetsCredits ? '✓' : '✗'})`,
        notoriety: `${player.notoriety}/${nextRank.requirements.notoriety} (${meetsNotoriety ? '✓' : '✗'})`,
        missions: `${completedMissions}/${nextRank.requirements.missionsCompleted || 0} (${meetsMissions ? '✓' : '✗'})`
      });
      
      const meetsRequirements = meetsCredits && meetsNotoriety && meetsMissions;
      
      if (meetsRequirements) {
        player.updateRank(nextRank.level, nextRank.title);
        console.log(`[GameFacade] 🎉 RANK UP! You are now ${nextRank.title} (Rank ${nextRank.level})`);
      }
    });
  }
  
  private getPlayerState(): any {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    
    return {
      credits: credits.credits,
      reputation: player.reputation,
      heat: player.heat,
      notoriety: player.notoriety,
      rank: player.rank,
      cargoSpace: 100, // Would get from ship store
      combatRating: 50, // Would calculate from equipment
      completedMissions: Array.from(usePlunderverseMissions.getState().completedMissionIds),
      items: [] // Would get from inventory
    };
  }
  
  getCurrentFaction(): FactionId {
    const factions: Record<string, FactionId> = {
      'Earth': 'corporations',
      'Mars': 'corporations',
      'Venus': 'independents',
      'Jupiter': 'independents',
      'Saturn': 'independents',
      'Uranus': 'outlaws',
      'Neptune': 'outlaws'
    };
    
    return factions[this.currentLocation] || 'independents';
  }
}

// Export singleton instance
export const gameFacade = GameFacade.getInstance();