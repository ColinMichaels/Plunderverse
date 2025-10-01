import { usePlayer } from '../stores/player/usePlayer';
import { usePlunderverseMissions } from '../stores/economy/usePlunderverseMissions';
import { usePlunderverseEconomy } from '../stores/economy/usePlunderverseEconomy';
import { useMissions } from '../stores/economy/useMissions';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useEquipment } from '../stores/ship/useEquipment';
import { useSurvival } from '../stores/economy/useSurvival';
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
  private economicPressureInterval: NodeJS.Timeout | null = null;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private survivalInterval: NodeJS.Timeout | null = null;
  
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
      
      // Start economic pressure systems
      this.startEconomicPressure();
    } catch (error) {
      console.error('[GameFacade] Failed to initialize:', error);
      throw error;
    }
  }
  
  /**
   * Start the economic pressure system timers
   */
  startEconomicPressure(): void {
    const tuning = usePlunderverseEconomy.getState().tuning;
    
    // Clear existing intervals if any
    this.stopEconomicPressure();
    
    // Daily costs timer (every minute = 1 game day)
    const dailyCostInterval = (tuning?.economy?.daily_costs?.payment_interval_minutes || 1) * 60000;
    this.economicPressureInterval = setInterval(async () => {
      await this.applyDailyCosts();
      await this.applyHeatDecay();
      await this.applyReputationDecay();
      
      // Check for emergency missions
      const credits = useCreditsStore.getState().credits;
      const emergencyThreshold = tuning?.economy?.economic_pressure?.emergency_missions?.trigger_credit_threshold || 100;
      if (credits < emergencyThreshold) {
        this.generateEmergencyMissions();
      }
    }, dailyCostInterval);
    
    // Maintenance degradation timer (every 5 minutes = more realistic)
    this.maintenanceInterval = setInterval(async () => {
      await this.applyMaintenanceDegradation();
    }, 5 * 60000);
    
    // Survival consumption timer (every 30 seconds for oxygen, adjusted for other resources)
    this.survivalInterval = setInterval(() => {
      const survival = useSurvival.getState();
      survival.consumeResources(0.5); // Consume for 30 seconds worth
      
      // Check warnings
      const warnings = survival.checkResourceWarnings();
      if (warnings.length > 0) {
        console.warn('[GameFacade] Survival warnings:', warnings);
      }
    }, 30000);
    
    console.log('[GameFacade] Economic pressure systems started');
  }
  
  /**
   * Stop the economic pressure system timers
   */
  stopEconomicPressure(): void {
    if (this.economicPressureInterval) {
      clearInterval(this.economicPressureInterval);
      this.economicPressureInterval = null;
    }
    
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    
    if (this.survivalInterval) {
      clearInterval(this.survivalInterval);
      this.survivalInterval = null;
    }
    
    console.log('[GameFacade] Economic pressure systems stopped');
  }
  
  /**
   * Generate emergency missions when desperate for credits
   */
  generateEmergencyMissions(): void {
    const tuning = usePlunderverseEconomy.getState().tuning;
    const emergencySettings = tuning?.economy?.economic_pressure?.emergency_missions;
    
    if (!emergencySettings) return;
    
    const missionsStore = usePlunderverseMissions.getState();
    const player = usePlayer.getState();
    
    // Generate special high-risk, morally compromising missions
    const emergencyMissions: Mission[] = [
      {
        id: `emergency_smuggling_${Date.now()}`,
        title: 'URGENT: Smuggle Medical Supplies',
        description: 'A desperate colony needs medical supplies, but they\'re embargoed. High pay, high risk.',
        type: 'smuggling',
        difficulty: 'hard',
        rank: player.rank,
        faction: 'outlaws',
        rewards: {
          credits: Math.floor(3000 * (emergencySettings.payout_multiplier || 0.7)),
          reputation: { outlaws: 10, corporations: emergencySettings.reputation_cost || -10 },
          notoriety: 15,
          heat: 20
        },
        requirements: { minRank: 1 },
        tags: ['illegal', 'urgent', 'moral_compromise'],
        timeLimit: 60,
        objectives: [],
        choices: [],
        active: false,
        completed: false,
        failed: false
      },
      {
        id: `emergency_combat_${Date.now()}`,
        title: 'URGENT: Eliminate Rival Crew',
        description: 'Take out a rival crew for quick credits. No questions asked.',
        type: 'combat',
        difficulty: 'hard',
        rank: player.rank,
        faction: 'outlaws',
        rewards: {
          credits: Math.floor(2500 * (emergencySettings.payout_multiplier || 0.7)),
          reputation: { outlaws: 5, corporations: emergencySettings.reputation_cost || -10 },
          notoriety: 20
        },
        requirements: { minRank: 1 },
        tags: ['illegal', 'urgent', 'violent'],
        objectives: [],
        choices: [],
        active: false,
        completed: false,
        failed: false
      }
    ];
    
    // Add emergency missions to available missions using proper setter
    missionsStore.addEmergencyMissions(emergencyMissions);
    
    console.log('[GameFacade] Generated emergency missions due to low credits');
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
    
    // Check fuel and consume it
    const fuelNeeded = this.calculateFuelNeeded(node.name);
    const equipmentStore = useEquipment.getState();
    const fuelTank = equipmentStore.getEquipment('fuel-tank');
    
    if (!fuelTank) {
      console.error('[GameFacade] No fuel tank found!');
      return { success: false, message: 'Ship has no fuel tank!' };
    }
    
    // Check if we have enough fuel
    if (fuelTank.currentDurability < fuelNeeded) {
      const tuning = usePlunderverseEconomy.getState().tuning;
      const emergencyReserve = tuning?.economy?.balance_constants?.fuel_emergency_reserve || 10;
      
      if (fuelTank.currentDurability < emergencyReserve) {
        return { 
          success: false, 
          message: `CRITICAL: Not enough fuel! Need ${fuelNeeded} units, only have ${fuelTank.currentDurability.toFixed(1)}. Refuel immediately!`,
          fuelConsumed: 0
        };
      } else {
        return { 
          success: false, 
          message: `Insufficient fuel for jump. Need ${fuelNeeded} units, only have ${fuelTank.currentDurability.toFixed(1)}.`,
          fuelConsumed: 0
        };
      }
    }
    
    // Consume fuel
    const fuelConsumed = equipmentStore.consumeFuel(fuelNeeded);
    if (!fuelConsumed) {
      return { 
        success: false, 
        message: 'Failed to consume fuel. Check ship systems.',
        fuelConsumed: 0
      };
    }
    
    console.log(`[GameFacade] Travel fuel consumed: ${fuelNeeded} units. Remaining: ${(fuelTank.currentDurability - fuelNeeded).toFixed(1)}`);
    
    // Update player location
    const player = usePlayer.getState();
    player.visitPlanet(node.name);
    player.incrementJumps(); // Track jumps for stats
    
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
   * Calculate daily operating costs
   */
  async calculateDailyCosts(): Promise<{
    crew: number;
    lifeSupport: number;
    docking: number;
    insurance: number;
    supplies: number;
    total: number;
    location: string;
  }> {
    const tuning = usePlunderverseEconomy.getState().tuning;
    console.log('[GameFacade] Tuning structure:', {
      hasTuning: !!tuning,
      hasEconomy: !!tuning?.economy,
      hasDailyCosts: !!tuning?.economy?.daily_costs
    });
    
    if (!tuning?.economy?.daily_costs) {
      console.warn('[GameFacade] No daily costs tuning found, using defaults');
      return {
        crew: 50,
        lifeSupport: 25,
        docking: 0,
        insurance: 15,
        supplies: 20,
        total: 110,
        location: this.currentLocation
      };
    }
    
    const dailyCosts = tuning.economy.daily_costs;
    
    // Calculate crew costs (base crew is always present)
    let crewCost = dailyCosts.crew_salaries.base_crew;
    
    // Add specialist crew costs if they exist (future expansion)
    // For now, just use base crew
    
    // Life support costs
    const lifeSupport = dailyCosts.life_support;
    
    // Docking fees based on current location
    const content = this.contentRegistry.getContent();
    const currentNode = content?.starNodes?.find(n => 
      n.name === this.currentLocation || n.id === this.currentLocation.toLowerCase()
    );
    
    let dockingFee = 0;
    if (currentNode) {
      if (currentNode.faction === 'corporations') {
        dockingFee = dailyCosts.docking_fees.corporations;
      } else if (currentNode.faction === 'independents') {
        dockingFee = dailyCosts.docking_fees.independents;
      } else if (currentNode.faction === 'outlaws') {
        dockingFee = dailyCosts.docking_fees.outlaws;
      } else {
        dockingFee = dailyCosts.docking_fees.deep_space || 0;
      }
    }
    
    // Insurance and supplies
    const insurance = dailyCosts.insurance;
    const supplies = dailyCosts.supplies;
    
    // Calculate total
    const total = crewCost + lifeSupport + dockingFee + insurance + supplies;
    
    return {
      crew: crewCost,
      lifeSupport,
      docking: dockingFee,
      insurance,
      supplies,
      total,
      location: this.currentLocation
    };
  }
  
  /**
   * Apply daily costs (deduct from credits)
   */
  async applyDailyCosts(): Promise<{
    success: boolean;
    message: string;
    costsDeducted: number;
    remainingCredits: number;
    bankruptcyWarning: boolean;
  }> {
    const costs = await this.calculateDailyCosts();
    const creditsStore = useCreditsStore.getState();
    const currentCredits = creditsStore.credits;
    
    // Deduct costs
    const success = creditsStore.spendCredits(costs.total);
    
    const tuning = usePlunderverseEconomy.getState().tuning;
    const warningThreshold = tuning?.economy?.daily_costs?.warning_credit_threshold || 200;
    const criticalThreshold = tuning?.economy?.daily_costs?.critical_credit_threshold || 50;
    const bankruptcyThreshold = tuning?.economy?.daily_costs?.bankruptcy_threshold || -500;
    
    const remainingCredits = creditsStore.credits;
    let message = `Daily costs of ${costs.total} credits deducted.`;
    let bankruptcyWarning = false;
    
    if (remainingCredits < bankruptcyThreshold) {
      message = `BANKRUPTCY! Your ship will be repossessed. Credits: ${remainingCredits}`;
      bankruptcyWarning = true;
      // Trigger bankruptcy consequences
      this.handleBankruptcy();
    } else if (remainingCredits < 0) {
      message = `IN DEBT! Daily costs deducted. Credits: ${remainingCredits}. Find work immediately!`;
      bankruptcyWarning = true;
    } else if (remainingCredits < criticalThreshold) {
      message = `CRITICAL: Only ${remainingCredits} credits remaining after daily costs!`;
    } else if (remainingCredits < warningThreshold) {
      message = `Warning: Low on credits (${remainingCredits} remaining)`;
    }
    
    console.log(`[GameFacade] ${message} Location: ${this.currentLocation}`);
    
    return {
      success,
      message,
      costsDeducted: costs.total,
      remainingCredits,
      bankruptcyWarning
    };
  }
  
  /**
   * Handle bankruptcy consequences
   */
  private handleBankruptcy(): void {
    const tuning = usePlunderverseEconomy.getState().tuning;
    const consequences = tuning?.economy?.economic_pressure?.bankruptcy_consequences;
    
    if (!consequences) return;
    
    // Apply reputation penalty
    const player = usePlayer.getState();
    player.updateReputation('corporations', consequences.reputation_penalty_per_day || -5);
    player.updateReputation('independents', consequences.reputation_penalty_per_day || -5);
    
    // Equipment failure chance
    const equipmentStore = useEquipment.getState();
    const failureRate = consequences.equipment_failure_rate || 0.5;
    
    if (Math.random() < failureRate) {
      // Random equipment takes damage
      const equipment = equipmentStore.equipment;
      if (equipment.length > 0) {
        const randomEquipment = equipment[Math.floor(Math.random() * equipment.length)];
        equipmentStore.applyWear(randomEquipment.id, {
          resourceHardness: 0.5,
          operationIntensity: 1.0,
          environmentalFactor: 0.5
        }, 10);
        console.log(`[GameFacade] Equipment failure due to bankruptcy: ${randomEquipment.name}`);
      }
    }
  }
  
  /**
   * Apply maintenance degradation (call periodically)
   */
  async applyMaintenanceDegradation(): Promise<void> {
    const tuning = usePlunderverseEconomy.getState().tuning;
    if (!tuning?.economy?.maintenance_system) return;
    
    const degradation = tuning.economy.maintenance_system.degradation_per_day;
    const equipmentStore = useEquipment.getState();
    
    // Apply degradation to hull
    const hull = equipmentStore.getEquipment('hull-primary');
    if (hull && degradation.hull) {
      equipmentStore.applyWear('hull-primary', {
        resourceHardness: 0.2,
        operationIntensity: 0.1,
        environmentalFactor: 0.2
      }, degradation.hull);
    }
    
    // Apply degradation to engine
    const engine = equipmentStore.getEquipment('engine-main');
    if (engine && degradation.engine) {
      equipmentStore.applyWear('engine-main', {
        resourceHardness: 0.2,
        operationIntensity: 0.2,
        environmentalFactor: 0.2
      }, degradation.engine);
    }
    
    // Check for maintenance reminders
    const reminderThreshold = tuning.maintenance_system.maintenance_reminder_threshold || 30;
    
    equipmentStore.equipment.forEach(eq => {
      const condition = (eq.currentDurability / eq.maxDurability) * 100;
      if (condition <= reminderThreshold && condition > 0) {
        console.log(`[GameFacade] MAINTENANCE REQUIRED: ${eq.name} at ${condition.toFixed(0)}% condition`);
      }
    });
    
    // Track days since last maintenance
    const gameDay = this.getGameDay();
    const lastMaintenance = parseInt(localStorage.getItem('last_maintenance_day') || '0');
    const daysSinceMaintenance = gameDay - lastMaintenance;
    
    const maintenanceInterval = tuning.maintenance_system.maintenance_interval_days || 5;
    
    if (daysSinceMaintenance >= maintenanceInterval) {
      console.log(`[GameFacade] OVERDUE MAINTENANCE: ${daysSinceMaintenance} days since last service!`);
      
      // Apply extra degradation for overdue maintenance
      const overdueMultiplier = 1 + ((daysSinceMaintenance - maintenanceInterval) * 0.2);
      
      equipmentStore.equipment.forEach(eq => {
        equipmentStore.applyWear(eq.id, {
          resourceHardness: 0.3 * overdueMultiplier,
          operationIntensity: 0.3 * overdueMultiplier,
          environmentalFactor: 0.3 * overdueMultiplier
        }, 1);
      });
    }
  }
  
  /**
   * Perform ship maintenance
   */
  async performMaintenance(): Promise<{
    success: boolean;
    message: string;
    cost: number;
  }> {
    const tuning = usePlunderverseEconomy.getState().tuning;
    const maintenanceCosts = tuning?.maintenance_system?.maintenance_costs;
    
    if (!maintenanceCosts) {
      return { success: false, message: 'Maintenance system not configured', cost: 0 };
    }
    
    const equipmentStore = useEquipment.getState();
    const creditsStore = useCreditsStore.getState();
    
    // Calculate total repair cost
    let totalCost = 0;
    equipmentStore.equipment.forEach(eq => {
      const damagePercent = ((eq.maxDurability - eq.currentDurability) / eq.maxDurability) * 100;
      if (damagePercent > 0) {
        let costPerPoint = maintenanceCosts.equipment_per_point;
        if (eq.type === 'hull') costPerPoint = maintenanceCosts.hull_per_point;
        if (eq.type === 'engine') costPerPoint = maintenanceCosts.engine_per_point;
        
        totalCost += Math.ceil(damagePercent * costPerPoint);
      }
    });
    
    // Check if player can afford it
    if (creditsStore.credits < totalCost) {
      return { 
        success: false, 
        message: `Cannot afford maintenance. Need ${totalCost} credits, have ${creditsStore.credits}`, 
        cost: totalCost 
      };
    }
    
    // Perform repairs
    creditsStore.spendCredits(totalCost);
    
    equipmentStore.equipment.forEach(eq => {
      const result = equipmentStore.repairEquipment(eq.id, eq.maxDurability, creditsStore.credits + totalCost);
      console.log(`[GameFacade] Repaired ${eq.name}: ${result.success}`);
    });
    
    // Update last maintenance day
    localStorage.setItem('last_maintenance_day', this.getGameDay().toString());
    
    return {
      success: true,
      message: `Maintenance complete. All systems repaired for ${totalCost} credits.`,
      cost: totalCost
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
  
  /**
   * Calculate distance between two star nodes
   */
  private calculateDistance(from: StarNode, to: StarNode): number {
    const dx = to.coordinates.x - from.coordinates.x;
    const dy = to.coordinates.y - from.coordinates.y;
    const dz = to.coordinates.z - from.coordinates.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  private calculateFuelNeeded(destination: string): number {
    const content = this.contentRegistry.getContent();
    if (!content?.starNodes) return 0;
    
    // Get current location node
    const fromNode = content.starNodes.find(n => n.name === this.currentLocation || n.id === this.currentLocation.toLowerCase());
    const toNode = content.starNodes.find(n => n.name === destination || n.id === destination);
    
    if (!fromNode || !toNode) {
      console.error(`[GameFacade] Could not find nodes for fuel calculation: ${this.currentLocation} -> ${destination}`);
      return 20; // Default fuel cost
    }
    
    const distance = this.calculateDistance(fromNode, toNode);
    const tuning = usePlunderverseEconomy.getState().tuning;
    
    if (!tuning?.economy?.fuel_system) {
      console.warn('[GameFacade] No fuel tuning found, using defaults');
      return Math.ceil(distance * 0.1);
    }
    
    // Determine fuel consumption based on distance thresholds
    const thresholds = tuning.economy.fuel_system.distance_thresholds;
    const fuelPerJump = tuning.economy.fuel_system.fuel_per_jump;
    
    let fuelNeeded: number;
    if (distance <= thresholds.short) {
      fuelNeeded = fuelPerJump.short_range;
    } else if (distance <= thresholds.medium) {
      fuelNeeded = fuelPerJump.medium_range;
    } else if (distance <= thresholds.long) {
      fuelNeeded = fuelPerJump.long_range;
    } else {
      // Emergency jump for very long distances
      fuelNeeded = fuelPerJump.emergency_jump || fuelPerJump.long_range * 1.5;
    }
    
    // Apply fuel efficiency modifiers from equipment
    const equipmentStore = useEquipment.getState();
    const efficiencyMultiplier = equipmentStore.getFuelEfficiencyMultiplier();
    fuelNeeded = Math.ceil(fuelNeeded * efficiencyMultiplier);
    
    console.log(`[GameFacade] Fuel calculation: ${this.currentLocation} -> ${destination}, distance: ${distance.toFixed(1)}, fuel needed: ${fuelNeeded}`);
    
    return fuelNeeded;
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