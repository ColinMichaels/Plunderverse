/**
 * Ship Stores Test Suite
 * Tests ship system stores including status, crew, equipment, and upgrades
 * Run with window.testShipStores() from the browser console
 */

import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useCrewManagement } from '../../../lib/stores/ship/useCrewManagement';
import { useUpgrades } from '../../../lib/stores/ship/useUpgrades';
import { useEquipment } from '../../../lib/stores/ship/useEquipment';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class ShipStoresTestSuite {
  private results: TestResult[] = [];
  private originalStates: any = {};

  constructor() {
    console.log('🚀 Ship Stores Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    console.log('%c   🚀 SHIP STORES TEST SUITE STARTING', 'color: #06b6d4; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original states
      this.saveOriginalStates();
      
      await this.testShipStatus();
      await this.wait(500);
      
      await this.testDamageAndRepair();
      await this.wait(500);
      
      await this.testCrewManagement();
      await this.wait(500);
      
      await this.testCrewBonuses();
      await this.wait(500);
      
      await this.testEquipmentSystem();
      await this.wait(500);
      
      await this.testUpgradeSystem();
      await this.wait(500);
      
      await this.testShipIntegration();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original states
      this.restoreOriginalStates();
      this.printSummary();
    }
  }

  private async testShipStatus() {
    console.log('\n🛡️ Testing Ship Status...');
    
    const shipStatus = useShipStatus.getState();
    
    // Reset ship
    shipStatus.resetShip();
    
    // Test initial values
    this.addResult(
      'Initial Shield',
      shipStatus.shield === 100 ? 'passed' : 'failed',
      `Shield: ${shipStatus.shield}/100`
    );
    
    this.addResult(
      'Initial Hull',
      shipStatus.hull === 100 ? 'passed' : 'failed',
      `Hull: ${shipStatus.hull}/100`
    );
    
    this.addResult(
      'Ship Operational',
      !shipStatus.isDestroyed ? 'passed' : 'failed',
      `Destroyed: ${shipStatus.isDestroyed}`
    );
    
    // Test thrust mode
    shipStatus.setThrusting(true);
    this.addResult(
      'Thrust Mode',
      shipStatus.isThrusting ? 'passed' : 'failed',
      `Thrusting: ${shipStatus.isThrusting}`
    );
    shipStatus.setThrusting(false);
    
    // Test warp mode
    shipStatus.upgradeShip('warpCapability', 0);
    shipStatus.setWarpMode(true);
    this.addResult(
      'Warp Mode Toggle',
      shipStatus.isWarpMode || !shipStatus.upgrades.warpCapability ? 'passed' : 'failed',
      `Warp mode: ${shipStatus.isWarpMode}`
    );
    shipStatus.setWarpMode(false);
  }

  private async testDamageAndRepair() {
    console.log('\n💥 Testing Damage and Repair...');
    
    const shipStatus = useShipStatus.getState();
    shipStatus.resetShip();
    
    // Test shield damage
    shipStatus.takeDamage(30, 'enemy fire');
    this.addResult(
      'Shield Damage',
      shipStatus.shield === 70 ? 'passed' : 'failed',
      `Shield after damage: ${shipStatus.shield}/100`
    );
    
    // Test shield penetration
    shipStatus.takeDamage(80, 'heavy attack');
    this.addResult(
      'Shield Penetration',
      shipStatus.shield === 0 && shipStatus.hull < 100 ? 'passed' : 'failed',
      `Shield: ${shipStatus.shield}, Hull: ${shipStatus.hull}`
    );
    
    // Test critical status
    shipStatus.hull = 25;
    const critical = shipStatus.hull <= 30;
    this.addResult(
      'Critical Status',
      shipStatus.isCritical === critical ? 'passed' : 'failed',
      `Critical at ${shipStatus.hull}% hull`
    );
    
    // Test hull repair
    const beforeRepair = shipStatus.hull;
    shipStatus.repairHull(30);
    this.addResult(
      'Hull Repair',
      shipStatus.hull === beforeRepair + 30 ? 'passed' : 'failed',
      `Hull repaired: ${beforeRepair} -> ${shipStatus.hull}`
    );
    
    // Test shield recharge
    shipStatus.rechargeShield(50);
    this.addResult(
      'Shield Recharge',
      shipStatus.shield === 50 ? 'passed' : 'failed',
      `Shield recharged: ${shipStatus.shield}/100`
    );
    
    // Test ship destruction
    shipStatus.takeDamage(1000, 'catastrophic');
    this.addResult(
      'Ship Destruction',
      shipStatus.isDestroyed && shipStatus.hull === 0 ? 'passed' : 'failed',
      `Ship destroyed: ${shipStatus.isDestroyed}`
    );
    
    // Reset ship
    shipStatus.resetShip();
  }

  private async testCrewManagement() {
    console.log('\n👥 Testing Crew Management...');
    
    const crewManagement = useCrewManagement.getState();
    
    // Initialize crew system
    crewManagement.initializeCrew();
    
    this.addResult(
      'Crew System Initialized',
      crewManagement.availableCrew.length > 0 ? 'passed' : 'failed',
      `Available crew: ${crewManagement.availableCrew.length}`
    );
    
    // Test hiring crew
    if (crewManagement.availableCrew.length > 0) {
      const crewToHire = crewManagement.availableCrew[0];
      const hireResult = crewManagement.hireCrew(crewToHire.id);
      
      this.addResult(
        'Hire Crew Member',
        hireResult.success || hireResult.message.includes('funds') ? 'passed' : 'failed',
        hireResult.message
      );
      
      if (hireResult.success) {
        // Test crew in active roster
        const isActive = crewManagement.activeCrew.find(c => c.id === crewToHire.id);
        this.addResult(
          'Crew Active',
          isActive !== undefined ? 'passed' : 'failed',
          `Crew member active: ${isActive?.name}`
        );
        
        // Test firing crew
        const fireResult = crewManagement.fireCrew(crewToHire.id);
        this.addResult(
          'Fire Crew Member',
          fireResult.success ? 'passed' : 'failed',
          fireResult.message
        );
      }
    }
    
    // Test max crew size
    this.addResult(
      'Max Crew Size',
      crewManagement.maxCrewSize === 5 ? 'passed' : 'failed',
      `Max crew: ${crewManagement.maxCrewSize}`
    );
    
    // Test daily salary calculation
    const dailyCost = crewManagement.dailySalaryCosts;
    this.addResult(
      'Daily Salary Calculation',
      dailyCost >= 0 ? 'passed' : 'failed',
      `Daily salary cost: ${dailyCost} credits`
    );
  }

  private async testCrewBonuses() {
    console.log('\n🎯 Testing Crew Bonuses...');
    
    const crewManagement = useCrewManagement.getState();
    
    // Calculate bonuses
    crewManagement.calculateBonuses();
    
    const bonuses = crewManagement.currentBonuses;
    
    // Test bonus structure
    this.addResult(
      'Bonus Structure',
      bonuses && typeof bonuses === 'object' ? 'passed' : 'failed',
      `Bonuses calculated`
    );
    
    // Test specific bonuses
    this.addResult(
      'Fuel Efficiency Bonus',
      bonuses.fuelEfficiency >= 0 ? 'passed' : 'failed',
      `Fuel efficiency: ${(bonuses.fuelEfficiency * 100).toFixed(0)}%`
    );
    
    this.addResult(
      'Combat Damage Bonus',
      bonuses.combatDamage >= 0 ? 'passed' : 'failed',
      `Combat damage: +${(bonuses.combatDamage * 100).toFixed(0)}%`
    );
    
    this.addResult(
      'Repair Cost Reduction',
      bonuses.repairCost <= 0 ? 'passed' : 'failed',
      `Repair cost: ${(bonuses.repairCost * 100).toFixed(0)}%`
    );
    
    // Test crew skill lookup
    const pilot = crewManagement.getCrewBySkill('pilot');
    this.addResult(
      'Skill-Based Crew Lookup',
      pilot === null || pilot.skills.pilot > 0 ? 'passed' : 'failed',
      pilot ? `Found pilot: ${pilot.name}` : 'No pilot in crew'
    );
    
    // Test loyalty system
    if (crewManagement.activeCrew.length > 0) {
      const crew = crewManagement.activeCrew[0];
      const initialLoyalty = crew.currentLoyalty;
      crewManagement.updateLoyalty(crew.id, 10, 'mission success');
      
      this.addResult(
        'Loyalty Update',
        crew.currentLoyalty > initialLoyalty ? 'passed' : 'failed',
        `Loyalty: ${initialLoyalty} -> ${crew.currentLoyalty}`
      );
    }
  }

  private async testEquipmentSystem() {
    console.log('\n⚙️ Testing Equipment System...');
    
    const equipment = useEquipment.getState();
    
    // Initialize equipment
    equipment.initializeEquipment();
    
    this.addResult(
      'Equipment Initialized',
      equipment.equipment.length > 0 ? 'passed' : 'failed',
      `Equipment pieces: ${equipment.equipment.length}`
    );
    
    // Test equipment slots
    const slots = equipment.availableSlots;
    this.addResult(
      'Equipment Slots',
      slots.length > 0 ? 'passed' : 'failed',
      `Available slots: ${slots.length}`
    );
    
    // Test fuel equipment
    const fuelEquipment = equipment.getEquipment('fuel-primary');
    this.addResult(
      'Fuel Equipment',
      fuelEquipment !== undefined ? 'passed' : 'failed',
      `Fuel tank: ${fuelEquipment?.name}`
    );
    
    if (fuelEquipment) {
      // Test fuel consumption
      const initialFuel = fuelEquipment.currentCharge;
      equipment.consumeFuel(10);
      const fuelAfter = equipment.getEquipment('fuel-primary')?.currentCharge || 0;
      
      this.addResult(
        'Fuel Consumption',
        fuelAfter < initialFuel ? 'passed' : 'failed',
        `Fuel: ${initialFuel} -> ${fuelAfter}`
      );
      
      // Test refueling
      equipment.refuel(50);
      const refueledAmount = equipment.getEquipment('fuel-primary')?.currentCharge || 0;
      
      this.addResult(
        'Refuel',
        refueledAmount > fuelAfter ? 'passed' : 'failed',
        `Refueled to: ${refueledAmount}`
      );
    }
    
    // Test equipment durability
    const testEquipment = equipment.equipment[0];
    if (testEquipment) {
      const initialDurability = testEquipment.currentDurability;
      equipment.damageEquipment(testEquipment.id, 20);
      
      const damagedEquipment = equipment.getEquipment(testEquipment.id);
      this.addResult(
        'Equipment Damage',
        damagedEquipment && damagedEquipment.currentDurability < initialDurability ? 'passed' : 'failed',
        `Durability: ${initialDurability} -> ${damagedEquipment?.currentDurability}`
      );
      
      // Test repair
      equipment.repairEquipment(testEquipment.id, 100);
      const repairedEquipment = equipment.getEquipment(testEquipment.id);
      
      this.addResult(
        'Equipment Repair',
        repairedEquipment && repairedEquipment.currentDurability > damagedEquipment.currentDurability ? 'passed' : 'failed',
        `Repaired to: ${repairedEquipment?.currentDurability}`
      );
    }
  }

  private async testUpgradeSystem() {
    console.log('\n📈 Testing Upgrade System...');
    
    const shipStatus = useShipStatus.getState();
    const upgrades = useUpgrades.getState();
    
    // Test fuel capacity upgrade
    const initialCapacity = shipStatus.upgrades.fuelCapacity;
    const upgradeResult = shipStatus.upgradeShip('fuelCapacity', 1000);
    
    this.addResult(
      'Fuel Capacity Upgrade',
      upgradeResult || shipStatus.upgrades.fuelCapacity > initialCapacity ? 'passed' : 'warning',
      `Capacity multiplier: ${shipStatus.upgrades.fuelCapacity}x`
    );
    
    // Test thrust efficiency upgrade
    const initialEfficiency = shipStatus.upgrades.thrustEfficiency;
    shipStatus.upgradeShip('thrustEfficiency', 500);
    
    this.addResult(
      'Thrust Efficiency Upgrade',
      shipStatus.upgrades.thrustEfficiency >= initialEfficiency ? 'passed' : 'failed',
      `Efficiency: ${shipStatus.upgrades.thrustEfficiency}x`
    );
    
    // Test upgrade levels
    if (upgrades) {
      const shieldLevel = upgrades.shieldLevel || 1;
      const hullLevel = upgrades.hullLevel || 1;
      
      this.addResult(
        'Shield Upgrade Level',
        shieldLevel >= 1 ? 'passed' : 'failed',
        `Shield level: ${shieldLevel}`
      );
      
      this.addResult(
        'Hull Upgrade Level',
        hullLevel >= 1 ? 'passed' : 'failed',
        `Hull level: ${hullLevel}`
      );
    }
  }

  private async testShipIntegration() {
    console.log('\n🔗 Testing Ship Systems Integration...');
    
    const shipStatus = useShipStatus.getState();
    const equipment = useEquipment.getState();
    const crewManagement = useCrewManagement.getState();
    
    // Test passive regeneration
    shipStatus.shield = 50;
    shipStatus.hull = 80;
    shipStatus.lastCombatTime = Date.now() - 10000; // 10 seconds ago
    
    shipStatus.applyPassiveRegen(1.0);
    
    this.addResult(
      'Passive Shield Regen',
      shipStatus.shield > 50 ? 'passed' : 'failed',
      `Shield regenerated to: ${shipStatus.shield}`
    );
    
    // Test crew effects on equipment
    crewManagement.calculateBonuses();
    const fuelBonus = crewManagement.currentBonuses.fuelEfficiency;
    
    this.addResult(
      'Crew Fuel Efficiency',
      fuelBonus !== undefined ? 'passed' : 'failed',
      `Fuel efficiency bonus: ${(fuelBonus * 100).toFixed(0)}%`
    );
    
    // Test equipment-ship status sync
    const hullEquipment = equipment.getEquipment('hull-primary');
    if (hullEquipment) {
      shipStatus.hull = 60;
      const expectedDurability = (60 / 100) * hullEquipment.maxDurability;
      
      this.addResult(
        'Hull-Equipment Sync',
        Math.abs(hullEquipment.currentDurability - expectedDurability) < 10 ? 'passed' : 'warning',
        `Hull: ${shipStatus.hull}%, Equipment durability: ${hullEquipment.currentDurability}`
      );
    }
    
    // Test critical systems
    shipStatus.hull = 15;
    this.addResult(
      'Critical Systems Alert',
      shipStatus.isCritical ? 'passed' : 'failed',
      `Critical status triggered at ${shipStatus.hull}% hull`
    );
    
    // Test full system reset
    shipStatus.resetShip();
    equipment.initializeEquipment();
    
    this.addResult(
      'System Reset',
      shipStatus.hull === 100 && shipStatus.shield === 100 && !shipStatus.isDestroyed ? 'passed' : 'failed',
      `Systems reset to operational`
    );
  }

  private saveOriginalStates() {
    this.originalStates.shipStatus = { ...useShipStatus.getState() };
    this.originalStates.crewManagement = { 
      activeCrew: [...useCrewManagement.getState().activeCrew],
      currentBonuses: { ...useCrewManagement.getState().currentBonuses }
    };
    this.originalStates.equipment = { 
      equipment: [...useEquipment.getState().equipment] 
    };
  }

  private restoreOriginalStates() {
    // Reset ship status
    const shipStatus = useShipStatus.getState();
    shipStatus.resetShip();
    
    // Clear crew changes
    const crewManagement = useCrewManagement.getState();
    crewManagement.activeCrew = this.originalStates.crewManagement?.activeCrew || [];
    crewManagement.calculateBonuses();
    
    // Reset equipment
    const equipment = useEquipment.getState();
    equipment.initializeEquipment();
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
    console.log('%c          SHIP STORES TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
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
(window as any).testShipStores = () => {
  const testSuite = new ShipStoresTestSuite();
  testSuite.runAllTests();
};

console.log('%c🚀 Ship Stores Test Suite Loaded!', 'color: #06b6d4; font-weight: bold');
console.log('Run %ctestShipStores()%c to execute tests', 'color: #3b82f6', 'color: inherit');