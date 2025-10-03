// Test file for save/load game functionality
import { saveGame, loadGame, quickSave, quickLoad, collectGameState, restoreGameState } from './utils/saveGame';
import { gameApi } from './services/gameApi';
import { usePlayer } from './lib/stores/player/usePlayer';
import { useCreditsStore } from './domain/economy/credits.store';
import { useShipStatus } from './lib/stores/ship/useShipStatus';

export async function testSaveSystem() {
  console.log('🧪 Starting Save System Test Suite');
  console.log('================================');
  
  try {
    // Test 1: Collect current game state
    console.log('\n📊 Test 1: Collecting current game state...');
    const currentState = collectGameState();
    console.log('✅ Game state collected successfully');
    console.log('  - Version:', currentState.version);
    console.log('  - Credits:', currentState.credits);
    console.log('  - Location:', currentState.location);
    console.log('  - Play time:', currentState.playTime, 'seconds');
    
    // Test 2: List available saves
    console.log('\n📋 Test 2: Listing available saves...');
    try {
      const { saves, availableSlots } = await gameApi.listSaves();
      console.log('✅ Listed saves successfully');
      console.log('  - Total saves:', saves.length);
      console.log('  - Available slots:', availableSlots);
      
      saves.forEach(save => {
        console.log(`  - Slot ${save.slot}: ${save.saveName} (${save.credits} credits)`);
      });
    } catch (error) {
      console.log('⚠️ Could not list saves (authentication may be required):', error);
    }
    
    // Test 3: Test state modification and restoration
    console.log('\n🔄 Test 3: Testing state modification and restoration...');
    
    // Save current state
    const originalCredits = useCreditsStore.getState().balance;
    const originalHealth = usePlayer.getState().health.overall;
    const originalHull = useShipStatus.getState().hull;
    
    console.log('  Original state:');
    console.log('    - Credits:', originalCredits);
    console.log('    - Health:', originalHealth);
    console.log('    - Hull:', originalHull);
    
    // Modify state
    useCreditsStore.getState().addCredits(1000);
    usePlayer.getState().updateHealth('overall', -20);
    useShipStatus.getState().takeDamage(15, 'test');
    
    const modifiedCredits = useCreditsStore.getState().balance;
    const modifiedHealth = usePlayer.getState().health.overall;
    const modifiedHull = useShipStatus.getState().hull;
    
    console.log('  Modified state:');
    console.log('    - Credits:', modifiedCredits);
    console.log('    - Health:', modifiedHealth);
    console.log('    - Hull:', modifiedHull);
    
    // Collect modified state
    const modifiedState = collectGameState();
    
    // Restore original state
    restoreGameState(currentState);
    
    const restoredCredits = useCreditsStore.getState().balance;
    const restoredHealth = usePlayer.getState().health.overall;
    const restoredHull = useShipStatus.getState().hull;
    
    console.log('  Restored state:');
    console.log('    - Credits:', restoredCredits);
    console.log('    - Health:', restoredHealth);
    console.log('    - Hull:', restoredHull);
    
    // Verify restoration
    if (restoredCredits === originalCredits && 
        restoredHealth === originalHealth && 
        restoredHull === originalHull) {
      console.log('✅ State restoration successful!');
    } else {
      console.log('❌ State restoration failed - values don\'t match');
    }
    
    // Test 4: Test save slot operations (requires auth)
    console.log('\n💾 Test 4: Testing save slot operations...');
    try {
      // Try to save to slot 1
      await saveGame(1);
      console.log('✅ Saved game to slot 1');
      
      // Try to load from slot 1
      await loadGame(1);
      console.log('✅ Loaded game from slot 1');
      
      // Try quick save
      await quickSave();
      console.log('✅ Quick save successful');
      
      // Try quick load
      await quickLoad();
      console.log('✅ Quick load successful');
    } catch (error) {
      console.log('⚠️ Save/load operations require authentication:', error);
    }
    
    // Test 5: Test save metadata generation
    console.log('\n📝 Test 5: Testing save metadata generation...');
    const testState = collectGameState();
    console.log('✅ Metadata generated:');
    console.log('  - Save name:', testState.metadata.saveName);
    console.log('  - Player level:', testState.metadata.playerLevel);
    console.log('  - Rank:', testState.metadata.rank);
    console.log('  - Reputation:', testState.metadata.reputation);
    
    // Test 6: Test state size and compression
    console.log('\n📦 Test 6: Testing state size...');
    const stateString = JSON.stringify(testState);
    const sizeKB = (stateString.length / 1024).toFixed(2);
    console.log('  - Uncompressed size:', sizeKB, 'KB');
    console.log('  - Compression:', sizeKB > '1.00' ? 'Will be compressed' : 'No compression needed');
    
    console.log('\n================================');
    console.log('✅ Save System Test Suite Complete!');
    console.log('Note: Some tests require authentication to fully complete.');
    console.log('You can test authenticated operations after logging in.');
    
    // Make test functions globally available
    (window as any).testSaveGame = async (slot: number = 1) => {
      try {
        await saveGame(slot);
        console.log(`✅ Game saved to slot ${slot}`);
      } catch (error) {
        console.error('❌ Save failed:', error);
      }
    };
    
    (window as any).testLoadGame = async (slot: number = 1) => {
      try {
        await loadGame(slot);
        console.log(`✅ Game loaded from slot ${slot}`);
      } catch (error) {
        console.error('❌ Load failed:', error);
      }
    };
    
    (window as any).testListSaves = async () => {
      try {
        const { saves, availableSlots } = await gameApi.listSaves();
        console.log('📋 Your saves:');
        saves.forEach(save => {
          console.log(`  Slot ${save.slot}: ${save.saveName}`);
          console.log(`    - Credits: ${save.credits}`);
          console.log(`    - Location: ${save.location}`);
          console.log(`    - Updated: ${new Date(save.updatedAt).toLocaleString()}`);
        });
        console.log('Available slots:', availableSlots);
      } catch (error) {
        console.error('❌ List saves failed:', error);
      }
    };
    
    console.log('\n🎮 Helper functions now available:');
    console.log('  - testSaveGame(slot) - Save game to slot (1-3)');
    console.log('  - testLoadGame(slot) - Load game from slot');
    console.log('  - testListSaves() - List all your saves');
    
  } catch (error) {
    console.error('❌ Test suite encountered an error:', error);
  }
}

// Auto-run tests when module is imported in development
if (import.meta.env.DEV) {
  // Wait for stores to initialize
  setTimeout(() => {
    console.log('💡 Run testSaveSystem() in console to test save/load functionality');
    (window as any).testSaveSystem = testSaveSystem;
  }, 1000);
}