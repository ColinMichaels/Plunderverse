import { create } from "zustand";
import { useCredits } from "../economy/useCredits";
import { useMissions } from "../economy/useMissions";

interface LandingReward {
  planetName: string;
  baseReward: number;
  explorationBonus: number;
  firstVisitBonus: number;
  difficultyMultiplier: number;
}

interface RewardsState {
  visitedPlanets: Set<string>;
  totalEarnings: number;
  landingCount: number;
  lastReward: number;
  
  // Actions
  processLandingReward: (planetName: string) => number;
  getRewardPreview: (planetName: string) => LandingReward;
  markPlanetVisited: (planetName: string) => void;
}

// Planet difficulty and base rewards
const planetRewards: Record<string, { baseReward: number; difficulty: number }> = {
  'Mercury': { baseReward: 100, difficulty: 1.5 }, // Close to sun, difficult
  'Venus': { baseReward: 150, difficulty: 2.0 },   // Extreme atmosphere
  'Earth': { baseReward: 50, difficulty: 0.8 },    // Easy, home planet
  'Mars': { baseReward: 120, difficulty: 1.2 },    // Moderate difficulty
  'Jupiter': { baseReward: 300, difficulty: 3.0 },  // Gas giant, very difficult
  'Saturn': { baseReward: 280, difficulty: 2.8 },   // Gas giant with rings
  'Uranus': { baseReward: 250, difficulty: 2.5 },   // Distant ice giant
  'Neptune': { baseReward: 350, difficulty: 3.5 }   // Furthest, most difficult
};

export const useRewards = create<RewardsState>((set, get) => ({
  visitedPlanets: new Set<string>(),
  totalEarnings: 0,
  landingCount: 0,
  lastReward: 0,
  
  processLandingReward: (planetName) => {
    const state = get();
    const missions = useMissions.getState();
    const credits = useCredits.getState();
    
    // Calculate base landing reward
    const planetData = planetRewards[planetName] || { baseReward: 100, difficulty: 1.0 };
    let totalReward = planetData.baseReward;
    
    // First visit bonus
    const isFirstVisit = !state.visitedPlanets.has(planetName);
    if (isFirstVisit) {
      totalReward += Math.round(planetData.baseReward * 0.5); // 50% bonus for first visit
      console.log(`First visit to ${planetName}! Bonus: +${Math.round(planetData.baseReward * 0.5)} credits`);
    }
    
    // Difficulty bonus
    const difficultyBonus = Math.round(planetData.baseReward * (planetData.difficulty - 1));
    totalReward += difficultyBonus;
    
    // Check for completed exploration missions
    const explorationMission = missions.getMissionByPlanet(planetName);
    if (explorationMission) {
      totalReward += explorationMission.reward;
      missions.completeMission(explorationMission.id);
      credits.earnCredits(explorationMission.reward);
      console.log(`Exploration mission completed: ${explorationMission.title}`);
    }
    
    // Award the credits
    credits.earnCredits(totalReward);
    
    // Update state
    const newVisitedPlanets = new Set(state.visitedPlanets);
    newVisitedPlanets.add(planetName);
    
    set({
      visitedPlanets: newVisitedPlanets,
      totalEarnings: state.totalEarnings + totalReward,
      landingCount: state.landingCount + 1,
      lastReward: totalReward
    });
    
    console.log(`Landing reward for ${planetName}: ${totalReward} credits`);
    return totalReward;
  },
  
  getRewardPreview: (planetName) => {
    const state = get();
    const planetData = planetRewards[planetName] || { baseReward: 100, difficulty: 1.0 };
    const isFirstVisit = !state.visitedPlanets.has(planetName);
    
    return {
      planetName,
      baseReward: planetData.baseReward,
      explorationBonus: Math.round(planetData.baseReward * 0.2), // Preview estimate
      firstVisitBonus: isFirstVisit ? Math.round(planetData.baseReward * 0.5) : 0,
      difficultyMultiplier: planetData.difficulty
    };
  },
  
  markPlanetVisited: (planetName) => {
    const state = get();
    const newVisitedPlanets = new Set(state.visitedPlanets);
    newVisitedPlanets.add(planetName);
    set({ visitedPlanets: newVisitedPlanets });
  }
}));