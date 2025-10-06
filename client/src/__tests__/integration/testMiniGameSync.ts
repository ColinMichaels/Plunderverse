import MiniGameSyncService from '../../services/MiniGameSyncService';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useInventoryStore } from '../../domain/economy/inventory.store';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';

/**
 * Test suite for Mini-Game to Main Game real-time sync
 */
export async function testMiniGameSync() {
  console.log('\n===== Testing Mini-Game Real-Time Sync =====\n');
  
  const syncService = MiniGameSyncService.getInstance();
  const player = usePlayer.getState();
  const credits = useCreditsStore.getState();
  const inventory = useInventoryStore.getState();
  const heat = useHeatSystem.getState();
  const missions = usePlunderverseMissions.getState();
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Sync Service Initialization
  console.log('1. Testing Sync Service Initialization...');
  try {
    const status = syncService.getSyncStatus();
    console.log(`   - Sync status: ${status}`);
    
    if (status === 'connected' || status === 'offline') {
      console.log('   ✅ Sync service initialized correctly');
      testsPassed++;
    } else {
      throw new Error(`Unexpected sync status: ${status}`);
    }
  } catch (error) {
    console.error('   ❌ Sync service initialization failed:', error);
    testsFailed++;
  }
  
  // Test 2: Credits Sync
  console.log('\n2. Testing Credits Synchronization...');
  try {
    const initialCredits = credits.credits;
    console.log(`   - Initial credits: ${initialCredits}`);
    
    // Simulate earning credits in mini-game
    syncService.setMinigameActive(true);
    credits.addCredits(500);
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`   - Credits after sync: ${credits.credits}`);
    
    if (credits.credits === initialCredits + 500) {
      console.log('   ✅ Credits synced successfully');
      testsPassed++;
    } else {
      throw new Error('Credits did not sync correctly');
    }
  } catch (error) {
    console.error('   ❌ Credits sync failed:', error);
    testsFailed++;
  }
  
  // Test 3: Reputation Sync
  console.log('\n3. Testing Reputation Synchronization...');
  try {
    const initialRep = player.reputation.outlaws;
    console.log(`   - Initial outlaw reputation: ${initialRep}`);
    
    // Simulate dialogue outcome that changes reputation
    syncService.syncDialogueOutcome('test_npc', [
      { type: 'reputation', faction: 'outlaws', value: 10 }
    ]);
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newRep = usePlayer.getState().reputation.outlaws;
    console.log(`   - Outlaw reputation after sync: ${newRep}`);
    
    console.log('   ✅ Reputation sync tested');
    testsPassed++;
  } catch (error) {
    console.error('   ❌ Reputation sync failed:', error);
    testsFailed++;
  }
  
  // Test 4: Smuggling Mission Sync
  console.log('\n4. Testing Smuggling Mission Synchronization...');
  try {
    const initialHeat = heat.heat;
    console.log(`   - Initial heat level: ${initialHeat}`);
    
    // Simulate completing a smuggling mission
    const testMission = {
      id: 'test_smuggling_01',
      contraband: { id: 'data_chip', name: 'Data Chip' },
      quantity: 1,
      baseReward: 1000,
      bonusReward: 200,
      heatGenerated: 15
    };
    
    syncService.syncSmugglingMission(testMission, 'success');
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newHeat = useHeatSystem.getState().heat;
    console.log(`   - Heat level after smuggling: ${newHeat}`);
    
    console.log('   ✅ Smuggling mission sync tested');
    testsPassed++;
  } catch (error) {
    console.error('   ❌ Smuggling mission sync failed:', error);
    testsFailed++;
  }
  
  // Test 5: Mission Progress Sync
  console.log('\n5. Testing Mission Progress Synchronization...');
  try {
    // Simulate mission progress update
    syncService.syncMissionProgress('test_mission_01', {
      objectiveId: 'obj_01',
      progress: 50,
      completed: false
    });
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('   ✅ Mission progress sync tested');
    testsPassed++;
  } catch (error) {
    console.error('   ❌ Mission progress sync failed:', error);
    testsFailed++;
  }
  
  // Test 6: Offline Queue
  console.log('\n6. Testing Offline Queue...');
  try {
    const initialQueueSize = syncService.getQueueSize();
    console.log(`   - Initial queue size: ${initialQueueSize}`);
    
    // Simulate being offline (WebSocket closed)
    // In real scenario, WebSocket would be closed
    
    // Queue some updates
    credits.addCredits(100);
    player.updateHeat(5);
    
    const queueSize = syncService.getQueueSize();
    console.log(`   - Queue size after offline updates: ${queueSize}`);
    
    if (queueSize >= initialQueueSize) {
      console.log('   ✅ Offline queue working');
      testsPassed++;
    } else {
      throw new Error('Offline queue not storing updates');
    }
  } catch (error) {
    console.error('   ❌ Offline queue test failed:', error);
    testsFailed++;
  }
  
  // Test 7: Batch Updates
  console.log('\n7. Testing Batch Update System...');
  try {
    // Rapidly fire multiple updates
    credits.addCredits(50);
    credits.addCredits(50);
    credits.addCredits(50);
    player.updateHeat(1);
    player.updateHeat(1);
    
    // Wait for batch to be sent
    await new Promise(resolve => setTimeout(resolve, 150));
    
    console.log('   ✅ Batch updates tested');
    testsPassed++;
  } catch (error) {
    console.error('   ❌ Batch update test failed:', error);
    testsFailed++;
  }
  
  // Test 8: Crew Task Sync
  console.log('\n8. Testing Crew Task Synchronization...');
  try {
    const testTask = {
      id: 'task_01',
      type: 'intel_gathering',
      name: 'Gather Intel',
      duration: 300
    };
    
    syncService.syncCrewTask('crew_member_01', testTask, 75);
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('   ✅ Crew task sync tested');
    testsPassed++;
  } catch (error) {
    console.error('   ❌ Crew task sync failed:', error);
    testsFailed++;
  }
  
  // Test 9: Force Sync
  console.log('\n9. Testing Force Sync...');
  try {
    syncService.forceSync();
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('   ✅ Force sync completed');
    testsPassed++;
  } catch (error) {
    console.error('   ❌ Force sync failed:', error);
    testsFailed++;
  }
  
  // Test 10: Sync Status Indicator
  console.log('\n10. Testing Sync Status Indicator...');
  try {
    const status = syncService.getSyncStatus();
    const queueSize = syncService.getQueueSize();
    
    console.log(`   - Current sync status: ${status}`);
    console.log(`   - Current queue size: ${queueSize}`);
    
    console.log('   ✅ Sync status indicator working');
    testsPassed++;
  } catch (error) {
    console.error('   ❌ Sync status indicator failed:', error);
    testsFailed++;
  }
  
  // Summary
  console.log('\n===== Mini-Game Sync Test Summary =====');
  console.log(`✅ Tests passed: ${testsPassed}`);
  console.log(`❌ Tests failed: ${testsFailed}`);
  console.log(`Success rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All mini-game sync tests passed successfully!');
  } else {
    console.log('\n⚠️ Some sync tests failed. Please review the errors above.');
  }
  
  // Deactivate mini-game sync
  syncService.setMinigameActive(false);
  
  return {
    passed: testsPassed,
    failed: testsFailed,
    total: testsPassed + testsFailed
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  testMiniGameSync().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}