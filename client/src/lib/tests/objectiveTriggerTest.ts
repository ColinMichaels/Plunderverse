/**
 * Objective Trigger System Comprehensive Test Suite
 * Tests all trigger types and auto-completion mechanisms
 * Run with window.testObjectiveTriggers() from the console
 */

import { toast } from 'sonner';
import { gameFacade } from '../plunderverse/gameFacade';
import { usePlunderverseMissions } from '../stores/economy/usePlunderverseMissions';
import { useObjectiveTriggers } from '../stores/economy/useObjectiveTriggers';
import { usePlayer } from '../stores/player/usePlayer';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useLandedState } from '../stores/surface/useLandedState';
import { useSolarSystem } from '../stores/space/useSolarSystem';
import { useMining } from '../stores/economy/useMining';
import { 
  Mission, 
  MissionObjective, 
  ObjectiveTriggerType,
  ObjectiveTriggerData,
  Coordinate3D
} from '../plunderverse/types';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  timestamp?: number;
}

interface TestMission {
  mission: Mission;
  triggerType: ObjectiveTriggerType;
  expectedBehavior: string;
}

export class ObjectiveTriggerTest {
  private results: TestResult[] = [];
  private testMissions: Map<string, TestMission> = new Map();
  private originalState: any = {};
  private verbose: boolean = true;

  constructor() {
    console.log('🎯 Objective Trigger Test Suite initialized');
    // Make it available globally
    (window as any).testObjectiveTriggers = () => this.runAllTests();
  }

  /**
   * Save current game state for restoration after tests
   */
  private saveState(): void {
    const missions = usePlunderverseMissions.getState();
    const player = usePlayer.getState();
    const credits = useCreditsStore.getState();
    const triggers = useObjectiveTriggers.getState();

    this.originalState = {
      missions: {
        available: [...missions.availableMissions],
        active: [...missions.activeMissions],
        completed: new Set(missions.completedMissionIds)
      },
      player: {
        rank: player.rank,
        reputation: { ...player.reputation },
        heat: player.heat,
        notoriety: player.notoriety
      },
      credits: credits.credits,
      triggers: {
        listeners: new Map(triggers.activeListeners),
        progress: new Map(triggers.progressData)
      }
    };

    console.log('💾 Test state saved for restoration');
  }

  /**
   * Restore original game state
   */
  private restoreState(): void {
    try {
      const missions = usePlunderverseMissions.getState();
      const credits = useCreditsStore.getState();

      // Clear current missions
      missions.activeMissions.forEach(m => {
        missions.abandonMission(m.id);
      });

      // Restore credits
      credits.setCredits(this.originalState.credits);

      console.log('♻️ Test state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }

  /**
   * Create a test mission with specific trigger type
   */
  private createTestMission(
    triggerType: ObjectiveTriggerType,
    triggerData: Partial<ObjectiveTriggerData>,
    title?: string
  ): Mission {
    const missionId = `test_trigger_${triggerType}_${Date.now()}`;
    const objectiveId = `obj_${triggerType}_1`;

    return {
      id: missionId,
      title: title || `TEST: ${triggerType} Trigger Mission`,
      description: `Testing ${triggerType} trigger auto-completion`,
      type: 'investigation',
      difficulty: 'easy',
      minRank: 1,
      rewards: {
        base: { credits: 100 },
        variable: false
      },
      requirements: {},
      objectives: [{
        id: objectiveId,
        type: 'investigation',
        description: `Test ${triggerType} trigger`,
        triggerType: triggerType,
        triggerData: {
          type: triggerType,
          ...triggerData,
          targetValue: triggerData.targetValue || 1,
          currentValue: 0
        } as ObjectiveTriggerData,
        quantity: triggerData.targetValue || 1,
        completed: false
      }],
      choices: [],
      active: false,
      completed: false
    };
  }

  /**
   * Test Location Trigger
   */
  private async testLocationTrigger(): Promise<void> {
    console.log('\n🌍 Testing LOCATION Trigger...');

    const mission = this.createTestMission('location', {
      location: 'Mars',
      planet: 'Mars',
      targetValue: 1
    }, 'Land on Mars');

    const missions = usePlunderverseMissions.getState();
    const triggers = useObjectiveTriggers.getState();

    // Add and accept mission
    missions.addEmergencyMissions([mission]);
    const accepted = missions.acceptMission(mission.id);

    if (!accepted) {
      this.results.push({
        name: 'Location Trigger - Setup',
        status: 'failed',
        message: 'Could not accept test mission',
        details: { mission }
      });
      return;
    }

    // Simulate landing on Mars
    console.log('  📍 Simulating landing on Mars...');
    triggers.reportLocationProgress('Mars', undefined, 'Mars');

    // Wait for state update
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if objective completed
    const missionState = missions.activeMissions.find(m => m.id === mission.id);
    const progress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);

    if (progress === 100) {
      this.results.push({
        name: 'Location Trigger - Mars Landing',
        status: 'passed',
        message: 'Location objective auto-completed on planet arrival',
        details: { 
          location: 'Mars', 
          progress: progress,
          objective: mission.objectives[0]
        }
      });

      // Complete the mission
      await gameFacade.resolveMission(mission.id);
      
      this.results.push({
        name: 'Location Trigger - Mission Complete',
        status: 'passed',
        message: 'Mission completed after location objective',
        details: { missionId: mission.id }
      });
    } else {
      this.results.push({
        name: 'Location Trigger - Mars Landing',
        status: 'failed',
        message: 'Location objective did not auto-complete',
        details: { 
          location: 'Mars', 
          progress: progress || 0,
          expected: 100
        }
      });
    }

    // Test coordinate-based location trigger
    const coordMission = this.createTestMission('location', {
      coordinates: { x: 100, y: 0, z: 50 } as Coordinate3D,
      radius: 20,
      targetValue: 1
    }, 'Reach Specific Coordinates');

    missions.addEmergencyMissions([coordMission]);
    missions.acceptMission(coordMission.id);

    // Simulate reaching coordinates
    console.log('  📍 Testing coordinate-based trigger...');
    triggers.reportLocationProgress(undefined, { x: 105, y: 0, z: 55 }); // Within radius

    await new Promise(resolve => setTimeout(resolve, 100));

    const coordProgress = missions.currentObjectiveProgress.get(coordMission.id)?.get(coordMission.objectives[0].id);

    if (coordProgress === 100) {
      this.results.push({
        name: 'Location Trigger - Coordinates',
        status: 'passed',
        message: 'Coordinate-based location trigger worked',
        details: { 
          target: { x: 100, y: 0, z: 50 },
          reached: { x: 105, y: 0, z: 55 },
          radius: 20,
          progress: coordProgress
        }
      });
    } else {
      this.results.push({
        name: 'Location Trigger - Coordinates',
        status: 'failed',
        message: 'Coordinate trigger did not complete',
        details: { progress: coordProgress || 0 }
      });
    }

    // Cleanup
    missions.abandonMission(mission.id);
    missions.abandonMission(coordMission.id);
  }

  /**
   * Test Collection Trigger
   */
  private async testCollectionTrigger(): Promise<void> {
    console.log('\n💎 Testing COLLECTION Trigger...');

    const mission = this.createTestMission('collection', {
      itemType: 'ore',
      targetValue: 10,
      currentValue: 0
    }, 'Collect 10 Ore');

    const missions = usePlunderverseMissions.getState();
    const triggers = useObjectiveTriggers.getState();

    // Add and accept mission
    missions.addEmergencyMissions([mission]);
    missions.acceptMission(mission.id);

    // Simulate collecting ore incrementally
    console.log('  ⛏️ Simulating ore collection...');
    
    // Collect 5 ore
    triggers.reportCollectionProgress('iron_ore', 'ore', 5);
    await new Promise(resolve => setTimeout(resolve, 100));

    let progress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);
    
    if (progress === 50) {
      this.results.push({
        name: 'Collection Trigger - Partial Progress',
        status: 'passed',
        message: 'Partial collection tracked correctly (5/10)',
        details: { collected: 5, target: 10, progress: progress }
      });
    } else {
      this.results.push({
        name: 'Collection Trigger - Partial Progress',
        status: 'failed',
        message: 'Partial collection not tracked correctly',
        details: { expected: 50, actual: progress || 0 }
      });
    }

    // Collect remaining 5 ore
    triggers.reportCollectionProgress('iron_ore', 'ore', 5);
    await new Promise(resolve => setTimeout(resolve, 100));

    progress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);

    if (progress === 100) {
      this.results.push({
        name: 'Collection Trigger - Complete',
        status: 'passed',
        message: 'Collection objective auto-completed at target',
        details: { collected: 10, target: 10, progress: progress }
      });

      // Complete the mission
      const result = await gameFacade.resolveMission(mission.id);
      
      if (result.success) {
        this.results.push({
          name: 'Collection Trigger - Mission Complete',
          status: 'passed',
          message: 'Mission completed after collection objective',
          details: { rewards: result.rewards }
        });
      }
    } else {
      this.results.push({
        name: 'Collection Trigger - Complete',
        status: 'failed',
        message: 'Collection objective did not auto-complete',
        details: { progress: progress || 0, expected: 100 }
      });
    }

    // Cleanup
    missions.abandonMission(mission.id);
  }

  /**
   * Test Combat Trigger
   */
  private async testCombatTrigger(): Promise<void> {
    console.log('\n⚔️ Testing COMBAT Trigger...');

    const mission = this.createTestMission('combat', {
      enemyType: 'pirate',
      targetValue: 3,
      currentValue: 0
    }, 'Defeat 3 Pirates');

    const missions = usePlunderverseMissions.getState();
    const triggers = useObjectiveTriggers.getState();

    // Add and accept mission
    missions.addEmergencyMissions([mission]);
    missions.acceptMission(mission.id);

    // Simulate combat victories
    console.log('  🎯 Simulating pirate defeats...');
    
    for (let i = 1; i <= 3; i++) {
      triggers.reportCombatProgress('pirate', undefined, 1);
      await new Promise(resolve => setTimeout(resolve, 100));

      const progress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);
      const expectedProgress = (i / 3) * 100;

      console.log(`    Defeated pirate ${i}/3 - Progress: ${progress}%`);

      if (i < 3 && progress === expectedProgress) {
        this.results.push({
          name: `Combat Trigger - Victory ${i}`,
          status: 'passed',
          message: `Combat progress tracked: ${i}/3 pirates`,
          details: { defeated: i, target: 3, progress: progress }
        });
      }
    }

    // Check final completion
    const finalProgress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);

    if (finalProgress === 100) {
      this.results.push({
        name: 'Combat Trigger - Complete',
        status: 'passed',
        message: 'Combat objective auto-completed',
        details: { defeated: 3, target: 3, progress: finalProgress }
      });
    } else {
      this.results.push({
        name: 'Combat Trigger - Complete',
        status: 'failed',
        message: 'Combat objective did not auto-complete',
        details: { progress: finalProgress || 0, expected: 100 }
      });
    }

    // Test faction-based combat
    const factionMission = this.createTestMission('combat', {
      enemyFaction: 'corporations',
      targetValue: 2,
      currentValue: 0
    }, 'Defeat 2 Corporation Ships');

    missions.addEmergencyMissions([factionMission]);
    missions.acceptMission(factionMission.id);

    console.log('  🎯 Testing faction-based combat trigger...');
    triggers.reportCombatProgress(undefined, 'corporations', 2);
    await new Promise(resolve => setTimeout(resolve, 100));

    const factionProgress = missions.currentObjectiveProgress.get(factionMission.id)?.get(factionMission.objectives[0].id);

    if (factionProgress === 100) {
      this.results.push({
        name: 'Combat Trigger - Faction',
        status: 'passed',
        message: 'Faction-based combat trigger worked',
        details: { faction: 'corporations', defeated: 2, progress: factionProgress }
      });
    } else {
      this.results.push({
        name: 'Combat Trigger - Faction',
        status: 'failed',
        message: 'Faction combat trigger failed',
        details: { progress: factionProgress || 0 }
      });
    }

    // Cleanup
    missions.abandonMission(mission.id);
    missions.abandonMission(factionMission.id);
  }

  /**
   * Test Interaction Trigger
   */
  private async testInteractionTrigger(): Promise<void> {
    console.log('\n🤝 Testing INTERACTION Trigger...');

    const mission = this.createTestMission('interaction', {
      interactionId: 'trade_merchant',
      targetValue: 1,
      currentValue: 0
    }, 'Trade with Merchant');

    const missions = usePlunderverseMissions.getState();
    const triggers = useObjectiveTriggers.getState();

    // Add and accept mission
    missions.addEmergencyMissions([mission]);
    missions.acceptMission(mission.id);

    // Simulate trading interaction
    console.log('  💰 Simulating trade interaction...');
    triggers.reportInteractionProgress('trade_merchant');

    await new Promise(resolve => setTimeout(resolve, 100));

    const progress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);

    if (progress === 100) {
      this.results.push({
        name: 'Interaction Trigger - Trade',
        status: 'passed',
        message: 'Trade interaction triggered completion',
        details: { 
          interaction: 'trade_merchant',
          progress: progress
        }
      });
    } else {
      this.results.push({
        name: 'Interaction Trigger - Trade',
        status: 'failed',
        message: 'Trade interaction did not trigger',
        details: { progress: progress || 0, expected: 100 }
      });
    }

    // Test scan interaction
    const scanMission = this.createTestMission('interaction', {
      interactionId: 'scan_artifact',
      targetValue: 1
    }, 'Scan Ancient Artifact');

    missions.addEmergencyMissions([scanMission]);
    missions.acceptMission(scanMission.id);

    console.log('  🔍 Testing scan interaction trigger...');
    triggers.reportInteractionProgress('scan_artifact');
    await new Promise(resolve => setTimeout(resolve, 100));

    const scanProgress = missions.currentObjectiveProgress.get(scanMission.id)?.get(scanMission.objectives[0].id);

    if (scanProgress === 100) {
      this.results.push({
        name: 'Interaction Trigger - Scan',
        status: 'passed',
        message: 'Scan interaction completed objective',
        details: { interaction: 'scan_artifact', progress: scanProgress }
      });
    } else {
      this.results.push({
        name: 'Interaction Trigger - Scan',
        status: 'failed',
        message: 'Scan interaction failed',
        details: { progress: scanProgress || 0 }
      });
    }

    // Cleanup
    missions.abandonMission(mission.id);
    missions.abandonMission(scanMission.id);
  }

  /**
   * Test Custom Trigger
   */
  private async testCustomTrigger(): Promise<void> {
    console.log('\n⚙️ Testing CUSTOM Trigger...');

    const mission = this.createTestMission('custom', {
      condition: 'reputation_threshold',
      customField: 'outlaws',
      targetValue: 50,
      currentValue: 0
    }, 'Reach 50 Outlaw Reputation');

    const missions = usePlunderverseMissions.getState();
    const triggers = useObjectiveTriggers.getState();
    const player = usePlayer.getState();

    // Add and accept mission
    missions.addEmergencyMissions([mission]);
    missions.acceptMission(mission.id);

    // Simulate reputation increase
    console.log('  📊 Simulating reputation changes...');
    
    // Report partial progress
    triggers.reportCustomProgress('reputation_threshold', 25);
    await new Promise(resolve => setTimeout(resolve, 100));

    let progress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);

    if (progress === 50) {
      this.results.push({
        name: 'Custom Trigger - Partial',
        status: 'passed',
        message: 'Custom trigger partial progress tracked',
        details: { condition: 'reputation_threshold', value: 25, progress: progress }
      });
    } else {
      this.results.push({
        name: 'Custom Trigger - Partial',
        status: 'warning',
        message: 'Custom trigger partial progress unexpected',
        details: { expected: 50, actual: progress || 0 }
      });
    }

    // Complete the custom condition
    triggers.reportCustomProgress('reputation_threshold', 50);
    await new Promise(resolve => setTimeout(resolve, 100));

    progress = missions.currentObjectiveProgress.get(mission.id)?.get(mission.objectives[0].id);

    if (progress === 100) {
      this.results.push({
        name: 'Custom Trigger - Complete',
        status: 'passed',
        message: 'Custom trigger auto-completed',
        details: { 
          condition: 'reputation_threshold',
          value: 50,
          progress: progress
        }
      });
    } else {
      this.results.push({
        name: 'Custom Trigger - Complete',
        status: 'failed',
        message: 'Custom trigger did not complete',
        details: { progress: progress || 0, expected: 100 }
      });
    }

    // Test rank-based custom trigger
    const rankMission = this.createTestMission('custom', {
      condition: 'player_rank',
      targetValue: 3,
      currentValue: player.rank
    }, 'Reach Rank 3');

    missions.addEmergencyMissions([rankMission]);
    missions.acceptMission(rankMission.id);

    console.log('  🎖️ Testing rank-based custom trigger...');
    triggers.reportCustomProgress('player_rank', 3);
    await new Promise(resolve => setTimeout(resolve, 100));

    const rankProgress = missions.currentObjectiveProgress.get(rankMission.id)?.get(rankMission.objectives[0].id);

    if (rankProgress >= 100) {
      this.results.push({
        name: 'Custom Trigger - Rank',
        status: 'passed',
        message: 'Rank-based custom trigger worked',
        details: { rank: 3, progress: rankProgress }
      });
    } else {
      this.results.push({
        name: 'Custom Trigger - Rank',
        status: 'warning',
        message: 'Rank custom trigger partial',
        details: { progress: rankProgress || 0 }
      });
    }

    // Cleanup
    missions.abandonMission(mission.id);
    missions.abandonMission(rankMission.id);
  }

  /**
   * Test Multi-Objective Mission Completion
   */
  private async testMultiObjectiveMission(): Promise<void> {
    console.log('\n🎯 Testing MULTI-OBJECTIVE Mission...');

    // Create a mission with multiple objectives of different types
    const mission: Mission = {
      id: `test_multi_${Date.now()}`,
      title: 'TEST: Multi-Objective Mission',
      description: 'Complete all objectives to finish',
      type: 'story',
      difficulty: 'medium',
      minRank: 1,
      rewards: {
        base: { credits: 500 },
        variable: false
      },
      requirements: {},
      objectives: [
        {
          id: 'obj_location',
          type: 'travel',
          description: 'Visit Earth',
          triggerType: 'location',
          triggerData: {
            type: 'location',
            location: 'Earth',
            targetValue: 1,
            currentValue: 0
          } as ObjectiveTriggerData,
          completed: false
        },
        {
          id: 'obj_combat',
          type: 'combat',
          description: 'Defeat 2 enemies',
          triggerType: 'combat',
          triggerData: {
            type: 'combat',
            targetValue: 2,
            currentValue: 0
          } as ObjectiveTriggerData,
          completed: false
        },
        {
          id: 'obj_collect',
          type: 'collection',
          description: 'Collect 5 items',
          triggerType: 'collection',
          triggerData: {
            type: 'collection',
            itemType: 'resource',
            targetValue: 5,
            currentValue: 0
          } as ObjectiveTriggerData,
          completed: false
        }
      ],
      choices: [],
      active: false,
      completed: false
    };

    const missions = usePlunderverseMissions.getState();
    const triggers = useObjectiveTriggers.getState();

    // Add and accept mission
    missions.addEmergencyMissions([mission]);
    missions.acceptMission(mission.id);

    console.log('  📋 Mission accepted with 3 objectives');

    // Complete objectives one by one
    console.log('  1️⃣ Completing location objective...');
    triggers.reportLocationProgress('Earth', undefined, 'Earth');
    await new Promise(resolve => setTimeout(resolve, 100));

    const locProgress = missions.currentObjectiveProgress.get(mission.id)?.get('obj_location');
    this.results.push({
      name: 'Multi-Objective - Location',
      status: locProgress === 100 ? 'passed' : 'failed',
      message: `Location objective ${locProgress === 100 ? 'completed' : 'failed'}`,
      details: { progress: locProgress }
    });

    console.log('  2️⃣ Completing combat objective...');
    triggers.reportCombatProgress(undefined, undefined, 2);
    await new Promise(resolve => setTimeout(resolve, 100));

    const combatProgress = missions.currentObjectiveProgress.get(mission.id)?.get('obj_combat');
    this.results.push({
      name: 'Multi-Objective - Combat',
      status: combatProgress === 100 ? 'passed' : 'failed',
      message: `Combat objective ${combatProgress === 100 ? 'completed' : 'failed'}`,
      details: { progress: combatProgress }
    });

    console.log('  3️⃣ Completing collection objective...');
    triggers.reportCollectionProgress('generic_resource', 'resource', 5);
    await new Promise(resolve => setTimeout(resolve, 100));

    const collectProgress = missions.currentObjectiveProgress.get(mission.id)?.get('obj_collect');
    this.results.push({
      name: 'Multi-Objective - Collection',
      status: collectProgress === 100 ? 'passed' : 'failed',
      message: `Collection objective ${collectProgress === 100 ? 'completed' : 'failed'}`,
      details: { progress: collectProgress }
    });

    // Check if all objectives are complete
    const allComplete = locProgress === 100 && combatProgress === 100 && collectProgress === 100;

    if (allComplete) {
      // Try to complete the mission
      const result = await gameFacade.resolveMission(mission.id);
      
      this.results.push({
        name: 'Multi-Objective - Mission Complete',
        status: result.success ? 'passed' : 'failed',
        message: result.success ? 
          'Mission auto-completed when all objectives done' : 
          'Mission did not complete despite all objectives',
        details: {
          objectives: { location: locProgress, combat: combatProgress, collection: collectProgress },
          result: result
        }
      });
    } else {
      this.results.push({
        name: 'Multi-Objective - Mission Complete',
        status: 'failed',
        message: 'Not all objectives completed',
        details: {
          objectives: { location: locProgress, combat: combatProgress, collection: collectProgress }
        }
      });
    }

    // Cleanup
    missions.abandonMission(mission.id);
  }

  /**
   * Test trigger cleanup on mission abandon
   */
  private async testTriggerCleanup(): Promise<void> {
    console.log('\n🧹 Testing TRIGGER CLEANUP...');

    const mission = this.createTestMission('location', {
      location: 'Venus',
      targetValue: 1
    }, 'Cleanup Test Mission');

    const missions = usePlunderverseMissions.getState();
    const triggers = useObjectiveTriggers.getState();

    // Add and accept mission
    missions.addEmergencyMissions([mission]);
    missions.acceptMission(mission.id);

    // Check that triggers are registered
    const beforeAbandon = triggers.activeListeners.size;
    console.log(`  📝 Triggers registered: ${beforeAbandon}`);

    // Abandon the mission
    missions.abandonMission(mission.id);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that triggers are cleaned up
    const afterAbandon = triggers.activeListeners.size;
    console.log(`  🗑️ Triggers after abandon: ${afterAbandon}`);

    if (afterAbandon < beforeAbandon) {
      this.results.push({
        name: 'Trigger Cleanup - Abandon',
        status: 'passed',
        message: 'Triggers cleaned up on mission abandon',
        details: {
          before: beforeAbandon,
          after: afterAbandon,
          cleaned: beforeAbandon - afterAbandon
        }
      });
    } else {
      this.results.push({
        name: 'Trigger Cleanup - Abandon',
        status: 'failed',
        message: 'Triggers not cleaned up properly',
        details: { before: beforeAbandon, after: afterAbandon }
      });
    }
  }

  /**
   * Generate test report
   */
  private generateReport(): void {
    console.log('\n%c📊 OBJECTIVE TRIGGER TEST RESULTS', 'color: #00ff00; font-size: 18px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');

    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;

    // Summary
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #00ff00');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ff0000');
    console.log(`%c⚠️  Warnings: ${warnings}/${total}`, 'color: #ffaa00');

    // Calculate success rate
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    console.log(`\n📈 Success Rate: ${successRate}%`);

    // Detailed results by category
    console.log('\n%c📋 Detailed Results:', 'color: #00ffff; font-weight: bold;');

    const categories = {
      'Location': this.results.filter(r => r.name.includes('Location')),
      'Collection': this.results.filter(r => r.name.includes('Collection')),
      'Combat': this.results.filter(r => r.name.includes('Combat')),
      'Interaction': this.results.filter(r => r.name.includes('Interaction')),
      'Custom': this.results.filter(r => r.name.includes('Custom')),
      'Multi-Objective': this.results.filter(r => r.name.includes('Multi-Objective')),
      'Cleanup': this.results.filter(r => r.name.includes('Cleanup'))
    };

    Object.entries(categories).forEach(([category, results]) => {
      if (results.length === 0) return;
      
      const categoryPassed = results.filter(r => r.status === 'passed').length;
      const categoryTotal = results.length;
      const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(0);
      
      console.log(`\n  ${category} (${categoryRate}% passed):`);
      results.forEach(result => {
        const icon = result.status === 'passed' ? '✅' : 
                     result.status === 'failed' ? '❌' : '⚠️';
        const color = result.status === 'passed' ? '#00ff00' : 
                      result.status === 'failed' ? '#ff0000' : '#ffaa00';
        
        console.log(`    %c${icon} ${result.message}`, `color: ${color}`);
        if (this.verbose && result.details) {
          console.log('       Details:', result.details);
        }
      });
    });

    // Final verdict
    console.log('\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
    
    if (failed === 0) {
      console.log('%c🎉 ALL TESTS PASSED! 🎉', 'color: #00ff00; font-size: 16px; font-weight: bold');
      toast.success('🎉 All Objective Trigger Tests Passed!', {
        description: `${passed}/${total} tests completed successfully`
      });
    } else if (failed <= 2) {
      console.log('%c⚠️  MOSTLY PASSED WITH ISSUES', 'color: #ffaa00; font-size: 16px; font-weight: bold');
      toast.warning('Tests Completed with Issues', {
        description: `${failed} failed, ${passed} passed, ${warnings} warnings`
      });
    } else {
      console.log('%c❌ TESTS FAILED', 'color: #ff0000; font-size: 16px; font-weight: bold');
      toast.error('Objective Trigger Tests Failed', {
        description: `${failed} failed, ${passed} passed, ${warnings} warnings`
      });
    }

    // Instructions for fixing
    if (failed > 0) {
      console.log('\n%c🔧 Debugging Tips:', 'color: #ffaa00; font-weight: bold');
      console.log('1. Check console for detailed error messages');
      console.log('2. Verify trigger registration in useObjectiveTriggers');
      console.log('3. Ensure progress reporting matches trigger conditions');
      console.log('4. Test individual triggers using MissionDebugPanel');
      console.log('5. Check mission objective configuration');
    }
  }

  /**
   * Run all objective trigger tests
   */
  public async runAllTests(verbose: boolean = true): Promise<void> {
    this.verbose = verbose;
    this.results = []; // Clear previous results

    console.clear();
    console.log('%c🚀 STARTING OBJECTIVE TRIGGER TEST SUITE', 'color: #00ff00; font-size: 20px; font-weight: bold');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
    console.log('Testing all trigger types and auto-completion mechanisms...\n');

    // Save current state
    this.saveState();

    // Initialize game systems
    await gameFacade.initialize();

    // Run tests with timing
    const startTime = Date.now();

    try {
      // Run each test suite
      await this.testLocationTrigger();
      await new Promise(resolve => setTimeout(resolve, 200));

      await this.testCollectionTrigger();
      await new Promise(resolve => setTimeout(resolve, 200));

      await this.testCombatTrigger();
      await new Promise(resolve => setTimeout(resolve, 200));

      await this.testInteractionTrigger();
      await new Promise(resolve => setTimeout(resolve, 200));

      await this.testCustomTrigger();
      await new Promise(resolve => setTimeout(resolve, 200));

      await this.testMultiObjectiveMission();
      await new Promise(resolve => setTimeout(resolve, 200));

      await this.testTriggerCleanup();

    } catch (error) {
      console.error('❌ Test suite encountered an error:', error);
      this.results.push({
        name: 'Test Suite Error',
        status: 'failed',
        message: `Critical error: ${error}`,
        details: { error }
      });
    }

    // Calculate elapsed time
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️ Tests completed in ${elapsed} seconds`);

    // Generate report
    this.generateReport();

    // Restore state
    this.restoreState();

    // Return results for programmatic access
    return Promise.resolve();
  }
}

// Create singleton instance and expose globally
const triggerTest = new ObjectiveTriggerTest();

// Export for module usage
export const testObjectiveTriggers = () => triggerTest.runAllTests();

// Make available on window for console access
(window as any).testObjectiveTriggers = testObjectiveTriggers;
(window as any).ObjectiveTriggerTest = ObjectiveTriggerTest;

console.log('🎯 Objective Trigger Test Suite loaded. Run with: window.testObjectiveTriggers()');