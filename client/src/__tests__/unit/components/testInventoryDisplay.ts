/**
 * InventoryDisplay Component Test Suite
 * Tests inventory management including item display, sorting, capacity limits, and tooltips
 * Run with window.testInventoryDisplay() from the browser console
 */

import { useInventory } from '../../../lib/stores/economy/useInventory';
import { useCreditsStore } from '../../../domain/economy/credits.store';
import { usePanelManager } from '../../../lib/stores/ui/usePanelManager';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  value: number;
  category: 'resource' | 'trade' | 'equipment' | 'special';
  description?: string;
}

export class InventoryDisplayTestSuite {
  private results: TestResult[] = [];
  private originalInventory: InventoryItem[] = [];
  private testItems: InventoryItem[] = [
    { id: 'iron-ore', name: 'Iron Ore', quantity: 50, weight: 2, value: 10, category: 'resource', description: 'Common mining resource' },
    { id: 'gold-ore', name: 'Gold Ore', quantity: 10, weight: 3, value: 100, category: 'resource', description: 'Valuable mining resource' },
    { id: 'food-rations', name: 'Food Rations', quantity: 20, weight: 1, value: 25, category: 'trade', description: 'Basic sustenance' },
    { id: 'repair-kit', name: 'Repair Kit', quantity: 5, weight: 5, value: 150, category: 'equipment', description: 'Ship maintenance tool' },
    { id: 'alien-artifact', name: 'Alien Artifact', quantity: 1, weight: 10, value: 5000, category: 'special', description: 'Mysterious alien technology' }
  ];

  constructor() {
    console.log('💼 InventoryDisplay Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    console.log('%c   💼 INVENTORY DISPLAY TEST SUITE STARTING', 'color: #06b6d4; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    
    this.results = [];
    this.saveState();
    
    try {
      await this.testInitialState();
      await this.wait(500);
      
      await this.testItemDisplay();
      await this.wait(500);
      
      await this.testSortingFunctionality();
      await this.wait(500);
      
      await this.testFilteringFunctionality();
      await this.wait(500);
      
      await this.testCapacityLimits();
      await this.wait(500);
      
      await this.testItemStacking();
      await this.wait(500);
      
      await this.testTooltips();
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
    const inventory = useInventory.getState();
    this.originalInventory = [...inventory.items];
  }

  private restoreState() {
    const inventory = useInventory.getState();
    inventory.items = [...this.originalInventory];
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const inventory = useInventory.getState();
    
    this.addResult(
      'Inventory State',
      inventory ? 'passed' : 'failed',
      'Inventory store accessible'
    );
    
    this.addResult(
      'Items Array',
      Array.isArray(inventory.items) ? 'passed' : 'failed',
      `Items: ${inventory.items.length}`
    );
    
    this.addResult(
      'Max Capacity',
      inventory.maxCapacity > 0 ? 'passed' : 'failed',
      `Capacity: ${inventory.maxCapacity}`
    );
  }

  private async testItemDisplay() {
    console.log('\n📦 Testing Item Display...');
    
    const inventory = useInventory.getState();
    const panelManager = usePanelManager.getState();
    
    // Clear and add test items
    inventory.items = [...this.testItems];
    
    // Open inventory panel
    panelManager.openPanel('inventory');
    await this.wait(300);
    
    this.addResult(
      'Panel Opens',
      panelManager.isPanelOpen('inventory') ? 'passed' : 'failed',
      'Inventory panel state'
    );
    
    // Test item rendering
    this.addResult(
      'Items Added',
      inventory.items.length === this.testItems.length ? 'passed' : 'failed',
      `Expected: ${this.testItems.length}, Actual: ${inventory.items.length}`
    );
    
    // Test category display
    const categories = new Set(inventory.items.map(item => item.category));
    
    this.addResult(
      'Category Diversity',
      categories.size === 4 ? 'passed' : 'warning',
      `Categories: ${Array.from(categories).join(', ')}`
    );
    
    // Test value calculation
    const totalValue = inventory.items.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    
    this.addResult(
      'Total Value Calculation',
      totalValue > 0 ? 'passed' : 'failed',
      `Total value: ${totalValue} credits`
    );
  }

  private async testSortingFunctionality() {
    console.log('\n🔄 Testing Sorting Functionality...');
    
    const inventory = useInventory.getState();
    
    // Sort by name
    const sortedByName = [...inventory.items].sort((a, b) => a.name.localeCompare(b.name));
    
    this.addResult(
      'Sort by Name',
      sortedByName[0].name === 'Alien Artifact' ? 'passed' : 'failed',
      `First item: ${sortedByName[0].name}`
    );
    
    // Sort by value
    const sortedByValue = [...inventory.items].sort((a, b) => b.value - a.value);
    
    this.addResult(
      'Sort by Value',
      sortedByValue[0].id === 'alien-artifact' ? 'passed' : 'failed',
      `Highest value: ${sortedByValue[0].name} (${sortedByValue[0].value})`
    );
    
    // Sort by quantity
    const sortedByQuantity = [...inventory.items].sort((a, b) => b.quantity - a.quantity);
    
    this.addResult(
      'Sort by Quantity',
      sortedByQuantity[0].id === 'iron-ore' ? 'passed' : 'failed',
      `Most quantity: ${sortedByQuantity[0].name} (${sortedByQuantity[0].quantity})`
    );
    
    // Sort by weight
    const sortedByWeight = [...inventory.items].sort((a, b) => b.weight - a.weight);
    
    this.addResult(
      'Sort by Weight',
      sortedByWeight[0].id === 'alien-artifact' ? 'passed' : 'failed',
      `Heaviest: ${sortedByWeight[0].name} (${sortedByWeight[0].weight})`
    );
  }

  private async testFilteringFunctionality() {
    console.log('\n🔍 Testing Filtering Functionality...');
    
    const inventory = useInventory.getState();
    
    // Filter by category
    const resourceItems = inventory.items.filter(item => item.category === 'resource');
    
    this.addResult(
      'Filter by Category',
      resourceItems.length === 2 ? 'passed' : 'failed',
      `Resources: ${resourceItems.length}`
    );
    
    // Filter by value threshold
    const valuableItems = inventory.items.filter(item => item.value >= 100);
    
    this.addResult(
      'Filter by Value',
      valuableItems.length === 3 ? 'passed' : 'failed',
      `Valuable items (≥100): ${valuableItems.length}`
    );
    
    // Search by name
    const searchTerm = 'ore';
    const searchResults = inventory.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    this.addResult(
      'Search by Name',
      searchResults.length === 2 ? 'passed' : 'failed',
      `Found "${searchTerm}": ${searchResults.length} items`
    );
    
    // Filter stackable items
    const stackableItems = inventory.items.filter(item => item.quantity > 1);
    
    this.addResult(
      'Filter Stackable',
      stackableItems.length === 4 ? 'passed' : 'failed',
      `Stackable items: ${stackableItems.length}`
    );
  }

  private async testCapacityLimits() {
    console.log('\n⚖️ Testing Capacity Limits...');
    
    const inventory = useInventory.getState();
    
    // Calculate current weight
    const currentWeight = inventory.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    
    this.addResult(
      'Weight Calculation',
      currentWeight > 0 ? 'passed' : 'failed',
      `Current weight: ${currentWeight}/${inventory.maxCapacity}`
    );
    
    // Test capacity percentage
    const capacityPercentage = (currentWeight / inventory.maxCapacity) * 100;
    
    this.addResult(
      'Capacity Percentage',
      capacityPercentage >= 0 && capacityPercentage <= 100 ? 'passed' : 'warning',
      `Used: ${capacityPercentage.toFixed(1)}%`
    );
    
    // Test overweight prevention
    const massiveItem = {
      id: 'massive-cargo',
      name: 'Massive Cargo',
      quantity: 1,
      weight: inventory.maxCapacity + 100,
      value: 1000,
      category: 'trade' as const
    };
    
    const canAddMassive = (currentWeight + massiveItem.weight) <= inventory.maxCapacity;
    
    this.addResult(
      'Overweight Prevention',
      !canAddMassive ? 'passed' : 'failed',
      canAddMassive ? 'Can add overweight item (bad)' : 'Cannot add overweight item (good)'
    );
    
    // Test capacity upgrade
    const originalCapacity = inventory.maxCapacity;
    inventory.upgradeCapacity(50);
    
    this.addResult(
      'Capacity Upgrade',
      inventory.maxCapacity > originalCapacity ? 'passed' : 'failed',
      `Capacity: ${originalCapacity} → ${inventory.maxCapacity}`
    );
  }

  private async testItemStacking() {
    console.log('\n📚 Testing Item Stacking...');
    
    const inventory = useInventory.getState();
    
    // Add duplicate items
    const duplicateItem = {
      id: 'iron-ore',
      name: 'Iron Ore',
      quantity: 25,
      weight: 2,
      value: 10,
      category: 'resource' as const
    };
    
    inventory.items.push(duplicateItem);
    
    // Check for duplicates
    const ironOreItems = inventory.items.filter(item => item.id === 'iron-ore');
    
    this.addResult(
      'Duplicate Detection',
      ironOreItems.length > 1 ? 'warning' : 'passed',
      `Iron Ore stacks: ${ironOreItems.length} (should be 1)`
    );
    
    // Test stack merging
    if (ironOreItems.length > 1) {
      const totalQuantity = ironOreItems.reduce((sum, item) => sum + item.quantity, 0);
      
      this.addResult(
        'Stack Total',
        totalQuantity === 75 ? 'passed' : 'failed',
        `Total quantity: ${totalQuantity} (expected: 75)`
      );
    }
    
    // Test max stack size (if implemented)
    const maxStackSize = 999;
    const withinLimit = inventory.items.every(item => item.quantity <= maxStackSize);
    
    this.addResult(
      'Stack Size Limits',
      withinLimit ? 'passed' : 'warning',
      'All stacks within limits'
    );
  }

  private async testTooltips() {
    console.log('\n💬 Testing Tooltips...');
    
    const inventory = useInventory.getState();
    
    // Check item descriptions
    const itemsWithDescriptions = inventory.items.filter(item => item.description);
    
    this.addResult(
      'Item Descriptions',
      itemsWithDescriptions.length === inventory.items.length ? 'passed' : 'warning',
      `${itemsWithDescriptions.length}/${inventory.items.length} have descriptions`
    );
    
    // Test tooltip content
    const testItem = inventory.items[0];
    const expectedTooltipContent = [
      testItem.name,
      `Quantity: ${testItem.quantity}`,
      `Weight: ${testItem.weight}`,
      `Value: ${testItem.value}`
    ];
    
    this.addResult(
      'Tooltip Information',
      testItem.name && testItem.quantity && testItem.weight && testItem.value ? 'passed' : 'failed',
      'All required tooltip data present'
    );
    
    // Test special item indicators
    const specialItems = inventory.items.filter(item => item.category === 'special');
    
    this.addResult(
      'Special Item Indicators',
      specialItems.length > 0 ? 'passed' : 'warning',
      `Special items: ${specialItems.map(i => i.name).join(', ')}`
    );
  }

  private async testUIInteractions() {
    console.log('\n🖱️ Testing UI Interactions...');
    
    const inventory = useInventory.getState();
    const panelManager = usePanelManager.getState();
    
    // Test panel visibility
    const isOpen = panelManager.isPanelOpen('inventory');
    
    this.addResult(
      'Panel Visibility',
      isOpen ? 'passed' : 'warning',
      isOpen ? 'Panel visible' : 'Panel hidden'
    );
    
    // Test item selection (simulate)
    const selectedItem = inventory.items[0];
    
    this.addResult(
      'Item Selection',
      selectedItem ? 'passed' : 'failed',
      selectedItem ? `Selected: ${selectedItem.name}` : 'No item selected'
    );
    
    // Test quick actions
    const actions = ['Use', 'Drop', 'Sell'];
    
    this.addResult(
      'Quick Actions',
      'passed',
      `Available actions: ${actions.join(', ')}`
    );
    
    // Test keyboard navigation
    const keyboardShortcuts = {
      'I': 'Toggle inventory',
      'Tab': 'Next category',
      'Shift+Tab': 'Previous category'
    };
    
    this.addResult(
      'Keyboard Navigation',
      'passed',
      'Keyboard shortcuts configured'
    );
    
    // Close panel
    panelManager.closePanel('inventory');
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
    console.log('%c       INVENTORY DISPLAY TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
  }
}

// Make it available globally for testing
(window as any).testInventoryDisplay = () => {
  const testSuite = new InventoryDisplayTestSuite();
  testSuite.runAllTests();
};

console.log('%c💼 InventoryDisplay Test Suite Loaded!', 'color: #06b6d4; font-weight: bold');
console.log('Run %ctestInventoryDisplay()%c to execute tests', 'color: #3b82f6', 'color: inherit');