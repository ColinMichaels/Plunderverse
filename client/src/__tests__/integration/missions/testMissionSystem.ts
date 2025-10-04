import { gameFacade } from '../../../lib/plunderverse/gameFacade';
import { usePlunderverseMissions } from '../../../lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../../domain/economy/credits.store';

export async function testMissionSystem() {
  console.log('=== MISSION SYSTEM TEST STARTING ===');
  
  // Initialize gameFacade
  console.log('1. Initializing gameFacade...');
  await gameFacade.initialize();
  
  // Check initial state
  const credits = useCreditsStore.getState();
  const player = usePlayer.getState();
  const missions = usePlunderverseMissions.getState();
  
  console.log('2. Initial State:');
  console.log('   Credits:', credits.credits);
  console.log('   Player Rank:', player.rank, player.rankTitle);
  console.log('   Available Missions:', missions.availableMissions.length);
  console.log('   Active Missions:', missions.activeMissions.length);
  
  // Generate test mission if none available
  if (missions.availableMissions.length === 0) {
    console.log('3. No missions available, generating test mission...');
    const testMission = {
      id: `test_mission_${Date.now()}`,
      title: 'TEST: Quick Credits Mission',
      description: 'A test mission to verify the system works',
      type: 'delivery' as const,
      difficulty: 'easy' as const,
      rank: 1,
      faction: 'corporations' as const,
      rewards: {
        base: {
          credits: 2500,
          reputation: { corporations: 5 }
        },
        variable: false
      },
      requirements: {},
      objectives: [{
        id: 'obj_test',
        type: 'investigation',
        description: 'Complete test objective',
        completed: false
      }],
      choices: [],
      active: false,
      completed: false,
      failed: false
    };
    missions.addEmergencyMissions([testMission]);
    console.log('   Test mission added');
  }
  
  // Test accepting a mission
  if (missions.availableMissions.length > 0) {
    const missionToAccept = missions.availableMissions[0];
    console.log('4. Accepting mission:', missionToAccept.title);
    
    const acceptResult = await gameFacade.acceptMission(missionToAccept.id);
    console.log('   Accept result:', acceptResult.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Message:', acceptResult.message);
    
    if (acceptResult.success) {
      // Check state after accepting
      const missionsAfterAccept = usePlunderverseMissions.getState();
      console.log('   Active missions now:', missionsAfterAccept.activeMissions.length);
      
      // Complete all objectives
      console.log('5. Completing mission objectives...');
      const activeMission = missionsAfterAccept.activeMissions[0];
      
      for (const objective of activeMission.objectives) {
        missionsAfterAccept.updateObjectiveProgress(activeMission.id, objective.id, 100);
        console.log('   Objective completed:', objective.description);
      }
      
      // Complete the mission
      console.log('6. Completing mission...');
      const creditsBeforeComplete = useCreditsStore.getState().credits;
      
      const completeResult = await gameFacade.resolveMission(activeMission.id);
      console.log('   Complete result:', completeResult.success ? '✅ SUCCESS' : '❌ FAILED');
      console.log('   Message:', completeResult.message);
      
      if (completeResult.success && completeResult.rewards) {
        console.log('   Rewards:', completeResult.rewards);
        
        // Check if credits were applied
        const creditsAfterComplete = useCreditsStore.getState().credits;
        const creditsDiff = creditsAfterComplete - creditsBeforeComplete;
        
        console.log('7. Credits Check:');
        console.log('   Before:', creditsBeforeComplete);
        console.log('   After:', creditsAfterComplete);
        console.log('   Difference:', creditsDiff);
        
        if (creditsDiff > 0) {
          console.log('   ✅ Credits successfully applied!');
        } else {
          console.log('   ❌ Credits NOT applied!');
        }
        
        // Check reputation changes
        const playerAfterComplete = usePlayer.getState();
        console.log('8. Reputation Check:');
        console.log('   Corporations:', playerAfterComplete.reputation.corporations);
        console.log('   Independents:', playerAfterComplete.reputation.independents);
        console.log('   Outlaws:', playerAfterComplete.reputation.outlaws);
      }
    }
  }
  
  // Final state check
  console.log('9. Final State:');
  const finalCredits = useCreditsStore.getState();
  const finalPlayer = usePlayer.getState();
  const finalMissions = usePlunderverseMissions.getState();
  
  console.log('   Credits:', finalCredits.credits);
  console.log('   Completed Missions:', finalMissions.completedMissionIds.size);
  console.log('   Player Rank:', finalPlayer.rank);
  console.log('   Notoriety:', finalPlayer.notoriety);
  console.log('   Heat:', finalPlayer.heat);
  
  console.log('=== MISSION SYSTEM TEST COMPLETE ===');
  
  return {
    success: true,
    creditsWorking: finalCredits.credits > 1000,
    missionsWorking: finalMissions.completedMissionIds.size > 0
  };
}

// Make it available globally for testing
(window as any).testMissionSystem = testMissionSystem;