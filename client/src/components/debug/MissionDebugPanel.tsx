import { useState, useEffect } from "react";
import { usePlunderverseMissions } from "../../lib/stores/economy/usePlunderverseMissions";
import { usePlayer } from "../../lib/stores/player/usePlayer";
import { useCreditsStore } from "../../domain/economy/credits.store";
import { gameFacade } from "../../lib/plunderverse/gameFacade";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useLandedState } from "../../lib/stores/surface/useLandedState";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { planets } from "../../lib/planetData";
import { useCrewManagement } from "../../lib/stores/ship/useCrewManagement";
import * as THREE from "three";

export function MissionDebugPanel() {
  const [isVisible, setIsVisible] = useState(true); // Start visible for testing
  const [creditAmount, setCreditAmount] = useState("1000");
  const [reputationAmount, setReputationAmount] = useState("10");
  const [selectedFaction, setSelectedFaction] = useState("corporations");
  
  const missionsStore = usePlunderverseMissions();
  const player = usePlayer();
  const credits = useCreditsStore();
  const { isLanded, landedPlanet, setLanded, setNotLanded } = useLandedState();
  const { time, setCameraPosition, setSelectedPlanet } = useSolarSystem();
  const [selectedTravelPlanet, setSelectedTravelPlanet] = useState<string>("");
  const crew = useCrewManagement();

  // Keyboard shortcut to toggle debug panel (`)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      console.log(`[MISSION-DEBUG] Key pressed: "${e.key}", code: "${e.code}"`);
      
      if (e.key === "`" || e.key === "~") {
        e.preventDefault(); 
        e.stopPropagation();
        setIsVisible(prev => {
          const newValue = !prev;
          console.log(`[MISSION-DEBUG] Debug panel toggled: ${prev} -> ${newValue}`);
          return newValue;
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress, true); // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyPress, true);
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  if (!isVisible) {
    return null;
  }
  
  console.log("[MISSION-DEBUG] Rendering debug panel");

  const addCredits = () => {
    const amount = parseInt(creditAmount) || 1000;
    credits.earnCredits(amount);
    console.log(`[MISSION-DEBUG] Added ${amount} credits. New balance: ${credits.credits}`);
  };

  const completeRandomMission = () => {
    if (missionsStore.activeMissions.length === 0) {
      console.warn("[MISSION-DEBUG] No active missions to complete");
      return;
    }

    const mission = missionsStore.activeMissions[0];
    console.log(`[MISSION-DEBUG] Force completing mission: ${mission.title}`);
    
    // Mark all objectives as complete
    mission.objectives.forEach(obj => {
      missionsStore.updateObjectiveProgress(mission.id, obj.id, 100);
    });
    
    // Complete the mission
    gameFacade.resolveMission(mission.id).then(result => {
      console.log("[MISSION-DEBUG] Mission completion result:", result);
    });
  };

  const generateTestMission = () => {
    console.log("[MISSION-DEBUG] Generating test mission");
    const testMission = {
      id: `debug_mission_${Date.now()}`,
      title: "DEBUG: Test Mission",
      description: "A debug mission for testing purposes",
      type: "delivery" as const,
      difficulty: "easy" as const,
      rank: 1,
      faction: "corporations" as const,
      rewards: {
        base: {
          credits: 5000,
          reputation: { corporations: 10, outlaws: -5 }
        },
        variable: false
      },
      requirements: {},
      objectives: [{
        id: "obj_test_1",
        type: "investigation",
        description: "Test objective 1",
        completed: false
      }],
      choices: [],
      active: false,
      completed: false,
      failed: false
    };

    missionsStore.addEmergencyMissions([testMission]);
    console.log("[MISSION-DEBUG] Test mission added to available missions");
  };

  const acceptFirstMission = () => {
    if (missionsStore.availableMissions.length === 0) {
      console.warn("[MISSION-DEBUG] No available missions to accept");
      return;
    }

    const mission = missionsStore.availableMissions[0];
    gameFacade.acceptMission(mission.id).then(result => {
      console.log("[MISSION-DEBUG] Mission acceptance result:", result);
    });
  };

  const adjustReputation = () => {
    const amount = parseInt(reputationAmount) || 10;
    player.updateReputation(selectedFaction as any, amount);
    console.log(`[MISSION-DEBUG] Updated ${selectedFaction} reputation by ${amount}. New value: ${player.reputation[selectedFaction as keyof typeof player.reputation]}`);
  };

  const resetPlayerStats = () => {
    console.log("[MISSION-DEBUG] Resetting player stats");
    
    // Reset player state
    player.initializePlayer();
    
    // Reset credits
    credits.setCredits(1000);
    
    // Clear missions
    missionsStore.activeMissions.forEach(m => {
      missionsStore.abandonMission(m.id);
    });
    
    console.log("[MISSION-DEBUG] Player stats reset complete");
  };

  const forceRankUp = () => {
    const newRank = player.rank + 1;
    player.updateRank(newRank, `Debug Rank ${newRank}`);
    console.log(`[MISSION-DEBUG] Force rank up to ${newRank}`);
  };

  const logCurrentState = () => {
    console.log("[MISSION-DEBUG] === CURRENT STATE ===");
    console.log("[MISSION-DEBUG] Credits:", credits.credits);
    console.log("[MISSION-DEBUG] Player Rank:", player.rank, player.rankTitle);
    console.log("[MISSION-DEBUG] Notoriety:", player.notoriety);
    console.log("[MISSION-DEBUG] Heat:", player.heat);
    console.log("[MISSION-DEBUG] Reputation:", player.reputation);
    console.log("[MISSION-DEBUG] Available Missions:", missionsStore.availableMissions.length);
    console.log("[MISSION-DEBUG] Active Missions:", missionsStore.activeMissions.length);
    console.log("[MISSION-DEBUG] Completed Missions:", missionsStore.completedMissionIds.size);
    console.log("[MISSION-DEBUG] Active Mission Details:", missionsStore.activeMissions);
    console.log("[MISSION-DEBUG] Available Mission Details:", missionsStore.availableMissions);
    console.log("[MISSION-DEBUG] ====================");
  };

  // Quick travel to planet
  const quickTravelToPlanet = (planetName: string) => {
    const planet = planets.find(p => p.name === planetName);
    if (planet) {
      const angle = time * planet.orbitalSpeed;
      const planetPos = new THREE.Vector3(
        Math.cos(angle) * planet.distance,
        0,
        Math.sin(angle) * planet.distance
      );
      
      setSelectedPlanet(planetName);
      
      // Position camera near planet for viewing
      const viewDistance = planet.size * 8;
      const cameraPos = planetPos.clone().add(
        new THREE.Vector3(viewDistance, 5, viewDistance)
      );
      
      setCameraPosition(cameraPos);
      console.log(`[MISSION-DEBUG] Quick traveled to ${planetName}`);
    }
  };

  // Land on current planet
  const landOnPlanet = () => {
    if (selectedTravelPlanet) {
      setLanded(selectedTravelPlanet);
      console.log(`[MISSION-DEBUG] Landed on ${selectedTravelPlanet}`);
    }
  };

  // Takeoff from planet
  const takeoffFromPlanet = () => {
    setNotLanded();
    console.log(`[MISSION-DEBUG] Took off from ${landedPlanet}`);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-gray-900 border-2 border-cyan-400 rounded-lg shadow-2xl" style={{ zIndex: 99999 }}>
      <div className="bg-cyan-600 text-white p-2 flex justify-between items-center">
        <span className="font-bold">Mission Debug Panel (`)</span>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200 text-xl"
        >
          ×
        </button>
      </div>
      <div className="p-4 space-y-4 bg-gray-900 text-white min-w-[350px] max-h-[600px] overflow-y-auto">
        {/* Status Display */}
        <div className="bg-gray-800 p-3 rounded space-y-2">
          <h3 className="text-sm font-bold text-yellow-400">Current Status</h3>
          <div className="text-xs space-y-1">
            <div>Credits: <span className="text-green-400">{credits.credits}</span></div>
            <div>Rank: <span className="text-blue-400">{player.rank} - {player.rankTitle}</span></div>
            <div>Active Missions: <span className="text-orange-400">{missionsStore.activeMissions.length}</span></div>
            <div>Available Missions: <span className="text-cyan-400">{missionsStore.availableMissions.length}</span></div>
            <div>Completed: <span className="text-green-400">{missionsStore.completedMissionIds.size}</span></div>
          </div>
        </div>

        {/* Mission Controls */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-400">Mission Controls</h3>
          <Button 
            onClick={generateTestMission}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            Generate Test Mission
          </Button>
          <Button 
            onClick={acceptFirstMission}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
            disabled={missionsStore.availableMissions.length === 0}
          >
            Accept First Available Mission
          </Button>
          <Button 
            onClick={completeRandomMission}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="sm"
            disabled={missionsStore.activeMissions.length === 0}
          >
            Complete First Active Mission
          </Button>
        </div>

        {/* Credits Control */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-yellow-400">Credits Control</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="flex-1 bg-gray-800 text-white"
              placeholder="Amount"
            />
            <Button onClick={addCredits} size="sm" className="bg-green-600 hover:bg-green-700">
              Add Credits
            </Button>
          </div>
        </div>

        {/* Reputation Control */}
        <div className="space-y-2">
          <Label className="text-sm font-bold text-yellow-400">Reputation Control</Label>
          <Select value={selectedFaction} onValueChange={setSelectedFaction}>
            <SelectTrigger className="bg-gray-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corporations">Corporations</SelectItem>
              <SelectItem value="independents">Independents</SelectItem>
              <SelectItem value="outlaws">Outlaws</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex space-x-2">
            <Input
              type="number"
              value={reputationAmount}
              onChange={(e) => setReputationAmount(e.target.value)}
              className="flex-1 bg-gray-800 text-white"
              placeholder="Amount"
            />
            <Button onClick={adjustReputation} size="sm" className="bg-blue-600 hover:bg-blue-700">
              Adjust Rep
            </Button>
          </div>
        </div>

        {/* Player Controls */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-400">Player Controls</h3>
          <Button 
            onClick={forceRankUp}
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="sm"
          >
            Force Rank Up
          </Button>
          <Button 
            onClick={resetPlayerStats}
            className="w-full bg-red-600 hover:bg-red-700"
            size="sm"
          >
            Reset All Stats
          </Button>
        </div>

        {/* Debug Actions */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-400">Debug Actions</h3>
          <Button 
            onClick={logCurrentState}
            className="w-full bg-gray-600 hover:bg-gray-700"
            size="sm"
          >
            Log Current State to Console
          </Button>
        </div>

        {/* Quick Travel Controls */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-400">Quick Travel & Navigation</h3>
          <div className="space-y-2">
            <Select value={selectedTravelPlanet} onValueChange={setSelectedTravelPlanet}>
              <SelectTrigger className="w-full bg-gray-800 text-white text-xs">
                <SelectValue placeholder="Select planet..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white">
                {planets.map(planet => (
                  <SelectItem key={planet.name} value={planet.name}>
                    {planet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => quickTravelToPlanet(selectedTravelPlanet)}
                className="bg-purple-600 hover:bg-purple-700 text-xs"
                size="sm"
                disabled={!selectedTravelPlanet}
              >
                Travel
              </Button>
              <Button
                onClick={landOnPlanet}
                className="bg-green-600 hover:bg-green-700 text-xs"
                size="sm"
                disabled={!selectedTravelPlanet || isLanded}
              >
                Land
              </Button>
              <Button
                onClick={takeoffFromPlanet}
                className="bg-orange-600 hover:bg-orange-700 text-xs"
                size="sm"
                disabled={!isLanded}
              >
                Takeoff
              </Button>
            </div>
            {isLanded && (
              <div className="text-xs text-green-400">
                Currently landed on: {landedPlanet}
              </div>
            )}
          </div>
        </div>

        {/* Heat & Notoriety Controls */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-400">Heat & Notoriety</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                player.updateHeat(25);
                console.log(`[MISSION-DEBUG] Added 25 heat. Current: ${player.heat}`);
              }}
              className="bg-red-600 hover:bg-red-700 text-xs"
              size="sm"
            >
              +25 Heat
            </Button>
            <Button
              onClick={() => {
                player.updateHeat(-25);
                console.log(`[MISSION-DEBUG] Removed 25 heat. Current: ${player.heat}`);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-xs"
              size="sm"
            >
              -25 Heat
            </Button>
            <Button
              onClick={() => {
                player.updateNotoriety(15);
                console.log(`[MISSION-DEBUG] Added 15 notoriety. Current: ${player.notoriety}`);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-xs"
              size="sm"
            >
              +15 Notoriety
            </Button>
            <Button
              onClick={() => {
                player.updateNotoriety(-15);
                console.log(`[MISSION-DEBUG] Removed 15 notoriety. Current: ${player.notoriety}`);
              }}
              className="bg-green-600 hover:bg-green-700 text-xs"
              size="sm"
            >
              -15 Notoriety
            </Button>
          </div>
          <div className="text-xs">
            <div>Heat: <span className={player.heat > 50 ? 'text-red-400' : 'text-orange-400'}>{player.heat}/100</span></div>
            <div>Notoriety: <span className="text-purple-400">{player.notoriety}/100</span></div>
          </div>
        </div>

        {/* Crew Management */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-yellow-400">Crew Testing</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                const availableCrew = crew.availableCrew.filter(c => !c.isActive);
                if (availableCrew.length > 0) {
                  const result = crew.hireCrew(availableCrew[0].id);
                  console.log(`[MISSION-DEBUG] Hire crew result:`, result.message);
                } else {
                  console.log("[MISSION-DEBUG] No available crew to hire");
                }
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-xs"
              size="sm"
            >
              Hire Crew
            </Button>
            <Button
              onClick={() => {
                const activeCrew = crew.activeCrew;
                if (activeCrew.length > 0) {
                  const result = crew.fireCrew(activeCrew[0].id);
                  console.log(`[MISSION-DEBUG] Fire crew result:`, result.message);
                } else {
                  console.log("[MISSION-DEBUG] No crew to fire");
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-xs"
              size="sm"
            >
              Fire Crew
            </Button>
          </div>
          <div className="text-xs text-gray-400">
            Crew: {crew.activeCrew.length} hired
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-gray-800 p-3 rounded space-y-1 text-xs">
          <h3 className="font-bold text-yellow-400 mb-2">Shortcuts</h3>
          <div>` (backtick) - Toggle this panel</div>
          <div>F3 - Toggle main debug overlay</div>
        </div>
      </div>
    </div>
  );
}