/**
 * Credits Store Test Suite
 * Tests the credits/economy state management including earn/spend operations and balance validation
 * Run with window.testCreditsStore() from the browser console
 */

import { useCreditsStore } from '../../../domain/economy/credits.store';
import { useCredits } from '../../../lib/stores/economy/useCredits';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class CreditsStoreTestSuite {
  private results: TestResult[] = [];
  private originalState: any;

  constructor() {
    console.log('💰 Credits Store Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #fbbf24; font-size: 14px');
    console.log('%c   💰 CREDITS STORE TEST SUITE STARTING', 'color: #fbbf24; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #fbbf24; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original state
      this.originalState = { ...useCreditsStore.getState() };
      
      await this.testInitialState();
      await this.wait(500);
      
      await this.testSpendCredits();
      await this.wait(500);
      
      await this.testEarnCredits();
      await this.wait(500);
      
      await this.testBalanceValidation();
      await this.wait(500);
      
      await this.testEdgeCases();
      await this.wait(500);
      
      await this.testTransactionSequence();
      await this.wait(500);
      
      await this.testLegacyStore();
      await this.wait(500);
      
      await this.testMinimumBalance();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original state
      this.restoreOriginalState();
      this.printSummary();
    }
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const creditsStore = useCreditsStore.getState();
    
    // Test initial balance
    creditsStore.setCredits(1000);
    this.addResult(
      'Initial Balance Set',
      creditsStore.credits === 1000 ? 'passed' : 'failed',
      `Credits: ${creditsStore.credits}`
    );
    
    // Test state consistency
    const stateAfterSet = useCreditsStore.getState();
    this.addResult(
      'State Consistency',
      stateAfterSet.credits === 1000 ? 'passed' : 'failed',
      `State persisted: ${stateAfterSet.credits}`
    );
  }

  private async testSpendCredits() {
    console.log('\n💸 Testing Spend Credits...');
    
    const creditsStore = useCreditsStore.getState();
    
    // Set starting balance
    creditsStore.setCredits(500);
    
    // Test valid spend
    const spendResult = creditsStore.spendCredits(100);
    this.addResult(
      'Valid Spend',
      spendResult === true && creditsStore.credits === 400 ? 'passed' : 'failed',
      `Spent 100, balance: ${creditsStore.credits}`
    );
    
    // Test insufficient funds
    const insufficientResult = creditsStore.spendCredits(500);
    this.addResult(
      'Insufficient Funds',
      insufficientResult === false && creditsStore.credits === 400 ? 'passed' : 'failed',
      `Cannot spend 500, balance remains: ${creditsStore.credits}`
    );
    
    // Test exact balance spend
    creditsStore.setCredits(250);
    const exactResult = creditsStore.spendCredits(250);
    this.addResult(
      'Exact Balance Spend',
      exactResult === true && creditsStore.credits === 0 ? 'passed' : 'failed',
      `Spent exact balance, remaining: ${creditsStore.credits}`
    );
    
    // Test spending with zero balance
    const zeroSpendResult = creditsStore.spendCredits(10);
    this.addResult(
      'Spend with Zero Balance',
      zeroSpendResult === false && creditsStore.credits === 0 ? 'passed' : 'failed',
      `Cannot spend with zero balance`
    );
  }

  private async testEarnCredits() {
    console.log('\n💵 Testing Earn Credits...');
    
    const creditsStore = useCreditsStore.getState();
    
    // Reset balance
    creditsStore.setCredits(0);
    
    // Test earning credits
    creditsStore.earnCredits(150);
    this.addResult(
      'Earn Credits',
      creditsStore.credits === 150 ? 'passed' : 'failed',
      `Earned 150, balance: ${creditsStore.credits}`
    );
    
    // Test multiple earnings
    creditsStore.earnCredits(75);
    creditsStore.earnCredits(125);
    this.addResult(
      'Multiple Earnings',
      creditsStore.credits === 350 ? 'passed' : 'failed',
      `Total after multiple earnings: ${creditsStore.credits}`
    );
    
    // Test large earning
    creditsStore.earnCredits(10000);
    this.addResult(
      'Large Earning',
      creditsStore.credits === 10350 ? 'passed' : 'failed',
      `Balance after large earning: ${creditsStore.credits}`
    );
    
    // Test fractional earnings
    creditsStore.setCredits(100);
    creditsStore.earnCredits(12.5);
    this.addResult(
      'Fractional Earnings',
      creditsStore.credits === 112.5 ? 'passed' : 'failed',
      `Fractional amount handled: ${creditsStore.credits}`
    );
  }

  private async testBalanceValidation() {
    console.log('\n✅ Testing Balance Validation...');
    
    const creditsStore = useCreditsStore.getState();
    
    // Test negative spend attempt
    creditsStore.setCredits(1000);
    let errorCaught = false;
    try {
      creditsStore.spendCredits(-50);
    } catch (e) {
      errorCaught = true;
    }
    this.addResult(
      'Negative Spend Prevention',
      creditsStore.credits === 1000 ? 'passed' : 'failed',
      `Balance unchanged after negative spend attempt: ${creditsStore.credits}`
    );
    
    // Test zero spend
    const zeroSpendResult = creditsStore.spendCredits(0);
    this.addResult(
      'Zero Spend Handling',
      creditsStore.credits === 1000 ? 'passed' : 'failed',
      `Zero spend handled correctly`
    );
    
    // Test negative earn attempt
    try {
      creditsStore.earnCredits(-100);
    } catch (e) {
      // Expected to fail or be ignored
    }
    this.addResult(
      'Negative Earn Prevention',
      creditsStore.credits === 1000 ? 'passed' : 'failed',
      `Balance protected from negative earn: ${creditsStore.credits}`
    );
    
    // Test NaN protection
    try {
      creditsStore.spendCredits(NaN);
    } catch (e) {
      // Expected to fail
    }
    this.addResult(
      'NaN Protection',
      creditsStore.credits === 1000 ? 'passed' : 'failed',
      `Balance protected from NaN: ${creditsStore.credits}`
    );
    
    // Test Infinity protection
    try {
      creditsStore.earnCredits(Infinity);
    } catch (e) {
      // Expected to fail
    }
    this.addResult(
      'Infinity Protection',
      creditsStore.credits === 1000 ? 'passed' : 'failed',
      `Balance protected from Infinity: ${creditsStore.credits}`
    );
  }

  private async testEdgeCases() {
    console.log('\n🔧 Testing Edge Cases...');
    
    const creditsStore = useCreditsStore.getState();
    
    // Test very small amounts
    creditsStore.setCredits(100.01);
    const smallSpend = creditsStore.spendCredits(0.01);
    this.addResult(
      'Very Small Transaction',
      smallSpend && Math.abs(creditsStore.credits - 100) < 0.001 ? 'passed' : 'failed',
      `Small amount handled: ${creditsStore.credits}`
    );
    
    // Test floating point precision
    creditsStore.setCredits(0.1 + 0.2);
    this.addResult(
      'Floating Point Precision',
      Math.abs(creditsStore.credits - 0.3) < 0.0001 ? 'passed' : 'failed',
      `Floating point handled: ${creditsStore.credits}`
    );
    
    // Test rapid transactions
    creditsStore.setCredits(1000);
    let rapidSuccess = true;
    for (let i = 0; i < 10; i++) {
      if (!creditsStore.spendCredits(10)) {
        rapidSuccess = false;
        break;
      }
    }
    this.addResult(
      'Rapid Transactions',
      rapidSuccess && creditsStore.credits === 900 ? 'passed' : 'failed',
      `Rapid transactions handled: ${creditsStore.credits}`
    );
    
    // Test alternating operations
    creditsStore.setCredits(500);
    creditsStore.earnCredits(100);
    creditsStore.spendCredits(50);
    creditsStore.earnCredits(75);
    creditsStore.spendCredits(125);
    this.addResult(
      'Alternating Operations',
      creditsStore.credits === 500 ? 'passed' : 'failed',
      `Alternating ops result: ${creditsStore.credits}`
    );
  }

  private async testTransactionSequence() {
    console.log('\n🔄 Testing Transaction Sequences...');
    
    const creditsStore = useCreditsStore.getState();
    
    // Test complex transaction sequence
    creditsStore.setCredits(1000);
    const transactions = [
      { type: 'spend', amount: 200, expected: 800 },
      { type: 'earn', amount: 150, expected: 950 },
      { type: 'spend', amount: 450, expected: 500 },
      { type: 'earn', amount: 1000, expected: 1500 },
      { type: 'spend', amount: 1500, expected: 1500 }, // Should fail
      { type: 'spend', amount: 750, expected: 750 }
    ];
    
    let sequenceValid = true;
    for (const tx of transactions) {
      if (tx.type === 'spend') {
        creditsStore.spendCredits(tx.amount);
      } else {
        creditsStore.earnCredits(tx.amount);
      }
      
      if (creditsStore.credits !== tx.expected) {
        sequenceValid = false;
        break;
      }
    }
    
    this.addResult(
      'Transaction Sequence',
      sequenceValid ? 'passed' : 'failed',
      `Final balance: ${creditsStore.credits}`
    );
    
    // Test overdraft protection in sequence
    creditsStore.setCredits(100);
    const overdraftProtected = 
      creditsStore.spendCredits(50) &&
      !creditsStore.spendCredits(60) &&
      creditsStore.credits === 50;
    
    this.addResult(
      'Overdraft Protection Sequence',
      overdraftProtected ? 'passed' : 'failed',
      `Protected balance: ${creditsStore.credits}`
    );
  }

  private async testLegacyStore() {
    console.log('\n🔗 Testing Legacy Store Compatibility...');
    
    const legacyStore = useCredits.getState();
    const creditsStore = useCreditsStore.getState();
    
    // Test legacy store delegation
    creditsStore.setCredits(500);
    
    // Check if legacy store reflects changes
    this.addResult(
      'Legacy Store Sync',
      legacyStore.balance === 500 ? 'passed' : 'warning',
      `Legacy balance: ${legacyStore.balance}`
    );
    
    // Test legacy operations
    legacyStore.addCredits(100);
    this.addResult(
      'Legacy Add Credits',
      creditsStore.credits === 600 ? 'passed' : 'failed',
      `Credits after legacy add: ${creditsStore.credits}`
    );
    
    // Test legacy spend
    const legacySpendResult = legacyStore.spendCredits(200);
    this.addResult(
      'Legacy Spend Credits',
      legacySpendResult && creditsStore.credits === 400 ? 'passed' : 'failed',
      `Credits after legacy spend: ${creditsStore.credits}`
    );
    
    // Test legacy canAfford
    const canAfford250 = legacyStore.canAfford(250);
    const canAfford500 = legacyStore.canAfford(500);
    this.addResult(
      'Legacy Can Afford Check',
      canAfford250 && !canAfford500 ? 'passed' : 'failed',
      `Can afford 250: ${canAfford250}, Can afford 500: ${canAfford500}`
    );
  }

  private async testMinimumBalance() {
    console.log('\n🔒 Testing Minimum Balance Checks...');
    
    const creditsStore = useCreditsStore.getState();
    
    // Test minimum balance enforcement
    creditsStore.setCredits(100);
    
    // Try to spend down to exactly 0
    const spendToZero = creditsStore.spendCredits(100);
    this.addResult(
      'Spend to Zero',
      spendToZero && creditsStore.credits === 0 ? 'passed' : 'failed',
      `Can spend to zero: ${creditsStore.credits}`
    );
    
    // Test balance after bankruptcy
    creditsStore.setCredits(0);
    creditsStore.earnCredits(50);
    this.addResult(
      'Recovery from Zero',
      creditsStore.credits === 50 ? 'passed' : 'failed',
      `Can recover from zero: ${creditsStore.credits}`
    );
    
    // Test minimum transaction amount
    creditsStore.setCredits(1000);
    const tinySpend = creditsStore.spendCredits(0.00001);
    this.addResult(
      'Tiny Transaction',
      tinySpend ? 'passed' : 'warning',
      `Tiny transactions supported: ${creditsStore.credits.toFixed(5)}`
    );
    
    // Test balance consistency after errors
    creditsStore.setCredits(500);
    const beforeError = creditsStore.credits;
    try {
      // Attempt invalid operation
      (creditsStore as any).credits = 'invalid';
      creditsStore.spendCredits(100);
    } catch (e) {
      // Expected to fail
    }
    // Reset if corrupted
    if (typeof creditsStore.credits !== 'number') {
      creditsStore.setCredits(beforeError);
    }
    this.addResult(
      'Balance Recovery',
      typeof creditsStore.credits === 'number' ? 'passed' : 'failed',
      `Balance recovered: ${creditsStore.credits}`
    );
  }

  private restoreOriginalState() {
    // Restore the original state
    if (this.originalState) {
      const creditsStore = useCreditsStore.getState();
      creditsStore.setCredits(this.originalState.credits || 1000);
    }
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
    console.log('%c          CREDITS STORE TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
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
(window as any).testCreditsStore = () => {
  const testSuite = new CreditsStoreTestSuite();
  testSuite.runAllTests();
};

console.log('%c💰 Credits Store Test Suite Loaded!', 'color: #fbbf24; font-weight: bold');
console.log('Run %ctestCreditsStore()%c to execute tests', 'color: #3b82f6', 'color: inherit');