import Phaser from 'phaser';
import { useCrewManagement } from '../../../lib/stores/ship/useCrewManagement';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { toast } from 'sonner';

export interface CrewMember {
  id: string;
  name: string;
  portrait: string; // Emoji or sprite key
  role: CrewRole;
  skills: CrewSkills;
  specialization?: CrewSpecialization;
  loyalty: number; // 0-100
  morale: number; // 0-100
  experience: number;
  level: number;
  currentTask?: CrewTask;
  taskProgress?: number;
  salary: number;
  personalMission?: CrewPersonalMission;
  backstory: string;
  personality: CrewPersonality;
  isAvailable: boolean;
  hiredDate?: number;
}

export type CrewRole = 
  | 'pilot'
  | 'engineer' 
  | 'medic'
  | 'security'
  | 'hacker'
  | 'negotiator'
  | 'smuggler'
  | 'mechanic';

export type CrewSpecialization = 
  | 'combat_veteran'
  | 'stealth_expert'
  | 'tech_specialist'
  | 'diplomacy_master'
  | 'black_market_dealer'
  | 'ex_corp_insider'
  | 'street_smart'
  | 'alien_liaison';

export type CrewPersonality =
  | 'loyal'
  | 'mercenary'
  | 'idealist'
  | 'cynical'
  | 'adventurous'
  | 'cautious'
  | 'professional'
  | 'maverick';

export interface CrewSkills {
  combat: number; // 0-100
  technical: number; // 0-100
  social: number; // 0-100
  stealth: number; // 0-100
  piloting: number; // 0-100
  medical: number; // 0-100
}

export interface CrewTask {
  id: string;
  type: CrewTaskType;
  name: string;
  description: string;
  duration: number; // in seconds
  startTime: number;
  requiredSkills: Partial<CrewSkills>;
  rewards?: CrewTaskRewards;
  difficulty: number; // 1-5
  location?: string;
}

export type CrewTaskType = 
  | 'intel_gathering'
  | 'distraction'
  | 'negotiation'
  | 'repairs'
  | 'upgrade'
  | 'recruitment'
  | 'training'
  | 'medical'
  | 'security_patrol'
  | 'hacking'
  | 'smuggling_prep';

export interface CrewTaskRewards {
  credits?: number;
  experience?: number;
  items?: Array<{ id: string; quantity: number }>;
  intel?: IntelData;
  shipBonus?: ShipBonus;
}

export interface IntelData {
  type: 'security_patterns' | 'market_prices' | 'faction_movements' | 'mission_intel';
  description: string;
  expiresAt: number;
  value: any;
}

export interface ShipBonus {
  type: 'speed' | 'armor' | 'weapons' | 'cargo' | 'stealth';
  amount: number;
  duration: number;
}

export interface CrewPersonalMission {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  currentObjective: number;
  rewards: {
    loyaltyBonus: number;
    skillBonus?: Partial<CrewSkills>;
    specialItem?: string;
  };
  isCompleted: boolean;
}

export class CrewManagementSystem {
  private scene: Phaser.Scene;
  private crewRoster: Map<string, CrewMember>;
  private availableCrewPool: Map<string, CrewMember>;
  private activeTasks: Map<string, CrewTask>;
  private completedTasks: Set<string>;
  private activeIntel: Map<string, IntelData>;
  private shipBonuses: Map<string, ShipBonus>;
  
  // Crew management stats
  private maxCrewSize: number = 8;
  private currentCrewSize: number = 0;
  private totalMorale: number = 0;
  private crewEfficiency: number = 1.0;
  
  // Task update timer
  private taskUpdateTimer?: Phaser.Time.TimerEvent;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.crewRoster = new Map();
    this.availableCrewPool = new Map();
    this.activeTasks = new Map();
    this.completedTasks = new Set();
    this.activeIntel = new Map();
    this.shipBonuses = new Map();
    
    this.initializeCrewPool();
    this.initializeStartingCrew();
    this.loadCrewProgress();
    this.setupTaskTracking();
  }

  private initializeCrewPool(): void {
    // Create a pool of potential crew members to hire
    const crewTemplates: CrewMember[] = [
      {
        id: 'crew_pilot_001',
        name: 'Rex "Rocket" Rodriguez',
        portrait: '👨‍✈️',
        role: 'pilot',
        skills: {
          combat: 60,
          technical: 40,
          social: 30,
          stealth: 20,
          piloting: 90,
          medical: 10
        },
        specialization: 'combat_veteran',
        loyalty: 50,
        morale: 70,
        experience: 0,
        level: 3,
        salary: 1000,
        backstory: 'Former military pilot turned freelancer after the wars.',
        personality: 'professional',
        isAvailable: true
      },
      {
        id: 'crew_engineer_001',
        name: 'Dr. Sarah Chen',
        portrait: '👩‍🔧',
        role: 'engineer',
        skills: {
          combat: 20,
          technical: 95,
          social: 40,
          stealth: 10,
          piloting: 30,
          medical: 50
        },
        specialization: 'tech_specialist',
        loyalty: 60,
        morale: 80,
        experience: 0,
        level: 4,
        salary: 1200,
        backstory: 'Brilliant engineer who left corporate life for adventure.',
        personality: 'idealist',
        isAvailable: true
      },
      {
        id: 'crew_smuggler_001',
        name: 'Jake "Shadow" Murphy',
        portrait: '🕵️',
        role: 'smuggler',
        skills: {
          combat: 50,
          technical: 30,
          social: 60,
          stealth: 85,
          piloting: 40,
          medical: 15
        },
        specialization: 'stealth_expert',
        loyalty: 40,
        morale: 60,
        experience: 0,
        level: 3,
        salary: 1500,
        backstory: 'Grew up in the undercity, knows every back alley and hidden route.',
        personality: 'maverick',
        isAvailable: true
      },
      {
        id: 'crew_negotiator_001',
        name: 'Ambassador Kira Volkov',
        portrait: '👩‍💼',
        role: 'negotiator',
        skills: {
          combat: 10,
          technical: 20,
          social: 95,
          stealth: 30,
          piloting: 15,
          medical: 20
        },
        specialization: 'diplomacy_master',
        loyalty: 70,
        morale: 75,
        experience: 0,
        level: 4,
        salary: 1300,
        backstory: 'Former diplomatic corps, now freelance negotiator.',
        personality: 'professional',
        isAvailable: true
      },
      {
        id: 'crew_hacker_001',
        name: 'Zero',
        portrait: '🧑‍💻',
        role: 'hacker',
        skills: {
          combat: 15,
          technical: 90,
          social: 20,
          stealth: 70,
          piloting: 10,
          medical: 5
        },
        specialization: 'ex_corp_insider',
        loyalty: 35,
        morale: 65,
        experience: 0,
        level: 3,
        salary: 1400,
        backstory: 'Nobody knows their real name. Corporate whistleblower on the run.',
        personality: 'cynical',
        isAvailable: true
      },
      {
        id: 'crew_medic_001',
        name: 'Doc Martinez',
        portrait: '👨‍⚕️',
        role: 'medic',
        skills: {
          combat: 30,
          technical: 50,
          social: 60,
          stealth: 15,
          piloting: 20,
          medical: 95
        },
        loyalty: 80,
        morale: 70,
        experience: 0,
        level: 3,
        salary: 1100,
        backstory: 'Combat medic who believes in helping anyone in need.',
        personality: 'idealist',
        isAvailable: true
      },
      {
        id: 'crew_security_001',
        name: 'Brutus "Tank" Johnson',
        portrait: '💪',
        role: 'security',
        skills: {
          combat: 95,
          technical: 10,
          social: 20,
          stealth: 5,
          piloting: 30,
          medical: 20
        },
        specialization: 'combat_veteran',
        loyalty: 65,
        morale: 60,
        experience: 0,
        level: 4,
        salary: 1200,
        backstory: 'Ex-marine, decorated war hero looking for purpose.',
        personality: 'loyal',
        isAvailable: true
      },
      {
        id: 'crew_mechanic_001',
        name: 'Gadget',
        portrait: '🔧',
        role: 'mechanic',
        skills: {
          combat: 25,
          technical: 80,
          social: 35,
          stealth: 20,
          piloting: 50,
          medical: 10
        },
        specialization: 'street_smart',
        loyalty: 55,
        morale: 75,
        experience: 0,
        level: 2,
        salary: 900,
        backstory: 'Young prodigy who can fix anything with duct tape and hope.',
        personality: 'adventurous',
        isAvailable: true
      }
    ];

    // Add crew to available pool
    crewTemplates.forEach(crew => {
      this.availableCrewPool.set(crew.id, crew);
    });
  }

  private initializeStartingCrew(): void {
    // Give player 2 starting crew members
    const startingCrew = [
      this.availableCrewPool.get('crew_pilot_001'),
      this.availableCrewPool.get('crew_engineer_001')
    ];
    
    startingCrew.forEach(crew => {
      if (crew) {
        this.hireCrew(crew.id, true); // Free hire for starting crew
      }
    });
  }

  public hireCrew(crewId: string, free: boolean = false): boolean {
    if (this.currentCrewSize >= this.maxCrewSize) {
      toast.error('Crew quarters full! Maximum crew size reached.');
      return false;
    }
    
    const crew = this.availableCrewPool.get(crewId);
    if (!crew) {
      toast.error('Crew member not available for hire.');
      return false;
    }
    
    // Check if player can afford hiring bonus (3x monthly salary)
    const hiringCost = free ? 0 : crew.salary * 3;
    const creditsStore = useCreditsStore.getState();
    
    if (!free && creditsStore.credits < hiringCost) {
      toast.error(`Not enough credits! Hiring cost: ${hiringCost}`);
      return false;
    }
    
    // Deduct hiring cost
    if (!free) {
      creditsStore.removeCredits(hiringCost);
    }
    
    // Add to roster
    crew.hiredDate = Date.now();
    crew.loyalty = 50; // Starting loyalty
    crew.morale = 70; // Starting morale
    this.crewRoster.set(crew.id, crew);
    this.availableCrewPool.delete(crew.id);
    this.currentCrewSize++;
    
    // Generate personal mission
    this.generatePersonalMission(crew);
    
    // Update crew efficiency
    this.updateCrewEfficiency();
    
    toast.success(`${crew.name} has joined your crew!`);
    
    // Sync with main game crew system
    const mainCrewStore = useCrewManagement.getState();
    mainCrewStore.addCrewMember({
      id: crew.id,
      name: crew.name,
      role: crew.role as any,
      skill: crew.level * 20,
      loyalty: crew.loyalty,
      morale: crew.morale,
      hired: true
    });
    
    return true;
  }

  public fireCrew(crewId: string): boolean {
    const crew = this.crewRoster.get(crewId);
    if (!crew) {
      return false;
    }
    
    // Check if crew is on a task
    if (crew.currentTask) {
      toast.error(`${crew.name} is currently on a task. Wait for completion.`);
      return false;
    }
    
    // Pay severance (1 month salary)
    const creditsStore = useCreditsStore.getState();
    creditsStore.removeCredits(crew.salary);
    
    // Remove from roster
    this.crewRoster.delete(crew.id);
    this.currentCrewSize--;
    
    // Add back to available pool with reduced loyalty
    crew.loyalty = Math.max(0, crew.loyalty - 30);
    crew.morale = Math.max(0, crew.morale - 20);
    crew.isAvailable = true;
    this.availableCrewPool.set(crew.id, crew);
    
    // Update crew efficiency
    this.updateCrewEfficiency();
    
    toast.info(`${crew.name} has left the crew.`);
    
    // Sync with main game
    const mainCrewStore = useCrewManagement.getState();
    mainCrewStore.removeCrewMember(crew.id);
    
    return true;
  }

  public assignCrewToTask(crewId: string, task: CrewTask): boolean {
    const crew = this.crewRoster.get(crewId);
    if (!crew) {
      toast.error('Crew member not found.');
      return false;
    }
    
    if (crew.currentTask) {
      toast.error(`${crew.name} is already on a task.`);
      return false;
    }
    
    // Check skill requirements
    const skillCheck = this.checkSkillRequirements(crew, task);
    if (!skillCheck.passed) {
      toast.error(`${crew.name} lacks required skills: ${skillCheck.missing.join(', ')}`);
      return false;
    }
    
    // Start task
    crew.currentTask = task;
    crew.taskProgress = 0;
    task.startTime = Date.now();
    this.activeTasks.set(task.id, task);
    
    // Apply crew efficiency to task duration
    const adjustedDuration = task.duration / this.crewEfficiency;
    
    // Create task timer
    this.scene.time.addEvent({
      delay: adjustedDuration * 1000,
      callback: () => this.completeTask(crew, task),
      callbackScope: this
    });
    
    // Update morale based on task difficulty
    this.updateCrewMorale(crew, -task.difficulty);
    
    toast.success(`${crew.name} started: ${task.name}`);
    
    // Emit task started event
    this.scene.events.emit('crewTaskStarted', { crew, task });
    
    return true;
  }

  private checkSkillRequirements(
    crew: CrewMember, 
    task: CrewTask
  ): { passed: boolean; missing: string[] } {
    const missing: string[] = [];
    let passed = true;
    
    if (task.requiredSkills) {
      Object.entries(task.requiredSkills).forEach(([skill, required]) => {
        if (crew.skills[skill as keyof CrewSkills] < required!) {
          missing.push(skill);
          passed = false;
        }
      });
    }
    
    return { passed, missing };
  }

  private completeTask(crew: CrewMember, task: CrewTask): void {
    // Calculate success based on crew skills and morale
    const successChance = this.calculateTaskSuccess(crew, task);
    const success = Math.random() < successChance;
    
    if (success) {
      // Grant rewards
      if (task.rewards) {
        this.grantTaskRewards(crew, task.rewards);
      }
      
      // Increase loyalty and experience
      this.updateCrewLoyalty(crew, 5);
      crew.experience += 10 * task.difficulty;
      
      // Check for level up
      this.checkLevelUp(crew);
      
      toast.success(`${crew.name} completed: ${task.name}`);
      
      // Special handling for task types
      this.handleSpecialTaskCompletion(task);
    } else {
      // Task failed
      this.updateCrewMorale(crew, -10);
      toast.error(`${crew.name} failed: ${task.name}`);
    }
    
    // Clear task
    crew.currentTask = undefined;
    crew.taskProgress = undefined;
    this.activeTasks.delete(task.id);
    this.completedTasks.add(task.id);
    
    // Update crew efficiency
    this.updateCrewEfficiency();
    
    // Emit task completed event
    this.scene.events.emit('crewTaskCompleted', { crew, task, success });
  }

  private calculateTaskSuccess(crew: CrewMember, task: CrewTask): number {
    let baseChance = 0.5;
    
    // Add skill bonuses
    if (task.requiredSkills) {
      let skillBonus = 0;
      let skillCount = 0;
      
      Object.entries(task.requiredSkills).forEach(([skill, required]) => {
        const crewSkill = crew.skills[skill as keyof CrewSkills];
        skillBonus += (crewSkill - required!) / 100;
        skillCount++;
      });
      
      if (skillCount > 0) {
        baseChance += skillBonus / skillCount;
      }
    }
    
    // Morale modifier
    baseChance += (crew.morale - 50) / 200;
    
    // Loyalty modifier
    baseChance += (crew.loyalty - 50) / 200;
    
    // Level modifier
    baseChance += crew.level * 0.05;
    
    // Difficulty penalty
    baseChance -= task.difficulty * 0.1;
    
    return Math.max(0.1, Math.min(0.95, baseChance));
  }

  private grantTaskRewards(crew: CrewMember, rewards: CrewTaskRewards): void {
    // Credits
    if (rewards.credits) {
      const creditsStore = useCreditsStore.getState();
      creditsStore.addCredits(rewards.credits);
    }
    
    // Experience
    if (rewards.experience) {
      crew.experience += rewards.experience;
    }
    
    // Intel
    if (rewards.intel) {
      rewards.intel.expiresAt = Date.now() + 3600000; // 1 hour
      this.activeIntel.set(rewards.intel.type, rewards.intel);
      
      // Apply intel effects
      this.applyIntelEffects(rewards.intel);
    }
    
    // Ship bonuses
    if (rewards.shipBonus) {
      this.applyShipBonus(rewards.shipBonus);
    }
  }

  private applyIntelEffects(intel: IntelData): void {
    switch (intel.type) {
      case 'security_patterns':
        // Make security patrols visible on map
        this.scene.events.emit('revealSecurityPatterns', intel.value);
        break;
      case 'market_prices':
        // Update market prices
        this.scene.events.emit('updateMarketPrices', intel.value);
        break;
      case 'faction_movements':
        // Show faction activities
        this.scene.events.emit('showFactionMovements', intel.value);
        break;
      case 'mission_intel':
        // Reveal mission details
        this.scene.events.emit('revealMissionIntel', intel.value);
        break;
    }
  }

  private applyShipBonus(bonus: ShipBonus): void {
    this.shipBonuses.set(bonus.type, bonus);
    
    // Apply to main game ship
    const shipStore = useShipStatus.getState();
    switch (bonus.type) {
      case 'speed':
        // Temporary speed boost
        this.scene.time.addEvent({
          delay: bonus.duration * 1000,
          callback: () => this.removeShipBonus(bonus.type)
        });
        break;
      case 'armor':
        shipStore.repairHull(bonus.amount);
        break;
      case 'weapons':
        // Temporary weapon damage boost
        break;
      case 'cargo':
        // Temporary cargo capacity boost
        break;
      case 'stealth':
        // Temporary detection reduction
        break;
    }
    
    toast.success(`Ship bonus applied: +${bonus.amount} ${bonus.type}`);
  }

  private removeShipBonus(type: string): void {
    this.shipBonuses.delete(type);
    toast.info(`Ship bonus expired: ${type}`);
  }

  private handleSpecialTaskCompletion(task: CrewTask): void {
    switch (task.type) {
      case 'intel_gathering':
        // Reveal security patterns for smuggling
        this.scene.events.emit('intelGathered', {
          type: 'security',
          duration: 600000 // 10 minutes
        });
        break;
        
      case 'distraction':
        // Reduce security alert level
        this.scene.events.emit('securityDistracted', {
          duration: 300000 // 5 minutes
        });
        break;
        
      case 'negotiation':
        // Better prices at merchants
        this.scene.events.emit('pricesNegotiated', {
          discount: 0.15 // 15% discount
        });
        break;
        
      case 'repairs':
        // Repair ship systems
        const shipStore = useShipStatus.getState();
        shipStore.repairHull(20);
        break;
        
      case 'recruitment':
        // Add new crew member to available pool
        this.generateRandomCrewMember();
        break;
    }
  }

  private updateCrewMorale(crew: CrewMember, amount: number): void {
    crew.morale = Math.max(0, Math.min(100, crew.morale + amount));
    
    // Low morale effects
    if (crew.morale < 30) {
      toast.warning(`${crew.name} has low morale!`);
      
      // Chance to leave
      if (Math.random() < 0.1) {
        this.fireCrew(crew.id);
        toast.error(`${crew.name} has quit due to low morale!`);
      }
    }
  }

  private updateCrewLoyalty(crew: CrewMember, amount: number): void {
    crew.loyalty = Math.max(0, Math.min(100, crew.loyalty + amount));
    
    // High loyalty bonuses
    if (crew.loyalty > 80) {
      // Work more efficiently
      this.crewEfficiency += 0.05;
    }
  }

  private checkLevelUp(crew: CrewMember): void {
    const requiredExp = crew.level * 100;
    
    if (crew.experience >= requiredExp) {
      crew.level++;
      crew.experience = 0;
      
      // Increase random skills
      const skills = Object.keys(crew.skills) as (keyof CrewSkills)[];
      const skillToIncrease = Phaser.Math.RND.pick(skills);
      crew.skills[skillToIncrease] = Math.min(100, crew.skills[skillToIncrease] + 10);
      
      toast.success(`${crew.name} leveled up to ${crew.level}!`);
    }
  }

  private generatePersonalMission(crew: CrewMember): void {
    const missionTemplates: CrewPersonalMission[] = [
      {
        id: `personal_${crew.id}_revenge`,
        title: 'Settling Old Scores',
        description: `Help ${crew.name} track down an old enemy`,
        objectives: [
          'Gather information about the target',
          'Track down their location',
          'Confront them'
        ],
        currentObjective: 0,
        rewards: {
          loyaltyBonus: 20,
          skillBonus: { combat: 10 }
        },
        isCompleted: false
      },
      {
        id: `personal_${crew.id}_family`,
        title: 'Family Matters',
        description: `Help ${crew.name} rescue a family member`,
        objectives: [
          'Locate the family member',
          'Negotiate their release',
          'Escort them to safety'
        ],
        currentObjective: 0,
        rewards: {
          loyaltyBonus: 25,
          skillBonus: { social: 10 }
        },
        isCompleted: false
      },
      {
        id: `personal_${crew.id}_redemption`,
        title: 'Path to Redemption',
        description: `Help ${crew.name} make amends for past mistakes`,
        objectives: [
          'Return stolen goods',
          'Make reparations',
          'Earn forgiveness'
        ],
        currentObjective: 0,
        rewards: {
          loyaltyBonus: 30,
          specialItem: 'redemption_token'
        },
        isCompleted: false
      }
    ];
    
    crew.personalMission = Phaser.Math.RND.pick(missionTemplates);
  }

  private generateRandomCrewMember(): void {
    const names = [
      'Alex Storm', 'Morgan Black', 'Casey Vega', 'Jordan Cross',
      'Riley Sharp', 'Quinn Fox', 'Blake Hunter', 'Sage River'
    ];
    
    const roles: CrewRole[] = [
      'pilot', 'engineer', 'medic', 'security', 
      'hacker', 'negotiator', 'smuggler', 'mechanic'
    ];
    
    const newCrew: CrewMember = {
      id: `crew_random_${Date.now()}`,
      name: Phaser.Math.RND.pick(names),
      portrait: '👤',
      role: Phaser.Math.RND.pick(roles),
      skills: {
        combat: Phaser.Math.Between(10, 70),
        technical: Phaser.Math.Between(10, 70),
        social: Phaser.Math.Between(10, 70),
        stealth: Phaser.Math.Between(10, 70),
        piloting: Phaser.Math.Between(10, 70),
        medical: Phaser.Math.Between(10, 70)
      },
      loyalty: 40,
      morale: 60,
      experience: 0,
      level: Phaser.Math.Between(1, 3),
      salary: Phaser.Math.Between(800, 1500),
      backstory: 'A mysterious individual looking for work.',
      personality: 'cautious' as CrewPersonality,
      isAvailable: true
    };
    
    this.availableCrewPool.set(newCrew.id, newCrew);
    toast.info(`New crew member available: ${newCrew.name}`);
  }

  private updateCrewEfficiency(): void {
    // Calculate overall crew efficiency based on morale and loyalty
    let totalMorale = 0;
    let totalLoyalty = 0;
    let count = 0;
    
    this.crewRoster.forEach(crew => {
      totalMorale += crew.morale;
      totalLoyalty += crew.loyalty;
      count++;
    });
    
    if (count > 0) {
      const avgMorale = totalMorale / count;
      const avgLoyalty = totalLoyalty / count;
      
      // Base efficiency is 1.0
      this.crewEfficiency = 1.0;
      
      // Morale affects efficiency (-20% to +20%)
      this.crewEfficiency += (avgMorale - 50) / 250;
      
      // Loyalty affects efficiency (-10% to +10%)
      this.crewEfficiency += (avgLoyalty - 50) / 500;
      
      // Crew size bonus (more crew = better efficiency, up to max)
      const sizeBonus = Math.min(count / this.maxCrewSize, 1.0) * 0.1;
      this.crewEfficiency += sizeBonus;
      
      // Clamp between 0.5 and 1.5
      this.crewEfficiency = Math.max(0.5, Math.min(1.5, this.crewEfficiency));
    }
  }

  public payCrewSalaries(): void {
    const creditsStore = useCreditsStore.getState();
    let totalSalary = 0;
    
    this.crewRoster.forEach(crew => {
      totalSalary += crew.salary;
    });
    
    if (creditsStore.credits >= totalSalary) {
      creditsStore.removeCredits(totalSalary);
      
      // Increase loyalty for paid crew
      this.crewRoster.forEach(crew => {
        this.updateCrewLoyalty(crew, 2);
      });
      
      toast.success(`Crew salaries paid: ${totalSalary} credits`);
    } else {
      // Can't pay salaries - crew morale and loyalty drops
      this.crewRoster.forEach(crew => {
        this.updateCrewMorale(crew, -15);
        this.updateCrewLoyalty(crew, -10);
      });
      
      toast.error('Unable to pay crew salaries! Morale dropping!');
    }
  }

  private setupTaskTracking(): void {
    // Update task progress every second
    this.taskUpdateTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: this.updateTaskProgress,
      callbackScope: this,
      loop: true
    });
  }

  private updateTaskProgress(): void {
    const now = Date.now();
    
    this.crewRoster.forEach(crew => {
      if (crew.currentTask) {
        const elapsed = (now - crew.currentTask.startTime) / 1000;
        const progress = (elapsed / crew.currentTask.duration) * 100;
        crew.taskProgress = Math.min(100, progress);
        
        // Emit progress update
        this.scene.events.emit('crewTaskProgress', {
          crew,
          task: crew.currentTask,
          progress: crew.taskProgress
        });
      }
    });
    
    // Check and remove expired intel
    this.activeIntel.forEach((intel, key) => {
      if (now > intel.expiresAt) {
        this.activeIntel.delete(key);
        toast.info(`Intel expired: ${intel.type}`);
      }
    });
  }

  public getCrewRoster(): CrewMember[] {
    return Array.from(this.crewRoster.values());
  }

  public getAvailableCrew(): CrewMember[] {
    return Array.from(this.availableCrewPool.values());
  }

  public getCrewByRole(role: CrewRole): CrewMember[] {
    return this.getCrewRoster().filter(crew => crew.role === role);
  }

  public getActiveIntel(): IntelData[] {
    return Array.from(this.activeIntel.values());
  }

  public hasIntel(type: string): boolean {
    return this.activeIntel.has(type);
  }

  public getCrewEfficiency(): number {
    return this.crewEfficiency;
  }

  public getCrewCapacity(): { current: number; max: number } {
    return {
      current: this.currentCrewSize,
      max: this.maxCrewSize
    };
  }

  private loadCrewProgress(): void {
    // Load saved crew data
    const savedData = localStorage.getItem('crew_progress');
    if (savedData) {
      const data = JSON.parse(savedData);
      // Restore crew roster, tasks, etc.
      // Implementation depends on save system
    }
  }

  public saveCrewProgress(): void {
    const data = {
      roster: Array.from(this.crewRoster.entries()),
      availablePool: Array.from(this.availableCrewPool.entries()),
      completedTasks: Array.from(this.completedTasks),
      efficiency: this.crewEfficiency
    };
    localStorage.setItem('crew_progress', JSON.stringify(data));
  }

  public cleanup(): void {
    if (this.taskUpdateTimer) {
      this.taskUpdateTimer.destroy();
    }
    
    this.saveCrewProgress();
  }
}