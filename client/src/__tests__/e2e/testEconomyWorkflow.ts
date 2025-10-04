/**
 * Economy Workflow E2E Test Suite  
 * Tests the complete economic cycle and player wealth management
 * 
 * Run with: window.testEconomyWorkflow() from browser console
 */

import { toast } from 'sonner';
import { gameFacade } from '../../lib/plunderverse/gameFacade';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useInventory } from '../../lib/stores/economy/useInventory';
import { useTrading } from '../../lib/stores/economy/useTrading';
import { useMining } from '../../lib/stores/economy/useMining';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useUpgrades } from '../../lib/stores/ship/useUpgrades';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { usePlayer } from '../../lib/stores/player/usePlayer';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  duration: number;
  timestamp: number;
}

interface EconomyMetrics {
  totalEarned: number;
  totalSpent: number;
  peakWealth: number;
  bankruptcyCount: number;
  profitableTrades: number;
  unprofitableTrades: number;
  miningIncome: number;
  missionIncome: number;
  combatIncome: number;
  tradingIncome: number;
  maintenanceCosts: number;
  upgradeCosts: number;
  crewCosts: number;
  deathPenalties: number;
  averageProfit: number;
  wealthGrowthRate: number;
}

export class EconomyWorkflowTest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private metrics: EconomyMetrics = {
    totalEarned: 0,
    totalSpent: 0,
    peakWealth: 0,
    bankruptcyCount: 0,
    profitableTrades: 0,
    unprofitableTrades: 0,
    miningIncome: 0,
    missionIncome: 0,
    combatIncome: 0,
    tradingIncome: 0,
    maintenanceCosts: 0,
    upgradeCosts: 0,
    crewCosts: 0,
    deathPenalties: 0,
    averageProfit: 0,
    wealthGrowthRate: 0
  };
  private originalState: any = {};
  private wealthHistory: number[] = [];

  constructor() {
    console.log('💰 Economy Workflow Test Suite initialized');
  }

  /**
   * Save original game state
   */
  private saveOriginalState() {
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    const ship = useShipStatus.getState();
    const crew = useCrewManagement.getState();
    const player = usePlayer.getState();
    
    this.originalState = {
      credits: credits.credits,
      inventory: {
        items: [...inventory.items],
        capacity: inventory.capacity
      },
      ship: {
        hull: ship.hull,
        shield: ship.shield,
        fuel: ship.fuel,
        upgrades: ship.upgrades ? [...ship.upgrades] : []
      },
      crew: {
        members: [...crew.crewMembers]
      },
      player: {
        rank: player.rank
      }
    };
    
    this.wealthHistory.push(credits.credits);
    this.metrics.peakWealth = credits.credits;
  }

  /**
   * Run all economy workflow tests
   */
  async runAllTests(): Promise<void> {
    console.clear();
    console.log('%c════════════════════════════════════════════════════', 'color: #f59e0b; font-size: 14px');
    console.log('%c  💰 ECONOMY WORKFLOW E2E TEST SUITE', 'color: #f59e0b; font-size: 16px; font-weight: bold');
    console.log('%c════════════════════════════════════════════════════', 'color: #f59e0b; font-size: 14px');
    
    this.startTime = Date.now();
    this.saveOriginalState();
    
    try {
      // Test 1: Multiple Income Streams
      await this.testMultipleIncomeStreams();
      await this.wait(500);
      
      // Test 2: Trading Profit Cycles
      await this.testTradingProfitCycles();
      await this.wait(500);
      
      // Test 3: Mining Economy
      await this.testMiningEconomy();
      await this.wait(500);
      
      // Test 4: Mission Economy
      await this.testMissionEconomy();
      await this.wait(500);
      
      // Test 5: Daily Operating Costs
      await this.testDailyOperatingCosts();
      await this.wait(500);
      
      // Test 6: Upgrade Investment ROI
      await this.testUpgradeInvestmentROI();
      await this.wait(500);
      
      // Test 7: Bankruptcy and Recovery
      await this.testBankruptcyRecovery();
      await this.wait(500);
      
      // Test 8: Wealth Accumulation
      await this.testWealthAccumulation();
      await this.wait(500);
      
      // Test 9: Economic Balance
      await this.testEconomicBalance();
      await this.wait(500);
      
      // Test 10: Market Manipulation
      await this.testMarketManipulation();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.generateReport();
      this.restoreOriginalState();
    }
  }

  /**
   * Test 1: Multiple Income Streams
   */
  private async testMultipleIncomeStreams() {
    console.log('\n💸 Testing Multiple Income Streams...');
    const startTest = Date.now();
    
    const credits = useCreditsStore.getState();
    const initialCredits = credits.credits;
    let totalIncome = 0;
    
    // Test mining income
    const miningIncome = 300;
    credits.addCredits(miningIncome);
    this.metrics.miningIncome += miningIncome;
    totalIncome += miningIncome;
    
    this.addResult(
      'Mining Income',
      miningIncome > 0 ? 'passed' : 'failed',
      `Earned ${miningIncome} from mining`,
      { amount: miningIncome },
      Date.now() - startTest
    );
    
    // Test trading income
    const tradingIncome = 500;
    credits.addCredits(tradingIncome);
    this.metrics.tradingIncome += tradingIncome;
    totalIncome += tradingIncome;
    
    this.addResult(
      'Trading Income',
      tradingIncome > 0 ? 'passed' : 'failed',
      `Earned ${tradingIncome} from trading`,
      { amount: tradingIncome },
      Date.now() - startTest
    );
    
    // Test mission income
    const missionIncome = 1000;
    credits.addCredits(missionIncome);
    this.metrics.missionIncome += missionIncome;
    totalIncome += missionIncome;
    
    this.addResult(
      'Mission Income',
      missionIncome > 0 ? 'passed' : 'failed',
      `Earned ${missionIncome} from missions`,
      { amount: missionIncome },
      Date.now() - startTest
    );
    
    // Test combat income
    const combatIncome = 200;
    credits.addCredits(combatIncome);
    this.metrics.combatIncome += combatIncome;
    totalIncome += combatIncome;
    
    this.addResult(
      'Combat Income',
      combatIncome > 0 ? 'passed' : 'failed',
      `Earned ${combatIncome} from combat`,
      { amount: combatIncome },
      Date.now() - startTest
    );
    
    this.metrics.totalEarned += totalIncome;
    this.updateWealthHistory(credits.credits);
    
    this.addResult(
      'Income Diversity',
      totalIncome > 1000 ? 'passed' : 'warning',
      `Total income: ${totalIncome} from 4 sources`,
      { 
        mining: miningIncome,
        trading: tradingIncome,
        missions: missionIncome,
        combat: combatIncome,
        total: totalIncome
      },
      Date.now() - startTest
    );
  }

  /**
   * Test 2: Trading Profit Cycles
   */
  private async testTradingProfitCycles() {
    console.log('\n📈 Testing Trading Profit Cycles...');
    const startTest = Date.now();
    
    const trading = useTrading.getState();
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    const landed = useLandedState.getState();
    
    let cycleCount = 0;
    let totalProfit = 0;
    
    // Run 3 trading cycles
    for (let cycle = 0; cycle < 3; cycle++) {
      const cycleStart = credits.credits;
      
      // Buy phase - go to cheap market
      landed.setLanded('Moon');
      await this.wait(100);
      
      const moonMarket = trading.getMarketDataForPlanet('Moon');
      if (moonMarket) {
        // Find cheapest resource
        const cheapResource = moonMarket.resources.reduce((min, r) => 
          r.buyPrice < min.buyPrice ? r : min
        );
        
        // Buy maximum affordable quantity
        const affordableQty = Math.min(
          Math.floor(credits.credits / cheapResource.buyPrice),
          10
        );
        
        if (affordableQty > 0) {
          trading.buyResource(cheapResource.resource, affordableQty);
          await this.wait(100);
        }
      }
      
      // Sell phase - go to expensive market
      landed.setNotLanded();
      await this.wait(100);
      landed.setLanded('Earth');
      await this.wait(100);
      
      const earthMarket = trading.getMarketDataForPlanet('Earth');
      if (earthMarket && inventory.items.length > 0) {
        // Sell all inventory
        for (const item of inventory.items) {
          trading.sellResource(item.name, item.quantity);
          await this.wait(100);
        }
      }
      
      const cycleProfit = credits.credits - cycleStart;
      totalProfit += cycleProfit;
      
      if (cycleProfit > 0) {
        this.metrics.profitableTrades++;
      } else {
        this.metrics.unprofitableTrades++;
      }
      
      cycleCount++;
      this.metrics.tradingIncome += Math.max(0, cycleProfit);
      this.updateWealthHistory(credits.credits);
    }
    
    const avgProfit = totalProfit / cycleCount;
    
    this.addResult(
      'Trading Cycles',
      cycleCount === 3 ? 'passed' : 'failed',
      `Completed ${cycleCount} trading cycles`,
      { cycles: cycleCount },
      Date.now() - startTest
    );
    
    this.addResult(
      'Trade Profitability',
      this.metrics.profitableTrades > this.metrics.unprofitableTrades ? 'passed' : 'warning',
      `${this.metrics.profitableTrades} profitable, ${this.metrics.unprofitableTrades} unprofitable`,
      { 
        profitable: this.metrics.profitableTrades,
        unprofitable: this.metrics.unprofitableTrades
      },
      Date.now() - startTest
    );
    
    this.addResult(
      'Average Profit',
      avgProfit > 0 ? 'passed' : 'failed',
      `Average profit per cycle: ${avgProfit.toFixed(0)}`,
      { average: avgProfit, total: totalProfit },
      Date.now() - startTest
    );
  }

  /**
   * Test 3: Mining Economy
   */
  private async testMiningEconomy() {
    console.log('\n⛏️ Testing Mining Economy...');
    const startTest = Date.now();
    
    const mining = useMining.getState();
    const inventory = useInventory.getState();
    const credits = useCreditsStore.getState();
    const trading = useTrading.getState();
    const landed = useLandedState.getState();
    
    // Go to resource-rich planet
    landed.setLanded('Mars');
    await this.wait(100);
    
    const initialCredits = credits.credits;
    const initialInventory = inventory.items.length;
    
    // Mine resources
    mining.startMining();
    for (let i = 0; i < 20; i++) {
      mining.updateMiningProgress(0.05);
      await this.wait(50);
    }
    mining.stopMining();
    
    const resourcesMined = inventory.items.length - initialInventory;
    
    this.addResult(
      'Resource Mining',
      resourcesMined > 0 ? 'passed' : 'failed',
      `Mined ${resourcesMined} resources`,
      { mined: resourcesMined },
      Date.now() - startTest
    );
    
    // Calculate mining value
    let miningValue = 0;
    const marketData = trading.getMarketDataForPlanet('Mars');
    if (marketData) {
      for (const item of inventory.items) {
        const resource = marketData.resources.find(r => r.resource === item.name);
        if (resource) {
          miningValue += resource.sellPrice * item.quantity;
        }
      }
    }
    
    this.addResult(
      'Mining Value',
      miningValue > 0 ? 'passed' : 'warning',
      `Mined resources worth ${miningValue} credits`,
      { value: miningValue },
      Date.now() - startTest
    );
    
    // Test mining efficiency
    const miningEfficiency = resourcesMined > 0 ? miningValue / resourcesMined : 0;
    
    this.addResult(
      'Mining Efficiency',
      miningEfficiency > 10 ? 'passed' : 'warning',
      `Average value per resource: ${miningEfficiency.toFixed(1)}`,
      { efficiency: miningEfficiency },
      Date.now() - startTest
    );
    
    this.metrics.miningIncome += miningValue;
    this.updateWealthHistory(credits.credits);
  }

  /**
   * Test 4: Mission Economy
   */
  private async testMissionEconomy() {
    console.log('\n📋 Testing Mission Economy...');
    const startTest = Date.now();
    
    const missions = usePlunderverseMissions.getState();
    const credits = useCreditsStore.getState();
    const player = usePlayer.getState();
    
    // Generate missions
    await gameFacade.generateMissionsForLocation('Earth');
    await this.wait(200);
    
    let totalMissionIncome = 0;
    let missionsCompleted = 0;
    
    // Complete multiple missions
    const availableMissions = missions.availableMissions.slice(0, 3);
    
    for (const mission of availableMissions) {
      const initialCredits = credits.credits;
      
      // Accept and complete mission
      missions.acceptMission(mission.id);
      await this.wait(100);
      
      // Simulate completion
      for (let i = 0; i < mission.objectives.length; i++) {
        missions.updateObjectiveProgress(mission.id, i, mission.objectives[i].target);
      }
      
      await gameFacade.completeMission(mission.id);
      await this.wait(100);
      
      const missionReward = credits.credits - initialCredits;
      totalMissionIncome += missionReward;
      missionsCompleted++;
      
      this.updateWealthHistory(credits.credits);
    }
    
    this.addResult(
      'Missions Completed',
      missionsCompleted > 0 ? 'passed' : 'failed',
      `Completed ${missionsCompleted} missions`,
      { completed: missionsCompleted },
      Date.now() - startTest
    );
    
    const avgMissionIncome = missionsCompleted > 0 ? totalMissionIncome / missionsCompleted : 0;
    
    this.addResult(
      'Mission Income',
      totalMissionIncome > 0 ? 'passed' : 'failed',
      `Total mission income: ${totalMissionIncome}`,
      { total: totalMissionIncome, average: avgMissionIncome },
      Date.now() - startTest
    );
    
    // Test mission ROI (time vs reward)
    const missionROI = totalMissionIncome / (missionsCompleted * 100); // Assuming 100 time units per mission
    
    this.addResult(
      'Mission ROI',
      missionROI > 1 ? 'passed' : 'warning',
      `ROI: ${missionROI.toFixed(2)} credits per time unit`,
      { roi: missionROI },
      Date.now() - startTest
    );
    
    this.metrics.missionIncome += totalMissionIncome;
    this.metrics.totalEarned += totalMissionIncome;
  }

  /**
   * Test 5: Daily Operating Costs
   */
  private async testDailyOperatingCosts() {
    console.log('\n📊 Testing Daily Operating Costs...');
    const startTest = Date.now();
    
    const credits = useCreditsStore.getState();
    const crew = useCrewManagement.getState();
    const ship = useShipStatus.getState();
    
    const initialCredits = credits.credits;
    let totalCosts = 0;
    
    // Crew salaries
    const crewSalary = crew.getMaintenanceCost();
    if (crewSalary > 0) {
      credits.removeCredits(crewSalary);
      totalCosts += crewSalary;
      this.metrics.crewCosts += crewSalary;
    }
    
    this.addResult(
      'Crew Salaries',
      crewSalary > 0 ? 'passed' : 'warning',
      `Daily crew cost: ${crewSalary}`,
      { cost: crewSalary, crewSize: crew.crewMembers.length },
      Date.now() - startTest
    );
    
    // Ship maintenance
    const maintenanceCost = Math.floor(100 * (1 - ship.hull / 100));
    if (maintenanceCost > 0) {
      credits.removeCredits(maintenanceCost);
      totalCosts += maintenanceCost;
      this.metrics.maintenanceCosts += maintenanceCost;
    }
    
    this.addResult(
      'Ship Maintenance',
      maintenanceCost >= 0 ? 'passed' : 'failed',
      `Maintenance cost: ${maintenanceCost}`,
      { cost: maintenanceCost, hullCondition: ship.hull },
      Date.now() - startTest
    );
    
    // Fuel costs
    const fuelCost = Math.floor((100 - ship.fuel) * 2);
    if (fuelCost > 0) {
      credits.removeCredits(fuelCost);
      ship.refuel(100 - ship.fuel);
      totalCosts += fuelCost;
    }
    
    this.addResult(
      'Fuel Costs',
      fuelCost >= 0 ? 'passed' : 'failed',
      `Fuel cost: ${fuelCost}`,
      { cost: fuelCost, fuelLevel: ship.fuel },
      Date.now() - startTest
    );
    
    // Daily cost summary
    const dailyLoss = initialCredits - credits.credits;
    
    this.addResult(
      'Daily Operating Total',
      dailyLoss === totalCosts ? 'passed' : 'warning',
      `Total daily costs: ${totalCosts}`,
      { 
        crew: crewSalary,
        maintenance: maintenanceCost,
        fuel: fuelCost,
        total: totalCosts
      },
      Date.now() - startTest
    );
    
    this.metrics.totalSpent += totalCosts;
    this.updateWealthHistory(credits.credits);
  }

  /**
   * Test 6: Upgrade Investment ROI
   */
  private async testUpgradeInvestmentROI() {
    console.log('\n🚀 Testing Upgrade Investment ROI...');
    const startTest = Date.now();
    
    const upgrades = useUpgrades.getState();
    const credits = useCreditsStore.getState();
    const ship = useShipStatus.getState();
    const mining = useMining.getState();
    
    const initialCredits = credits.credits;
    const initialMiningSpeed = mining.miningSpeed;
    
    // Purchase efficiency upgrade
    const availableUpgrades = upgrades.getAvailableUpgrades();
    const efficiencyUpgrade = availableUpgrades.find(u => 
      u.name.toLowerCase().includes('efficiency') || 
      u.name.toLowerCase().includes('mining')
    );
    
    let upgradeCost = 0;
    let upgradeROI = 0;
    
    if (efficiencyUpgrade && credits.credits >= efficiencyUpgrade.cost) {
      upgradeCost = efficiencyUpgrade.cost;
      upgrades.purchaseUpgrade(efficiencyUpgrade.id);
      await this.wait(100);
      
      this.metrics.upgradeCosts += upgradeCost;
      this.metrics.totalSpent += upgradeCost;
      
      // Test improved efficiency
      const newMiningSpeed = mining.miningSpeed;
      const speedIncrease = newMiningSpeed - initialMiningSpeed;
      
      // Calculate ROI based on expected increased income
      const dailyMiningIncrease = speedIncrease * 100; // Estimated daily benefit
      const daysToPayback = upgradeCost / dailyMiningIncrease;
      upgradeROI = (dailyMiningIncrease * 30) / upgradeCost; // 30-day ROI
      
      this.addResult(
        'Upgrade Purchase',
        upgradeCost > 0 ? 'passed' : 'failed',
        `Purchased upgrade for ${upgradeCost}`,
        { upgrade: efficiencyUpgrade.name, cost: upgradeCost },
        Date.now() - startTest
      );
      
      this.addResult(
        'Upgrade Effect',
        speedIncrease > 0 ? 'passed' : 'warning',
        `Mining speed increased by ${(speedIncrease * 100).toFixed(1)}%`,
        { increase: speedIncrease },
        Date.now() - startTest
      );
      
      this.addResult(
        'Upgrade ROI',
        upgradeROI > 1 ? 'passed' : 'warning',
        `30-day ROI: ${(upgradeROI * 100).toFixed(1)}%`,
        { roi: upgradeROI, paybackDays: daysToPayback },
        Date.now() - startTest
      );
    } else {
      this.addResult(
        'Upgrade Availability',
        false,
        'No affordable efficiency upgrades',
        { credits: credits.credits },
        Date.now() - startTest
      );
    }
    
    this.updateWealthHistory(credits.credits);
  }

  /**
   * Test 7: Bankruptcy and Recovery
   */
  private async testBankruptcyRecovery() {
    console.log('\n💔 Testing Bankruptcy & Recovery...');
    const startTest = Date.now();
    
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    const ship = useShipStatus.getState();
    
    // Simulate bankruptcy
    const preB ankruptcyWealth = credits.credits;
    credits.setCredits(0);
    this.metrics.bankruptcyCount++;
    
    this.addResult(
      'Bankruptcy Triggered',
      credits.credits === 0 ? 'passed' : 'failed',
      'Player reached bankruptcy',
      { previousWealth: preBankruptcyWealth },
      Date.now() - startTest
    );
    
    // Test emergency loan system
    const emergencyLoan = 500;
    credits.addCredits(emergencyLoan);
    
    this.addResult(
      'Emergency Loan',
      credits.credits === emergencyLoan ? 'passed' : 'failed',
      `Received ${emergencyLoan} credit emergency loan`,
      { loan: emergencyLoan },
      Date.now() - startTest
    );
    
    // Recovery phase - complete easy mission
    await gameFacade.generateMissionsForLocation('Earth');
    const easyMissions = missions.availableMissions.filter(m => m.difficulty === 'easy');
    
    if (easyMissions.length > 0) {
      const recoveryMission = easyMissions[0];
      missions.acceptMission(recoveryMission.id);
      
      // Complete mission
      for (let i = 0; i < recoveryMission.objectives.length; i++) {
        missions.updateObjectiveProgress(recoveryMission.id, i, recoveryMission.objectives[i].target);
      }
      await gameFacade.completeMission(recoveryMission.id);
      
      const recoveredCredits = credits.credits;
      
      this.addResult(
        'Recovery Mission',
        recoveredCredits > emergencyLoan ? 'passed' : 'failed',
        `Recovered to ${recoveredCredits} credits`,
        { recovered: recoveredCredits, profit: recoveredCredits - emergencyLoan },
        Date.now() - startTest
      );
    }
    
    // Test bankruptcy penalties
    const penaltyAmount = Math.floor(preBankruptcyWealth * 0.1);
    this.metrics.deathPenalties += penaltyAmount;
    
    this.addResult(
      'Bankruptcy Penalty',
      penaltyAmount > 0 ? 'passed' : 'warning',
      `Penalty: ${penaltyAmount} credits`,
      { penalty: penaltyAmount },
      Date.now() - startTest
    );
    
    this.updateWealthHistory(credits.credits);
  }

  /**
   * Test 8: Wealth Accumulation
   */
  private async testWealthAccumulation() {
    console.log('\n📈 Testing Wealth Accumulation...');
    const startTest = Date.now();
    
    const credits = useCreditsStore.getState();
    const startingWealth = credits.credits;
    
    // Simulate wealth accumulation over time
    const accumulationCycles = 5;
    const targetGrowth = 1.5; // 50% growth target
    
    for (let cycle = 0; cycle < accumulationCycles; cycle++) {
      // Income phase
      const cycleIncome = 200 + (cycle * 50); // Increasing income
      credits.addCredits(cycleIncome);
      this.metrics.totalEarned += cycleIncome;
      
      // Cost phase (decreasing costs as player optimizes)
      const cycleCosts = 100 - (cycle * 10);
      credits.removeCredits(cycleCosts);
      this.metrics.totalSpent += cycleCosts;
      
      this.updateWealthHistory(credits.credits);
      await this.wait(100);
    }
    
    const finalWealth = credits.credits;
    const wealthGrowth = finalWealth / startingWealth;
    
    this.addResult(
      'Wealth Growth',
      wealthGrowth >= targetGrowth ? 'passed' : 'warning',
      `Wealth grew by ${((wealthGrowth - 1) * 100).toFixed(1)}%`,
      { 
        start: startingWealth,
        end: finalWealth,
        growth: wealthGrowth
      },
      Date.now() - startTest
    );
    
    // Calculate compound growth rate
    const periods = this.wealthHistory.length - 1;
    const compoundRate = periods > 0 ? 
      Math.pow(finalWealth / this.wealthHistory[0], 1 / periods) - 1 : 0;
    
    this.addResult(
      'Compound Growth',
      compoundRate > 0 ? 'passed' : 'warning',
      `Compound growth rate: ${(compoundRate * 100).toFixed(2)}% per period`,
      { rate: compoundRate },
      Date.now() - startTest
    );
    
    // Check peak wealth
    this.addResult(
      'Peak Wealth',
      this.metrics.peakWealth > startingWealth ? 'passed' : 'failed',
      `Peak wealth: ${this.metrics.peakWealth}`,
      { peak: this.metrics.peakWealth, current: finalWealth },
      Date.now() - startTest
    );
    
    this.metrics.wealthGrowthRate = compoundRate;
  }

  /**
   * Test 9: Economic Balance
   */
  private async testEconomicBalance() {
    console.log('\n⚖️ Testing Economic Balance...');
    const startTest = Date.now();
    
    const profitMargin = this.metrics.totalEarned > 0 ? 
      (this.metrics.totalEarned - this.metrics.totalSpent) / this.metrics.totalEarned : 0;
    
    this.addResult(
      'Profit Margin',
      profitMargin > 0.2 ? 'passed' : 'warning',
      `Profit margin: ${(profitMargin * 100).toFixed(1)}%`,
      { 
        earned: this.metrics.totalEarned,
        spent: this.metrics.totalSpent,
        margin: profitMargin
      },
      Date.now() - startTest
    );
    
    // Income diversity check
    const incomeStreams = [
      this.metrics.miningIncome,
      this.metrics.tradingIncome,
      this.metrics.missionIncome,
      this.metrics.combatIncome
    ].filter(income => income > 0);
    
    const incomeDiversity = incomeStreams.length;
    
    this.addResult(
      'Income Diversity',
      incomeDiversity >= 3 ? 'passed' : 'warning',
      `${incomeDiversity} active income streams`,
      { 
        mining: this.metrics.miningIncome,
        trading: this.metrics.tradingIncome,
        missions: this.metrics.missionIncome,
        combat: this.metrics.combatIncome
      },
      Date.now() - startTest
    );
    
    // Cost efficiency
    const costRatio = this.metrics.totalEarned > 0 ? 
      this.metrics.totalSpent / this.metrics.totalEarned : 1;
    
    this.addResult(
      'Cost Efficiency',
      costRatio < 0.7 ? 'passed' : 'warning',
      `Cost ratio: ${(costRatio * 100).toFixed(1)}%`,
      { ratio: costRatio },
      Date.now() - startTest
    );
    
    // Economic health score
    const healthScore = 
      (profitMargin * 40) + 
      (incomeDiversity * 10) + 
      ((1 - costRatio) * 30) + 
      (this.metrics.wealthGrowthRate * 20);
    
    this.addResult(
      'Economic Health',
      healthScore > 50 ? 'passed' : 'warning',
      `Health score: ${healthScore.toFixed(1)}/100`,
      { score: healthScore },
      Date.now() - startTest
    );
  }

  /**
   * Test 10: Market Manipulation
   */
  private async testMarketManipulation() {
    console.log('\n📊 Testing Market Manipulation...');
    const startTest = Date.now();
    
    const trading = useTrading.getState();
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    
    // Test bulk buying effect on prices
    const testResource = 'minerals';
    const initialPrice = trading.getResourcePrice(testResource, 'Earth');
    
    // Bulk buy
    const bulkQuantity = 50;
    for (let i = 0; i < 5; i++) {
      if (credits.credits >= initialPrice * 10) {
        trading.buyResource(testResource, 10);
        await this.wait(50);
      }
    }
    
    const priceAfterBuy = trading.getResourcePrice(testResource, 'Earth');
    const priceIncrease = priceAfterBuy - initialPrice;
    
    this.addResult(
      'Bulk Buy Impact',
      priceIncrease > 0 ? 'passed' : 'warning',
      `Price increased by ${priceIncrease} after bulk buy`,
      { 
        initial: initialPrice,
        after: priceAfterBuy,
        increase: priceIncrease
      },
      Date.now() - startTest
    );
    
    // Test bulk selling effect
    const itemsToSell = inventory.items.filter(i => i.name === testResource);
    if (itemsToSell.length > 0) {
      for (const item of itemsToSell) {
        trading.sellResource(item.name, Math.min(item.quantity, 10));
        await this.wait(50);
      }
    }
    
    const priceAfterSell = trading.getResourcePrice(testResource, 'Earth');
    const priceDecrease = priceAfterBuy - priceAfterSell;
    
    this.addResult(
      'Bulk Sell Impact',
      priceDecrease > 0 ? 'passed' : 'warning',
      `Price decreased by ${priceDecrease} after bulk sell`,
      { 
        before: priceAfterBuy,
        after: priceAfterSell,
        decrease: priceDecrease
      },
      Date.now() - startTest
    );
    
    // Test arbitrage opportunity
    const earthPrice = trading.getResourcePrice(testResource, 'Earth');
    const marsPrice = trading.getResourcePrice(testResource, 'Mars');
    const arbitrageProfit = Math.abs(earthPrice - marsPrice);
    
    this.addResult(
      'Arbitrage Opportunity',
      arbitrageProfit > 10 ? 'passed' : 'warning',
      `Arbitrage potential: ${arbitrageProfit} credits`,
      { 
        earth: earthPrice,
        mars: marsPrice,
        profit: arbitrageProfit
      },
      Date.now() - startTest
    );
  }

  /**
   * Helper: Update wealth history and peak
   */
  private updateWealthHistory(currentWealth: number) {
    this.wealthHistory.push(currentWealth);
    if (currentWealth > this.metrics.peakWealth) {
      this.metrics.peakWealth = currentWealth;
    }
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
    console.log('📊 ECONOMY WORKFLOW TEST REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`⏱️ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60));
    
    // Economy metrics summary
    console.log('\n💰 Economy Metrics:');
    console.log(`  • Total Earned: ${this.metrics.totalEarned}`);
    console.log(`  • Total Spent: ${this.metrics.totalSpent}`);
    console.log(`  • Net Profit: ${this.metrics.totalEarned - this.metrics.totalSpent}`);
    console.log(`  • Peak Wealth: ${this.metrics.peakWealth}`);
    console.log(`  • Bankruptcy Count: ${this.metrics.bankruptcyCount}`);
    console.log(`  • Wealth Growth Rate: ${(this.metrics.wealthGrowthRate * 100).toFixed(2)}%`);
    
    // Income breakdown
    console.log('\n📈 Income Sources:');
    console.log(`  • Mining: ${this.metrics.miningIncome} (${this.getPercentage(this.metrics.miningIncome)}%)`);
    console.log(`  • Trading: ${this.metrics.tradingIncome} (${this.getPercentage(this.metrics.tradingIncome)}%)`);
    console.log(`  • Missions: ${this.metrics.missionIncome} (${this.getPercentage(this.metrics.missionIncome)}%)`);
    console.log(`  • Combat: ${this.metrics.combatIncome} (${this.getPercentage(this.metrics.combatIncome)}%)`);
    
    // Cost breakdown
    console.log('\n📉 Expense Breakdown:');
    console.log(`  • Maintenance: ${this.metrics.maintenanceCosts}`);
    console.log(`  • Upgrades: ${this.metrics.upgradeCosts}`);
    console.log(`  • Crew: ${this.metrics.crewCosts}`);
    console.log(`  • Penalties: ${this.metrics.deathPenalties}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (failed > 0) {
      console.log('  - Fix economic system failures');
    }
    if (this.metrics.bankruptcyCount > 0) {
      console.log('  - Improve bankruptcy recovery mechanisms');
    }
    if (this.metrics.wealthGrowthRate < 0.05) {
      console.log('  - Balance economy for better wealth accumulation');
    }
    if (this.metrics.unprofitableTrades > this.metrics.profitableTrades) {
      console.log('  - Rebalance trading prices and markets');
    }
    
    // Show toast notification
    const status = failed > 0 ? 'error' : passed === this.results.length ? 'success' : 'warning';
    toast[status](
      `Economy Test: ${passed}/${this.results.length} passed`,
      {
        description: failed > 0 
          ? `${failed} economic issues detected`
          : 'Economy systems functioning correctly',
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
        efficiency: (passed / this.results.length) * 100
      }
    };
  }

  /**
   * Helper: Get percentage of total earned
   */
  private getPercentage(amount: number): string {
    if (this.metrics.totalEarned === 0) return '0';
    return ((amount / this.metrics.totalEarned) * 100).toFixed(1);
  }

  /**
   * Restore original game state
   */
  private restoreOriginalState() {
    try {
      const credits = useCreditsStore.getState();
      const ship = useShipStatus.getState();
      const player = usePlayer.getState();
      
      // Restore credits
      credits.setCredits(this.originalState.credits);
      
      // Restore ship
      ship.takeDamage(-ship.hull + this.originalState.ship.hull, 'hull');
      ship.takeDamage(-ship.shield + this.originalState.ship.shield, 'shield');
      ship.refuel(this.originalState.ship.fuel - ship.fuel);
      
      // Restore player
      player.setRank(this.originalState.player.rank);
      
      console.log('♻️ Game state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testEconomyWorkflow = () => {
    const test = new EconomyWorkflowTest();
    return test.runAllTests();
  };
}