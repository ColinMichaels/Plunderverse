import Phaser from 'phaser';
import { Mission, MissionObjective, MissionRewards } from '../../../lib/plunderverse/types';
import { usePlunderverseMissions } from '../../../lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { useInventoryStore } from '../../../domain/economy/inventory.store';
import { toast } from 'sonner';

export interface NPCMission {
  id: string;
  npcId: string;
  title: string;
  description: string;
  type: 'delivery' | 'fetch' | 'repair' | 'sabotage' | 'information' | 'recruitment' | 'loyalty';
  objectives: NPCMissionObjective[];
  rewards: NPCMissionRewards;
  requirements?: NPCMissionRequirements;
  timeLimit?: number; // in seconds
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  progress: number; // 0-100
  startTime?: number;
}

export interface NPCMissionObjective {
  id: string;
  description: string;
  type: 'collect' | 'deliver' | 'interact' | 'defeat' | 'escort' | 'investigate';
  target?: string;
  quantity?: number;
  currentQuantity?: number;
  location?: string;
  isCompleted: boolean;
}

export interface NPCMissionRewards {
  credits?: number;
  reputation?: {
    corporations?: number;
    independents?: number;
    outlaws?: number;
  };
  items?: Array<{ id: string; quantity: number }>;
  experience?: number;
  unlocks?: string[];
}

export interface NPCMissionRequirements {
  minReputation?: {
    corporations?: number;
    independents?: number;
    outlaws?: number;
  };
  minLevel?: number;
  items?: string[];
  previousMissions?: string[];
}

export class NPCMissionSystem {
  private scene: Phaser.Scene;
  private activeMissions: Map<string, NPCMission>;
  private completedMissions: Set<string>;
  private missionTemplates: Map<string, NPCMission>;
  private missionUpdateTimer?: Phaser.Time.TimerEvent;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.activeMissions = new Map();
    this.completedMissions = new Set();
    this.missionTemplates = new Map();
    
    this.initializeMissionTemplates();
    this.loadMissionProgress();
    this.setupMissionTracking();
  }

  private initializeMissionTemplates(): void {
    // Merchant Missions
    this.missionTemplates.set('merchant_delivery_001', {
      id: 'merchant_delivery_001',
      npcId: 'npc_merchant',
      title: 'Medical Supply Run',
      description: 'Deliver medical supplies to the outer colonies',
      type: 'delivery',
      objectives: [
        {
          id: 'obj_collect_supplies',
          description: 'Collect medical supplies from the merchant',
          type: 'collect',
          target: 'medical_supplies',
          quantity: 5,
          currentQuantity: 0,
          isCompleted: false
        },
        {
          id: 'obj_deliver_supplies',
          description: 'Deliver supplies to the crew quarters',
          type: 'deliver',
          location: 'crew_quarters',
          isCompleted: false
        }
      ],
      rewards: {
        credits: 2500,
        reputation: { independents: 10 },
        experience: 100
      },
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    this.missionTemplates.set('merchant_fetch_001', {
      id: 'merchant_fetch_001',
      npcId: 'npc_merchant',
      title: 'Rare Components',
      description: 'Find rare components for the merchant\'s special customer',
      type: 'fetch',
      objectives: [
        {
          id: 'obj_find_components',
          description: 'Find 3 rare components in the engineering bay',
          type: 'collect',
          target: 'rare_component',
          quantity: 3,
          currentQuantity: 0,
          location: 'engineering',
          isCompleted: false
        },
        {
          id: 'obj_return_merchant',
          description: 'Return to the merchant',
          type: 'interact',
          target: 'npc_merchant',
          isCompleted: false
        }
      ],
      rewards: {
        credits: 3500,
        reputation: { independents: 15 },
        items: [{ id: 'energy_cell', quantity: 2 }]
      },
      requirements: {
        minReputation: { independents: 10 }
      },
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    // Engineer Missions
    this.missionTemplates.set('engineer_repair_001', {
      id: 'engineer_repair_001',
      npcId: 'npc_engineer',
      title: 'System Maintenance',
      description: 'Help repair critical station systems',
      type: 'repair',
      objectives: [
        {
          id: 'obj_get_tools',
          description: 'Get repair tools from the engineer',
          type: 'collect',
          target: 'repair_tools',
          quantity: 1,
          currentQuantity: 0,
          isCompleted: false
        },
        {
          id: 'obj_repair_terminals',
          description: 'Repair 3 damaged terminals',
          type: 'interact',
          target: 'damaged_terminal',
          quantity: 3,
          currentQuantity: 0,
          isCompleted: false
        }
      ],
      rewards: {
        credits: 2000,
        reputation: { corporations: 10 },
        experience: 150
      },
      timeLimit: 600, // 10 minutes
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    this.missionTemplates.set('engineer_sabotage_001', {
      id: 'engineer_sabotage_001',
      npcId: 'npc_engineer',
      title: 'Off the Books',
      description: 'Disable corporate surveillance without getting caught',
      type: 'sabotage',
      objectives: [
        {
          id: 'obj_disable_cameras',
          description: 'Disable 5 security cameras',
          type: 'interact',
          target: 'security_camera',
          quantity: 5,
          currentQuantity: 0,
          isCompleted: false
        },
        {
          id: 'obj_plant_virus',
          description: 'Plant virus in main terminal',
          type: 'interact',
          target: 'main_terminal',
          isCompleted: false
        },
        {
          id: 'obj_escape_undetected',
          description: 'Return without raising alarm',
          type: 'deliver',
          location: 'engineering',
          isCompleted: false
        }
      ],
      rewards: {
        credits: 5000,
        reputation: { outlaws: 20, corporations: -15 },
        unlocks: ['black_market_access']
      },
      requirements: {
        minReputation: { outlaws: 30 }
      },
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    // Bartender Missions
    this.missionTemplates.set('bartender_info_001', {
      id: 'bartender_info_001',
      npcId: 'npc_bartender',
      title: 'Information Gathering',
      description: 'Gather intel from various station inhabitants',
      type: 'information',
      objectives: [
        {
          id: 'obj_talk_dock_worker',
          description: 'Talk to the dock worker about recent shipments',
          type: 'interact',
          target: 'npc_dockworker',
          isCompleted: false
        },
        {
          id: 'obj_talk_merchant',
          description: 'Question the merchant about unusual purchases',
          type: 'interact',
          target: 'npc_merchant',
          isCompleted: false
        },
        {
          id: 'obj_investigate_cargo',
          description: 'Investigate suspicious cargo in the hold',
          type: 'investigate',
          location: 'cargo_hold',
          isCompleted: false
        },
        {
          id: 'obj_report_back',
          description: 'Report findings to the bartender',
          type: 'interact',
          target: 'npc_bartender',
          isCompleted: false
        }
      ],
      rewards: {
        credits: 1500,
        reputation: { independents: 10, outlaws: 5 },
        experience: 200
      },
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    this.missionTemplates.set('bartender_bounty_001', {
      id: 'bartender_bounty_001',
      npcId: 'npc_bartender',
      title: 'Bar Fight Bounty',
      description: 'Deal with troublemakers causing problems in the cantina',
      type: 'information',
      objectives: [
        {
          id: 'obj_find_troublemakers',
          description: 'Find the troublemakers in the station',
          type: 'investigate',
          location: 'cantina',
          isCompleted: false
        },
        {
          id: 'obj_defeat_troublemakers',
          description: 'Defeat or convince them to leave',
          type: 'defeat',
          target: 'troublemaker',
          quantity: 3,
          currentQuantity: 0,
          isCompleted: false
        }
      ],
      rewards: {
        credits: 4000,
        reputation: { independents: 15 },
        items: [{ id: 'combat_stim', quantity: 3 }]
      },
      requirements: {
        minLevel: 3
      },
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    // Crew Missions
    this.missionTemplates.set('crew_recruitment_001', {
      id: 'crew_recruitment_001',
      npcId: 'npc_crew',
      title: 'New Recruits',
      description: 'Help recruit skilled crew members for the ship',
      type: 'recruitment',
      objectives: [
        {
          id: 'obj_find_pilot',
          description: 'Find and recruit a skilled pilot',
          type: 'interact',
          target: 'potential_pilot',
          isCompleted: false
        },
        {
          id: 'obj_find_gunner',
          description: 'Find and recruit an experienced gunner',
          type: 'interact',
          target: 'potential_gunner',
          isCompleted: false
        },
        {
          id: 'obj_convince_veteran',
          description: 'Convince the veteran to join',
          type: 'interact',
          target: 'veteran_spacer',
          isCompleted: false
        }
      ],
      rewards: {
        credits: 3000,
        reputation: { independents: 20 },
        unlocks: ['crew_bonus_efficiency']
      },
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    this.missionTemplates.set('crew_loyalty_001', {
      id: 'crew_loyalty_001',
      npcId: 'npc_crew',
      title: 'Lost Sister',
      description: 'Help Sarah find her missing sister',
      type: 'loyalty',
      objectives: [
        {
          id: 'obj_investigate_logs',
          description: 'Check station logs for her sister\'s ship',
          type: 'investigate',
          location: 'docking_bay',
          isCompleted: false
        },
        {
          id: 'obj_find_witness',
          description: 'Find someone who saw the ship',
          type: 'interact',
          target: 'npc_dockworker',
          isCompleted: false
        },
        {
          id: 'obj_search_debris',
          description: 'Search the asteroid field for debris',
          type: 'investigate',
          location: 'cargo_hold',
          isCompleted: false
        },
        {
          id: 'obj_rescue_survivor',
          description: 'Rescue the survivor',
          type: 'escort',
          target: 'sarah_sister',
          location: 'crew_quarters',
          isCompleted: false
        }
      ],
      rewards: {
        credits: 5000,
        reputation: { independents: 30 },
        experience: 500,
        unlocks: ['sarah_loyalty_bonus']
      },
      requirements: {
        minReputation: { independents: 30 }
      },
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });

    // Dock Worker Missions
    this.missionTemplates.set('smuggler_run_001', {
      id: 'smuggler_run_001',
      npcId: 'npc_dockworker',
      title: 'Under the Radar',
      description: 'Move contraband without getting caught',
      type: 'delivery',
      objectives: [
        {
          id: 'obj_pickup_contraband',
          description: 'Pick up the "special cargo" from dock 7',
          type: 'collect',
          target: 'contraband',
          quantity: 1,
          currentQuantity: 0,
          location: 'docking_bay',
          isCompleted: false
        },
        {
          id: 'obj_avoid_security',
          description: 'Avoid security patrols',
          type: 'deliver',
          location: 'cargo_hold',
          isCompleted: false
        },
        {
          id: 'obj_deliver_cargo',
          description: 'Deliver to the contact in engineering',
          type: 'interact',
          target: 'smuggler_contact',
          location: 'engineering',
          isCompleted: false
        }
      ],
      rewards: {
        credits: 7500,
        reputation: { outlaws: 25, corporations: -10 },
        items: [{ id: 'stealth_module', quantity: 1 }]
      },
      requirements: {
        minReputation: { outlaws: 10 }
      },
      timeLimit: 300, // 5 minutes
      isActive: false,
      isCompleted: false,
      isFailed: false,
      progress: 0
    });
  }

  private loadMissionProgress(): void {
    // Load completed missions from localStorage
    const saved = localStorage.getItem('npc_missions_completed');
    if (saved) {
      this.completedMissions = new Set(JSON.parse(saved));
    }
    
    // Load active missions
    const active = localStorage.getItem('npc_missions_active');
    if (active) {
      const missions = JSON.parse(active);
      missions.forEach((mission: NPCMission) => {
        this.activeMissions.set(mission.id, mission);
      });
    }
  }

  private saveMissionProgress(): void {
    // Save completed missions
    localStorage.setItem('npc_missions_completed', 
      JSON.stringify(Array.from(this.completedMissions))
    );
    
    // Save active missions
    const activeMissionsArray = Array.from(this.activeMissions.values());
    localStorage.setItem('npc_missions_active', 
      JSON.stringify(activeMissionsArray)
    );
  }

  private setupMissionTracking(): void {
    // Update mission progress every second
    this.missionUpdateTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: this.updateMissionTimers,
      callbackScope: this,
      loop: true
    });
    
    // Listen for mission-related events
    this.scene.events.on('itemCollected', this.onItemCollected, this);
    this.scene.events.on('npcInteracted', this.onNPCInteracted, this);
    this.scene.events.on('locationReached', this.onLocationReached, this);
    this.scene.events.on('enemyDefeated', this.onEnemyDefeated, this);
  }

  private updateMissionTimers(): void {
    const now = Date.now();
    
    this.activeMissions.forEach(mission => {
      if (mission.timeLimit && mission.startTime) {
        const elapsed = (now - mission.startTime) / 1000;
        if (elapsed > mission.timeLimit) {
          this.failMission(mission.id);
        }
      }
    });
  }

  public canAcceptMission(missionId: string): boolean {
    const mission = this.missionTemplates.get(missionId);
    if (!mission) return false;
    
    // Check if already completed
    if (this.completedMissions.has(missionId)) return false;
    
    // Check if already active
    if (this.activeMissions.has(missionId)) return false;
    
    // Check requirements
    if (mission.requirements) {
      const player = usePlayer.getState();
      
      // Check reputation requirements
      if (mission.requirements.minReputation) {
        for (const [faction, minRep] of Object.entries(mission.requirements.minReputation)) {
          const playerRep = player.reputation[faction as keyof typeof player.reputation];
          if (playerRep < minRep) return false;
        }
      }
      
      // Check level requirement
      if (mission.requirements.minLevel && player.level < mission.requirements.minLevel) {
        return false;
      }
      
      // Check previous missions
      if (mission.requirements.previousMissions) {
        for (const prevMissionId of mission.requirements.previousMissions) {
          if (!this.completedMissions.has(prevMissionId)) return false;
        }
      }
    }
    
    return true;
  }

  public acceptMission(missionId: string): boolean {
    if (!this.canAcceptMission(missionId)) {
      toast.error('You cannot accept this mission yet');
      return false;
    }
    
    const template = this.missionTemplates.get(missionId);
    if (!template) return false;
    
    // Create active mission from template
    const mission: NPCMission = {
      ...template,
      isActive: true,
      startTime: Date.now(),
      objectives: template.objectives.map(obj => ({ ...obj })) // Deep copy objectives
    };
    
    this.activeMissions.set(missionId, mission);
    this.saveMissionProgress();
    
    // Emit event for UI update
    this.scene.events.emit('missionAccepted', mission);
    
    // Sync with main game if needed
    this.syncWithMainGame(mission);
    
    toast.success(`Mission accepted: ${mission.title}`);
    return true;
  }

  private syncWithMainGame(mission: NPCMission): void {
    // Create a compatible mission for the main game system
    const mainGameMission: Partial<Mission> = {
      id: `mobile_${mission.id}`,
      title: mission.title,
      description: mission.description,
      type: mission.type as any,
      difficulty: 'easy',
      minRank: 0,
      requirements: {},
      objectives: mission.objectives.map(obj => ({
        id: obj.id,
        type: obj.type as any,
        description: obj.description,
        target: obj.target,
        quantity: obj.quantity,
        completed: obj.isCompleted
      })),
      rewards: {
        base: {
          credits: mission.rewards.credits || 0,
          reputation: mission.rewards.reputation || {}
        }
      },
      active: mission.isActive,
      completed: mission.isCompleted,
      choices: []
    };
    
    // Add to main game missions
    const missions = usePlunderverseMissions.getState();
    missions.addEmergencyMissions([mainGameMission as Mission]);
  }

  public updateObjectiveProgress(missionId: string, objectiveId: string, increment: number = 1): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;
    
    const objective = mission.objectives.find(obj => obj.id === objectiveId);
    if (!objective || objective.isCompleted) return;
    
    if (objective.quantity && objective.currentQuantity !== undefined) {
      objective.currentQuantity = Math.min(
        objective.currentQuantity + increment, 
        objective.quantity
      );
      
      if (objective.currentQuantity >= objective.quantity) {
        this.completeObjective(missionId, objectiveId);
      }
    } else {
      this.completeObjective(missionId, objectiveId);
    }
    
    // Update overall mission progress
    this.updateMissionProgress(missionId);
  }

  private completeObjective(missionId: string, objectiveId: string): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;
    
    const objective = mission.objectives.find(obj => obj.id === objectiveId);
    if (objective) {
      objective.isCompleted = true;
      toast.info(`Objective complete: ${objective.description}`);
      
      // Check if all objectives are complete
      if (mission.objectives.every(obj => obj.isCompleted)) {
        this.completeMission(missionId);
      }
    }
    
    this.saveMissionProgress();
  }

  private updateMissionProgress(missionId: string): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;
    
    const completedCount = mission.objectives.filter(obj => obj.isCompleted).length;
    mission.progress = (completedCount / mission.objectives.length) * 100;
    
    // Emit progress update
    this.scene.events.emit('missionProgress', missionId, mission.progress);
  }

  private completeMission(missionId: string): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;
    
    mission.isCompleted = true;
    mission.isActive = false;
    
    // Apply rewards
    this.applyRewards(mission.rewards);
    
    // Move to completed
    this.completedMissions.add(missionId);
    this.activeMissions.delete(missionId);
    
    // Save progress
    this.saveMissionProgress();
    
    // Emit completion event
    this.scene.events.emit('missionCompleted', mission);
    
    // Sync with main game
    const missions = usePlunderverseMissions.getState();
    missions.completeMission(`mobile_${missionId}`);
    
    toast.success(`Mission complete: ${mission.title}!`);
  }

  private failMission(missionId: string): void {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return;
    
    mission.isFailed = true;
    mission.isActive = false;
    
    // Remove from active
    this.activeMissions.delete(missionId);
    
    // Save progress
    this.saveMissionProgress();
    
    // Emit failure event
    this.scene.events.emit('missionFailed', mission);
    
    toast.error(`Mission failed: ${mission.title}`);
  }

  private applyRewards(rewards: NPCMissionRewards): void {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const inventory = useInventoryStore.getState();
    
    // Apply credits
    if (rewards.credits) {
      credits.addCredits(rewards.credits);
    }
    
    // Apply reputation
    if (rewards.reputation) {
      if (rewards.reputation.corporations) {
        player.updateReputation('corporations', rewards.reputation.corporations);
      }
      if (rewards.reputation.independents) {
        player.updateReputation('independents', rewards.reputation.independents);
      }
      if (rewards.reputation.outlaws) {
        player.updateReputation('outlaws', rewards.reputation.outlaws);
      }
    }
    
    // Apply items
    if (rewards.items) {
      rewards.items.forEach(item => {
        inventory.addItem(item.id, item.quantity);
      });
    }
    
    // Apply experience
    if (rewards.experience) {
      player.addExperience(rewards.experience);
    }
    
    // Handle unlocks
    if (rewards.unlocks) {
      rewards.unlocks.forEach(unlock => {
        this.scene.events.emit('featureUnlocked', unlock);
      });
    }
  }

  // Event handlers for mission progress
  private onItemCollected(itemId: string, quantity: number = 1): void {
    this.activeMissions.forEach(mission => {
      mission.objectives.forEach(objective => {
        if (objective.type === 'collect' && objective.target === itemId) {
          this.updateObjectiveProgress(mission.id, objective.id, quantity);
        }
      });
    });
  }

  private onNPCInteracted(npcId: string): void {
    this.activeMissions.forEach(mission => {
      mission.objectives.forEach(objective => {
        if (objective.type === 'interact' && objective.target === npcId) {
          this.updateObjectiveProgress(mission.id, objective.id);
        }
      });
    });
  }

  private onLocationReached(location: string): void {
    this.activeMissions.forEach(mission => {
      mission.objectives.forEach(objective => {
        if ((objective.type === 'deliver' || objective.type === 'investigate') 
            && objective.location === location) {
          this.updateObjectiveProgress(mission.id, objective.id);
        }
      });
    });
  }

  private onEnemyDefeated(enemyType: string): void {
    this.activeMissions.forEach(mission => {
      mission.objectives.forEach(objective => {
        if (objective.type === 'defeat' && objective.target === enemyType) {
          this.updateObjectiveProgress(mission.id, objective.id);
        }
      });
    });
  }

  public getActiveMissions(): NPCMission[] {
    return Array.from(this.activeMissions.values());
  }

  public getMissionsByNPC(npcId: string): NPCMission[] {
    return Array.from(this.missionTemplates.values())
      .filter(mission => mission.npcId === npcId);
  }

  public getMissionProgress(missionId: string): number {
    const mission = this.activeMissions.get(missionId);
    return mission ? mission.progress : 0;
  }

  public abandonMission(missionId: string): void {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.isActive = false;
      this.activeMissions.delete(missionId);
      this.saveMissionProgress();
      
      toast.info(`Mission abandoned: ${mission.title}`);
      this.scene.events.emit('missionAbandoned', mission);
    }
  }

  public destroy(): void {
    if (this.missionUpdateTimer) {
      this.missionUpdateTimer.destroy();
    }
    
    this.scene.events.off('itemCollected', this.onItemCollected, this);
    this.scene.events.off('npcInteracted', this.onNPCInteracted, this);
    this.scene.events.off('locationReached', this.onLocationReached, this);
    this.scene.events.off('enemyDefeated', this.onEnemyDefeated, this);
  }
}