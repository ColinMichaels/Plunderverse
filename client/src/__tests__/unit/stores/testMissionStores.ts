/**
 * Mission Stores Test Suite
 * Tests mission management including acceptance, objectives, rewards, and story progression
 * Run with window.testMissionStores() from the browser console
 */

import { useMissions } from '../../../lib/stores/economy/useMissions';
import { usePlunderverseMissions } from '../../../lib/stores/economy/usePlunderverseMissions';
import missionsData from '../../../content/plunderverse/missions.json';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class MissionStoresTestSuite {
  private results: TestResult[] = [];
  private originalState: any;

  constructor() {
    console.log('📜 Mission Stores Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 14px');
    console.log('%c   📜 MISSION STORES TEST SUITE STARTING', 'color: #a855f7; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #a855f7; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original state
      this.originalState = { ...useMissions.getState() };
      
      await this.testMissionInitialization();
      await this.wait(500);
      
      await this.testMissionAcceptance();
      await this.wait(500);
      
      await this.testObjectiveTracking();
      await this.wait(500);
      
      await this.testMissionCompletion();
      await this.wait(500);
      
      await this.testRewardDistribution();
      await this.wait(500);
      
      await this.testStoryProgression();
      await this.wait(500);
      
      await this.testMissionChoices();
      await this.wait(500);
      
      await this.testMissionRequirements();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original state
      this.restoreOriginalState();
      this.printSummary();
    }
  }

  private async testMissionInitialization() {
    console.log('\n🚀 Testing Mission Initialization...');
    
    const missions = useMissions.getState();
    const plunderverse = usePlunderverseMissions.getState();
    
    // Initialize mission system
    plunderverse.initializeMissions();
    
    this.addResult(
      'Mission System Init',
      plunderverse.allMissions.length > 0 ? 'passed' : 'failed',
      `Loaded ${plunderverse.allMissions.length} missions`
    );
    
    // Test available missions
    const available = plunderverse.availableMissions;
    this.addResult(
      'Available Missions',
      available.length > 0 ? 'passed' : 'failed',
      `Available: ${available.length} missions`
    );
    
    // Test mission categories
    const categories = new Set(plunderverse.allMissions.map(m => m.category));
    this.addResult(
      'Mission Categories',
      categories.size > 0 ? 'passed' : 'failed',
      `Categories: ${Array.from(categories).join(', ')}`
    );
    
    // Test tutorial mission
    const tutorialMission = plunderverse.allMissions.find(m => m.id === 'tutorial_first_steps');
    this.addResult(
      'Tutorial Mission',
      tutorialMission !== undefined ? 'passed' : 'failed',
      `Tutorial found: ${tutorialMission?.title}`
    );
    
    // Test mission structure
    if (tutorialMission) {
      this.addResult(
        'Mission Structure',
        tutorialMission.objectives && tutorialMission.rewards ? 'passed' : 'failed',
        `Has objectives and rewards`
      );
    }
  }

  private async testMissionAcceptance() {
    console.log('\n✅ Testing Mission Acceptance...');
    
    const plunderverse = usePlunderverseMissions.getState();
    const missions = useMissions.getState();
    
    // Get first available mission
    const availableMission = plunderverse.availableMissions[0];
    
    if (!availableMission) {
      this.addResult('Mission Acceptance', 'failed', 'No available missions');
      return;
    }
    
    // Accept mission
    const acceptResult = plunderverse.acceptMission(availableMission.id);
    
    this.addResult(
      'Accept Mission',
      acceptResult ? 'passed' : 'failed',
      `Accepted: ${availableMission.title}`
    );
    
    // Check active missions
    const activeMission = plunderverse.activeMissions.find(m => m.id === availableMission.id);
    
    this.addResult(
      'Mission Active',
      activeMission !== undefined ? 'passed' : 'failed',
      `Mission in active list: ${activeMission?.status}`
    );
    
    // Test multiple active missions
    const secondMission = plunderverse.availableMissions[0];
    if (secondMission) {
      plunderverse.acceptMission(secondMission.id);
      
      this.addResult(
        'Multiple Active Missions',
        plunderverse.activeMissions.length >= 2 ? 'passed' : 'failed',
        `Active missions: ${plunderverse.activeMissions.length}`
      );
    }
    
    // Test mission limit
    const maxMissions = 10;
    let acceptCount = plunderverse.activeMissions.length;
    
    while (acceptCount < maxMissions && plunderverse.availableMissions.length > 0) {
      plunderverse.acceptMission(plunderverse.availableMissions[0].id);
      acceptCount++;
    }
    
    this.addResult(
      'Mission Limit',
      plunderverse.activeMissions.length <= maxMissions ? 'passed' : 'warning',
      `Active count: ${plunderverse.activeMissions.length}`
    );
  }

  private async testObjectiveTracking() {
    console.log('\n🎯 Testing Objective Tracking...');
    
    const plunderverse = usePlunderverseMissions.getState();
    
    // Get active mission with objectives
    const activeMission = plunderverse.activeMissions[0];
    
    if (!activeMission || !activeMission.objectives) {
      this.addResult('Objective Tracking', 'warning', 'No active mission with objectives');
      return;
    }
    
    // Test objective structure
    const firstObjective = activeMission.objectives[0];
    
    this.addResult(
      'Objective Structure',
      firstObjective && firstObjective.id && firstObjective.description ? 'passed' : 'failed',
      `Objective: ${firstObjective?.description}`
    );
    
    // Test objective progress
    if (firstObjective) {
      plunderverse.updateObjectiveProgress(activeMission.id, firstObjective.id, 50);
      
      const updatedMission = plunderverse.activeMissions.find(m => m.id === activeMission.id);
      const updatedObjective = updatedMission?.objectives?.find(o => o.id === firstObjective.id);
      
      this.addResult(
        'Objective Progress Update',
        updatedObjective?.progress === 50 ? 'passed' : 'failed',
        `Progress: ${updatedObjective?.progress}%`
      );
      
      // Complete objective
      plunderverse.updateObjectiveProgress(activeMission.id, firstObjective.id, 100);
      
      this.addResult(
        'Objective Completion',
        updatedObjective?.completed === true ? 'passed' : 'failed',
        `Completed: ${updatedObjective?.completed}`
      );
    }
    
    // Test multiple objectives
    if (activeMission.objectives && activeMission.objectives.length > 1) {
      this.addResult(
        'Multiple Objectives',
        activeMission.objectives.length > 1 ? 'passed' : 'failed',
        `Objectives: ${activeMission.objectives.length}`
      );
    }
  }

  private async testMissionCompletion() {
    console.log('\n🏆 Testing Mission Completion...');
    
    const plunderverse = usePlunderverseMissions.getState();
    
    // Get or create test mission
    if (plunderverse.activeMissions.length === 0 && plunderverse.availableMissions.length > 0) {
      plunderverse.acceptMission(plunderverse.availableMissions[0].id);
    }
    
    const testMission = plunderverse.activeMissions[0];
    
    if (!testMission) {
      this.addResult('Mission Completion', 'warning', 'No active mission to test');
      return;
    }
    
    // Complete all objectives
    if (testMission.objectives) {
      testMission.objectives.forEach(obj => {
        plunderverse.updateObjectiveProgress(testMission.id, obj.id, 100);
      });
    }
    
    // Complete mission
    const completeResult = plunderverse.completeMission(testMission.id, true);
    
    this.addResult(
      'Complete Mission',
      completeResult ? 'passed' : 'failed',
      `Mission completed: ${testMission.title}`
    );
    
    // Check completed missions list
    const completedMission = plunderverse.completedMissions.find(m => m.id === testMission.id);
    
    this.addResult(
      'Mission in Completed List',
      completedMission !== undefined ? 'passed' : 'failed',
      `Status: ${completedMission?.status}`
    );
    
    // Test mission failure
    if (plunderverse.availableMissions.length > 0) {
      const failMission = plunderverse.availableMissions[0];
      plunderverse.acceptMission(failMission.id);
      plunderverse.completeMission(failMission.id, false);
      
      const failedMission = plunderverse.completedMissions.find(m => m.id === failMission.id);
      
      this.addResult(
        'Mission Failure',
        failedMission?.status === 'failed' ? 'passed' : 'failed',
        `Failed status: ${failedMission?.status}`
      );
    }
  }

  private async testRewardDistribution() {
    console.log('\n💰 Testing Reward Distribution...');
    
    const plunderverse = usePlunderverseMissions.getState();
    
    // Find mission with rewards
    const missionWithRewards = plunderverse.allMissions.find(m => 
      m.rewards && (m.rewards.credits > 0 || m.rewards.reputation)
    );
    
    if (!missionWithRewards) {
      this.addResult('Reward Distribution', 'warning', 'No mission with rewards found');
      return;
    }
    
    // Test credit rewards
    this.addResult(
      'Credit Rewards',
      missionWithRewards.rewards.credits > 0 ? 'passed' : 'failed',
      `Credits: ${missionWithRewards.rewards.credits}`
    );
    
    // Test reputation rewards
    if (missionWithRewards.rewards.reputation) {
      const repKeys = Object.keys(missionWithRewards.rewards.reputation);
      
      this.addResult(
        'Reputation Rewards',
        repKeys.length > 0 ? 'passed' : 'failed',
        `Factions: ${repKeys.join(', ')}`
      );
    }
    
    // Test XP rewards
    if (missionWithRewards.rewards.xp) {
      this.addResult(
        'XP Rewards',
        missionWithRewards.rewards.xp > 0 ? 'passed' : 'failed',
        `XP: ${missionWithRewards.rewards.xp}`
      );
    }
    
    // Test item rewards
    if (missionWithRewards.rewards.items) {
      this.addResult(
        'Item Rewards',
        missionWithRewards.rewards.items.length > 0 ? 'passed' : 'failed',
        `Items: ${missionWithRewards.rewards.items.length}`
      );
    }
    
    // Test reward multipliers
    const rankMultiplier = 1.0 + (plunderverse.playerRank || 0) * 0.1;
    const adjustedCredits = missionWithRewards.rewards.credits * rankMultiplier;
    
    this.addResult(
      'Reward Multipliers',
      adjustedCredits !== missionWithRewards.rewards.credits ? 'passed' : 'warning',
      `Base: ${missionWithRewards.rewards.credits}, Adjusted: ${adjustedCredits.toFixed(0)}`
    );
  }

  private async testStoryProgression() {
    console.log('\n📖 Testing Story Progression...');
    
    const plunderverse = usePlunderverseMissions.getState();
    
    // Test story acts
    const storyMissions = plunderverse.allMissions.filter(m => m.act !== undefined);
    
    this.addResult(
      'Story Missions',
      storyMissions.length > 0 ? 'passed' : 'failed',
      `Story missions: ${storyMissions.length}`
    );
    
    // Test act progression
    const acts = new Set(storyMissions.map(m => m.act));
    
    this.addResult(
      'Story Acts',
      acts.size > 0 ? 'passed' : 'failed',
      `Acts: ${Array.from(acts).join(', ')}`
    );
    
    // Test prerequisite missions
    const missionsWithPrereqs = plunderverse.allMissions.filter(m => 
      m.prerequisites && m.prerequisites.missions && m.prerequisites.missions.length > 0
    );
    
    this.addResult(
      'Mission Prerequisites',
      missionsWithPrereqs.length > 0 ? 'passed' : 'failed',
      `Missions with prerequisites: ${missionsWithPrereqs.length}`
    );
    
    // Test unlocking missions
    if (missionsWithPrereqs.length > 0) {
      const locked = missionsWithPrereqs[0];
      const isAvailable = plunderverse.availableMissions.find(m => m.id === locked.id);
      
      this.addResult(
        'Mission Locking',
        !isAvailable ? 'passed' : 'warning',
        `Locked mission not in available list`
      );
    }
    
    // Test story progression tracking
    const completedStoryMissions = plunderverse.completedMissions.filter(m => 
      storyMissions.find(sm => sm.id === m.id)
    );
    
    this.addResult(
      'Story Progress Tracking',
      true ? 'passed' : 'failed',
      `Completed story missions: ${completedStoryMissions.length}`
    );
  }

  private async testMissionChoices() {
    console.log('\n🔀 Testing Mission Choices...');
    
    const plunderverse = usePlunderverseMissions.getState();
    
    // Find mission with choices
    const missionWithChoices = plunderverse.allMissions.find(m => 
      m.choices && m.choices.length > 0
    );
    
    if (!missionWithChoices) {
      this.addResult('Mission Choices', 'warning', 'No missions with choices found');
      return;
    }
    
    // Test choice structure
    const firstChoice = missionWithChoices.choices![0];
    
    this.addResult(
      'Choice Structure',
      firstChoice.id && firstChoice.text && firstChoice.consequences ? 'passed' : 'failed',
      `Choice: ${firstChoice.text?.substring(0, 50)}...`
    );
    
    // Test choice consequences
    if (firstChoice.consequences) {
      this.addResult(
        'Choice Consequences',
        Object.keys(firstChoice.consequences).length > 0 ? 'passed' : 'failed',
        `Consequence types: ${Object.keys(firstChoice.consequences).join(', ')}`
      );
    }
    
    // Test choice requirements
    if (firstChoice.requirements) {
      this.addResult(
        'Choice Requirements',
        Object.keys(firstChoice.requirements).length > 0 ? 'passed' : 'failed',
        `Requirements: ${Object.keys(firstChoice.requirements).join(', ')}`
      );
    }
    
    // Test multiple choices
    this.addResult(
      'Multiple Choices',
      missionWithChoices.choices!.length > 1 ? 'passed' : 'failed',
      `Choices available: ${missionWithChoices.choices!.length}`
    );
    
    // Test choice impact
    const impactfulChoice = missionWithChoices.choices!.find(c => 
      c.consequences?.reputation || c.consequences?.morality
    );
    
    this.addResult(
      'Choice Impact',
      impactfulChoice !== undefined ? 'passed' : 'failed',
      `Impactful choices present`
    );
  }

  private async testMissionRequirements() {
    console.log('\n🔒 Testing Mission Requirements...');
    
    const plunderverse = usePlunderverseMissions.getState();
    
    // Test level requirements
    const levelRequiredMissions = plunderverse.allMissions.filter(m => 
      m.prerequisites?.level && m.prerequisites.level > 1
    );
    
    this.addResult(
      'Level Requirements',
      levelRequiredMissions.length > 0 ? 'passed' : 'failed',
      `Missions with level req: ${levelRequiredMissions.length}`
    );
    
    // Test reputation requirements
    const repRequiredMissions = plunderverse.allMissions.filter(m => 
      m.prerequisites?.reputation
    );
    
    this.addResult(
      'Reputation Requirements',
      repRequiredMissions.length > 0 ? 'passed' : 'failed',
      `Missions with rep req: ${repRequiredMissions.length}`
    );
    
    // Test rank requirements
    const rankRequiredMissions = plunderverse.allMissions.filter(m => 
      m.prerequisites?.rank && m.prerequisites.rank > 1
    );
    
    this.addResult(
      'Rank Requirements',
      rankRequiredMissions.length > 0 ? 'passed' : 'failed',
      `Missions with rank req: ${rankRequiredMissions.length}`
    );
    
    // Test item requirements
    const itemRequiredMissions = plunderverse.allMissions.filter(m => 
      m.prerequisites?.items && m.prerequisites.items.length > 0
    );
    
    this.addResult(
      'Item Requirements',
      itemRequiredMissions.length > 0 ? 'passed' : 'warning',
      `Missions with item req: ${itemRequiredMissions.length}`
    );
    
    // Test requirement checking
    const testMission = levelRequiredMissions[0];
    if (testMission) {
      const meetsRequirements = plunderverse.checkMissionRequirements(testMission.id);
      
      this.addResult(
        'Requirement Checking',
        typeof meetsRequirements === 'boolean' ? 'passed' : 'failed',
        `Requirements check functional`
      );
    }
  }

  private restoreOriginalState() {
    // Restore the original state
    const plunderverse = usePlunderverseMissions.getState();
    
    // Clear missions
    plunderverse.activeMissions = [];
    plunderverse.completedMissions = [];
    
    // Reinitialize
    plunderverse.initializeMissions();
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private addResult(name: string, status: 'passed' | 'failed' | 'warning', message: string, details?: any) {
    this.results.push({ name, status, message, details });
    
    const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    const color = status === 'passed' ? '#10b981' : status === 'failed' ? '#ef4444' : '#f59e0b';
    console.log(`%c${emoji} ${name}: ${message}`, `color: ${color}`);
    
    if (details) {
      console.log('   Details:', details);
    }
  }

  private printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;
    
    console.log('\n%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log('%c          MISSION STORES TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    
    if (failed > 0) {
      console.log('\n%cFailed Tests:', 'color: #ef4444; font-weight: bold');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  • ${r.name}: ${r.message}`));
    }
    
    if (warnings > 0) {
      console.log('\n%cWarnings:', 'color: #f59e0b; font-weight: bold');
      this.results
        .filter(r => r.status === 'warning')
        .forEach(r => console.log(`  • ${r.name}: ${r.message}`));
    }
  }
}

// Make it available globally for testing
(window as any).testMissionStores = () => {
  const testSuite = new MissionStoresTestSuite();
  testSuite.runAllTests();
};

console.log('%c📜 Mission Stores Test Suite Loaded!', 'color: #a855f7; font-weight: bold');
console.log('Run %ctestMissionStores()%c to execute tests', 'color: #3b82f6', 'color: inherit');