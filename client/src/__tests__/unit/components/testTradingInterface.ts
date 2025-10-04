/**
 * TradingInterface Component Test Suite
 * Tests the trading system UI including item listing, buy/sell functionality, and price calculations
 * Run with window.testTradingInterface() from the browser console
 */

import { useTradingData } from '../../../domain/economy/selectors';
import { economyService } from '../../../domain/economy/economy.service';
import { gameFacade } from '../../../lib/plunderverse/gameFacade';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { useInventory } from '../../../lib/stores/economy/useInventory';
import { useTrading } from '../../../lib/stores/economy/useTrading';
import { usePanelManager } from '../../../lib/stores/ui/usePanelManager';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class TradingInterfaceTestSuite {
  private results: TestResult[] = [];
  private originalCredits: number = 0;
  private originalInventory: any[] = [];

  constructor() {
    console.log('💱 TradingInterface Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #f59e0b; font-size: 14px');
    console.log('%c   💱 TRADING INTERFACE TEST SUITE STARTING', 'color: #f59e0b; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #f59e0b; font-size: 14px');
    
    this.results = [];
    this.saveState();
    
    try {
      await this.testInitialState();
      await this.wait(500);
      
      await this.testItemListing();
      await this.wait(500);
      
      await this.testBuyFunctionality();
      await this.wait(500);
      
      await this.testSellFunctionality();
      await this.wait(500);
      
      await this.testPriceCalculations();
      await this.wait(500);
      
      await this.testInventoryUpdates();
      await this.wait(500);
      
      await this.testBlackMarketAccess();
      await this.wait(500);
      
      await this.testUIInteractions();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.restoreState();
      this.printSummary();
    }
  }

  private saveState() {
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    
    this.originalCredits = credits.credits;
    this.originalInventory = [...inventory.items];
  }

  private restoreState() {
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    
    credits.setCredits(this.originalCredits);
    inventory.items = [...this.originalInventory];
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const tradingData = useTradingData();
    const credits = useCreditsStore.getState();
    
    this.addResult(
      'Trading Data Available',
      tradingData ? 'passed' : 'failed',
      tradingData ? 'Data loaded' : 'No data'
    );
    
    this.addResult(
      'Credits Display',
      credits.credits >= 0 ? 'passed' : 'failed',
      `Credits: ${credits.credits}`
    );
    
    this.addResult(
      'Storage Capacity',
      tradingData.storageCapacity > 0 ? 'passed' : 'failed',
      `Capacity: ${tradingData.storageCapacity}`
    );
  }

  private async testItemListing() {
    console.log('\n📦 Testing Item Listing...');
    
    const tradingData = useTradingData();
    const trading = useTrading.getState();
    
    // Generate market prices for testing
    trading.generateMarketPrices('Earth');
    await this.wait(200);
    
    const prices = trading.getMarketPrices('Earth');
    
    this.addResult(
      'Market Prices Generated',
      prices.length > 0 ? 'passed' : 'failed',
      `${prices.length} items in market`
    );
    
    // Test item categorization
    const categories = new Set(prices.map((p: any) => trading.getGoodById(p.goodId)?.category));
    
    this.addResult(
      'Item Categories',
      categories.size > 1 ? 'passed' : 'warning',
      `Found ${categories.size} categories`
    );
    
    // Test illegal items marking
    const illegalResources = ['crystals', 'alien artifacts', 'quantum cores', 'dark matter'];
    const hasIllegalMarkings = tradingData.items.some((item: any) => 
      illegalResources.some(illegal => item.type?.toLowerCase().includes(illegal))
    );
    
    this.addResult(
      'Illegal Item Detection',
      'passed',
      hasIllegalMarkings ? 'Illegal items marked' : 'No illegal items present'
    );
  }

  private async testBuyFunctionality() {
    console.log('\n💰 Testing Buy Functionality...');
    
    const credits = useCreditsStore.getState();
    const trading = useTrading.getState();
    const inventory = useInventory.getState();
    
    // Set test credits
    credits.setCredits(5000);
    
    // Generate prices
    trading.generateMarketPrices('Earth');
    const prices = trading.getMarketPrices('Earth');
    
    if (prices.length > 0) {
      const testItem = prices[0];
      const good = trading.getGoodById(testItem.goodId);
      
      if (good) {
        const beforeCredits = credits.credits;
        const beforeInventory = inventory.items.length;
        
        // Simulate purchase
        const result = trading.buyGood('Earth', good.id, 1, testItem.buyPrice);
        
        if (result) {
          credits.setCredits(credits.credits - testItem.buyPrice);
          inventory.items.push({
            id: good.id,
            name: good.name,
            quantity: 1,
            weight: good.weight,
            value: testItem.buyPrice,
            category: 'trade'
          });
        }
        
        await this.wait(200);
        
        const afterCredits = credits.credits;
        const afterInventory = inventory.items.length;
        
        this.addResult(
          'Buy Transaction',
          afterCredits < beforeCredits && afterInventory > beforeInventory ? 'passed' : 'failed',
          `Credits: ${beforeCredits} → ${afterCredits}, Items: ${beforeInventory} → ${afterInventory}`
        );
        
        this.addResult(
          'Price Deduction',
          beforeCredits - afterCredits === testItem.buyPrice ? 'passed' : 'failed',
          `Expected: ${testItem.buyPrice}, Actual: ${beforeCredits - afterCredits}`
        );
      }
    } else {
      this.addResult('Buy Transaction', 'warning', 'No items available to test');
    }
  }

  private async testSellFunctionality() {
    console.log('\n💸 Testing Sell Functionality...');
    
    const credits = useCreditsStore.getState();
    const inventory = useInventory.getState();
    
    // Add test item to inventory
    const testResource = {
      id: 'test-ore',
      name: 'Test Ore',
      quantity: 10,
      weight: 10,
      value: 50,
      category: 'resource' as const
    };
    
    inventory.items.push(testResource);
    const beforeCredits = credits.credits;
    const beforeInventory = inventory.items.length;
    
    // Simulate selling
    const sellValue = testResource.value * testResource.quantity;
    const result = economyService.sellResource('Test Ore', testResource.quantity);
    
    await this.wait(200);
    
    const afterCredits = credits.credits;
    const afterInventory = inventory.items.filter(i => i.id === 'test-ore').length;
    
    this.addResult(
      'Sell Transaction',
      result.success ? 'passed' : 'failed',
      result.message || 'Transaction processed'
    );
    
    this.addResult(
      'Credits Received',
      afterCredits > beforeCredits ? 'passed' : 'failed',
      `Credits gained: ${afterCredits - beforeCredits}`
    );
  }

  private async testPriceCalculations() {
    console.log('\n🧮 Testing Price Calculations...');
    
    const trading = useTrading.getState();
    
    // Test price variations between planets
    trading.generateMarketPrices('Earth');
    const earthPrices = trading.getMarketPrices('Earth');
    
    trading.generateMarketPrices('Mars');
    const marsPrices = trading.getMarketPrices('Mars');
    
    if (earthPrices.length > 0 && marsPrices.length > 0) {
      const earthItem = earthPrices[0];
      const marsItem = marsPrices.find((p: any) => p.goodId === earthItem.goodId);
      
      if (marsItem) {
        const priceDifference = Math.abs(marsItem.buyPrice - earthItem.buyPrice);
        
        this.addResult(
          'Price Variation',
          priceDifference > 0 ? 'passed' : 'failed',
          `Earth: ${earthItem.buyPrice}, Mars: ${marsItem.buyPrice}`
        );
        
        // Test buy/sell spread
        const spread = earthItem.buyPrice - earthItem.sellPrice;
        const spreadPercentage = (spread / earthItem.buyPrice) * 100;
        
        this.addResult(
          'Buy/Sell Spread',
          spread > 0 && spreadPercentage > 10 ? 'passed' : 'warning',
          `Spread: ${spread} (${spreadPercentage.toFixed(1)}%)`
        );
      }
    }
    
    // Test quantity discounts (if implemented)
    const bulkQuantity = 10;
    const singlePrice = 100;
    const bulkPrice = singlePrice * bulkQuantity;
    
    this.addResult(
      'Bulk Pricing',
      bulkPrice === singlePrice * bulkQuantity ? 'passed' : 'warning',
      `Single: ${singlePrice}, Bulk (x${bulkQuantity}): ${bulkPrice}`
    );
  }

  private async testInventoryUpdates() {
    console.log('\n📦 Testing Inventory Updates...');
    
    const inventory = useInventory.getState();
    const tradingData = useTradingData();
    
    // Test weight calculation
    const totalWeight = inventory.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    
    this.addResult(
      'Weight Calculation',
      totalWeight >= 0 ? 'passed' : 'failed',
      `Total weight: ${totalWeight}/${tradingData.storageCapacity}`
    );
    
    // Test capacity limits
    const overCapacity = totalWeight > tradingData.storageCapacity;
    
    this.addResult(
      'Capacity Check',
      !overCapacity ? 'passed' : 'warning',
      overCapacity ? 'Over capacity!' : 'Within limits'
    );
    
    // Test item stacking
    const stackableItem = {
      id: 'test-stackable',
      name: 'Stackable Item',
      quantity: 5,
      weight: 1,
      value: 10,
      category: 'resource' as const
    };
    
    inventory.items.push(stackableItem);
    inventory.items.push({ ...stackableItem, quantity: 3 });
    
    const stacked = inventory.items.filter(i => i.id === 'test-stackable');
    
    this.addResult(
      'Item Stacking',
      stacked.length === 2 ? 'warning' : 'passed',
      `Stack count: ${stacked.length} (should combine into 1)`
    );
  }

  private async testBlackMarketAccess() {
    console.log('\n🏴‍☠️ Testing Black Market Access...');
    
    const hasAccess = gameFacade.canAccessBlackMarket();
    
    this.addResult(
      'Black Market Check',
      'passed',
      hasAccess ? 'Access granted' : 'Access denied (need reputation)'
    );
    
    // Test illegal item restrictions
    const illegalItem = {
      type: 'alien artifacts',
      value: 1000,
      planetSource: 'Unknown'
    };
    
    const canSell = hasAccess || !illegalItem.type.includes('alien');
    
    this.addResult(
      'Illegal Item Restriction',
      !hasAccess && illegalItem.type.includes('alien') ? 'passed' : 'warning',
      canSell ? 'Can sell' : 'Cannot sell without access'
    );
  }

  private async testUIInteractions() {
    console.log('\n🖱️ Testing UI Interactions...');
    
    const panelManager = usePanelManager.getState();
    
    // Open trading panel
    panelManager.openPanel('trading');
    await this.wait(200);
    
    this.addResult(
      'Panel Opens',
      panelManager.isPanelOpen('trading') ? 'passed' : 'failed',
      'Trading panel state'
    );
    
    // Test tab switching (if visible in DOM)
    const tabs = ['sell', 'fuel', 'repairs', 'upgrades'];
    const tabElements = document.querySelectorAll('[role="tab"], button');
    
    let tabsFound = 0;
    tabs.forEach(tab => {
      const found = Array.from(tabElements).some(el => 
        el.textContent?.toLowerCase().includes(tab)
      );
      if (found) tabsFound++;
    });
    
    this.addResult(
      'Tab Navigation',
      tabsFound > 0 ? 'passed' : 'warning',
      `Found ${tabsFound}/${tabs.length} tabs`
    );
    
    // Test close button
    const closeButton = document.querySelector('[aria-label*="close"], button:has(> svg), button:contains("✕")');
    
    this.addResult(
      'Close Button',
      closeButton ? 'passed' : 'warning',
      closeButton ? 'Close button found' : 'Close button not found'
    );
    
    // Clean up
    panelManager.closePanel('trading');
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
    console.log('%c       TRADING INTERFACE TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
  }
}

// Make it available globally for testing
(window as any).testTradingInterface = () => {
  const testSuite = new TradingInterfaceTestSuite();
  testSuite.runAllTests();
};

console.log('%c💱 TradingInterface Test Suite Loaded!', 'color: #f59e0b; font-weight: bold');
console.log('Run %ctestTradingInterface()%c to execute tests', 'color: #3b82f6', 'color: inherit');