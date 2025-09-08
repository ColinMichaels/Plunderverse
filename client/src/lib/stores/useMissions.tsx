import { create } from "zustand";

export interface Mission {
  id: string;
  type: 'exploration' | 'delivery' | 'survival' | 'discovery';
  title: string;
  description: string;
  target?: string; // Planet name for exploration/delivery missions
  reward: number; // Credits reward
  progress: number; // 0-100
  completed: boolean;
  timeLimit?: number; // Optional time limit in minutes
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  target: string; // What to destroy/find
  reward: number;
  completed: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MissionsState {
  missions: Mission[];
  bounties: Bounty[];
  completedMissions: Mission[];
  completedBounties: Bounty[];
  
  // Actions
  generateNewMissions: () => void;
  completeMission: (missionId: string) => void;
  completeBounty: (bountyId: string) => void;
  updateMissionProgress: (missionId: string, progress: number) => void;
  getMissionByPlanet: (planetName: string) => Mission | undefined;
}

// Mission templates for generation
const missionTemplates = {
  exploration: [
    { title: "Planetary Survey", description: "Land on {planet} and conduct surface analysis", baseReward: 150 },
    { title: "Resource Scouting", description: "Explore {planet} for valuable minerals", baseReward: 200 },
    { title: "Environmental Study", description: "Document atmospheric conditions on {planet}", baseReward: 125 },
    { title: "Settlement Site Survey", description: "Identify potential colony locations on {planet}", baseReward: 180 }
  ],
  delivery: [
    { title: "Supply Run", description: "Transport supplies from {origin} to {destination}", baseReward: 250 },
    { title: "Medical Emergency", description: "Rush medical supplies to {destination}", baseReward: 350 },
    { title: "Research Data Transfer", description: "Deliver scientific data between research stations", baseReward: 200 },
    { title: "Equipment Delivery", description: "Transport specialized equipment to {destination}", baseReward: 275 }
  ],
  survival: [
    { title: "Asteroid Field Navigation", description: "Survive passage through dense asteroid field for 2 minutes", baseReward: 300 },
    { title: "Deep Space Patrol", description: "Clear asteroid field and destroy 10 asteroids", baseReward: 400 },
    { title: "Emergency Evacuation", description: "Navigate dangerous space while maintaining hull integrity", baseReward: 350 },
    { title: "Mining Escort", description: "Protect mining operations by clearing asteroid threats", baseReward: 450 }
  ],
  discovery: [
    { title: "Stellar Cartography", description: "Map uncharted regions of the solar system", baseReward: 500 },
    { title: "Anomaly Investigation", description: "Investigate unknown spatial phenomena", baseReward: 600 },
    { title: "Lost Signal Recovery", description: "Locate and recover lost communication satellites", baseReward: 400 },
    { title: "Deep Space Reconnaissance", description: "Scout outer system for new discoveries", baseReward: 550 }
  ]
};

const bountyTemplates = [
  { title: "Asteroid Clearance", description: "Destroy 5 asteroids threatening shipping lanes", target: "asteroids", baseReward: 200 },
  { title: "Space Debris Removal", description: "Clear orbital debris around major planets", target: "debris", baseReward: 150 },
  { title: "Pirate Ship Elimination", description: "Destroy hostile vessels in outer system", target: "pirates", baseReward: 400 },
  { title: "Rogue Satellite Destruction", description: "Eliminate malfunctioning defense satellites", target: "satellites", baseReward: 250 }
];

const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

export const useMissions = create<MissionsState>((set, get) => ({
  missions: [],
  bounties: [],
  completedMissions: [],
  completedBounties: [],
  
  generateNewMissions: () => {
    const state = get();
    
    // Don't generate if we already have 5+ active missions
    if (state.missions.length >= 5) return;
    
    const newMissions: Mission[] = [];
    const newBounties: Bounty[] = [];
    
    // Generate 3-5 missions
    const missionCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < missionCount; i++) {
      const types = Object.keys(missionTemplates) as Array<keyof typeof missionTemplates>;
      const type = types[Math.floor(Math.random() * types.length)];
      const template = missionTemplates[type][Math.floor(Math.random() * missionTemplates[type].length)];
      
      let description = template.description;
      let target = undefined;
      
      // Replace placeholders based on mission type
      if (type === 'exploration' || type === 'delivery') {
        const planet = planets[Math.floor(Math.random() * planets.length)];
        description = description.replace('{planet}', planet).replace('{destination}', planet);
        target = planet;
        
        if (type === 'delivery') {
          const origin = planets[Math.floor(Math.random() * planets.length)];
          description = description.replace('{origin}', origin);
        }
      }
      
      const difficulty = Math.random() < 0.5 ? 'easy' : Math.random() < 0.8 ? 'medium' : 'hard';
      const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
      
      newMissions.push({
        id: `mission_${Date.now()}_${i}`,
        type,
        title: template.title,
        description,
        target,
        reward: Math.round(template.baseReward * difficultyMultiplier),
        progress: 0,
        completed: false,
        difficulty,
        timeLimit: type === 'survival' ? 2 : undefined
      });
    }
    
    // Generate 1-2 bounties
    const bountyCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < bountyCount; i++) {
      const template = bountyTemplates[Math.floor(Math.random() * bountyTemplates.length)];
      const difficulty = Math.random() < 0.6 ? 'easy' : Math.random() < 0.9 ? 'medium' : 'hard';
      const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
      
      newBounties.push({
        id: `bounty_${Date.now()}_${i}`,
        title: template.title,
        description: template.description,
        target: template.target,
        reward: Math.round(template.baseReward * difficultyMultiplier),
        completed: false,
        difficulty
      });
    }
    
    set({
      missions: [...state.missions, ...newMissions],
      bounties: [...state.bounties, ...newBounties]
    });
    
    console.log(`Generated ${newMissions.length} missions and ${newBounties.length} bounties`);
  },
  
  completeMission: (missionId) => {
    const state = get();
    const mission = state.missions.find(m => m.id === missionId);
    if (mission) {
      set({
        missions: state.missions.filter(m => m.id !== missionId),
        completedMissions: [...state.completedMissions, { ...mission, completed: true, progress: 100 }]
      });
      console.log(`Mission completed: ${mission.title} (+${mission.reward} credits)`);
    }
  },
  
  completeBounty: (bountyId) => {
    const state = get();
    const bounty = state.bounties.find(b => b.id === bountyId);
    if (bounty) {
      set({
        bounties: state.bounties.filter(b => b.id !== bountyId),
        completedBounties: [...state.completedBounties, { ...bounty, completed: true }]
      });
      console.log(`Bounty completed: ${bounty.title} (+${bounty.reward} credits)`);
    }
  },
  
  updateMissionProgress: (missionId, progress) => {
    const state = get();
    set({
      missions: state.missions.map(mission =>
        mission.id === missionId ? { ...mission, progress: Math.min(100, progress) } : mission
      )
    });
  },
  
  getMissionByPlanet: (planetName) => {
    const state = get();
    return state.missions.find(mission => 
      mission.type === 'exploration' && mission.target === planetName && !mission.completed
    );
  }
}));

// Initialize with some missions
setTimeout(() => {
  useMissions.getState().generateNewMissions();
}, 1000);