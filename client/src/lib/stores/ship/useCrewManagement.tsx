import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { usePlayer } from '../player/usePlayer';

// Import crew data
import crewDataJson from '../../../content/plunderverse/crew.json';

interface CrewSkills {
  pilot: number;
  mechanic: number;
  medic: number;
  gunner: number;
  negotiator: number;
  hacker: number;
}

interface PersonalQuest {
  id: string;
  title: string;
  hook: string;
  triggerLoyalty: number;
  stages: string[];
  currentStage?: number;
  active?: boolean;
  completed?: boolean;
}

export interface CrewMember {
  id: string;
  name: string;
  title: string;
  background: string;
  personality: {
    traits: string[];
    quirks: string[];
    values: string[];
  };
  skills: CrewSkills;
  currentLoyalty: number;
  startingLoyalty: number;
  hiringCost: number;
  dailySalary: number;
  preferredFaction: string | null;
  hatedFaction: string | null;
  personalQuest: PersonalQuest;
  dialogue: {
    greeting: string;
    lowMorale: string;
    highMorale: string;
    combatStart: string;
    missionSuccess: string;
  };
  bonusEffects: {
    primary: string;
    secondary: string;
    special: string;
  };
  daysInCrew?: number;
  lastPaidDay?: number;
  isActive?: boolean;
}

interface CrewBonuses {
  fuelEfficiency: number;
  repairCost: number;
  healthRegen: number;
  combatDamage: number;
  missionRewards: number;
  heatReduction: number;
  navigationSpeed: number;
  tradePrices: number;
  evasion: number;
  accuracy: number;
  securityBypass: number;
  intelGathering: number;
  reputationGain: number;
  crewMorale: number;
}

interface CrewManagementState {
  availableCrew: CrewMember[];
  activeCrew: CrewMember[];
  maxCrewSize: number;
  dailySalaryCosts: number;
  currentBonuses: CrewBonuses;
  lastPaymentDay: number;
  crewEvents: Array<{
    id: string;
    timestamp: number;
    type: 'hired' | 'fired' | 'deserted' | 'loyalty_change' | 'quest_progress' | 'payment';
    crewId: string;
    details: string;
  }>;
  
  // Actions
  initializeCrew: () => void;
  hireCrew: (crewId: string) => { success: boolean; message: string };
  fireCrew: (crewId: string) => { success: boolean; message: string };
  updateLoyalty: (crewId: string, change: number, reason: string) => void;
  payCrew: () => { success: boolean; message: string; totalCost: number };
  checkDesertion: () => string[];
  calculateBonuses: () => void;
  startPersonalQuest: (crewId: string) => void;
  progressPersonalQuest: (crewId: string) => void;
  getCrewBySkill: (skill: keyof CrewSkills) => CrewMember | null;
  getCrewDialogue: (situation: 'greeting' | 'lowMorale' | 'highMorale' | 'combatStart' | 'missionSuccess') => string[];
  checkCompatibility: (newCrewId: string) => { compatible: boolean; warnings: string[] };
  getCrewForStation: (stationFaction: string) => CrewMember[];
  applyMissionOutcome: (success: boolean, moralAlignment?: 'good' | 'evil' | 'neutral') => void;
}

// Loyalty thresholds
const LOYALTY_THRESHOLDS = {
  DESERTION: 30,
  NEUTRAL: 60,
  LOYAL: 80,
  DEVOTED: 95
};

// Loyalty modifiers from the JSON
const LOYALTY_MODIFIERS = {
  missionSuccess: 3,
  missionFailure: -5,
  paidOnTime: 1,
  paidLate: -3,
  noPay: -10,
  giftBonus: 5,
  alignedChoice: 2,
  opposedChoice: -4,
  crewDeath: -15,
  personalQuestComplete: 20
};

export const useCrewManagement = create<CrewManagementState>()(
  persist(
    (set, get) => ({
      availableCrew: [],
      activeCrew: [],
      maxCrewSize: 5,
      dailySalaryCosts: 0,
      currentBonuses: {
        fuelEfficiency: 0,
        repairCost: 0,
        healthRegen: 0,
        combatDamage: 0,
        missionRewards: 0,
        heatReduction: 0,
        navigationSpeed: 0,
        tradePrices: 0,
        evasion: 0,
        accuracy: 0,
        securityBypass: 0,
        intelGathering: 0,
        reputationGain: 0,
        crewMorale: 0
      },
      lastPaymentDay: 0,
      crewEvents: [],
      
      initializeCrew: () => {
        // Load crew from JSON and set initial state
        const allCrew = crewDataJson.crew.map(crew => ({
          ...crew,
          currentLoyalty: crew.startingLoyalty,
          daysInCrew: 0,
          lastPaidDay: 0,
          isActive: false
        }));
        
        set({
          availableCrew: allCrew,
          activeCrew: []
        });
        
        console.log('[CrewManagement] Initialized with', allCrew.length, 'available crew members');
      },
      
      hireCrew: (crewId: string) => {
        const state = get();
        const crew = state.availableCrew.find(c => c.id === crewId);
        
        if (!crew) {
          return { success: false, message: 'Crew member not found' };
        }
        
        if (state.activeCrew.length >= state.maxCrewSize) {
          return { success: false, message: `Crew is full (max ${state.maxCrewSize} members)` };
        }
        
        if (state.activeCrew.some(c => c.id === crewId)) {
          return { success: false, message: 'Crew member already hired' };
        }
        
        // Check if player can afford hiring cost
        const credits = useCreditsStore.getState();
        if (credits.credits < crew.hiringCost) {
          return { success: false, message: `Cannot afford hiring cost of ${crew.hiringCost} credits` };
        }
        
        // Check faction requirements
        const player = usePlayer.getState();
        if (crew.hatedFaction && player.reputation[crew.hatedFaction as keyof typeof player.reputation] > 50) {
          return { success: false, message: `${crew.name} refuses to work with someone friendly to ${crew.hatedFaction}` };
        }
        
        // Deduct hiring cost
        credits.spendCredits(crew.hiringCost);
        
        // Add to active crew
        const newCrewMember = {
          ...crew,
          isActive: true,
          daysInCrew: 0,
          lastPaidDay: state.lastPaymentDay
        };
        
        set(state => ({
          activeCrew: [...state.activeCrew, newCrewMember],
          availableCrew: state.availableCrew.map(c => 
            c.id === crewId ? { ...c, isActive: true } : c
          ),
          dailySalaryCosts: state.dailySalaryCosts + crew.dailySalary,
          crewEvents: [...state.crewEvents, {
            id: `event_${Date.now()}`,
            timestamp: Date.now(),
            type: 'hired' as const,
            crewId,
            details: `Hired ${crew.name} for ${crew.hiringCost} credits`
          }]
        }));
        
        // Recalculate bonuses
        get().calculateBonuses();
        
        console.log(`[CrewManagement] Hired ${crew.name}`);
        return { success: true, message: `Welcome aboard, ${crew.name}!` };
      },
      
      fireCrew: (crewId: string) => {
        const state = get();
        const crew = state.activeCrew.find(c => c.id === crewId);
        
        if (!crew) {
          return { success: false, message: 'Crew member not in active crew' };
        }
        
        // Apply loyalty penalty to other crew if firing without cause
        if (crew.currentLoyalty >= LOYALTY_THRESHOLDS.NEUTRAL) {
          state.activeCrew
            .filter(c => c.id !== crewId)
            .forEach(c => {
              get().updateLoyalty(c.id, -5, 'Witnessed unjust firing');
            });
        }
        
        set(state => ({
          activeCrew: state.activeCrew.filter(c => c.id !== crewId),
          availableCrew: state.availableCrew.map(c => 
            c.id === crewId ? { ...c, isActive: false, currentLoyalty: Math.max(10, c.currentLoyalty - 20) } : c
          ),
          dailySalaryCosts: state.dailySalaryCosts - crew.dailySalary,
          crewEvents: [...state.crewEvents, {
            id: `event_${Date.now()}`,
            timestamp: Date.now(),
            type: 'fired' as const,
            crewId,
            details: `Fired ${crew.name} (loyalty was ${crew.currentLoyalty})`
          }]
        }));
        
        // Recalculate bonuses
        get().calculateBonuses();
        
        console.log(`[CrewManagement] Fired ${crew.name}`);
        return { success: true, message: `${crew.name} has been dismissed` };
      },
      
      updateLoyalty: (crewId: string, change: number, reason: string) => {
        set(state => ({
          activeCrew: state.activeCrew.map(crew => {
            if (crew.id === crewId) {
              const newLoyalty = Math.max(0, Math.min(100, crew.currentLoyalty + change));
              console.log(`[CrewManagement] ${crew.name} loyalty: ${crew.currentLoyalty} → ${newLoyalty} (${reason})`);
              
              // Check for quest activation
              if (crew.personalQuest && 
                  newLoyalty >= crew.personalQuest.triggerLoyalty && 
                  crew.currentLoyalty < crew.personalQuest.triggerLoyalty) {
                get().startPersonalQuest(crewId);
              }
              
              return { ...crew, currentLoyalty: newLoyalty };
            }
            return crew;
          }),
          crewEvents: [...state.crewEvents, {
            id: `event_${Date.now()}`,
            timestamp: Date.now(),
            type: 'loyalty_change' as const,
            crewId,
            details: `${reason}: ${change > 0 ? '+' : ''}${change} loyalty`
          }]
        }));
        
        get().calculateBonuses();
      },
      
      payCrew: () => {
        const state = get();
        const totalCost = state.dailySalaryCosts;
        
        if (totalCost === 0) {
          return { success: true, message: 'No crew to pay', totalCost: 0 };
        }
        
        const credits = useCreditsStore.getState();
        const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        const daysSinceLastPayment = currentDay - state.lastPaymentDay;
        
        if (credits.credits < totalCost) {
          // Can't pay - apply loyalty penalties
          state.activeCrew.forEach(crew => {
            get().updateLoyalty(crew.id, LOYALTY_MODIFIERS.noPay, 'No pay');
          });
          
          return { success: false, message: `Cannot afford crew salaries (need ${totalCost} credits)`, totalCost };
        }
        
        // Pay crew
        credits.spendCredits(totalCost);
        
        // Apply loyalty modifiers based on payment timing
        const loyaltyChange = daysSinceLastPayment <= 1 
          ? LOYALTY_MODIFIERS.paidOnTime 
          : LOYALTY_MODIFIERS.paidLate;
        
        state.activeCrew.forEach(crew => {
          get().updateLoyalty(crew.id, loyaltyChange, daysSinceLastPayment <= 1 ? 'Paid on time' : 'Paid late');
        });
        
        set({
          lastPaymentDay: currentDay,
          crewEvents: [...state.crewEvents, {
            id: `event_${Date.now()}`,
            timestamp: Date.now(),
            type: 'payment' as const,
            crewId: 'all',
            details: `Paid ${totalCost} credits in crew salaries`
          }]
        });
        
        return { success: true, message: `Paid ${totalCost} credits in crew salaries`, totalCost };
      },
      
      checkDesertion: () => {
        const state = get();
        const deserters: string[] = [];
        
        state.activeCrew.forEach(crew => {
          if (crew.currentLoyalty < LOYALTY_THRESHOLDS.DESERTION) {
            const desertionChance = (LOYALTY_THRESHOLDS.DESERTION - crew.currentLoyalty) / LOYALTY_THRESHOLDS.DESERTION;
            
            if (Math.random() < desertionChance) {
              deserters.push(crew.id);
              console.log(`[CrewManagement] ${crew.name} has deserted!`);
            }
          }
        });
        
        if (deserters.length > 0) {
          set(state => ({
            activeCrew: state.activeCrew.filter(c => !deserters.includes(c.id)),
            availableCrew: state.availableCrew.map(c => 
              deserters.includes(c.id) 
                ? { ...c, isActive: false, currentLoyalty: 0 } 
                : c
            ),
            crewEvents: [
              ...state.crewEvents,
              ...deserters.map(id => ({
                id: `event_${Date.now()}_${id}`,
                timestamp: Date.now(),
                type: 'deserted' as const,
                crewId: id,
                details: `Crew member deserted due to low loyalty`
              }))
            ]
          }));
          
          get().calculateBonuses();
        }
        
        return deserters;
      },
      
      calculateBonuses: () => {
        const state = get();
        const bonuses: CrewBonuses = {
          fuelEfficiency: 0,
          repairCost: 0,
          healthRegen: 0,
          combatDamage: 0,
          missionRewards: 0,
          heatReduction: 0,
          navigationSpeed: 0,
          tradePrices: 0,
          evasion: 0,
          accuracy: 0,
          securityBypass: 0,
          intelGathering: 0,
          reputationGain: 0,
          crewMorale: 0
        };
        
        // Calculate bonuses from all active crew
        state.activeCrew.forEach(crew => {
          // Only apply bonuses if loyalty is above neutral
          if (crew.currentLoyalty >= LOYALTY_THRESHOLDS.NEUTRAL) {
            const skillBonuses = crewDataJson.skillBonuses;
            
            // Check each skill and apply bonuses based on skill level and loyalty
            Object.entries(crew.skills).forEach(([skill, level]) => {
              const skillBonus = skillBonuses[skill as keyof typeof skillBonuses];
              if (!skillBonus) return;
              
              // Determine which tier of bonuses to apply based on loyalty
              let bonusTier = null;
              if (crew.currentLoyalty >= LOYALTY_THRESHOLDS.DEVOTED && skillBonus['95']) {
                bonusTier = skillBonus['95'];
              } else if (crew.currentLoyalty >= LOYALTY_THRESHOLDS.LOYAL && skillBonus['80']) {
                bonusTier = skillBonus['80'];
              } else if (crew.currentLoyalty >= LOYALTY_THRESHOLDS.NEUTRAL && skillBonus['60']) {
                bonusTier = skillBonus['60'];
              }
              
              if (bonusTier) {
                // Apply the bonuses
                Object.entries(bonusTier).forEach(([bonusType, value]) => {
                  if (bonusType !== 'special' && bonuses.hasOwnProperty(bonusType)) {
                    bonuses[bonusType as keyof CrewBonuses] += (value as number) * (level / 100);
                  }
                });
              }
            });
          }
        });
        
        set({ currentBonuses: bonuses });
        
        console.log('[CrewManagement] Calculated bonuses:', bonuses);
      },
      
      startPersonalQuest: (crewId: string) => {
        const crew = get().activeCrew.find(c => c.id === crewId);
        if (!crew || !crew.personalQuest) return;
        
        set(state => ({
          activeCrew: state.activeCrew.map(c => 
            c.id === crewId 
              ? {
                  ...c,
                  personalQuest: {
                    ...c.personalQuest,
                    active: true,
                    currentStage: 0
                  }
                } 
              : c
          ),
          crewEvents: [...state.crewEvents, {
            id: `event_${Date.now()}`,
            timestamp: Date.now(),
            type: 'quest_progress' as const,
            crewId,
            details: `Started personal quest: ${crew.personalQuest.title}`
          }]
        }));
        
        console.log(`[CrewManagement] Started personal quest for ${crew.name}: ${crew.personalQuest.title}`);
      },
      
      progressPersonalQuest: (crewId: string) => {
        const crew = get().activeCrew.find(c => c.id === crewId);
        if (!crew || !crew.personalQuest || !crew.personalQuest.active) return;
        
        const currentStage = crew.personalQuest.currentStage || 0;
        const nextStage = currentStage + 1;
        
        if (nextStage >= crew.personalQuest.stages.length) {
          // Quest complete
          set(state => ({
            activeCrew: state.activeCrew.map(c => 
              c.id === crewId 
                ? {
                    ...c,
                    personalQuest: {
                      ...c.personalQuest,
                      active: false,
                      completed: true
                    },
                    currentLoyalty: Math.min(100, c.currentLoyalty + LOYALTY_MODIFIERS.personalQuestComplete)
                  } 
                : c
            ),
            crewEvents: [...state.crewEvents, {
              id: `event_${Date.now()}`,
              timestamp: Date.now(),
              type: 'quest_progress' as const,
              crewId,
              details: `Completed personal quest: ${crew.personalQuest.title}`
            }]
          }));
          
          console.log(`[CrewManagement] Completed personal quest for ${crew.name}`);
        } else {
          // Progress to next stage
          set(state => ({
            activeCrew: state.activeCrew.map(c => 
              c.id === crewId 
                ? {
                    ...c,
                    personalQuest: {
                      ...c.personalQuest,
                      currentStage: nextStage
                    }
                  } 
                : c
            )
          }));
          
          console.log(`[CrewManagement] Progressed ${crew.name}'s quest to stage ${nextStage}: ${crew.personalQuest.stages[nextStage]}`);
        }
      },
      
      getCrewBySkill: (skill: keyof CrewSkills) => {
        const state = get();
        const skilled = state.activeCrew
          .filter(c => c.currentLoyalty >= LOYALTY_THRESHOLDS.NEUTRAL)
          .sort((a, b) => b.skills[skill] - a.skills[skill]);
        
        return skilled[0] || null;
      },
      
      getCrewDialogue: (situation) => {
        const state = get();
        return state.activeCrew
          .filter(c => c.currentLoyalty >= LOYALTY_THRESHOLDS.NEUTRAL)
          .map(c => c.dialogue[situation]);
      },
      
      checkCompatibility: (newCrewId: string) => {
        const state = get();
        const newCrew = state.availableCrew.find(c => c.id === newCrewId);
        if (!newCrew) return { compatible: true, warnings: [] };
        
        const warnings: string[] = [];
        
        state.activeCrew.forEach(crew => {
          // Check faction conflicts
          if (crew.preferredFaction && newCrew.hatedFaction === crew.preferredFaction) {
            warnings.push(`${newCrew.name} hates ${crew.preferredFaction}, may conflict with ${crew.name}`);
          }
          if (newCrew.preferredFaction && crew.hatedFaction === newCrew.preferredFaction) {
            warnings.push(`${crew.name} hates ${newCrew.preferredFaction}, may conflict with ${newCrew.name}`);
          }
          
          // Check personality clashes
          const clashingTraits = crew.personality.traits.filter(t => 
            (t === 'lawful' && newCrew.personality.traits.includes('chaotic')) ||
            (t === 'chaotic' && newCrew.personality.traits.includes('lawful')) ||
            (t === 'authoritarian' && newCrew.personality.traits.includes('free-spirited'))
          );
          
          if (clashingTraits.length > 0) {
            warnings.push(`Personality clash between ${crew.name} and ${newCrew.name}`);
          }
        });
        
        return {
          compatible: warnings.length === 0,
          warnings
        };
      },
      
      getCrewForStation: (stationFaction: string) => {
        const state = get();
        const player = usePlayer.getState();
        
        // Filter available crew based on station faction and player reputation
        return state.availableCrew.filter(crew => {
          if (crew.isActive) return false;
          
          // Check if crew would work at this faction's station
          if (crew.hatedFaction === stationFaction) return false;
          
          // Check if player reputation is acceptable to crew
          if (crew.hatedFaction && player.reputation[crew.hatedFaction as keyof typeof player.reputation] > 50) {
            return false;
          }
          
          // Prefer crew aligned with station faction
          if (crew.preferredFaction === stationFaction) return true;
          
          // Neutral crew appear everywhere
          if (!crew.preferredFaction) return true;
          
          // Random chance for others
          return Math.random() < 0.3;
        });
      },
      
      applyMissionOutcome: (success: boolean, moralAlignment?: 'good' | 'evil' | 'neutral') => {
        const state = get();
        
        state.activeCrew.forEach(crew => {
          // Base loyalty change for mission outcome
          const baseChange = success ? LOYALTY_MODIFIERS.missionSuccess : LOYALTY_MODIFIERS.missionFailure;
          let totalChange = baseChange;
          
          // Additional modifiers based on moral alignment
          if (moralAlignment) {
            const values = crew.personality.values;
            
            if (moralAlignment === 'good' && values.some(v => 
              v.includes('justice') || v.includes('helping') || v.includes('protecting'))) {
              totalChange += LOYALTY_MODIFIERS.alignedChoice;
            } else if (moralAlignment === 'evil' && values.some(v => 
              v.includes('freedom') || v.includes('survival'))) {
              totalChange += LOYALTY_MODIFIERS.opposedChoice;
            }
          }
          
          get().updateLoyalty(
            crew.id, 
            totalChange, 
            success ? 'Mission success' : 'Mission failure'
          );
        });
      }
    }),
    {
      name: 'crew-management-storage',
      partialize: (state) => ({
        activeCrew: state.activeCrew,
        lastPaymentDay: state.lastPaymentDay,
        crewEvents: state.crewEvents.slice(-100) // Keep only last 100 events
      })
    }
  )
);