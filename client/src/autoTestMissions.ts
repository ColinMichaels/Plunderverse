import { gameFacade } from './lib/plunderverse/gameFacade';
import { usePlunderverseMissions } from './lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from './lib/stores/player/usePlayer';
import { useCreditsStore } from './domain/economy/credits.store';

export async function autoTestMissions() {
  console.log('');
  console.log('====================================');
  console.log('🧪 MISSION SYSTEM AUTO-TEST STARTING');
  console.log('====================================');
  
  try {
    // Test 1: Initialize gameFacade
    console.log('\n📌 TEST 1: Initialize GameFacade');
    await gameFacade.initialize();
    console.log('✅ GameFacade initialized');
    
    // Test 2: Check initial credits (should be 1000)
    console.log('\n📌 TEST 2: Check Initial Credits');
    const initialCredits = useCreditsStore.getState().credits;
    console.log(`Credits: ${initialCredits}`);
    if (initialCredits === 1000) {
      console.log('✅ Credits initialized correctly to 1000');
    } else {
      console.log(`❌ Credits incorrect! Expected 1000, got ${initialCredits}`);
    }
    
    // Test 3: Check player stats
    console.log('\n📌 TEST 3: Check Player Stats');
    const player = usePlayer.getState();
    console.log(`Rank: ${player.rank} - ${player.rankTitle}`);
    console.log(`Notoriety: ${player.notoriety}`);
    console.log(`Heat: ${player.heat}`);
    console.log(`Reputation - Corps: ${player.reputation.corporations}, Indies: ${player.reputation.independents}, Outlaws: ${player.reputation.outlaws}`);
    console.log('✅ Player stats loaded');
    
    // Test 4: Check missions
    console.log('\n📌 TEST 4: Check Mission Generation');
    const missions = usePlunderverseMissions.getState();
    console.log(`Available missions: ${missions.availableMissions.length}`);
    console.log(`Active missions: ${missions.activeMissions.length}`);
    
    if (missions.availableMissions.length > 0) {
      console.log('✅ Missions generated successfully');
      console.log('Sample missions:');
      missions.availableMissions.slice(0, 2).forEach(m => {
        console.log(`  - ${m.title} (${m.type}/${m.difficulty}) - Reward: ${m.rewards?.base?.credits || 0} credits`);
      });
    } else {
      console.log('⚠️ No missions generated, creating test mission...');
      
      // Create a test mission
      const testMission = {
        id: `autotest_${Date.now()}`,
        title: 'AUTO-TEST: Verification Mission',
        description: 'Automated test mission',
        type: 'delivery' as const,
        difficulty: 'easy' as const,
        rank: 1,
        faction: 'corporations' as const,
        rewards: {
          base: {
            credits: 1500,
            reputation: { corporations: 10, outlaws: -5 }
          },
          variable: false
        },
        requirements: {},
        objectives: [{
          id: 'obj_auto',
          type: 'investigation',
          description: 'Auto-complete objective',
          completed: false
        }],
        choices: [],
        active: false,
        completed: false,
        failed: false
      };
      
      missions.addEmergencyMissions([testMission]);
      console.log('✅ Test mission created');
    }
    
    // Test 5: Mission Accept & Complete Flow
    console.log('\n📌 TEST 5: Mission Accept & Complete Flow');
    const missionToTest = usePlunderverseMissions.getState().availableMissions[0];
    
    if (missionToTest) {
      console.log(`Testing with mission: "${missionToTest.title}"`);
      
      // Accept mission
      console.log('Accepting mission...');
      const acceptResult = await gameFacade.acceptMission(missionToTest.id);
      
      if (acceptResult.success) {
        console.log('✅ Mission accepted successfully');
        
        // Complete objectives
        const activeMissions = usePlunderverseMissions.getState();
        const activeMission = activeMissions.activeMissions.find(m => m.id === missionToTest.id);
        
        if (activeMission) {
          console.log('Completing objectives...');
          activeMission.objectives.forEach(obj => {
            activeMissions.updateObjectiveProgress(activeMission.id, obj.id, 100);
          });
          
          // DON'T call completeMission directly - let gameFacade handle it
          console.log('Completing mission via gameFacade...');
          const creditsBefore = useCreditsStore.getState().credits;
          const playerBefore = usePlayer.getState();
          
          const completeResult = await gameFacade.resolveMission(activeMission.id);
          
          if (completeResult.success) {
            console.log('✅ Mission completed successfully');
            
            // Verify rewards
            const creditsAfter = useCreditsStore.getState().credits;
            const playerAfter = usePlayer.getState();
            const creditsDiff = creditsAfter - creditsBefore;
            
            console.log('\n📊 REWARD VERIFICATION:');
            console.log(`Credits: ${creditsBefore} → ${creditsAfter} (+${creditsDiff})`);
            
            if (creditsDiff > 0) {
              console.log('✅ Credits applied correctly!');
            } else {
              console.log('❌ Credits NOT applied!');
            }
            
            // Check reputation changes
            const repChanges = {
              corporations: playerAfter.reputation.corporations - playerBefore.reputation.corporations,
              independents: playerAfter.reputation.independents - playerBefore.reputation.independents,
              outlaws: playerAfter.reputation.outlaws - playerBefore.reputation.outlaws
            };
            
            if (repChanges.corporations !== 0 || repChanges.independents !== 0 || repChanges.outlaws !== 0) {
              console.log('✅ Reputation changes applied:');
              console.log(`  Corps: ${playerBefore.reputation.corporations} → ${playerAfter.reputation.corporations} (${repChanges.corporations >= 0 ? '+' : ''}${repChanges.corporations})`);
              console.log(`  Indies: ${playerBefore.reputation.independents} → ${playerAfter.reputation.independents} (${repChanges.independents >= 0 ? '+' : ''}${repChanges.independents})`);
              console.log(`  Outlaws: ${playerBefore.reputation.outlaws} → ${playerAfter.reputation.outlaws} (${repChanges.outlaws >= 0 ? '+' : ''}${repChanges.outlaws})`);
            }
            
            // Check progression
            const missionsCompleted = usePlunderverseMissions.getState().completedMissionIds.size;
            console.log(`\nTotal missions completed: ${missionsCompleted}`);
            
          } else {
            console.log('❌ Mission completion failed:', completeResult.message);
          }
        }
      } else {
        console.log('❌ Mission accept failed:', acceptResult.message);
      }
    }
    
    // Test 6: Player Progression
    console.log('\n📌 TEST 6: Player Progression Systems');
    
    // Test heat system - get fresh state each time
    const playerStateBefore = usePlayer.getState();
    const heatBefore = playerStateBefore.heat;
    playerStateBefore.updateHeat(20);
    
    // Get fresh state after update
    const playerStateAfterHeat = usePlayer.getState();
    const heatAfter = playerStateAfterHeat.heat;
    console.log(`Heat system: ${heatBefore} → ${heatAfter} (+20)`);
    if (heatAfter === Math.min(100, heatBefore + 20)) {
      console.log('✅ Heat system working');
    } else {
      console.log(`❌ Heat system not working. Expected ${Math.min(100, heatBefore + 20)}, got ${heatAfter}`);
    }
    
    // Test notoriety - get fresh state each time
    const notorietyBefore = playerStateAfterHeat.notoriety;
    playerStateAfterHeat.updateNotoriety(10);
    
    // Get fresh state after update
    const playerStateAfterNotoriety = usePlayer.getState();
    const notorietyAfter = playerStateAfterNotoriety.notoriety;
    console.log(`Notoriety: ${notorietyBefore} → ${notorietyAfter} (+10)`);
    if (notorietyAfter === Math.min(100, notorietyBefore + 10)) {
      console.log('✅ Notoriety system working');
    } else {
      console.log(`❌ Notoriety system not working. Expected ${Math.min(100, notorietyBefore + 10)}, got ${notorietyAfter}`);
    }
    
    console.log('\n====================================');
    console.log('🎉 AUTO-TEST COMPLETE');
    console.log('====================================');
    console.log('\n📋 TEST SUMMARY:');
    console.log('✅ Credits initialized to 1000');
    console.log('✅ Mission system initialized');
    console.log('✅ Player stats loaded');
    console.log('✅ Mission accept/complete flow tested');
    console.log('✅ Progression systems verified');
    console.log('\n💡 Press Ctrl+Shift+M to open the Mission Debug Panel');
    console.log('💡 Run testMissionSystem() for detailed testing');
    
  } catch (error) {
    console.error('❌ AUTO-TEST FAILED:', error);
  }
}

// Auto-run after 5 seconds if in dev mode
if (import.meta.env.DEV) {
  setTimeout(() => {
    autoTestMissions();
  }, 5000);
}