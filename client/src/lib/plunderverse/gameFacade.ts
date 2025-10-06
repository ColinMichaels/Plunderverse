import { usePlayer } from "../stores/player/usePlayer";
import { usePlunderverseMissions } from "../stores/economy/usePlunderverseMissions";
import { usePlunderverseEconomy } from "../stores/economy/usePlunderverseEconomy";
import { useMissions } from "../stores/economy/useMissions";
import { useCreditsStore } from "../../domain/economy/credits.store";
import { useEquipment } from "../stores/ship/useEquipment";
import { useSurvival } from "../stores/economy/useSurvival";
import { useCrewManagement } from "../stores/ship/useCrewManagement";
import { useObjectiveTriggers } from "../stores/economy/useObjectiveTriggers";
import { ContentRegistry } from "./contentRegistry";
import { toast } from "sonner";
import { missionControlTest } from "../tests/missionControlTest";
import {
  StarNode,
  Mission,
  MissionRewards,
  FactionId,
  Rank,
  ChoiceOutcome,
} from "./types";

/**
 * GameFacade - Central coordinator for the Plunderverse mission engine
 * Manages travel, missions, economy, and progression
 */
export class GameFacade {
  private static instance: GameFacade;
  private contentRegistry: ContentRegistry;
  private initialized: boolean = false;
  private currentLocation: string = "Earth";
  private playerId: string | null = null;
  private gameDay: number = 1; // Tracks in-game day for seed stability
  private economicPressureInterval: NodeJS.Timeout | null = null;
  private maintenanceInterval: NodeJS.Timeout | null = null;
  private survivalInterval: NodeJS.Timeout | null = null;

  // Story progression tracking
  private storyProgress: Map<string, any> = new Map();
  private currentAct: number = 1;
  private completedStoryMissions: Set<string> = new Set();
  private playerChoices: Map<string, string> = new Map(); // Track important choices
  private moralityScore: number = 0; // Tracks moral alignment
  private endingPath: string | null = null;

  // Progression metrics
  private progressionMetrics = {
    creditsEarnedTotal: 0,
    missionsCompleted: 0,
    missionsByType: new Map<string, number>(),
    combatVictories: 0,
    systemsVisited: new Set<string>(),
    crewRecruited: 0,
    shipsOwned: 1,
    basesControlled: 0,
    livesLost: 0,
    livesSaved: 0,
  };

  private constructor() {
    this.contentRegistry = new ContentRegistry();
    this.loadProgressionData();
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
    let playerId = localStorage.getItem("plunderverse_player_id");

    if (!playerId) {
      // Generate a stable ID based on timestamp and random value
      playerId = `player_${Math.floor(Math.random() * 1000000)}_${new Date().getTime()}`;
      localStorage.setItem("plunderverse_player_id", playerId);
      console.log("Generated new player ID:", playerId);
    } else {
      console.log("Using existing player ID:", playerId);
    }

    this.playerId = playerId;
    return playerId;
  }

  /**
   * Get current game day (increments on travel)
   */
  private getGameDay(): number {
    const savedDay = localStorage.getItem("plunderverse_game_day");
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
    localStorage.setItem("plunderverse_game_day", this.gameDay.toString());
    console.log("Game day incremented to:", this.gameDay);
  }

  /**
   * Initialize the game facade
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log("[GameFacade] Already initialized, skipping");
      return;
    }

    console.log("[GameFacade] 🚀 Starting initialization...");

    try {
      // Load content from registry
      console.log("[GameFacade] Loading content registry...");
      await this.contentRegistry.loadContent();
      console.log("[GameFacade] ✅ Content loaded successfully");

      // Load economy tuning
      console.log("[GameFacade] Loading economy tuning...");
      await usePlunderverseEconomy.getState().loadTuning();
      console.log("[GameFacade] ✅ Economy tuning loaded");

      // Initialize economy with persistent player seed
      const playerId = this.getPlayerId();
      const gameDay = this.getGameDay();
      console.log(`[GameFacade] Initializing RNG with player ID: ${playerId}`);
      usePlunderverseEconomy.getState().initializeRNG(playerId);

      // Initialize crew system and make it globally accessible
      const crewManagement = useCrewManagement.getState();
      crewManagement.initializeCrew();

      // Make crew management accessible globally for other systems
      (window as any).useCrewManagement = useCrewManagement;

      console.log("[GameFacade] ✅ Crew system initialized");

      // Check credits status
      const credits = useCreditsStore.getState();
      console.log(`[GameFacade] 💰 Initial credits: ${credits.credits}`);

      // Generate initial missions for starting location
      const player = usePlayer.getState();
      const seed = `${playerId}:${this.currentLocation}:${gameDay}`;
      console.log(`[GameFacade] 📋 Generating initial missions...`);
      console.log(
        `[GameFacade] Location: ${this.currentLocation}, Rank: ${player.rank}, Seed: ${seed}`,
      );

      usePlunderverseMissions
        .getState()
        .generateMissions(this.currentLocation, player.rank, seed);

      const missionsState = usePlunderverseMissions.getState();
      console.log(
        `[GameFacade] ✅ Missions generated: ${missionsState.availableMissions.length} available, ${missionsState.activeMissions.length} active`,
      );

      if (missionsState.availableMissions.length > 0) {
        console.log(
          "[GameFacade] Sample mission:",
          missionsState.availableMissions[0],
        );
      }

      // Initialize the objective trigger system
      const triggerSystem = useObjectiveTriggers.getState();
      triggerSystem.initializeFromMissions(missionsState.activeMissions);
      console.log("[GameFacade] ✅ Objective trigger system initialized");

      // Make trigger system globally accessible for debugging
      (window as any).objectiveTriggers = triggerSystem;

      // Generate Act 1 story missions on initialization
      console.log("[GameFacade] 📖 Generating Act 1 story missions...");
      await this.generateStoryMissions();

      // Make facade accessible globally for debugging
      (window as any).gameFacade = this;
      
      // Add debug console commands
      (window as any).advanceToAct = (actNumber: number) => {
        this.currentAct = actNumber;
        this.generateStoryMissions();
        console.log(`[GameFacade] Advanced to Act ${actNumber}`);
        toast.info("Story Progression", {
          description: `Advanced to Act ${actNumber}`,
        });
      };

      (window as any).completeStoryMission = async (missionId: string) => {
        const result = await this.resolveMission(missionId);
        if (result.success) {
          this.completedStoryMissions.add(missionId);
          console.log(`[GameFacade] Completed story mission: ${missionId}`);
        }
        return result;
      };

      (window as any).getStoryState = () => {
        return this.getStoryProgressionState();
      };

      this.initialized = true;
      console.log(
        "[GameFacade] Initialized successfully with deterministic seeding",
      );

      // Setup keyboard shortcuts for testing
      this.setupTestKeyboardShortcuts();

      // Start economic pressure systems
      this.startEconomicPressure();
    } catch (error) {
      console.error("[GameFacade] Failed to initialize:", error instanceof Error ? error.message : String(error));
      // Don't throw - allow the app to continue with default values
      this.initialized = false;
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
    const paymentIntervalMinutes = tuning?.economy?.daily_costs?.payment_interval_minutes || 1;
    const dailyCostInterval = paymentIntervalMinutes * 60000;
    
    console.log(`[GameFacade] Daily costs deduction interval set to ${paymentIntervalMinutes} minutes (${dailyCostInterval}ms)`);
    console.log(`[GameFacade] Daily costs will now be deducted every ${paymentIntervalMinutes} minute(s) instead of every minute`);
    
    this.economicPressureInterval = setInterval(async () => {
      console.log(`[GameFacade] Processing daily costs deduction (interval: ${paymentIntervalMinutes} minutes)`);
      await this.applyDailyCosts();
      await this.applyHeatDecay();
      await this.applyReputationDecay();

      // Check for emergency missions
      const credits = useCreditsStore.getState().credits;
      const emergencyThreshold =
        tuning?.economy?.economic_pressure?.emergency_missions
          ?.trigger_credit_threshold || 100;
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
        console.warn("[GameFacade] Survival warnings:", warnings);
      }
    }, 30000);

    console.log("[GameFacade] Economic pressure systems started");
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

    console.log("[GameFacade] Economic pressure systems stopped");
  }

  /**
   * Setup keyboard shortcuts for testing
   */
  private setupTestKeyboardShortcuts(): void {
    window.addEventListener("keydown", (e) => {
      // Ctrl+T to run full test
      if (e.ctrlKey && !e.shiftKey && e.key === "t") {
        e.preventDefault();
        console.log("[GameFacade] Running Mission Control test suite...");
        toast.info("Starting Test Suite", {
          description: "Running comprehensive Mission Control tests...",
        });
        missionControlTest.runAllTests(true); // Run in non-destructive mode
      }

      // Ctrl+Shift+Q for quick test
      if (e.ctrlKey && e.shiftKey && e.key === "Q") {
        e.preventDefault();
        console.log("[GameFacade] Running quick test...");
        toast.info("Quick Test", {
          description: "Testing mission generation and acceptance...",
        });
        missionControlTest.testMissionGeneration();
      }

      // Ctrl+M for mission info display
      if (e.ctrlKey && !e.shiftKey && e.key === "m") {
        e.preventDefault();
        const missions = usePlunderverseMissions.getState();
        console.log("[GameFacade] Current Missions:", {
          available: missions.availableMissions.length,
          active: missions.activeMissions.length,
          completed: missions.completedMissionIds.size,
        });
        toast.info("Mission Status", {
          description: `Available: ${missions.availableMissions.length}, Active: ${missions.activeMissions.length}, Completed: ${missions.completedMissionIds.size}`,
        });
      }

      // Ctrl+Shift+C for clear missions (reset)
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        console.log("[GameFacade] Clearing all missions...");
        const missions = usePlunderverseMissions.getState();
        missions.clearMissions();
        toast.warning("Missions Cleared", {
          description: "All missions have been reset",
        });
      }
    });

    console.log(
      "[GameFacade] Keyboard shortcuts activated: Ctrl+T (test), Ctrl+M (info), Ctrl+Shift+C (clear)",
    );
  }

  /**
   * Travel to a destination
   */
  async travelTo(destination: string): Promise<{
    success: boolean;
    message: string;
    location: string;
    fuelUsed?: number;
  }> {
    await this.ensureInitialized();

    const content = this.contentRegistry.getContent();
    if (!content?.starNodes) {
      return {
        success: false,
        message: "Navigation data not available",
        location: this.currentLocation,
      };
    }

    // Find destination node
    const targetNode = content.starNodes.find(
      (n) => n.name === destination || n.id === destination,
    );

    if (!targetNode) {
      return {
        success: false,
        message: `Unknown destination: ${destination}`,
        location: this.currentLocation,
      };
    }

    // Check fuel requirements
    const fuelNeeded = this.calculateFuelNeeded(destination);
    const survival = useSurvival.getState();

    if (survival.fuel < fuelNeeded) {
      console.log(
        `[GameFacade] Insufficient fuel: ${survival.fuel} / ${fuelNeeded} needed`,
      );
      return {
        success: false,
        message: `Insufficient fuel. Need ${fuelNeeded}, have ${survival.fuel}`,
        location: this.currentLocation,
      };
    }

    // Consume fuel
    survival.consumeFuel(fuelNeeded);

    // Update location
    const previousLocation = this.currentLocation;
    this.currentLocation = targetNode.name;

    // Increment game day on travel
    this.incrementGameDay();

    // Track system visit
    this.progressionMetrics.systemsVisited.add(targetNode.name);

    // Generate new missions for the new location
    const player = usePlayer.getState();
    const newSeed = `${this.getPlayerId()}:${this.currentLocation}:${this.getGameDay()}`;

    // Clear old location missions and generate new ones
    const missionsStore = usePlunderverseMissions.getState();
    missionsStore.clearAvailableMissions(); // Clear available (not active) missions
    missionsStore.generateMissions(this.currentLocation, player.rank, newSeed);

    console.log(
      `[GameFacade] 🚀 Traveled from ${previousLocation} to ${this.currentLocation}`,
    );
    console.log(
      `[GameFacade] New missions generated: ${missionsStore.availableMissions.length} available`,
    );

    // Apply location effects
    this.applyLocationEffects(targetNode);

    // Apply daily costs on travel
    await this.applyDailyCosts();

    return {
      success: true,
      message: `Arrived at ${targetNode.name}`,
      location: this.currentLocation,
      fuelUsed: fuelNeeded,
    };
  }

  /**
   * Get current location details
   */
  getCurrentLocation(): StarNode | null {
    const content = this.contentRegistry.getContent();
    if (!content?.starNodes) return null;

    return (
      content.starNodes.find(
        (n) =>
          n.name === this.currentLocation ||
          n.id === this.currentLocation.toLowerCase(),
      ) || null
    );
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
    const player = usePlayer.getState();

    // Get the mission
    const mission = missionsStore.availableMissions.find(
      (m) => m.id === missionId,
    );

    if (!mission) {
      return {
        success: false,
        message: "Mission not found or no longer available",
      };
    }

    // Check player requirements
    const playerState = this.getPlayerState();
    if (mission.requirements) {
      // Check credits requirement
      if (
        mission.requirements.credits &&
        playerState.credits < mission.requirements.credits
      ) {
        return {
          success: false,
          message: `Insufficient credits. Need ${mission.requirements.credits}`,
        };
      }

      // Check reputation requirements
      if (mission.requirements.reputation) {
        for (const [faction, required] of Object.entries(
          mission.requirements.reputation,
        )) {
          const playerRep = playerState.reputation[faction as FactionId] || 0;
          if (playerRep < required) {
            return {
              success: false,
              message: `Insufficient ${faction} reputation. Need ${required}, have ${playerRep}`,
            };
          }
        }
      }
    }

    // Check max active missions
    const tuning = usePlunderverseEconomy.getState().tuning;
    const maxActive = tuning?.economy?.missions?.max_active || 5;

    if (missionsStore.activeMissions.length >= maxActive) {
      return {
        success: false,
        message: `Cannot accept more than ${maxActive} active missions`,
      };
    }

    // Accept the mission
    const accepted = missionsStore.acceptMission(missionId);

    if (accepted) {
      console.log(
        `[GameFacade] ✅ Mission accepted: ${mission.title} (${mission.type})`,
      );

      // Initialize trigger system for this mission
      const triggerSystem = useObjectiveTriggers.getState();
      triggerSystem.initializeMissionTriggers(mission);

      return {
        success: true,
        message: `Mission "${mission.title}" accepted`,
        mission,
      };
    }

    return {
      success: false,
      message: "Failed to accept mission",
    };
  }

  /**
   * Resolve/complete a mission
   */
  async resolveMission(
    missionId: string,
    choiceId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    rewards?: MissionRewards;
  }> {
    await this.ensureInitialized();

    const missionsStore = usePlunderverseMissions.getState();
    const mission = missionsStore.activeMissions.find(
      (m) => m.id === missionId,
    );

    if (!mission) {
      return {
        success: false,
        message: "Mission not found or not active",
      };
    }

    // Check all objectives are complete
    const allObjectivesComplete = mission.objectives.every((o) => o.completed);
    if (!allObjectivesComplete) {
      return {
        success: false,
        message: "Not all mission objectives are complete",
      };
    }

    // Handle choice if provided
    if (choiceId) {
      const choice = mission.choices.find((c) => c.id === choiceId);
      if (choice?.outcome) {
        await this.applyOutcome(choice.outcome);
        // Track moral choice
        this.playerChoices.set(missionId, choiceId);
        if (choice.outcome.moralityShift) {
          this.moralityScore += choice.outcome.moralityShift;
          console.log(
            `[GameFacade] Morality shift: ${choice.outcome.moralityShift > 0 ? "+" : ""}${choice.outcome.moralityShift} (Total: ${this.moralityScore})`,
          );
        }
      }
    }

    // Apply base rewards
    await this.applyRewards(mission.rewards, mission);

    // Complete the mission
    missionsStore.completeMission(missionId);

    // Update progression metrics
    this.progressionMetrics.missionsCompleted++;
    const missionTypeCount =
      this.progressionMetrics.missionsByType.get(mission.type) || 0;
    this.progressionMetrics.missionsByType.set(mission.type, missionTypeCount + 1);
    this.progressionMetrics.creditsEarnedTotal +=
      mission.rewards.base?.credits || 0;

    // Check for story mission completion
    if (mission.type === "story") {
      this.completedStoryMissions.add(missionId);
      await this.checkActProgression();
    }

    // Check rank progression
    this.updateRankProgressionInternal();

    // Clean up trigger system for this mission
    const triggerSystem = useObjectiveTriggers.getState();
    triggerSystem.removeMissionTriggers(missionId);

    console.log(
      `[GameFacade] 🎉 Mission completed: ${mission.title} (${mission.type})`,
    );

    return {
      success: true,
      message: `Mission "${mission.title}" completed!`,
      rewards: mission.rewards,
    };
  }

  /**
   * Update objective progress (called by trigger system)
   */
  async updateObjectiveProgress(
    missionId: string,
    objectiveId: string,
    progress: number,
  ): Promise<void> {
    const missionsStore = usePlunderverseMissions.getState();
    const mission = missionsStore.activeMissions.find(
      (m) => m.id === missionId,
    );

    if (!mission) return;

    // Find and update objective
    const objective = mission.objectives.find((o) => o.id === objectiveId);
    if (!objective) return;

    const previousProgress = objective.progress || 0;
    missionsStore.updateObjectiveProgress(missionId, objectiveId, progress);

    // Notify if significant progress
    if (!objective.completed && progress >= 100) {
      toast.success(`✅ Objective complete: ${objective.description}`, {
        duration: 3000,
      });
      console.log(
        `[GameFacade] Objective completed: ${objective.description} for mission ${mission.title}`,
      );
    } else if (previousProgress < progress) {
      // Only notify on significant progress increments (20% or more)
      const progressIncrease = progress - previousProgress;
      if (progressIncrease >= 20) {
        toast.info(`📋 Progress: ${objective.description} (${Math.round(progress)}%)`, {
          duration: 2500
        });
      }
    }

    // Check for automatic mission completion
    if (mission && mission.active) {
      const allComplete = mission.objectives.every((o) => o.completed);
      if (allComplete && mission.choices.length === 0) {
        // Show mission completion preview
        toast.success(`🎯 Mission ready for completion: ${mission.title}`, {
          description: 'All objectives complete!',
          duration: 3000
        });
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
      notoriety: player.notoriety,
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
    const crewManagement = useCrewManagement.getState();

    console.log("[GameFacade] Tuning structure:", {
      hasTuning: !!tuning,
      hasEconomy: !!tuning?.economy,
      hasDailyCosts: !!tuning?.economy?.daily_costs,
    });

    // Get crew salaries
    const crewSalaries = crewManagement.dailySalaryCosts;

    if (!tuning?.economy?.daily_costs) {
      console.warn("[GameFacade] No daily costs tuning found, using defaults");
      return {
        crew: 50 + crewSalaries,
        lifeSupport: 25,
        docking: 0,
        insurance: 15,
        supplies: 20,
        total: 110 + crewSalaries,
        location: this.currentLocation,
      };
    }

    const dailyCosts = tuning.economy.daily_costs;

    // Calculate crew costs (base crew + hired specialists)
    let crewCost = dailyCosts.crew_salaries.base_crew + crewSalaries;

    // Life support costs
    const lifeSupport = dailyCosts.life_support;

    // Docking fees based on current location
    const content = this.contentRegistry.getContent();
    const currentNode = content?.starNodes?.find(
      (n) =>
        n.name === this.currentLocation ||
        n.id === this.currentLocation.toLowerCase(),
    );

    let dockingFee = 0;
    if (currentNode) {
      if (currentNode.faction === "corporations") {
        dockingFee = dailyCosts.docking_fees.corporations;
      } else if (currentNode.faction === "independents") {
        dockingFee = dailyCosts.docking_fees.independents;
      } else if (currentNode.faction === "outlaws") {
        dockingFee = dailyCosts.docking_fees.outlaws;
      } else {
        dockingFee = dailyCosts.docking_fees.deep_space || 0;
      }
    }

    // Insurance and supplies
    const insurance = dailyCosts.insurance;
    const supplies = dailyCosts.supplies;

    // Calculate total (including hired crew salaries)
    const total = crewCost + lifeSupport + dockingFee + insurance + supplies;

    return {
      crew: crewCost,
      lifeSupport,
      docking: dockingFee,
      insurance,
      supplies,
      total,
      location: this.currentLocation,
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
    const warningThreshold =
      tuning?.economy?.daily_costs?.warning_credit_threshold || 200;
    const criticalThreshold =
      tuning?.economy?.daily_costs?.critical_credit_threshold || 50;
    const bankruptcyThreshold =
      tuning?.economy?.daily_costs?.bankruptcy_threshold || -500;

    const remainingCredits = creditsStore.credits;
    let message = `Daily costs of ${costs.total} credits deducted.`;
    let bankruptcyWarning = false;

    // Show daily costs notification
    const costBreakdown = costs.docking > 0 
      ? `Crew: ${costs.crew}c, Docking: ${costs.docking}c, Supplies: ${costs.supplies}c` 
      : `Crew: ${costs.crew}c, Life Support: ${costs.lifeSupport}c, Supplies: ${costs.supplies}c`;
    
    toast.info(`💵 Daily costs paid: -${costs.total} credits`, {
      description: costBreakdown,
      duration: 3000
    });

    if (remainingCredits < bankruptcyThreshold) {
      message = `BANKRUPTCY! Your ship will be repossessed. Credits: ${remainingCredits}`;
      bankruptcyWarning = true;
      // Trigger bankruptcy consequences
      this.handleBankruptcy();
      // Show critical bankruptcy notification
      toast.error(`💀 BANKRUPTCY! Ship will be repossessed!`, {
        description: `Credits: ${remainingCredits}. Game Over.`,
        duration: 0 // Persistent notification
      });
    } else if (remainingCredits < 0) {
      message = `IN DEBT! Daily costs deducted. Credits: ${remainingCredits}. Find work immediately!`;
      bankruptcyWarning = true;
      toast.error(`🔴 IN DEBT! Credits: ${remainingCredits}`, {
        description: 'Find work immediately or face bankruptcy!',
        duration: 5000
      });
    } else if (remainingCredits < criticalThreshold) {
      message = `CRITICAL: Only ${remainingCredits} credits remaining after daily costs!`;
      toast.warning(`⚠️ Credits critical: ${remainingCredits}c remaining`, {
        description: 'Accept any mission immediately!',
        duration: 4000
      });
    } else if (remainingCredits < warningThreshold) {
      message = `Warning: Low on credits (${remainingCredits} remaining)`;
      toast.warning(`💸 Low credits: ${remainingCredits}c remaining`, {
        description: 'Consider taking on missions soon',
        duration: 3500
      });
    }

    console.log(`[GameFacade] ${message} Location: ${this.currentLocation}`);

    return {
      success,
      message,
      costsDeducted: costs.total,
      remainingCredits,
      bankruptcyWarning,
    };
  }

  /**
   * Handle bankruptcy consequences
   */
  private handleBankruptcy(): void {
    const tuning = usePlunderverseEconomy.getState().tuning;
    const consequences =
      tuning?.economy?.economic_pressure?.bankruptcy_consequences;

    if (!consequences) return;

    // Apply reputation penalty
    const player = usePlayer.getState();
    player.updateReputation(
      "corporations",
      consequences.reputation_penalty_per_day || -5,
    );
    player.updateReputation(
      "independents",
      consequences.reputation_penalty_per_day || -5,
    );

    // Equipment failure chance
    const equipmentStore = useEquipment.getState();
    const failureRate = consequences.equipment_failure_rate || 0.5;

    if (Math.random() < failureRate) {
      // Random equipment takes damage
      const equipment = equipmentStore.equipment;
      if (equipment.length > 0) {
        const randomEquipment =
          equipment[Math.floor(Math.random() * equipment.length)];
        equipmentStore.applyWear(
          randomEquipment.id,
          {
            resourceHardness: 0.5,
            operationIntensity: 0.1,
            environmentalFactor: 0.5,
          },
          10,
        );
        console.log(
          `[GameFacade] Equipment failure from bankruptcy: ${randomEquipment.name}`,
        );
      }
    }
  }

  /**
   * Apply maintenance degradation
   */
  async applyMaintenanceDegradation(): Promise<void> {
    const equipmentStore = useEquipment.getState();
    const equipment = equipmentStore.equipment;

    if (equipment.length === 0) return;

    const tuning = usePlunderverseEconomy.getState().tuning;
    const degradationRate =
      tuning?.economy?.maintenance?.degradation_per_hour || 0.02;

    // Apply degradation to all equipment
    equipment.forEach((eq) => {
      // Calculate the current condition percentage
      const currentConditionPercent = (eq.currentDurability / eq.maxDurability) * 100;
      
      // Apply wear based on degradation rate (convert percentage to actual durability loss)
      const durabilityLoss = (degradationRate * eq.maxDurability);
      
      // Use applyWear to properly degrade the equipment
      equipmentStore.applyWear(
        eq.id,
        {
          resourceHardness: 0.2,  // Low stress for passive degradation
          operationIntensity: 0.1,  // Minimal operation intensity
          environmentalFactor: 0.3,  // Some environmental wear
        },
        durabilityLoss * 10  // Scale operation time to achieve desired wear
      );

      // Check for condition warnings
      const newConditionPercent = ((eq.currentDurability - durabilityLoss) / eq.maxDurability) * 100;
      if (newConditionPercent < 30 && currentConditionPercent >= 30) {
        console.warn(
          `[GameFacade] Equipment ${eq.name} is in poor condition: ${Math.round(newConditionPercent)}%`,
        );
      }
    });
  }

  /**
   * Apply heat decay over time
   */
  async applyHeatDecay(): Promise<void> {
    const player = usePlayer.getState();
    const tuning = usePlunderverseEconomy.getState().tuning;
    const decayRate = tuning?.economy?.heat_system?.decay_per_day || 5;

    if (player.heat > 0) {
      const newHeat = Math.max(0, player.heat - decayRate);
      player.updateHeat(-decayRate);
      console.log(
        `[GameFacade] Heat decay applied: ${player.heat + decayRate} -> ${newHeat}`,
      );
    }
  }

  /**
   * Apply reputation decay for inactive factions
   */
  async applyReputationDecay(): Promise<void> {
    const player = usePlayer.getState();
    const tuning = usePlunderverseEconomy.getState().tuning;
    const decayRate = tuning?.economy?.reputation?.decay_rate || 0.01;

    // Apply small decay to all faction reputations (trending toward neutral)
    const factions: FactionId[] = ["corporations", "independents", "outlaws"];

    factions.forEach((faction) => {
      const currentRep = player.reputation[faction];
      if (Math.abs(currentRep) > 10) {
        // Only decay if reputation is significantly away from neutral
        const decay =
          currentRep > 0
            ? -Math.ceil(currentRep * decayRate)
            : Math.floor(Math.abs(currentRep) * decayRate);
        player.updateReputation(faction, decay);
      }
    });
  }

  /**
   * Generate emergency missions when credits are low
   */
  private generateEmergencyMissions(): void {
    const missionsStore = usePlunderverseMissions.getState();
    const player = usePlayer.getState();

    console.log("[GameFacade] Generating emergency missions due to low credits");

    // Add a high-paying urgent mission
    const emergencyMission: Mission = {
      id: `emergency_${Date.now()}`,
      title: "URGENT: Emergency Cargo Run",
      description:
        "A desperate client needs immediate delivery. High pay, high risk.",
      type: "delivery",
      difficulty: "hard",
      minRank: player.rank,
      active: false,
      completed: false,
      progress: 0,
      timeLimit: 30, // 30 minute time limit
      factionAlignment: "independents",
      requirements: {},
      objectives: [
        {
          id: "deliver_emergency",
          type: "delivery",
          description: "Deliver emergency supplies",
          target: 1,
          current: 0,
          progress: 0,
          completed: false,
          locations: ["Mars", "Venus"],
        },
      ],
      rewards: {
        base: {
          credits: 500, // High payout
          reputation: { independents: 10 },
        },
      },
      choices: [],
      tags: ["urgent", "high_pay"],
    };

    // Add to available missions
    missionsStore.availableMissions.unshift(emergencyMission);

    toast.warning("💰 URGENT MISSION AVAILABLE!", {
      description: "High-paying emergency job to help with your financial situation",
      duration: 5000,
    });
  }

  /**
   * Check and handle act progression
   */
  private async checkActProgression(): Promise<void> {
    const player = usePlayer.getState();

    // Act progression based on rank
    if (player.rank >= 3 && this.currentAct === 1) {
      this.currentAct = 2;
      await this.generateStoryMissions();
      console.log("[GameFacade] 📖 Progressed to Act 2!");
      toast.success("Act 2 Unlocked: The Outlaw", {
        description:
          "Your reputation grows. Time to build your crew and choose your allies.",
      });
    } else if (player.rank >= 6 && this.currentAct === 2) {
      this.currentAct = 3;
      await this.generateStoryMissions();
      console.log("[GameFacade] 📖 Progressed to Act 3!");
      toast.success("Act 3 Unlocked: The Captain", {
        description:
          "You command respect. The faction war has begun, and everyone wants you on their side.",
      });
    } else if (player.rank >= 9 && this.currentAct === 3) {
      this.currentAct = 4;
      await this.generateStoryMissions();
      console.log("[GameFacade] 📖 Progressed to Act 4!");
      toast.success("Act 4 Unlocked: The Legend", {
        description: "Your name will echo through history. Choose your destiny.",
      });
    }
  }

  /**
   * Load progression data from storage
   */
  private loadProgressionData(): void {
    try {
      const saved = localStorage.getItem('plunderverse_progression');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentAct = data.currentAct || 1;
        this.moralityScore = data.moralityScore || 0;
        this.completedStoryMissions = new Set(data.completedStoryMissions || []);
        this.playerChoices = new Map(data.playerChoices || []);
        this.endingPath = data.endingPath || null;
        console.log('[GameFacade] Loaded progression data:', data);
      }
    } catch (error) {
      console.error('[GameFacade] Error loading progression data:', error);
    }
  }

  /**
   * Get current act information
   */
  async getCurrentAct(): Promise<any> {
    try {
      await this.ensureInitialized();
      
      // Get content from registry
      const content = this.contentRegistry.getContent();
      
      // Check if story acts are loaded
      if (!content) {
        console.warn('[GameFacade] No content loaded in registry');
        return this.getDefaultAct();
      }
      
      // Load story acts from the content registry
      // The content registry loads story_acts.json which should have an acts array
      const storyActsModule = (window as any).storyActsData || null;
      
      // Try to load story acts directly from the JSON file
      try {
        const response = await fetch('/src/content/plunderverse/story_acts.json');
        if (response.ok) {
          const storyData = await response.json();
          const acts = storyData.acts || [];
          
          // Find the current act
          const currentActData = acts.find((act: any) => act.number === this.currentAct);
          
          if (currentActData) {
            console.log('[GameFacade] Found act data:', currentActData);
            return currentActData;
          }
        }
      } catch (fetchError) {
        console.warn('[GameFacade] Could not fetch story acts directly:', fetchError);
      }
      
      // Return default act data if not found
      return this.getDefaultAct();
    } catch (error) {
      console.error('[GameFacade] Error getting current act:', error instanceof Error ? error.message : String(error));
      return this.getDefaultAct();
    }
  }

  /**
   * Get default act data when story content is not available
   */
  private getDefaultAct(): any {
    const defaultActs = [
      {
        id: "act_1",
        number: 1,
        title: "The Rogue",
        subtitle: "Life on the Margins",
        description: "Fresh from Earth's collapse, you're just another desperate soul trying to survive in the black.",
        rankRange: { min: 0, max: 3 },
        themes: ["survival", "learning_the_ropes", "first_betrayal", "finding_purpose"]
      },
      {
        id: "act_2", 
        number: 2,
        title: "The Outlaw",
        subtitle: "Building a Reputation",
        description: "You've learned the hard way that playing by the rules gets you killed. Time to build your crew.",
        rankRange: { min: 4, max: 6 },
        themes: ["crew_loyalty", "faction_politics", "moral_choices", "conspiracy_unveiled"]
      },
      {
        id: "act_3",
        number: 3,
        title: "The Captain",
        subtitle: "Leading the Charge",
        description: "You command respect across the frontier. Your decisions shape the fate of entire colonies.",
        rankRange: { min: 7, max: 8 },
        themes: ["leadership", "faction_war", "difficult_choices", "power_and_responsibility"]
      },
      {
        id: "act_4",
        number: 4,
        title: "The Legend",
        subtitle: "Destiny Awaits",
        description: "Your name will echo through history. The final battle approaches.",
        rankRange: { min: 9, max: 10 },
        themes: ["legacy", "final_confrontation", "redemption_or_damnation", "crew_epilogues"]
      }
    ];

    const act = defaultActs.find(a => a.number === this.currentAct) || defaultActs[0];
    console.log('[GameFacade] Using default act data for act', this.currentAct);
    return act;
  }

  /**
   * Check rank progression and requirements
   */
  async checkRankProgression(): Promise<{
    currentRank: number;
    nextRank: number | null;
    progress: any;
    canAdvance: boolean;
    requirements: any | null;
  }> {
    await this.ensureInitialized();

    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missionsStore = usePlunderverseMissions.getState();

    const content = this.contentRegistry.getContent();
    const ranks = content?.ranks || [];
    const currentRank = ranks.find((r: Rank) => r.level === player.rank);
    const nextRankData = ranks.find((r: Rank) => r.level === player.rank + 1);

    if (!nextRankData) {
      return {
        currentRank: player.rank,
        nextRank: null,
        progress: {
          credits: credits.credits,
          missions: missionsStore.completedMissionIds.size,
          notoriety: player.notoriety,
        },
        canAdvance: false,
        requirements: null,
      };
    }

    const progress = {
      credits: credits.credits,
      missions: missionsStore.completedMissionIds.size,
      notoriety: player.notoriety,
      special: this.checkSpecialRequirements(nextRankData),
    };

    const canAdvance =
      progress.credits >= nextRankData.requirements.credits &&
      progress.missions >= (nextRankData.requirements.missionsCompleted || 0) &&
      progress.notoriety >= nextRankData.requirements.notoriety &&
      (!nextRankData.requirements.special || progress.special);

    return {
      currentRank: player.rank,
      nextRank: player.rank + 1,
      progress,
      canAdvance,
      requirements: nextRankData.requirements,
    };
  }

  /**
   * Check special requirements for ranks
   */
  private checkSpecialRequirements(rank: Rank): string | null {
    // Implement special requirement checks based on rank
    // This is placeholder logic
    return null;
  }

  /**
   * Generate story missions for current act
   */
  private async generateStoryMissions(): Promise<void> {
    // This is a placeholder - story missions would be generated based on act
    console.log(`[GameFacade] Generating story missions for Act ${this.currentAct}`);
    
    // Mark some as completed based on progress
    if (this.currentAct > 1) {
      const storyMissionIds = [
        'story_act1_desperate_measures',
        'story_act1_first_score',
        'story_act1_betrayal'
      ];
      storyMissionIds.forEach(id => this.completedStoryMissions.add(id));
    }
  }

  /**
   * Get available endings based on player state
   */
  async getAvailableEndings(): Promise<any[]> {
    await this.ensureInitialized();

    // Only available in Act 4
    if (this.currentAct < 4) {
      return [];
    }

    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const crewState = useCrewManagement.getState();

    const availableEndings = [];

    // Pirate King ending
    if (
      player.notoriety >= 90 &&
      player.reputation.outlaws >= 80 &&
      this.moralityScore <= -50
    ) {
      availableEndings.push({
        id: "ending_pirate_king",
        name: "The Pirate King",
        description:
          "Rule the frontier through fear and strength. The Corps bend to your will.",
      });
    }

    // Hero ending
    if (
      player.reputation.independents >= 90 &&
      crewState.averageLoyalty >= 85 &&
      this.moralityScore >= 50
    ) {
      availableEndings.push({
        id: "ending_robin_hood",
        name: "Hero of the People",
        description:
          "Break the Corporate stranglehold and give power back to the colonies.",
      });
    }

    // Corporate Sellout
    if (
      player.reputation.corporations >= 70 &&
      credits.credits >= 1000000 &&
      this.moralityScore >= -20 &&
      this.moralityScore <= 20
    ) {
      availableEndings.push({
        id: "ending_corporate_sellout",
        name: "The Devil's Bargain",
        description:
          "Make a deal with the Corps - legitimacy and wealth for keeping colonies in line.",
      });
    }

    // True Independence
    if (
      player.notoriety >= 100 &&
      Math.max(
        player.reputation.corporations,
        player.reputation.independents,
        player.reputation.outlaws,
      ) < 60
    ) {
      availableEndings.push({
        id: "ending_true_independence",
        name: "Ghost of the Frontier",
        description:
          "Answer to no one. Your ship disappears into the black, a legend whispered.",
      });
    }

    // Redemption
    if (this.moralityScore >= 75 && this.progressionMetrics.livesSaved >= 100) {
      availableEndings.push({
        id: "ending_redemption",
        name: "The Redeemed",
        description:
          "Begin as a scoundrel but become something more. Your past sins are forgiven.",
      });
    }

    return availableEndings;
  }

  /**
   * Choose an ending path
   */
  async chooseEnding(endingId: string): Promise<{
    success: boolean;
    message: string;
    ending?: any;
  }> {
    if (this.currentAct < 4) {
      return {
        success: false,
        message: "Endings are only available in Act 4",
      };
    }

    const availableEndings = await this.getAvailableEndings();
    const chosenEnding = availableEndings.find((e) => e.id === endingId);

    if (!chosenEnding) {
      return {
        success: false,
        message: "This ending is not available based on your choices",
      };
    }

    this.endingPath = endingId;

    // Apply ending consequences
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();

    switch (endingId) {
      case "ending_pirate_king":
        player.updateNotoriety(100 - player.notoriety);
        player.updateReputation("outlaws", 100 - player.reputation.outlaws);
        break;

      case "ending_robin_hood":
        player.updateReputation("independents", 100 - player.reputation.independents);
        this.progressionMetrics.livesSaved += 1000;
        break;

      case "ending_corporate_sellout":
        credits.earnCredits(1000000);
        player.updateReputation("corporations", 100 - player.reputation.corporations);
        break;

      case "ending_true_independence":
        // Reset all faction reputations to neutral
        player.updateReputation("corporations", -player.reputation.corporations);
        player.updateReputation("independents", -player.reputation.independents);
        player.updateReputation("outlaws", -player.reputation.outlaws);
        break;

      case "ending_redemption":
        this.moralityScore = 100;
        player.updateHeat(-player.heat);
        break;
    }

    console.log(`[GameFacade] 🎭 Ending chosen: ${chosenEnding.name}`);
    toast.success("Destiny Chosen!", {
      description: chosenEnding.name,
      duration: 5000,
    });

    return {
      success: true,
      message: `You have chosen: ${chosenEnding.name}`,
      ending: chosenEnding,
    };
  }

  /**
   * Get new game plus bonuses
   */
  async getNewGamePlusBonuses(): Promise<any[]> {
    if (!this.endingPath) {
      return [];
    }

    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const crewState = useCrewManagement.getState();

    const bonuses = [];

    // List of potential bonuses
    const potentialBonuses = [
      {
        id: "bonus_credits",
        name: "Starter Fund",
        description: "Start with 10% of your ending credits",
        condition: credits.credits > 10000,
      },
      {
        id: "bonus_crew",
        name: "Veteran Crew",
        description: "One loyal crew member joins you immediately",
        condition: crewState.activeCrew.length > 0 && crewState.averageLoyalty >= 90,
      },
      {
        id: "bonus_ship",
        name: "Legacy Ship",
        description: "Keep an upgraded version of your starting ship",
        condition: this.endingPath !== null,
      },
      {
        id: "bonus_reputation",
        name: "Remembered",
        description: "Start with +10 reputation with your allied faction",
        condition:
          Math.max(
            player.reputation.corporations,
            player.reputation.independents,
            player.reputation.outlaws,
          ) >= 80,
      },
    ];

    // Check which bonuses qualify
    for (const bonus of potentialBonuses) {
      let qualified = false;
      let value: any = null;

      switch (bonus.id) {
        case "bonus_credits":
          if (credits.credits > 10000) {
            qualified = true;
            value = Math.floor(credits.credits * 0.1);
          }
          break;

        case "bonus_crew":
          const loyalCrew = crewState.activeCrew.find(
            (c) => c.loyalty >= 90,
          );
          if (loyalCrew) {
            qualified = true;
            value = loyalCrew.name;
          }
          break;

        case "bonus_ship":
          if (this.endingPath) {
            qualified = true;
            value = "upgraded_starter_ship";
          }
          break;

        case "bonus_reputation":
          const alliedFaction = Object.entries(player.reputation).find(
            ([_, rep]) => rep >= 80,
          );
          if (alliedFaction) {
            qualified = true;
            value = { faction: alliedFaction[0], bonus: 10 };
          }
          break;
      }

      if (qualified) {
        bonuses.push({ ...bonus, value });
      }
    }

    return bonuses;
  }

  /**
   * Get story progression state for UI
   */
  getStoryProgressionState(): {
    currentAct: number;
    completedMissions: number;
    totalStoryMissions: number;
    moralityScore: number;
    moralityAlignment: string;
    progressionMetrics: any;
    nextMilestone: string | null;
    endingPath: string | null;
  } {
    const alignment =
      this.moralityScore >= 50
        ? "Hero"
        : this.moralityScore >= 20
          ? "Neutral"
          : this.moralityScore >= -20
            ? "Opportunist"
            : this.moralityScore >= -50
              ? "Villain"
              : "Monster";

    // Determine next milestone
    let nextMilestone = null;
    const player = usePlayer.getState();
    if (player.rank < 3) {
      nextMilestone = "Complete Act 1 betrayal";
    } else if (player.rank < 6) {
      nextMilestone = "Pull off the Beaumonde Job";
    } else if (player.rank < 8) {
      nextMilestone = "Choose your faction in the war";
    } else if (player.rank < 10) {
      nextMilestone = "Prepare for the final battle";
    }

    return {
      currentAct: this.currentAct,
      completedMissions: this.completedStoryMissions.size,
      totalStoryMissions: 12, // Total story missions across all acts
      moralityScore: this.moralityScore,
      moralityAlignment: alignment,
      progressionMetrics: {
        ...this.progressionMetrics,
        systemsVisited: Array.from(this.progressionMetrics.systemsVisited),
        missionsByType: Object.fromEntries(
          this.progressionMetrics.missionsByType,
        ),
      },
      nextMilestone,
      endingPath: this.endingPath,
    };
  }

  /**
   * Hook for delivery completion
   */
  async onDeliveryComplete(destination: string): Promise<void> {
    const missionsStore = usePlunderverseMissions.getState();
    const activeMissions = missionsStore.getActiveMissionsByType("delivery");

    for (const mission of activeMissions) {
      const deliveryObjective = mission.objectives.find(
        (o) => o.type === "delivery" && o.locations?.includes(destination),
      );

      if (deliveryObjective) {
        await this.updateObjectiveProgress(
          mission.id,
          deliveryObjective.id,
          100,
        );
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
    const fromNode = content.starNodes.find(
      (n) =>
        n.name === this.currentLocation ||
        n.id === this.currentLocation.toLowerCase(),
    );
    const toNode = content.starNodes.find(
      (n) => n.name === destination || n.id === destination,
    );

    if (!fromNode || !toNode) {
      console.error(
        `[GameFacade] Could not find nodes for fuel calculation: ${this.currentLocation} -> ${destination}`,
      );
      return 20; // Default fuel cost
    }

    const distance = this.calculateDistance(fromNode, toNode);
    const tuning = usePlunderverseEconomy.getState().tuning;

    if (!tuning?.economy?.fuel_system) {
      console.warn("[GameFacade] No fuel tuning found, using defaults");
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

    console.log(
      `[GameFacade] Fuel calculation: ${this.currentLocation} -> ${destination}, distance: ${distance.toFixed(1)}, fuel needed: ${fuelNeeded}`,
    );

    return fuelNeeded;
  }

  private applyLocationEffects(node: StarNode): void {
    const player = usePlayer.getState();

    // Apply faction-specific effects
    if (node.faction === "corporations") {
      // Corporations reduce heat but cost more
      player.updateHeat(-5);
    } else if (node.faction === "outlaws") {
      // Outlaws increase notoriety
      player.updateNotoriety(1);
    }

    // Apply security-based effects instead of tags
    if (node.security?.level === "low") {
      player.updateHeat(-10);
      player.updateNotoriety(2);
    }

    if (node.security?.level === "high") {
      // Can't reduce heat below detection threshold in high security
      if (player.heat > 30) {
        console.log("Warning: High heat in high security zone!");
      }
    }
  }

  private async applyOutcome(outcome: ChoiceOutcome): Promise<void> {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();

    console.log("[GameFacade] Applying choice outcome:", outcome);

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
        console.log(
          `[GameFacade] Reputation change for ${faction}: ${oldRep} -> ${newRep} (${change > 0 ? "+" : ""}${change})`,
        );
      }
    }

    // Apply effects
    if (outcome.effects) {
      if (outcome.effects.notoriety) {
        const oldNotoriety = player.notoriety;
        player.updateNotoriety(outcome.effects.notoriety);
        console.log(
          `[GameFacade] Notoriety change: ${oldNotoriety} -> ${player.notoriety} (+${outcome.effects.notoriety})`,
        );
      }
      if (outcome.effects.heatLevel) {
        const oldHeat = player.heat;
        player.updateHeat(outcome.effects.heatLevel);
        console.log(
          `[GameFacade] Heat change: ${oldHeat} -> ${player.heat} (+${outcome.effects.heatLevel})`,
        );
      }
    }

    // Handle combat outcomes
    if (outcome.combat) {
      // Trigger combat (would interface with combat system)
      console.log("[GameFacade] Combat triggered:", outcome.enemies);
    }

    // Add items to inventory (would interface with inventory system)
    if (outcome.items && outcome.items.length > 0) {
      console.log("[GameFacade] Items received:", outcome.items);
    }
  }

  private async applyRewards(
    rewards: MissionRewards,
    mission: Mission,
  ): Promise<void> {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const economy = usePlunderverseEconomy.getState();

    console.log(
      `[GameFacade] Applying rewards for mission: ${mission.title}`,
      rewards,
    );

    // Calculate payout with modifiers
    let creditReward = rewards.base?.credits || 0;
    const payoutModifier = economy.calculateMissionPayoutModifier(
      mission.type,
      player.reputation,
    );

    // Apply crew negotiator bonus to rewards
    const crewState = useCrewManagement.getState();
    let crewBonus = 1.0;

    if (
      crewState?.activeCrew.length > 1 &&
      crewState?.bonuses?.missionRewards > 0
    ) {
      crewBonus = 1 + crewState.bonuses.missionRewards;
      console.log(
        `[GameFacade] Applying negotiator bonus: +${crewState.bonuses.missionRewards * 100}% to mission rewards`,
      );
    }

    creditReward = Math.round(creditReward * payoutModifier * crewBonus);

    // Apply credits
    if (creditReward > 0) {
      const oldCredits = credits.credits;
      credits.earnCredits(creditReward);
      console.log(
        `[GameFacade] Credits earned: ${oldCredits} -> ${credits.credits} (+${creditReward}, modifiers: faction ${payoutModifier.toFixed(2)}x, crew ${crewBonus.toFixed(2)}x)`,
      );
    }

    // Apply reputation changes
    if (rewards.base?.reputation) {
      for (const [faction, change] of Object.entries(rewards.base.reputation)) {
        const oldRep = player.reputation[faction as FactionId];
        player.updateReputation(faction as FactionId, change);
        const newRep = player.reputation[faction as FactionId];
        console.log(
          `[GameFacade] Mission reward - Reputation ${faction}: ${oldRep} -> ${newRep} (${change > 0 ? "+" : ""}${change})`,
        );
      }
    }

    // Apply items
    if (rewards.base?.items) {
      // Would add to inventory
      console.log("[GameFacade] Items received:", rewards.base.items);
    }

    // Update stats - use player.rank consistently
    const expGain = 100 * (mission.difficulty === "hard" ? 2 : 1);
    player.addExperience(expGain);
    console.log(`[GameFacade] Experience gained: ${expGain}`);

    // Apply heat/notoriety based on mission type
    if (mission.type === "smuggling") {
      const heat = economy.calculateHeatFromAction(
        "smuggling",
        this.getCurrentFaction(),
      );
      const oldHeat = player.heat;
      const oldNotoriety = player.notoriety;
      player.updateHeat(heat);
      player.updateNotoriety(3);
      console.log(
        `[GameFacade] Smuggling mission - Heat: ${oldHeat} -> ${player.heat} (+${heat}), Notoriety: ${oldNotoriety} -> ${player.notoriety} (+3)`,
      );
    } else if (mission.type === "bounty") {
      const oldNotoriety = player.notoriety;
      player.updateNotoriety(5);
      console.log(
        `[GameFacade] Bounty mission - Notoriety: ${oldNotoriety} -> ${player.notoriety} (+5)`,
      );
    }
  }

  private updateRankProgressionInternal(): void {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missionsStore = usePlunderverseMissions.getState();

    // Load rank data
    this.contentRegistry.loadContent().then((content) => {
      const ranks = content.ranks;
      const currentRank = ranks.find((r) => r.level === player.rank);
      const nextRank = ranks.find((r) => r.level === player.rank + 1);

      if (!nextRank) {
        console.log(
          `[GameFacade] Player at max rank: ${currentRank?.title || player.rank}`,
        );
        return;
      }

      // Check if player meets requirements for next rank
      const completedMissions = missionsStore.completedMissionIds.size;
      const meetsCredits = credits.credits >= nextRank.requirements.credits;
      const meetsNotoriety =
        player.notoriety >= nextRank.requirements.notoriety;
      const meetsMissions =
        completedMissions >= (nextRank.requirements.missionsCompleted || 0);

      console.log(
        `[GameFacade] Rank progression check for ${nextRank.title}:`,
        {
          currentRank: player.rank,
          credits: `${credits.credits}/${nextRank.requirements.credits} (${meetsCredits ? "✓" : "✗"})`,
          notoriety: `${player.notoriety}/${nextRank.requirements.notoriety} (${meetsNotoriety ? "✓" : "✗"})`,
          missions: `${completedMissions}/${nextRank.requirements.missionsCompleted || 0} (${meetsMissions ? "✓" : "✗"})`,
        },
      );

      const meetsRequirements = meetsCredits && meetsNotoriety && meetsMissions;

      if (meetsRequirements) {
        player.updateRank(nextRank.level, nextRank.title);
        console.log(
          `[GameFacade] 🎉 RANK UP! You are now ${nextRank.title} (Rank ${nextRank.level})`,
        );
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
      completedMissions: Array.from(
        usePlunderverseMissions.getState().completedMissionIds,
      ),
      items: [], // Would get from inventory
    };
  }

  getCurrentFaction(): FactionId {
    const factions: Record<string, FactionId> = {
      Earth: "corporations",
      Mars: "corporations",
      Venus: "independents",
      Jupiter: "independents",
      Saturn: "independents",
      Uranus: "outlaws",
      Neptune: "outlaws",
    };

    return factions[this.currentLocation] || "independents";
  }

  canAccessBlackMarket(): boolean {
    // Black market is accessible when player has high notoriety or is in outlaw territory
    const player = usePlayer.getState();
    const isOutlawTerritory = this.getCurrentFaction() === "outlaws";
    const hasHighNotoriety = player.notoriety >= 50;
    
    return isOutlawTerritory || hasHighNotoriety;
  }
}

// Export singleton instance
export const gameFacade = GameFacade.getInstance();