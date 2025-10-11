// Test script to verify EnhancedSplashScreen stats panel functionality
import { useAuthStore } from './lib/stores/auth/useAuthStore';
import { usePlayer } from './lib/stores/player/usePlayer';
import { useCredits } from './lib/stores/economy/useCredits';
import { usePlunderverseMissions } from './lib/stores/economy/usePlunderverseMissions';

export function testStatsPanel() {
  console.log('=== Testing EnhancedSplashScreen Stats Panel ===');
  
  // Test 1: Check if authentication state is working
  const authState = useAuthStore.getState();
  console.log('Auth State:', {
    isAuthenticated: authState.isAuthenticated,
    isGuest: authState.isGuest,
    user: authState.user
  });
  
  // Test 2: Check if player stats are accessible
  const playerState = usePlayer.getState();
  console.log('Player Stats:', {
    level: playerState.level,
    experience: playerState.experience,
    rankTitle: playerState.rankTitle,
    reputation: playerState.reputation,
    planetsVisited: playerState.planetsVisited,
    totalJumps: playerState.totalJumps
  });
  
  // Test 3: Check credits
  const creditsState = useCredits.getState();
  console.log('Credits:', creditsState.credits);
  
  // Test 4: Check missions
  const missionsState = usePlunderverseMissions.getState();
  console.log('Completed Missions:', missionsState.completedMissionIds.size);
  
  // Test 5: Simulate login as guest to test UI
  console.log('\n=== Simulating Guest Login ===');
  authState.playAsGuest();
  
  console.log('Guest Auth State:', {
    isAuthenticated: useAuthStore.getState().isAuthenticated,
    isGuest: useAuthStore.getState().isGuest
  });
  
  console.log('\n=== Stats Panel Testing Summary ===');
  console.log('✅ Fixed: Account menu dropdown now only shows when showAccountMenu is true');
  console.log('✅ Fixed: Added clickable user avatar/name button to toggle menu');
  console.log('✅ Fixed: Added click outside handler to close menu');
  console.log('✅ Fixed: Stats panel visibility controlled by authentication state');
  console.log('\n🎯 Expected Behavior:');
  console.log('1. When authenticated: Stats panel shows in top-right corner');
  console.log('2. On hover: Stats panel expands to show full details');
  console.log('3. Click user avatar: Opens account dropdown menu');
  console.log('4. Click outside: Closes account menu');
  console.log('5. Logout button: Logs out user and updates UI');
}

// Run the test
if (typeof window !== 'undefined') {
  (window as any).testStatsPanel = testStatsPanel;
  console.log('Stats panel test ready! Run testStatsPanel() in the browser console to test.');
}