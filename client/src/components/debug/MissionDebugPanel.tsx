import { useState, useEffect } from "react";
import { usePlunderverseMissions } from "../../lib/stores/economy/usePlunderverseMissions";
import { usePlayer } from "../../lib/stores/player/usePlayer";
import { useCreditsStore } from "../../domain/economy/credits.store";
import { gameFacade } from "../../lib/plunderverse/gameFacade";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DraggablePanel } from "../ui/DraggablePanel";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function MissionDebugPanel() {
  console.log("[MISSION-DEBUG] MissionDebugPanel component initialized");
  
  const [isVisible, setIsVisible] = useState(false);
  const [creditAmount, setCreditAmount] = useState("1000");
  const [reputationAmount, setReputationAmount] = useState("10");
  const [selectedFaction, setSelectedFaction] = useState("corporations");
  
  const missionsStore = usePlunderverseMissions();
  const player = usePlayer();
  const credits = useCreditsStore();

  // Keyboard shortcut to toggle debug panel (`)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "`") {
        e.preventDefault(); // Prevent the backtick from being typed in input fields
        setIsVisible(prev => {
          const newValue = !prev;
          console.log(`[MISSION-DEBUG] Debug panel toggled: ${prev} -> ${newValue}`);
          return newValue;
        });
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Debug logging
  console.log(`[MISSION-DEBUG] Render check - isVisible: ${isVisible}, DEV: ${import.meta.env.DEV}`);

  if (!import.meta.env.DEV) {
    console.log("[MISSION-DEBUG] Not in dev mode, hiding panel");
    return null;
  }

  if (!isVisible) {
    console.log("[MISSION-DEBUG] Panel hidden by visibility state");
    return null;
  }

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

  return (
    <DraggablePanel
      title="Mission Debug Panel (`)"
      onClose={() => setIsVisible(false)}
      defaultPosition={{ x: 20, y: 150 }}
      className="z-[9999]"
    >
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

        {/* Keyboard Shortcuts */}
        <div className="bg-gray-800 p-3 rounded space-y-1 text-xs">
          <h3 className="font-bold text-yellow-400 mb-2">Shortcuts</h3>
          <div>` (backtick) - Toggle this panel</div>
          <div>F3 - Toggle main debug overlay</div>
        </div>
      </div>
    </DraggablePanel>
  );
}