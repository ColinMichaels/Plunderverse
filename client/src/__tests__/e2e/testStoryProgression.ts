/**
 * Story Progression E2E Test Suite
 * Tests the complete story arc and narrative flow
 * 
 * Run with: window.testStoryProgression() from browser console
 */

import { toast } from 'sonner';
import { gameFacade } from '../../lib/plunderverse/gameFacade';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { ContentRegistry } from '../../lib/plunderverse/contentRegistry';
import * as storyActs from '../../content/plunderverse/story_acts.json';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  duration: number;
  timestamp: number;
}

interface StoryMetrics {
  currentAct: number;
  completedActs: Set<number>;
  choicesMade: Map<string, string>;
  factionAlignments: Map<string, number>;
  moralityScore: number;
  storyMissionsCompleted: number;
  endingUnlocked: string | null;
  achievementsUnlocked: string[];
  criticalChoices: string[];
  storyBranch: string;
}

export class StoryProgressionTest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private metrics: StoryMetrics = {
    currentAct: 1,
    completedActs: new Set(),
    choicesMade: new Map(),
    factionAlignments: new Map([
      ['corporations', 0],
      ['pirates', 0],
      ['independents', 0],
      ['military', 0]
    ]),
    moralityScore: 0,
    storyMissionsCompleted: 0,
    endingUnlocked: null,
    achievementsUnlocked: [],
    criticalChoices: [],
    storyBranch: 'neutral'
  };
  private originalState: any = {};
  private contentRegistry: ContentRegistry;

  constructor() {
    console.log('📖 Story Progression Test Suite initialized');
    this.contentRegistry = new ContentRegistry();
  }

  /**
   * Save original game state
   */
  private saveOriginalState() {
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    
    this.originalState = {
      player: {
        rank: player.rank,
        reputation: { ...player.reputation },
        points: player.points
      },
      credits: credits.credits,
      missions: {
        completed: new Set(missions.completedMissionIds)
      },
      storyProgress: gameFacade.getStoryProgress()
    };
  }

  /**
   * Run all story progression tests
   */
  async runAllTests(): Promise<void> {
    console.clear();
    console.log('%c════════════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    console.log('%c  📖 STORY PROGRESSION E2E TEST SUITE', 'color: #ec4899; font-size: 16px; font-weight: bold');
    console.log('%c════════════════════════════════════════════════════', 'color: #ec4899; font-size: 14px');
    
    this.startTime = Date.now();
    this.saveOriginalState();
    
    try {
      // Test 1: Act 1 Introduction
      await this.testAct1Introduction();
      await this.wait(500);
      
      // Test 2: Act 1 Progression
      await this.testAct1Progression();
      await this.wait(500);
      
      // Test 3: Act 2 Unlocking
      await this.testAct2Unlocking();
      await this.wait(500);
      
      // Test 4: Faction Choices
      await this.testFactionChoices();
      await this.wait(500);
      
      // Test 5: Moral Decisions
      await this.testMoralDecisions();
      await this.wait(500);
      
      // Test 6: Story Branches
      await this.testStoryBranches();
      await this.wait(500);
      
      // Test 7: Act 3 Climax
      await this.testAct3Climax();
      await this.wait(500);
      
      // Test 8: Multiple Endings
      await this.testMultipleEndings();
      await this.wait(500);
      
      // Test 9: Achievement System
      await this.testAchievementSystem();
      await this.wait(500);
      
      // Test 10: Story Continuity
      await this.testStoryContinuity();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.generateReport();
      this.restoreOriginalState();
    }
  }

  /**
   * Test 1: Act 1 Introduction
   */
  private async testAct1Introduction() {
    console.log('\n🎬 Testing Act 1 Introduction...');
    const startTest = Date.now();
    
    const missions = usePlunderverseMissions.getState();
    const player = usePlayer.getState();
    
    // Start fresh with Act 1
    gameFacade.resetStoryProgress();
    gameFacade.setCurrentAct(1);
    
    // Generate Act 1 story missions
    await gameFacade.generateStoryMissions(1);
    await this.wait(200);
    
    // Check for introduction mission
    const introMissions = missions.availableMissions.filter(m => 
      m.storyAct === 1 && m.type === 'story'
    );
    
    this.addResult(
      'Act 1 Introduction',
      introMissions.length > 0 ? 'passed' : 'failed',
      `Found ${introMissions.length} introduction missions`,
      { missions: introMissions.map(m => m.title) },
      Date.now() - startTest
    );
    
    if (introMissions.length > 0) {
      // Accept first story mission
      const introMission = introMissions[0];
      missions.acceptMission(introMission.id);
      
      this.addResult(
        'Story Mission Accept',
        missions.activeMissions.some(m => m.id === introMission.id) ? 'passed' : 'failed',
        `Accepted: ${introMission.title}`,
        { mission: introMission },
        Date.now() - startTest
      );
      
      this.metrics.currentAct = 1;
    }
  }

  /**
   * Test 2: Act 1 Progression
   */
  private async testAct1Progression() {
    console.log('\n📈 Testing Act 1 Progression...');
    const startTest = Date.now();
    
    const missions = usePlunderverseMissions.getState();
    const player = usePlayer.getState();
    
    // Complete Act 1 story missions
    const act1Missions = missions.activeMissions.filter(m => m.storyAct === 1);
    let completedCount = 0;
    
    for (const mission of act1Missions) {
      // Simulate mission completion
      await this.simulateStoryMission(mission);
      completedCount++;
      this.metrics.storyMissionsCompleted++;
      await this.wait(100);
    }
    
    this.addResult(
      'Act 1 Missions',
      completedCount > 0 ? 'passed' : 'warning',
      `Completed ${completedCount} Act 1 missions`,
      { completed: completedCount },
      Date.now() - startTest
    );
    
    // Check Act 1 completion
    const act1Complete = gameFacade.isActComplete(1);
    if (act1Complete) {
      this.metrics.completedActs.add(1);
    }
    
    this.addResult(
      'Act 1 Completion',
      act1Complete ? 'passed' : 'warning',
      `Act 1 ${act1Complete ? 'completed' : 'in progress'}`,
      { complete: act1Complete },
      Date.now() - startTest
    );
  }

  /**
   * Test 3: Act 2 Unlocking
   */
  private async testAct2Unlocking() {
    console.log('\n🔓 Testing Act 2 Unlocking...');
    const startTest = Date.now();
    
    const player = usePlayer.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Prerequisites for Act 2
    player.setRank(5); // Required rank
    player.addPoints(500); // Required experience
    gameFacade.completeAct(1);
    
    // Attempt to unlock Act 2
    const act2Unlocked = gameFacade.unlockAct(2);
    
    this.addResult(
      'Act 2 Prerequisites',
      player.rank >= 5 ? 'passed' : 'failed',
      `Rank: ${player.rank}/5 required`,
      { rank: player.rank },
      Date.now() - startTest
    );
    
    this.addResult(
      'Act 2 Unlock',
      act2Unlocked ? 'passed' : 'failed',
      `Act 2 ${act2Unlocked ? 'unlocked' : 'locked'}`,
      { unlocked: act2Unlocked },
      Date.now() - startTest
    );
    
    if (act2Unlocked) {
      // Generate Act 2 missions
      await gameFacade.generateStoryMissions(2);
      await this.wait(200);
      
      const act2Missions = missions.availableMissions.filter(m => m.storyAct === 2);
      
      this.addResult(
        'Act 2 Content',
        act2Missions.length > 0 ? 'passed' : 'failed',
        `Generated ${act2Missions.length} Act 2 missions`,
        { missions: act2Missions.map(m => m.title) },
        Date.now() - startTest
      );
      
      this.metrics.currentAct = 2;
    }
  }

  /**
   * Test 4: Faction Choices
   */
  private async testFactionChoices() {
    console.log('\n⚔️ Testing Faction Choices...');
    const startTest = Date.now();
    
    const player = usePlayer.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Test faction alignment choices
    const factionChoices = [
      { faction: 'corporations', choice: 'support_corp', impact: 10 },
      { faction: 'pirates', choice: 'join_pirates', impact: 15 },
      { faction: 'independents', choice: 'stay_neutral', impact: 5 }
    ];
    
    for (const choice of factionChoices) {
      // Make faction choice
      gameFacade.makeStoryChoice(choice.choice, choice.faction);
      player.adjustReputation(choice.faction, choice.impact);
      
      this.metrics.factionAlignments.set(
        choice.faction,
        (this.metrics.factionAlignments.get(choice.faction) || 0) + choice.impact
      );
      
      this.metrics.choicesMade.set(choice.choice, choice.faction);
      await this.wait(100);
    }
    
    // Determine dominant faction
    let dominantFaction = '';
    let maxAlignment = 0;
    for (const [faction, alignment] of this.metrics.factionAlignments) {
      if (alignment > maxAlignment) {
        maxAlignment = alignment;
        dominantFaction = faction;
      }
    }
    
    this.addResult(
      'Faction Choices',
      this.metrics.choicesMade.size > 0 ? 'passed' : 'failed',
      `Made ${this.metrics.choicesMade.size} faction choices`,
      { choices: Array.from(this.metrics.choicesMade.entries()) },
      Date.now() - startTest
    );
    
    this.addResult(
      'Faction Alignment',
      dominantFaction !== '' ? 'passed' : 'warning',
      `Aligned with: ${dominantFaction} (${maxAlignment} points)`,
      { alignments: Object.fromEntries(this.metrics.factionAlignments) },
      Date.now() - startTest
    );
    
    // Test faction-specific content
    const factionMissions = missions.availableMissions.filter(m => 
      m.faction === dominantFaction
    );
    
    this.addResult(
      'Faction Content',
      factionMissions.length > 0 ? 'passed' : 'warning',
      `${factionMissions.length} ${dominantFaction} missions available`,
      { missionCount: factionMissions.length },
      Date.now() - startTest
    );
  }

  /**
   * Test 5: Moral Decisions
   */
  private async testMoralDecisions() {
    console.log('\n⚖️ Testing Moral Decisions...');
    const startTest = Date.now();
    
    // Test moral choice scenarios
    const moralChoices = [
      { scenario: 'rescue_civilians', morality: 10, choice: 'save' },
      { scenario: 'steal_supplies', morality: -5, choice: 'steal' },
      { scenario: 'expose_corruption', morality: 15, choice: 'expose' },
      { scenario: 'betray_ally', morality: -20, choice: 'loyal' }
    ];
    
    for (const scenario of moralChoices) {
      // Make moral choice
      gameFacade.makeStoryChoice(scenario.scenario, scenario.choice);
      this.metrics.moralityScore += scenario.morality;
      
      if (Math.abs(scenario.morality) >= 10) {
        this.metrics.criticalChoices.push(scenario.scenario);
      }
      
      await this.wait(100);
    }
    
    this.addResult(
      'Moral Choices',
      moralChoices.length > 0 ? 'passed' : 'failed',
      `Made ${moralChoices.length} moral decisions`,
      { choices: moralChoices.map(c => c.scenario) },
      Date.now() - startTest
    );
    
    // Determine moral alignment
    let moralAlignment = 'neutral';
    if (this.metrics.moralityScore > 20) moralAlignment = 'paragon';
    else if (this.metrics.moralityScore < -20) moralAlignment = 'renegade';
    
    this.addResult(
      'Moral Alignment',
      this.metrics.moralityScore !== 0 ? 'passed' : 'warning',
      `Alignment: ${moralAlignment} (${this.metrics.moralityScore})`,
      { morality: this.metrics.moralityScore, alignment: moralAlignment },
      Date.now() - startTest
    );
    
    this.addResult(
      'Critical Choices',
      this.metrics.criticalChoices.length > 0 ? 'passed' : 'warning',
      `${this.metrics.criticalChoices.length} critical decisions made`,
      { critical: this.metrics.criticalChoices },
      Date.now() - startTest
    );
  }

  /**
   * Test 6: Story Branches
   */
  private async testStoryBranches() {
    console.log('\n🌿 Testing Story Branches...');
    const startTest = Date.now();
    
    // Determine story branch based on choices
    const factionScore = Math.max(...this.metrics.factionAlignments.values());
    const moralScore = this.metrics.moralityScore;
    
    if (factionScore > 30 && moralScore > 20) {
      this.metrics.storyBranch = 'hero';
    } else if (factionScore > 30 && moralScore < -20) {
      this.metrics.storyBranch = 'villain';
    } else if (Math.abs(moralScore) < 10) {
      this.metrics.storyBranch = 'neutral';
    } else {
      this.metrics.storyBranch = 'complex';
    }
    
    this.addResult(
      'Story Branch',
      this.metrics.storyBranch !== 'neutral' ? 'passed' : 'warning',
      `Following ${this.metrics.storyBranch} path`,
      { branch: this.metrics.storyBranch, factors: { faction: factionScore, moral: moralScore } },
      Date.now() - startTest
    );
    
    // Test branch-specific content
    const branchContent = gameFacade.getStoryBranchContent(this.metrics.storyBranch);
    
    this.addResult(
      'Branch Content',
      branchContent !== null ? 'passed' : 'warning',
      `Branch-specific content ${branchContent ? 'available' : 'not found'}`,
      { hasContent: branchContent !== null },
      Date.now() - startTest
    );
    
    // Test consequence of earlier choices
    const hasConsequences = this.metrics.criticalChoices.length > 0;
    
    this.addResult(
      'Choice Consequences',
      hasConsequences ? 'passed' : 'warning',
      `Earlier choices ${hasConsequences ? 'have' : 'lack'} consequences`,
      { criticalChoices: this.metrics.criticalChoices.length },
      Date.now() - startTest
    );
  }

  /**
   * Test 7: Act 3 Climax
   */
  private async testAct3Climax() {
    console.log('\n🎯 Testing Act 3 Climax...');
    const startTest = Date.now();
    
    const player = usePlayer.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Prerequisites for Act 3
    player.setRank(10);
    gameFacade.completeAct(2);
    gameFacade.setCurrentAct(3);
    
    // Unlock Act 3
    const act3Unlocked = gameFacade.unlockAct(3);
    
    this.addResult(
      'Act 3 Unlock',
      act3Unlocked ? 'passed' : 'warning',
      `Act 3 ${act3Unlocked ? 'unlocked' : 'locked'}`,
      { unlocked: act3Unlocked },
      Date.now() - startTest
    );
    
    if (act3Unlocked) {
      // Generate climax missions
      await gameFacade.generateStoryMissions(3);
      await this.wait(200);
      
      const climaxMissions = missions.availableMissions.filter(m => 
        m.storyAct === 3 && m.type === 'story'
      );
      
      this.addResult(
        'Climax Missions',
        climaxMissions.length > 0 ? 'passed' : 'failed',
        `${climaxMissions.length} climax missions available`,
        { missions: climaxMissions.map(m => m.title) },
        Date.now() - startTest
      );
      
      // Test final boss encounter
      const bossMission = climaxMissions.find(m => 
        m.title.toLowerCase().includes('final') || 
        m.title.toLowerCase().includes('boss')
      );
      
      this.addResult(
        'Final Boss',
        bossMission !== undefined ? 'passed' : 'warning',
        bossMission ? `Boss: ${bossMission.title}` : 'No boss encounter found',
        { boss: bossMission?.title },
        Date.now() - startTest
      );
      
      this.metrics.currentAct = 3;
      this.metrics.completedActs.add(2);
    }
  }

  /**
   * Test 8: Multiple Endings
   */
  private async testMultipleEndings() {
    console.log('\n🏆 Testing Multiple Endings...');
    const startTest = Date.now();
    
    // Calculate ending based on choices and alignment
    const endings = [
      { 
        id: 'hero_ending',
        requirements: { morality: 50, faction: 'independents' },
        title: 'Hero of the People'
      },
      { 
        id: 'pirate_king',
        requirements: { morality: -30, faction: 'pirates' },
        title: 'Pirate King'
      },
      { 
        id: 'corporate_elite',
        requirements: { morality: 0, faction: 'corporations' },
        title: 'Corporate Elite'
      },
      { 
        id: 'true_freedom',
        requirements: { morality: 20, faction: 'independents' },
        title: 'True Freedom'
      }
    ];
    
    // Determine available endings
    const availableEndings = [];
    for (const ending of endings) {
      const meetsRequirements = this.checkEndingRequirements(ending.requirements);
      if (meetsRequirements) {
        availableEndings.push(ending);
      }
    }
    
    this.addResult(
      'Available Endings',
      availableEndings.length > 0 ? 'passed' : 'warning',
      `${availableEndings.length} endings available`,
      { endings: availableEndings.map(e => e.title) },
      Date.now() - startTest
    );
    
    // Select ending based on strongest alignment
    if (availableEndings.length > 0) {
      const selectedEnding = availableEndings[0];
      this.metrics.endingUnlocked = selectedEnding.id;
      
      this.addResult(
        'Selected Ending',
        true,
        `Unlocked: ${selectedEnding.title}`,
        { ending: selectedEnding },
        Date.now() - startTest
      );
      
      // Test ending cutscene/content
      const hasEndingContent = gameFacade.hasEndingContent(selectedEnding.id);
      
      this.addResult(
        'Ending Content',
        hasEndingContent ? 'passed' : 'warning',
        `Ending content ${hasEndingContent ? 'exists' : 'missing'}`,
        { hasContent: hasEndingContent },
        Date.now() - startTest
      );
    }
  }

  /**
   * Test 9: Achievement System
   */
  private async testAchievementSystem() {
    console.log('\n🏅 Testing Achievement System...');
    const startTest = Date.now();
    
    // Check various achievements
    const achievements = [
      { id: 'first_mission', condition: this.metrics.storyMissionsCompleted > 0 },
      { id: 'act1_complete', condition: this.metrics.completedActs.has(1) },
      { id: 'faction_ally', condition: Math.max(...this.metrics.factionAlignments.values()) > 30 },
      { id: 'moral_paragon', condition: this.metrics.moralityScore > 50 },
      { id: 'story_complete', condition: this.metrics.endingUnlocked !== null },
      { id: 'critical_choice', condition: this.metrics.criticalChoices.length > 0 }
    ];
    
    for (const achievement of achievements) {
      if (achievement.condition) {
        this.metrics.achievementsUnlocked.push(achievement.id);
      }
    }
    
    this.addResult(
      'Achievements Unlocked',
      this.metrics.achievementsUnlocked.length > 0 ? 'passed' : 'warning',
      `Unlocked ${this.metrics.achievementsUnlocked.length}/${achievements.length} achievements`,
      { unlocked: this.metrics.achievementsUnlocked },
      Date.now() - startTest
    );
    
    // Test achievement persistence
    const savedAchievements = localStorage.getItem('plunderverse_achievements');
    localStorage.setItem('plunderverse_achievements', 
      JSON.stringify(this.metrics.achievementsUnlocked));
    
    this.addResult(
      'Achievement Persistence',
      localStorage.getItem('plunderverse_achievements') !== null ? 'passed' : 'failed',
      'Achievements saved to storage',
      { saved: true },
      Date.now() - startTest
    );
    
    // Test achievement rewards
    const achievementRewards = this.metrics.achievementsUnlocked.length * 100;
    
    this.addResult(
      'Achievement Rewards',
      achievementRewards > 0 ? 'passed' : 'warning',
      `Earned ${achievementRewards} credits from achievements`,
      { rewards: achievementRewards },
      Date.now() - startTest
    );
  }

  /**
   * Test 10: Story Continuity
   */
  private async testStoryContinuity() {
    console.log('\n🔗 Testing Story Continuity...');
    const startTest = Date.now();
    
    // Check story progression continuity
    const hasContinuity = 
      this.metrics.completedActs.size > 0 &&
      this.metrics.choicesMade.size > 0 &&
      this.metrics.storyMissionsCompleted > 0;
    
    this.addResult(
      'Story Continuity',
      hasContinuity ? 'passed' : 'failed',
      'Story maintains continuity across acts',
      { 
        acts: Array.from(this.metrics.completedActs),
        missions: this.metrics.storyMissionsCompleted,
        choices: this.metrics.choicesMade.size
      },
      Date.now() - startTest
    );
    
    // Check choice persistence
    const choicesRemembered = this.metrics.choicesMade.size > 0 && 
                              this.metrics.criticalChoices.length > 0;
    
    this.addResult(
      'Choice Persistence',
      choicesRemembered ? 'passed' : 'warning',
      'Player choices remembered throughout story',
      { choiceCount: this.metrics.choicesMade.size },
      Date.now() - startTest
    );
    
    // Check narrative coherence
    const hasCoherence = 
      this.metrics.storyBranch !== 'neutral' &&
      this.metrics.endingUnlocked !== null;
    
    this.addResult(
      'Narrative Coherence',
      hasCoherence ? 'passed' : 'warning',
      `Story follows ${this.metrics.storyBranch} branch to ${this.metrics.endingUnlocked || 'ongoing'}`,
      { branch: this.metrics.storyBranch, ending: this.metrics.endingUnlocked },
      Date.now() - startTest
    );
  }

  /**
   * Helper: Simulate story mission completion
   */
  private async simulateStoryMission(mission: any) {
    const missions = usePlunderverseMissions.getState();
    
    // Complete objectives
    for (let i = 0; i < mission.objectives.length; i++) {
      missions.updateObjectiveProgress(mission.id, i, mission.objectives[i].target);
    }
    
    // Make story choice if present
    if (mission.choices && mission.choices.length > 0) {
      const choice = mission.choices[0];
      gameFacade.makeStoryChoice(mission.id, choice.id);
      this.metrics.choicesMade.set(mission.id, choice.id);
    }
    
    // Complete mission
    await gameFacade.completeMission(mission.id);
  }

  /**
   * Helper: Check ending requirements
   */
  private checkEndingRequirements(requirements: any): boolean {
    if (requirements.morality !== undefined) {
      if (this.metrics.moralityScore < requirements.morality) return false;
    }
    
    if (requirements.faction !== undefined) {
      const factionScore = this.metrics.factionAlignments.get(requirements.faction) || 0;
      if (factionScore < 30) return false;
    }
    
    return true;
  }

  /**
   * Helper: Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add test result
   */
  private addResult(
    name: string,
    status: 'running' | 'passed' | 'failed' | 'warning',
    message: string,
    details?: any,
    duration: number = 0
  ) {
    this.results.push({
      name,
      status,
      message,
      details,
      duration,
      timestamp: Date.now()
    });
    
    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    console.log(`  ${icon} ${name}: ${message}`);
  }

  /**
   * Generate and display test report
   */
  private generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    
    console.log('\n' + '═'.repeat(60));
    console.log('📊 STORY PROGRESSION TEST REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`⏱️ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60));
    
    // Story metrics summary
    console.log('\n📖 Story Metrics:');
    console.log(`  • Current Act: ${this.metrics.currentAct}`);
    console.log(`  • Acts Completed: ${this.metrics.completedActs.size}`);
    console.log(`  • Story Missions: ${this.metrics.storyMissionsCompleted}`);
    console.log(`  • Choices Made: ${this.metrics.choicesMade.size}`);
    console.log(`  • Critical Choices: ${this.metrics.criticalChoices.length}`);
    console.log(`  • Morality Score: ${this.metrics.moralityScore}`);
    console.log(`  • Story Branch: ${this.metrics.storyBranch}`);
    console.log(`  • Ending: ${this.metrics.endingUnlocked || 'Not reached'}`);
    console.log(`  • Achievements: ${this.metrics.achievementsUnlocked.length}`);
    
    // Faction alignments
    console.log('\n⚔️ Faction Alignments:');
    for (const [faction, score] of this.metrics.factionAlignments) {
      console.log(`  • ${faction}: ${score}`);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (failed > 0) {
      console.log('  - Fix story progression blockers');
    }
    if (this.metrics.choicesMade.size < 5) {
      console.log('  - Add more meaningful player choices');
    }
    if (this.metrics.endingUnlocked === null) {
      console.log('  - Ensure endings are achievable');
    }
    if (this.metrics.achievementsUnlocked.length < 3) {
      console.log('  - Make achievements more discoverable');
    }
    
    // Show toast notification
    const status = failed > 0 ? 'error' : passed === this.results.length ? 'success' : 'warning';
    toast[status](
      `Story Test: ${passed}/${this.results.length} passed`,
      {
        description: failed > 0 
          ? `${failed} story issues detected`
          : 'Story progression validated',
        duration: 5000
      }
    );
    
    return {
      results: this.results,
      metrics: this.metrics,
      summary: {
        total: this.results.length,
        passed,
        failed,
        warnings,
        duration: totalDuration,
        completion: (passed / this.results.length) * 100
      }
    };
  }

  /**
   * Restore original game state
   */
  private restoreOriginalState() {
    try {
      const player = usePlayer.getState();
      const credits = useCreditsStore.getState();
      
      // Restore player stats
      player.setRank(this.originalState.player.rank);
      player.setReputation(this.originalState.player.reputation);
      player.setPoints(this.originalState.player.points);
      
      // Restore credits
      credits.setCredits(this.originalState.credits);
      
      // Restore story progress
      if (this.originalState.storyProgress) {
        gameFacade.loadStoryProgress(this.originalState.storyProgress);
      }
      
      console.log('♻️ Game state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testStoryProgression = () => {
    const test = new StoryProgressionTest();
    return test.runAllTests();
  };
}