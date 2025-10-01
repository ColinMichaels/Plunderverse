// ============================================================================
// PLUNDERVERSE CONTENT SYSTEM - USAGE EXAMPLES
// Demonstrates how to use the content registry in React components
// ============================================================================

import React, { useEffect, useState } from 'react';
import contentRegistry from './contentRegistry';
import {
  Mission,
  StarNode,
  PlayerProfile,
  FactionId,
  Faction
} from './types';

// ============================================================================
// EXAMPLE 1: MISSION BROWSER COMPONENT
// ============================================================================

export const MissionBrowser: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load content when component mounts
    const loadMissions = async () => {
      try {
        const content = await contentRegistry.loadContent();
        setMissions(content.missions);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load missions:', error);
        setLoading(false);
      }
    };

    loadMissions();

    // Subscribe to hot-reload changes
    const unsubscribe = contentRegistry.onContentChange((content) => {
      console.log('Content reloaded, updating missions...');
      setMissions(content.missions);
    });

    return unsubscribe;
  }, []);

  // Example: Filter available missions based on player profile
  const getAvailableMissions = (playerProfile: PlayerProfile): Mission[] => {
    return contentRegistry.getAvailableMissions(
      playerProfile.rank,
      playerProfile.reputation
    );
  };

  if (loading) {
    return <div>Loading mission content...</div>;
  }

  return (
    <div className="mission-browser">
      <h2>Available Missions</h2>
      <div className="mission-list">
        {missions.map(mission => (
          <div
            key={mission.id}
            className={`mission-card ${mission.difficulty}`}
            onClick={() => setSelectedMission(mission)}
          >
            <h3>{mission.title}</h3>
            <p>{mission.description}</p>
            <div className="mission-meta">
              <span>Difficulty: {mission.difficulty}</span>
              <span>Type: {mission.type}</span>
              <span>Min Rank: {mission.minRank}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedMission && (
        <MissionDetails mission={selectedMission} />
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: MISSION DETAILS COMPONENT
// ============================================================================

const MissionDetails: React.FC<{ mission: Mission }> = ({ mission }) => {
  const [currentObjective, setCurrentObjective] = useState(0);
  const [playerChoices, setPlayerChoices] = useState<string[]>([]);

  const handleChoice = (choiceId: string) => {
    setPlayerChoices([...playerChoices, choiceId]);

    // Find the choice and process outcomes
    const choice = mission.choices.find(c => c.id === choiceId);
    if (choice) {
      choice.outcomes.forEach(outcome => {
        console.log('Choice outcome:', outcome);
        // Here you would apply the outcome effects to the game state
      });
    }
  };

  return (
    <div className="mission-details">
      <h2>{mission.title}</h2>
      <p>{mission.description}</p>

      <div className="objectives">
        <h3>Objectives:</h3>
        {mission.objectives.map((obj, index) => (
          <div
            key={obj.id}
            className={`objective ${index === currentObjective ? 'active' : ''} ${obj.completed ? 'completed' : ''}`}
          >
            <span>{obj.description}</span>
            {obj.dialogue && (
              <div className="dialogue">
                {Object.entries(obj.dialogue).map(([key, text]) => (
                  <p key={key}><strong>{key}:</strong> "{text}"</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="choices">
        <h3>Choices:</h3>
        {mission.choices
          .filter(choice => !choice.appears || choice.appears === mission.objectives[currentObjective]?.id)
          .map(choice => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice.id)}
              disabled={playerChoices.includes(choice.id)}
            >
              {choice.text}
            </button>
          ))}
      </div>

      <div className="rewards">
        <h3>Rewards:</h3>
        {mission.rewards.base && (
          <div>
            <p>Credits: {mission.rewards.base.credits}</p>
            {mission.rewards.base.reputation && (
              <div>
                Reputation:
                {Object.entries(mission.rewards.base.reputation).map(([faction, value]) => (
                  <span key={faction}> {faction}: {value > 0 ? '+' : ''}{value}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: STAR MAP COMPONENT
// ============================================================================

export const StarMap: React.FC<{ playerProfile: PlayerProfile }> = ({ playerProfile }) => {
  const [nodes, setNodes] = useState<StarNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<StarNode | null>(null);

  useEffect(() => {
    const loadNodes = async () => {
      await contentRegistry.loadContent();
      const visibleNodes = contentRegistry.getVisibleStarNodes(playerProfile.knownLocations);
      setNodes(visibleNodes);
    };

    loadNodes();
  }, [playerProfile.knownLocations]);

  const calculateTravelCost = (fromNode: string, toNode: string): number => {
    const from = contentRegistry.getStarNode(fromNode);
    const to = contentRegistry.getStarNode(toNode);
    
    if (!from || !to) return 0;

    // Calculate distance
    const dx = to.coordinates.x - from.coordinates.x;
    const dy = to.coordinates.y - from.coordinates.y;
    const dz = to.coordinates.z - from.coordinates.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Get fuel cost from tuning
    const tuning = contentRegistry.getTuning();
    if (!tuning) return distance * 0.1;

    const baseCost = tuning.fuel_costs.base_consumption_per_jump;
    const multiplier = distance > 200 ? 
      tuning.fuel_costs.consumption_multipliers.long_range :
      distance > 100 ?
      tuning.fuel_costs.consumption_multipliers.medium_range :
      tuning.fuel_costs.consumption_multipliers.short_range;

    return Math.ceil(baseCost * multiplier);
  };

  return (
    <div className="star-map">
      <svg width="800" height="600">
        {nodes.map(node => (
          <g key={node.id}>
            <circle
              cx={400 + node.coordinates.x}
              cy={300 + node.coordinates.y}
              r="8"
              fill={getFactionColor(node.faction)}
              stroke={selectedNode?.id === node.id ? '#fff' : 'none'}
              strokeWidth="2"
              onClick={() => setSelectedNode(node)}
              style={{ cursor: 'pointer' }}
            />
            <text
              x={400 + node.coordinates.x}
              y={300 + node.coordinates.y - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#fff"
            >
              {node.name}
            </text>
          </g>
        ))}
      </svg>

      {selectedNode && (
        <NodeDetails
          node={selectedNode}
          playerReputation={playerProfile.reputation}
          currentLocation={playerProfile.currentLocation}
          onTravel={(nodeId) => {
            const cost = calculateTravelCost(playerProfile.currentLocation, nodeId);
            console.log(`Travel to ${nodeId} costs ${cost} fuel`);
            // Implement travel logic here
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 4: NODE DETAILS WITH DYNAMIC PRICING
// ============================================================================

const NodeDetails: React.FC<{
  node: StarNode;
  playerReputation: Record<FactionId, number>;
  currentLocation: string;
  onTravel: (nodeId: string) => void;
}> = ({ node, playerReputation, currentLocation, onTravel }) => {
  const faction = node.faction ? contentRegistry.getFaction(node.faction) : null;
  const reputationLevel = faction ? 
    contentRegistry.getReputationLevel(faction.id, playerReputation[faction.id] || 0) : 
    'Neutral';

  // Calculate dynamic prices based on reputation
  const calculatePrice = (basePrice: number): number => {
    if (!node.faction) return basePrice;
    
    const modifier = contentRegistry.calculatePriceModifier(
      node.id,
      'generic_item',
      playerReputation
    );
    
    return Math.round(basePrice * modifier);
  };

  return (
    <div className="node-details">
      <h3>{node.name}</h3>
      <p>{node.description}</p>
      
      <div className="node-info">
        <p>Type: {node.type}</p>
        <p>Faction: {faction?.name || 'None'} ({reputationLevel})</p>
        <p>Control: {node.factionControl}%</p>
        <p>Risk Level: {node.riskLevel}/5</p>
      </div>

      <div className="services">
        <h4>Services:</h4>
        <ul>
          {node.services.refuel && <li>⛽ Refuel - {calculatePrice(100)} credits</li>}
          {node.services.repair && <li>🔧 Repair - {calculatePrice(200)} credits</li>}
          {node.services.trade && <li>💰 Trading Post</li>}
          {node.services.missions && <li>📋 Mission Board</li>}
          {node.services.shipyard && <li>🚀 Shipyard</li>}
          {node.services.blackMarket && <li>🏴‍☠️ Black Market</li>}
        </ul>
      </div>

      {node.security && (
        <div className="security">
          <h4>Security:</h4>
          <p>Level: {node.security.level}</p>
          <p>Scan Chance: {(node.security.scanChance * 100).toFixed(0)}%</p>
        </div>
      )}

      {currentLocation !== node.id && (
        <button onClick={() => onTravel(node.id)}>
          Travel to {node.name}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 5: REPUTATION TRACKER
// ============================================================================

export const ReputationTracker: React.FC<{ playerProfile: PlayerProfile }> = ({ playerProfile }) => {
  const [factions, setFactions] = useState<Faction[]>([]);

  useEffect(() => {
    const loadFactions = async () => {
      const content = await contentRegistry.loadContent();
      setFactions(content.factions);
    };

    loadFactions();
  }, []);

  const getReputationBar = (factionId: FactionId): JSX.Element => {
    const reputation = playerProfile.reputation[factionId] || 0;
    const percentage = ((reputation + 100) / 200) * 100;
    const level = contentRegistry.getReputationLevel(factionId, reputation);

    return (
      <div className="reputation-bar">
        <div
          className="reputation-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: reputation > 0 ? '#4CAF50' : '#F44336'
          }}
        />
        <span className="reputation-value">
          {reputation} ({level})
        </span>
      </div>
    );
  };

  return (
    <div className="reputation-tracker">
      <h3>Faction Standings</h3>
      {factions.map(faction => (
        <div key={faction.id} className="faction-reputation">
          <h4 style={{ color: faction.color }}>{faction.name}</h4>
          {getReputationBar(faction.id)}
          <p className="faction-description">{faction.description}</p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFactionColor(faction: FactionId | null): string {
  switch (faction) {
    case 'corporations': return '#FFD700';
    case 'independents': return '#4CAF50';
    case 'outlaws': return '#FF4444';
    default: return '#808080';
  }
}

// ============================================================================
// EXAMPLE 6: HOT-RELOAD DEMONSTRATION
// ============================================================================

export const ContentDebugger: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [contentStats, setContentStats] = useState<any>(null);

  useEffect(() => {
    const updateStats = () => {
      const content = contentRegistry.getContent();
      if (content) {
        setContentStats({
          missions: content.missions.length,
          factions: content.factions.length,
          nodes: content.starNodes.length,
          ranks: content.ranks.length,
          items: content.tradeGoods.length + content.shipModules.length + content.specialItems.length,
          timestamp: contentRegistry.getLoadedTimestamp()
        });
      }
    };

    updateStats();

    // Listen for content changes
    const unsubscribe = contentRegistry.onContentChange(() => {
      setLastUpdate(Date.now());
      updateStats();
      console.log('🔥 Hot-reload detected! Content updated.');
    });

    return unsubscribe;
  }, []);

  return (
    <div className="content-debugger">
      <h3>Content Registry Status</h3>
      {contentStats && (
        <div>
          <p>Missions: {contentStats.missions}</p>
          <p>Factions: {contentStats.factions}</p>
          <p>Star Nodes: {contentStats.nodes}</p>
          <p>Ranks: {contentStats.ranks}</p>
          <p>Items: {contentStats.items}</p>
          <p>Last Updated: {new Date(lastUpdate).toLocaleTimeString()}</p>
        </div>
      )}
      <p className="hot-reload-hint">
        ✨ Edit any JSON file in /content/plunderverse/ to see hot-reload in action!
      </p>
    </div>
  );
};

// ============================================================================
// USAGE IN YOUR GAME
// ============================================================================

/*
To use this content system in your game:

1. Import the content registry:
   import contentRegistry from './lib/plunderverse/contentRegistry';

2. Load content on game start:
   await contentRegistry.loadContent();

3. Access content with type safety:
   const mission = contentRegistry.getMission('mission_delivery_001');
   const faction = contentRegistry.getFaction('outlaws');
   const tuning = contentRegistry.getTuning();

4. Subscribe to hot-reload updates:
   contentRegistry.onContentChange((newContent) => {
     // Update your game state
   });

5. Calculate dynamic values:
   const rewards = contentRegistry.calculateMissionRewards(mission, choices, playerRank);
   const price = contentRegistry.calculatePriceModifier(nodeId, itemId, reputation);

The system automatically validates content and provides helpful error messages
if any JSON files have issues. In development mode, changes to JSON files
are hot-reloaded without restarting the game.
*/