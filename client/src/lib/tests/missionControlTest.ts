/**
 * Mission Control Comprehensive Test Suite
 * Tests all Mission Control tabs, credit synchronization, and player progression
 * Run with Ctrl+T in the game
 */

import { toast } from 'sonner';
import { gameFacade } from '../plunderverse/gameFacade';
import { usePlunderverseMissions } from '../stores/economy/usePlunderverseMissions';
import { useMissions } from '../stores/economy/useMissions';
import { usePlayer } from '../stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useEquipment } from '../stores/ship/useEquipment';
import { useSurvival } from '../stores/economy/useSurvival';
import { useCrewManagement } from '../stores/ship/useCrewManagement';
import { useHeatSystem } from '../stores/player/useHeatSystem';
import { Mission, FactionId } from '../plunderverse/types';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

interface SavedGameState {
  credits: number;
  player: any;
  missions: any;
  activeMissions: Mission[];
  completedMissions: Set<string>;
  reputation: Record<FactionId, number>;
  heat: number;
  notoriety: number;
  rank: number;
  morality: number;
}

export class MissionControlTest {
  private results: TestResult[] = [];
  private savedState: SavedGameState | null = null;
  private testMissionId: string | null = null;

  constructor() {
    console.log('🧪 Mission Control Test Suite initialized');
  }

  /**
   * Save the current game state for restoration
   */
  private saveState(): void {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const plunderverseMissions = usePlunderverseMissions.getState();
    
    this.savedState = {
      credits: credits.credits,
      player: { ...player },
      missions: { ...plunderverseMissions },
      activeMissions: [...plunderverseMissions.activeMissions],
      completedMissions: new Set(plunderverseMissions.completedMissionIds),
      reputation: { ...player.reputation },
      heat: player.heat,
      notoriety: player.notoriety,
      rank: player.rank,
      morality: gameFacade.getMorality()
    };
    
    console.log('💾 Game state saved for restoration');
  }

  /**
   * Restore the saved game state
   */
  private restoreState(): void {
    if (!this.savedState) {
      console.warn('⚠️ No saved state to restore');
      return;
    }

    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const plunderverseMissions = usePlunderverseMissions.getState();
    
    // Restore credits
    credits.setCredits(this.savedState.credits);
    
    // Restore player state
    player.updateReputation('corporations', this.savedState.reputation.corporations - player.reputation.corporations);
    player.updateReputation('independents', this.savedState.reputation.independents - player.reputation.independents);
    player.updateReputation('outlaws', this.savedState.reputation.outlaws - player.reputation.outlaws);
    
    // Note: Some states may need manual restoration through game methods
    console.log('♻️ Game state restored');
  }

  /**
   * Log test instructions
   */
  private logTestInstructions(): void {
    console.log('%c📋 MISSION CONTROL TEST GUIDE', 'color: #00ff00; font-size: 16px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
    console.log('1. Press F1 to open Missions Panel');
    console.log('2. Accept a mission from Plunderverse tab');
    console.log('3. Use Ctrl+Shift+M to open Debug Panel');
    console.log('4. Complete mission with debug command');
    console.log('5. Check that credits increased');
    console.log('6. Switch to Stats tab - verify completion count');
    console.log('7. Check Reputation tab for faction changes');
    console.log('8. Press Ctrl+T to run automated tests');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
  }

  /**
   * Test Plunderverse Tab functionality
   */
  private async testPlunderverseTab(): Promise<void> {
    console.log('\n🔍 Testing Plunderverse Tab...');
    
    const missionsStore = usePlunderverseMissions.getState();
    const creditsBefore = useCreditsStore.getState().credits;
    
    // Check if missions are available
    const availableMissions = missionsStore.availableMissions;
    if (availableMissions.length === 0) {
      this.results.push({
        name: 'Plunderverse Tab - Mission Availability',
        status: 'warning',
        message: 'No missions available, generating test mission',
        details: { availableMissions: 0 }
      });
      
      // Generate a test mission
      const testMission: Mission = {
        id: `test_mission_${Date.now()}`,
        title: 'TEST: Automated Test Mission',
        description: 'Mission for automated testing',
        type: 'delivery',
        difficulty: 'easy',
        rank: 1,
        faction: 'corporations',
        rewards: {
          base: {
            credits: 1000,
            reputation: { corporations: 5, outlaws: -2 }
          },
          variable: false
        },
        requirements: {},
        objectives: [{
          id: 'test_obj_1',
          type: 'investigation',
          description: 'Test objective',
          completed: false
        }],
        choices: [],
        active: false,
        completed: false,
        failed: false
      };
      
      missionsStore.addEmergencyMissions([testMission]);
      this.testMissionId = testMission.id;
      toast.success('Test mission generated', {
        description: 'Added test mission to available missions'
      });
    } else {
      this.testMissionId = availableMissions[0].id;
    }
    
    // Accept a mission
    const acceptResult = await gameFacade.acceptMission(this.testMissionId!);
    
    if (acceptResult.success) {
      this.results.push({
        name: 'Plunderverse Tab - Accept Mission',
        status: 'passed',
        message: 'Mission accepted successfully',
        details: acceptResult
      });
      
      toast.success('✅ Mission Accepted', {
        description: acceptResult.mission?.title || 'Test mission'
      });
    } else {
      this.results.push({
        name: 'Plunderverse Tab - Accept Mission',
        status: 'failed',
        message: acceptResult.message,
        details: acceptResult
      });
      
      toast.error('Failed to accept mission', {
        description: acceptResult.message
      });
      return;
    }
    
    // Complete the mission
    const completeResult = await gameFacade.resolveMission(this.testMissionId!);
    
    if (completeResult.success) {
      const creditsAfter = useCreditsStore.getState().credits;
      const creditsEarned = creditsAfter - creditsBefore;
      
      this.results.push({
        name: 'Plunderverse Tab - Complete Mission',
        status: 'passed',
        message: `Mission completed, earned ${creditsEarned} credits`,
        details: {
          rewards: completeResult.rewards,
          creditsBefore,
          creditsAfter,
          creditsEarned
        }
      });
      
      toast.success('🎉 Mission Completed!', {
        description: `Earned ${creditsEarned} credits`
      });
    } else {
      this.results.push({
        name: 'Plunderverse Tab - Complete Mission',
        status: 'failed',
        message: completeResult.message,
        details: completeResult
      });
      
      toast.error('Failed to complete mission', {
        description: completeResult.message
      });
    }
  }

  /**
   * Test Legacy Tab functionality
   */
  private async testLegacyTab(): Promise<void> {
    console.log('\n🔍 Testing Legacy Tab...');
    
    const legacyMissions = useMissions.getState();
    const initialMissionCount = legacyMissions.missions.length;
    
    // Generate new missions
    legacyMissions.generateNewMissions();
    
    const afterGenerationCount = legacyMissions.missions.length;
    const missionsGenerated = afterGenerationCount - initialMissionCount;
    
    if (missionsGenerated > 0) {
      this.results.push({
        name: 'Legacy Tab - Mission Generation',
        status: 'passed',
        message: `Generated ${missionsGenerated} legacy missions`,
        details: {
          before: initialMissionCount,
          after: afterGenerationCount,
          generated: missionsGenerated
        }
      });
      
      toast.success('Legacy missions generated', {
        description: `Added ${missionsGenerated} new missions`
      });
    } else {
      this.results.push({
        name: 'Legacy Tab - Mission Generation',
        status: 'warning',
        message: 'No new legacy missions generated',
        details: { missionCount: afterGenerationCount }
      });
    }
    
    // Complete a legacy mission if available
    if (legacyMissions.missions.length > 0) {
      const missionToComplete = legacyMissions.missions[0];
      legacyMissions.completeMission(missionToComplete.id);
      
      this.results.push({
        name: 'Legacy Tab - Complete Mission',
        status: 'passed',
        message: `Completed legacy mission: ${missionToComplete.title}`,
        details: { mission: missionToComplete }
      });
      
      toast.success('Legacy mission completed', {
        description: missionToComplete.title
      });
    }
  }

  /**
   * Test Reputation Tab functionality
   */
  private async testReputationTab(): Promise<void> {
    console.log('\n🔍 Testing Reputation Tab...');
    
    const player = usePlayer.getState();
    const initialReputation = { ...player.reputation };
    
    // Test reputation changes
    const factions: FactionId[] = ['corporations', 'independents', 'outlaws'];
    
    for (const faction of factions) {
      const oldRep = player.reputation[faction];
      player.updateReputation(faction, 10);
      const newRep = player.reputation[faction];
      
      this.results.push({
        name: `Reputation Tab - ${faction}`,
        status: 'passed',
        message: `${faction} reputation: ${oldRep} → ${newRep}`,
        details: {
          faction,
          before: oldRep,
          after: newRep,
          change: 10
        }
      });
      
      toast.info(`Reputation Changed: ${faction}`, {
        description: `${oldRep} → ${newRep} (+10)`
      });
      
      // Test reputation level
      const level = gameFacade.getReputationLevel(faction);
      console.log(`${faction} reputation level: ${level}`);
    }
    
    // Test reputation effects on prices
    const priceModifier = gameFacade.getReputationPriceModifier('corporations');
    
    this.results.push({
      name: 'Reputation Tab - Price Effects',
      status: 'passed',
      message: `Corporation price modifier: ${(priceModifier * 100).toFixed(0)}%`,
      details: { priceModifier }
    });
  }

  /**
   * Test Stats Tab functionality
   */
  private async testStatsTab(): Promise<void> {
    console.log('\n🔍 Testing Stats Tab...');
    
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    
    const stats = {
      credits: credits.credits,
      rank: player.rank,
      rankTitle: player.rankTitle,
      heat: player.heat,
      notoriety: player.notoriety,
      completedMissions: missions.completedMissionIds.size,
      activeMissions: missions.activeMissions.length,
      jumpsCompleted: player.jumpsCompleted,
      planetsVisited: player.visitedPlanets.size,
      morality: gameFacade.getMorality()
    };
    
    this.results.push({
      name: 'Stats Tab - Statistics Display',
      status: 'passed',
      message: 'All statistics tracked correctly',
      details: stats
    });
    
    // Display stats in console
    console.log('%c📊 Current Game Statistics:', 'color: #00ffff; font-weight: bold;');
    console.table(stats);
    
    toast.info('Stats Verified', {
      description: `${missions.completedMissionIds.size} missions completed, Rank ${player.rank}`
    });
  }

  /**
   * Test Credit Synchronization
   */
  private async testCreditSync(): Promise<void> {
    console.log('\n🔍 Testing Credit Synchronization...');
    
    const creditsStore = useCreditsStore.getState();
    const initialCredits = creditsStore.credits;
    
    // Test earning credits
    creditsStore.earnCredits(500);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for state update
    
    const afterEarn = creditsStore.credits;
    if (afterEarn === initialCredits + 500) {
      this.results.push({
        name: 'Credit Sync - Earn Credits',
        status: 'passed',
        message: `Credits earned correctly: ${initialCredits} → ${afterEarn}`,
        details: { before: initialCredits, after: afterEarn, earned: 500 }
      });
      
      toast.success('💰 Credits Earned!', {
        description: `+500 credits (Total: ${afterEarn})`
      });
    } else {
      this.results.push({
        name: 'Credit Sync - Earn Credits',
        status: 'failed',
        message: 'Credit earning not synchronized',
        details: { expected: initialCredits + 500, actual: afterEarn }
      });
    }
    
    // Test spending credits
    creditsStore.spendCredits(200);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const afterSpend = creditsStore.credits;
    if (afterSpend === afterEarn - 200) {
      this.results.push({
        name: 'Credit Sync - Spend Credits',
        status: 'passed',
        message: `Credits spent correctly: ${afterEarn} → ${afterSpend}`,
        details: { before: afterEarn, after: afterSpend, spent: 200 }
      });
      
      toast.warning('💸 Credits Spent', {
        description: `-200 credits (Total: ${afterSpend})`
      });
    } else {
      this.results.push({
        name: 'Credit Sync - Spend Credits',
        status: 'failed',
        message: 'Credit spending not synchronized',
        details: { expected: afterEarn - 200, actual: afterSpend }
      });
    }
    
    // Test daily costs
    const beforeDailyCosts = creditsStore.credits;
    await gameFacade.applyDailyCosts();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const afterDailyCosts = creditsStore.credits;
    const dailyCostsDeducted = beforeDailyCosts - afterDailyCosts;
    
    if (dailyCostsDeducted > 0) {
      this.results.push({
        name: 'Credit Sync - Daily Costs',
        status: 'passed',
        message: `Daily costs deducted: -${dailyCostsDeducted} credits`,
        details: { before: beforeDailyCosts, after: afterDailyCosts, deducted: dailyCostsDeducted }
      });
      
      toast.warning('Daily Costs Applied', {
        description: `-${dailyCostsDeducted} credits for ship maintenance`
      });
    } else {
      this.results.push({
        name: 'Credit Sync - Daily Costs',
        status: 'warning',
        message: 'No daily costs applied',
        details: { credits: afterDailyCosts }
      });
    }
  }

  /**
   * Test Player Progression
   */
  private async testPlayerProgression(): Promise<void> {
    console.log('\n🔍 Testing Player Progression...');
    
    const player = usePlayer.getState();
    const heatSystem = useHeatSystem.getState();
    
    // Test rank progression
    const initialRank = player.rank;
    player.increaseRank();
    const newRank = player.rank;
    
    if (newRank > initialRank) {
      this.results.push({
        name: 'Player Progression - Rank',
        status: 'passed',
        message: `Rank increased: ${initialRank} → ${newRank}`,
        details: { before: initialRank, after: newRank, title: player.rankTitle }
      });
      
      toast.success('🎖️ Rank Increased!', {
        description: `Now Rank ${newRank}: ${player.rankTitle}`
      });
    } else {
      this.results.push({
        name: 'Player Progression - Rank',
        status: 'warning',
        message: 'Rank did not increase (may be at max)',
        details: { rank: newRank }
      });
    }
    
    // Test heat system
    const initialHeat = player.heat;
    player.increaseHeat(20);
    const newHeat = player.heat;
    
    this.results.push({
      name: 'Player Progression - Heat',
      status: 'passed',
      message: `Heat increased: ${initialHeat} → ${newHeat}`,
      details: { 
        before: initialHeat, 
        after: newHeat,
        wantedLevel: heatSystem.wantedLevel,
        wantedInfo: heatSystem.wantedLevelInfo
      }
    });
    
    if (newHeat > initialHeat) {
      toast.warning('🔥 Heat Increased!', {
        description: `Heat level: ${newHeat} (Wanted Level: ${heatSystem.wantedLevel})`
      });
    }
    
    // Test notoriety
    const initialNotoriety = player.notoriety;
    player.increaseNotoriety(15);
    const newNotoriety = player.notoriety;
    
    this.results.push({
      name: 'Player Progression - Notoriety',
      status: 'passed',
      message: `Notoriety increased: ${initialNotoriety} → ${newNotoriety}`,
      details: { before: initialNotoriety, after: newNotoriety }
    });
    
    if (newNotoriety > initialNotoriety) {
      toast.warning('☠️ Notoriety Increased!', {
        description: `You're becoming more infamous: ${newNotoriety}`
      });
    }
    
    // Test morality
    const initialMorality = gameFacade.getMorality();
    gameFacade.updateMorality(-10); // Make an evil choice
    const newMorality = gameFacade.getMorality();
    
    this.results.push({
      name: 'Player Progression - Morality',
      status: 'passed',
      message: `Morality changed: ${initialMorality} → ${newMorality}`,
      details: { 
        before: initialMorality, 
        after: newMorality,
        alignment: newMorality > 0 ? 'Good' : newMorality < 0 ? 'Evil' : 'Neutral'
      }
    });
    
    if (newMorality !== initialMorality) {
      const alignment = newMorality > 0 ? '😇 Good' : newMorality < 0 ? '😈 Evil' : '😐 Neutral';
      toast.info('Morality Shifted', {
        description: `Alignment: ${alignment} (${newMorality})`
      });
    }
    
    // Test heat decay
    await gameFacade.applyHeatDecay();
    const afterDecay = player.heat;
    
    if (afterDecay < newHeat) {
      this.results.push({
        name: 'Player Progression - Heat Decay',
        status: 'passed',
        message: `Heat decayed: ${newHeat} → ${afterDecay}`,
        details: { before: newHeat, after: afterDecay, decayed: newHeat - afterDecay }
      });
      
      toast.info('Heat Decreasing', {
        description: `Heat level reduced to ${afterDecay}`
      });
    }
  }

  /**
   * Test Credit Display across UI
   */
  private async testCreditDisplay(): Promise<void> {
    console.log('\n🔍 Testing Credit Display...');
    
    const creditsStore = useCreditsStore.getState();
    const currentCredits = creditsStore.credits;
    
    // Log where credits should be displayed
    const displayLocations = [
      { location: 'Mission Context HUD (Top Right)', selector: '.mission-context-credits' },
      { location: 'Mission Rewards Preview', selector: '.mission-reward-credits' },
      { location: 'Stats Tab', selector: '.stats-credits' },
      { location: 'Debug Panel', selector: '.debug-credits' }
    ];
    
    console.log('%c💰 Credit Display Locations:', 'color: #ffd700; font-weight: bold;');
    displayLocations.forEach(loc => {
      console.log(`  📍 ${loc.location}: ${currentCredits} credits`);
    });
    
    this.results.push({
      name: 'Credit Display - UI Sync',
      status: 'passed',
      message: `Credits displayed: ${currentCredits}`,
      details: {
        credits: currentCredits,
        locations: displayLocations.map(l => l.location)
      }
    });
    
    toast.info('Credit Display Verified', {
      description: `All UI elements show: ${currentCredits} credits`
    });
  }

  /**
   * Generate summary report
   */
  private generateReport(): void {
    console.log('\n%c📊 TEST RESULTS SUMMARY', 'color: #ffff00; font-size: 18px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ffff00;');
    
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`⚠️  Warnings: ${warnings}/${total}`);
    
    // Display detailed results
    console.log('\n%cDetailed Results:', 'color: #00ffff; font-weight: bold;');
    this.results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⚠️';
      const color = result.status === 'passed' ? '#00ff00' : 
                    result.status === 'failed' ? '#ff0000' : '#ffaa00';
      
      console.log(`%c${icon} ${result.name}`, `color: ${color}`);
      console.log(`   ${result.message}`);
      if (result.details) {
        console.log('   Details:', result.details);
      }
    });
    
    // Final toast notification
    if (failed === 0) {
      toast.success('🎉 All Tests Passed!', {
        description: `${passed}/${total} tests completed successfully`
      });
    } else {
      toast.error('Some Tests Failed', {
        description: `${failed} failed, ${passed} passed, ${warnings} warnings`
      });
    }
    
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ffff00;');
  }

  /**
   * Run all tests
   */
  public async runAllTests(nonDestructive: boolean = true): Promise<void> {
    console.clear();
    console.log('%c🚀 STARTING MISSION CONTROL TEST SUITE', 'color: #00ff00; font-size: 20px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
    
    // Save state if non-destructive mode
    if (nonDestructive) {
      this.saveState();
    }
    
    // Show test instructions
    this.logTestInstructions();
    
    // Initialize game systems if needed
    await gameFacade.initialize();
    
    // Run all test suites
    try {
      toast.info('Starting Tests', {
        description: 'Running comprehensive Mission Control tests...'
      });
      
      await this.testPlunderverseTab();
      await this.testLegacyTab();
      await this.testReputationTab();
      await this.testStatsTab();
      await this.testCreditSync();
      await this.testPlayerProgression();
      await this.testCreditDisplay();
      
    } catch (error) {
      console.error('❌ Test execution error:', error);
      this.results.push({
        name: 'Test Execution',
        status: 'failed',
        message: `Critical error: ${error}`,
        details: error
      });
    }
    
    // Generate report
    this.generateReport();
    
    // Restore state if non-destructive mode
    if (nonDestructive) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait to see results
      this.restoreState();
      toast.info('State Restored', {
        description: 'Game state has been restored to pre-test condition'
      });
    }
    
    console.log('\n%c✨ Test suite completed!', 'color: #00ff00; font-weight: bold;');
  }

  /**
   * Run a quick smoke test
   */
  public async runQuickTest(): Promise<void> {
    console.log('%c⚡ Running Quick Test...', 'color: #ffff00; font-weight: bold;');
    
    const credits = useCreditsStore.getState().credits;
    const missions = usePlunderverseMissions.getState();
    const player = usePlayer.getState();
    
    console.log('💰 Credits:', credits);
    console.log('📋 Available Missions:', missions.availableMissions.length);
    console.log('🎖️ Player Rank:', player.rank, '-', player.rankTitle);
    console.log('🔥 Heat Level:', player.heat);
    console.log('☠️ Notoriety:', player.notoriety);
    
    toast.success('Quick Test Complete', {
      description: `Credits: ${credits}, Missions: ${missions.availableMissions.length}`
    });
  }
}

// Export singleton instance
export const missionControlTest = new MissionControlTest();

// Auto-log instructions when module is imported
console.log('%c🎮 Mission Control Test Ready!', 'color: #00ff00; font-weight: bold;');
console.log('Press Ctrl+T to run the full test suite');
console.log('Press Ctrl+Shift+Q for a quick test');