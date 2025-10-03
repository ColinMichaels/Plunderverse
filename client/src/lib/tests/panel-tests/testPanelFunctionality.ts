// Test Script for Panel Functionality and Transitions
// This script provides automated and manual test procedures for verifying panel behavior

import { useLandedState } from './lib/stores/surface/useLandedState';
import { useHUDContext } from './lib/stores/ui/useHUDContext';
import { useUILayout } from './components/ui/UILayoutManager';
import { useAutopilot } from './lib/stores/navigation/useAutopilot';
import { useShipStatus } from './lib/stores/ship/useShipStatus';
import { toast } from 'sonner';

// Test Logger Helper
class PanelTestLogger {
  private testResults: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];
  
  log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[PANEL-TEST ${timestamp}]`;
    
    switch(type) {
      case 'success':
        console.log(`%c${prefix} ✅ ${message}`, 'color: #10b981');
        break;
      case 'error':
        console.error(`%c${prefix} ❌ ${message}`, 'color: #ef4444');
        break;
      case 'warning':
        console.warn(`%c${prefix} ⚠️ ${message}`, 'color: #f59e0b');
        break;
      default:
        console.log(`%c${prefix} ℹ️ ${message}`, 'color: #3b82f6');
    }
  }
  
  addTestResult(test: string, status: 'PASS' | 'FAIL', details?: string) {
    this.testResults.push({ test, status, details });
    this.log(`Test "${test}": ${status}${details ? ` - ${details}` : ''}`, 
              status === 'PASS' ? 'success' : 'error');
  }
  
  printSummary() {
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log('\n%c═══════════════════════════════════════════', 'color: #8b5cf6');
    console.log('%c          PANEL TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log('%c═══════════════════════════════════════════', 'color: #8b5cf6');
    
    if (failed > 0) {
      console.log('\n%cFailed Tests:', 'color: #ef4444; font-weight: bold');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  • ${r.test}: ${r.details || 'No details'}`));
    }
  }
}

// Panel Test Suite
export class PanelTestSuite {
  private logger = new PanelTestLogger();
  
  // Run all automated tests
  async runAllTests() {
    console.clear();
    this.logger.log('Starting Panel Functionality Test Suite', 'info');
    this.logger.log('═══════════════════════════════════════════', 'info');
    
    // Test 1: Check initial panel states
    await this.testInitialStates();
    
    // Test 2: Test keyboard shortcuts
    await this.testKeyboardShortcuts();
    
    // Test 3: Test panel visibility transitions
    await this.testPanelVisibilityTransitions();
    
    // Test 4: Test panel content changes
    await this.testPanelContentChanges();
    
    // Test 5: Test UI integration
    await this.testUIIntegration();
    
    // Print summary
    this.logger.printSummary();
    
    // Show toast notification
    toast.success('Panel tests completed! Check console for results.');
  }
  
  // Test 1: Initial States
  private async testInitialStates() {
    this.logger.log('Testing initial panel states...', 'info');
    
    const landedState = useLandedState.getState();
    const hudContext = useHUDContext.getState();
    const uiLayout = useUILayout.getState();
    
    // Should start in space
    this.logger.addTestResult(
      'Initial state: Not landed',
      !landedState.isLanded ? 'PASS' : 'FAIL',
      `isLanded: ${landedState.isLanded}`
    );
    
    // Check panel registry
    const registeredPanels = uiLayout.panels;
    const expectedPanels = ['autopilot', 'ship-systems', 'quick-repair'];
    
    expectedPanels.forEach(panelId => {
      const panel = registeredPanels.find(p => p.id === panelId);
      this.logger.addTestResult(
        `Panel registered: ${panelId}`,
        panel ? 'PASS' : 'FAIL',
        panel ? 'Panel found' : 'Panel not found'
      );
    });
  }
  
  // Test 2: Keyboard Shortcuts
  private async testKeyboardShortcuts() {
    this.logger.log('Testing keyboard shortcuts...', 'info');
    
    const uiLayout = useUILayout.getState();
    const landedState = useLandedState.getState();
    
    // Test Alt+1 (Autopilot - should work only in space)
    if (!landedState.isLanded) {
      this.simulateKeyPress('1', true);
      await this.wait(100);
      const autopilotExpanded = uiLayout.expandedPanelId === 'autopilot';
      this.logger.addTestResult(
        'Alt+1 toggles Autopilot (in space)',
        autopilotExpanded ? 'PASS' : 'FAIL',
        `Expanded: ${autopilotExpanded}`
      );
      
      // Toggle back
      this.simulateKeyPress('1', true);
      await this.wait(100);
    }
    
    // Test Alt+2 (Ship Systems - always available)
    this.simulateKeyPress('2', true);
    await this.wait(100);
    const systemsExpanded = uiLayout.expandedPanelId === 'ship-systems';
    this.logger.addTestResult(
      'Alt+2 toggles Ship Systems',
      systemsExpanded ? 'PASS' : 'FAIL',
      `Expanded: ${systemsExpanded}`
    );
    
    // Test Alt+4 (Quick Repair - always available)
    this.simulateKeyPress('4', true);
    await this.wait(100);
    const repairExpanded = uiLayout.expandedPanelId === 'quick-repair';
    this.logger.addTestResult(
      'Alt+4 toggles Quick Repair',
      repairExpanded ? 'PASS' : 'FAIL',
      `Expanded: ${repairExpanded}`
    );
  }
  
  // Test 3: Panel Visibility Transitions
  private async testPanelVisibilityTransitions() {
    this.logger.log('Testing panel visibility transitions...', 'info');
    
    const landedState = useLandedState.getState();
    const uiLayout = useUILayout.getState();
    
    // Simulate landing on a planet
    this.logger.log('Simulating landing on Mars...', 'info');
    landedState.setLanded('Mars');
    await this.wait(100);
    
    // Check that ship-upgrades panel appears when landed
    const upgradesPanel = uiLayout.panels.find(p => p.id === 'ship-upgrades');
    this.logger.addTestResult(
      'Ship Upgrades panel appears when landed',
      upgradesPanel ? 'PASS' : 'FAIL',
      upgradesPanel ? 'Panel visible' : 'Panel not found'
    );
    
    // Check that autopilot panel is not available
    const autopilotPanel = uiLayout.panels.find(p => p.id === 'autopilot');
    this.logger.addTestResult(
      'Autopilot panel hidden when landed',
      !autopilotPanel ? 'PASS' : 'FAIL',
      autopilotPanel ? 'Panel still visible' : 'Panel correctly hidden'
    );
    
    // Test Alt+1 should NOT work when landed
    const beforeToggle = uiLayout.expandedPanelId;
    this.simulateKeyPress('1', true);
    await this.wait(100);
    const afterToggle = uiLayout.expandedPanelId;
    this.logger.addTestResult(
      'Alt+1 disabled when landed',
      beforeToggle === afterToggle ? 'PASS' : 'FAIL',
      'Keyboard shortcut correctly disabled'
    );
    
    // Test Alt+3 SHOULD work when landed
    this.simulateKeyPress('3', true);
    await this.wait(100);
    const upgradesExpanded = uiLayout.expandedPanelId === 'ship-upgrades';
    this.logger.addTestResult(
      'Alt+3 toggles Ship Upgrades when landed',
      upgradesExpanded ? 'PASS' : 'FAIL',
      `Expanded: ${upgradesExpanded}`
    );
    
    // Simulate takeoff
    this.logger.log('Simulating takeoff from Mars...', 'info');
    landedState.setNotLanded();
    await this.wait(100);
    
    // Check that autopilot panel reappears
    const autopilotPanelAfter = uiLayout.panels.find(p => p.id === 'autopilot');
    this.logger.addTestResult(
      'Autopilot panel reappears after takeoff',
      autopilotPanelAfter ? 'PASS' : 'FAIL',
      autopilotPanelAfter ? 'Panel visible' : 'Panel not found'
    );
    
    // Check that ship-upgrades panel disappears in space
    const upgradesPanelAfter = uiLayout.panels.find(p => p.id === 'ship-upgrades');
    this.logger.addTestResult(
      'Ship Upgrades panel hidden in space',
      !upgradesPanelAfter ? 'PASS' : 'FAIL',
      upgradesPanelAfter ? 'Panel still visible' : 'Panel correctly hidden'
    );
  }
  
  // Test 4: Panel Content Changes
  private async testPanelContentChanges() {
    this.logger.log('Testing panel content changes...', 'info');
    
    const hudContext = useHUDContext.getState();
    const landedState = useLandedState.getState();
    
    // Test docked at station
    this.logger.log('Simulating docking at Station Alpha...', 'info');
    hudContext.setDocked(true, 'Station Alpha');
    await this.wait(100);
    
    // Check upgrades panel appears with correct title
    const uiLayout = useUILayout.getState();
    const upgradesPanel = uiLayout.panels.find(p => p.id === 'ship-upgrades');
    this.logger.addTestResult(
      'Ship Upgrades panel appears when docked',
      upgradesPanel ? 'PASS' : 'FAIL',
      upgradesPanel?.title || 'Panel not found'
    );
    
    if (upgradesPanel) {
      this.logger.addTestResult(
        'Title shows "STATION UPGRADES" when docked',
        upgradesPanel.title === 'STATION UPGRADES' ? 'PASS' : 'FAIL',
        `Title: ${upgradesPanel.title}`
      );
    }
    
    // Test landed on planet
    hudContext.setDocked(false, '');
    landedState.setLanded('Earth');
    await this.wait(100);
    
    const upgradesPanelLanded = uiLayout.panels.find(p => p.id === 'ship-upgrades');
    if (upgradesPanelLanded) {
      this.logger.addTestResult(
        'Title shows "FIELD REPAIRS" when landed',
        upgradesPanelLanded.title === 'FIELD REPAIRS' ? 'PASS' : 'FAIL',
        `Title: ${upgradesPanelLanded.title}`
      );
    }
    
    // Reset to space
    landedState.setNotLanded();
    hudContext.setDocked(false, '');
    await this.wait(100);
  }
  
  // Test 5: UI Integration
  private async testUIIntegration() {
    this.logger.log('Testing UI integration...', 'info');
    
    const uiLayout = useUILayout.getState();
    
    // Test that only one panel can be expanded at a time
    uiLayout.togglePanel('ship-systems');
    await this.wait(100);
    const firstExpanded = uiLayout.expandedPanelId;
    
    uiLayout.togglePanel('quick-repair');
    await this.wait(100);
    const secondExpanded = uiLayout.expandedPanelId;
    
    this.logger.addTestResult(
      'Only one panel expanded at a time',
      firstExpanded !== secondExpanded && secondExpanded === 'quick-repair' ? 'PASS' : 'FAIL',
      `First: ${firstExpanded}, Second: ${secondExpanded}`
    );
    
    // Test panel collapse
    uiLayout.togglePanel('quick-repair'); // Toggle same panel
    await this.wait(100);
    this.logger.addTestResult(
      'Panel collapses when toggled again',
      uiLayout.expandedPanelId === null ? 'PASS' : 'FAIL',
      `Expanded: ${uiLayout.expandedPanelId}`
    );
  }
  
  // Helper: Simulate keyboard press
  private simulateKeyPress(key: string, altKey: boolean = false) {
    const event = new KeyboardEvent('keydown', {
      key: key,
      altKey: altKey,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
  }
  
  // Helper: Wait for async operations
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Manual Test Procedure Document
export const generateManualTestProcedure = () => {
  const procedure = `
╔════════════════════════════════════════════════════════════════════╗
║          MANUAL TEST PROCEDURE FOR PANEL FUNCTIONALITY            ║
╚════════════════════════════════════════════════════════════════════╝

📋 SETUP:
1. Open the game in your browser
2. Open the browser console (F12)
3. Keep this test procedure document handy

═══════════════════════════════════════════════════════════════════════

🎯 TEST 1: INITIAL STATE IN SPACE
----------------------------------
□ Verify you start in space (not landed)
□ Check left sidebar is visible
□ Confirm these panels are visible:
  • Autopilot (🧭)
  • Ship Systems (⚡)
  • Quick Repair (🔧)
□ Confirm Ship Upgrades panel is NOT visible

═══════════════════════════════════════════════════════════════════════

⌨️ TEST 2: KEYBOARD SHORTCUTS IN SPACE
---------------------------------------
□ Press Alt+1 → Autopilot panel should expand
□ Press Alt+1 again → Autopilot panel should collapse
□ Press Alt+2 → Ship Systems panel should expand
□ Press Alt+2 again → Ship Systems panel should collapse
□ Press Alt+3 → Nothing should happen (upgrades not available in space)
□ Press Alt+4 → Quick Repair panel should expand
□ Press Alt+4 again → Quick Repair panel should collapse

═══════════════════════════════════════════════════════════════════════

🪐 TEST 3: LANDING ON A PLANET
-------------------------------
□ Navigate to a planet (use arrow keys or WASD)
□ Press L to land when close enough
□ After landing, verify:
  • Autopilot panel disappears
  • Ship Upgrades panel appears with title "FIELD REPAIRS"
  • Ship Systems panel still visible
  • Quick Repair panel still visible
□ Press Alt+1 → Nothing should happen (autopilot disabled when landed)
□ Press Alt+3 → Ship Upgrades panel should expand
□ Check Ship Upgrades shows 20% price increase warning

═══════════════════════════════════════════════════════════════════════

🚀 TEST 4: TAKING OFF FROM PLANET
---------------------------------
□ Press T to initiate takeoff
□ Wait for takeoff animation
□ After takeoff, verify:
  • Autopilot panel reappears
  • Ship Upgrades panel disappears
  • Ship Systems and Quick Repair remain visible
□ Press Alt+1 → Autopilot should work again
□ Press Alt+3 → Nothing should happen (upgrades not available in space)

═══════════════════════════════════════════════════════════════════════

🏭 TEST 5: DOCKING AT STATION (if stations are implemented)
-----------------------------------------------------------
□ Navigate to a space station
□ Press D to dock when close enough
□ After docking, verify:
  • Autopilot panel disappears
  • Ship Upgrades panel appears with title "STATION UPGRADES"
  • No price increase warning (standard prices)
□ Undock from station
□ Verify panels return to space configuration

═══════════════════════════════════════════════════════════════════════

🎨 TEST 6: UI INTEGRATION
-------------------------
□ Expand Ship Systems panel (Alt+2)
□ Try expanding Quick Repair (Alt+4)
□ Verify first panel collapses when second opens
□ Check panel animations are smooth
□ Verify no visual overlapping or glitches
□ Test dragging panels (if draggable)

═══════════════════════════════════════════════════════════════════════

⚠️ TEST 7: ERROR HANDLING
-------------------------
□ Try rapidly pressing shortcut keys
□ Try pressing multiple shortcuts simultaneously
□ Land/takeoff rapidly and check panel states
□ Check console for any error messages

═══════════════════════════════════════════════════════════════════════

📝 CHECKLIST SUMMARY:
--------------------
□ All keyboard shortcuts work correctly
□ Panels show/hide based on context
□ Panel titles change appropriately
□ Price modifiers display correctly
□ UI animations are smooth
□ No console errors during testing
□ Error messages are user-friendly

═══════════════════════════════════════════════════════════════════════

🐛 ISSUES TO REPORT:
-------------------
If you find any issues, note:
1. What you were doing when it happened
2. What you expected to happen
3. What actually happened
4. Any error messages in console
5. Screenshots if possible

═══════════════════════════════════════════════════════════════════════
`;

  console.log(procedure);
  return procedure;
};

// Auto-run test suite when imported in development
if (import.meta.env.DEV) {
  // Add global command for easy testing
  (window as any).testPanels = () => {
    const testSuite = new PanelTestSuite();
    testSuite.runAllTests();
  };
  
  (window as any).showTestProcedure = () => {
    generateManualTestProcedure();
  };
  
  console.log('%c📋 Panel Test Suite Loaded!', 'color: #8b5cf6; font-weight: bold');
  console.log('Run %ctestPanels()%c to execute automated tests', 'color: #3b82f6', 'color: inherit');
  console.log('Run %cshowTestProcedure()%c to see manual test steps', 'color: #3b82f6', 'color: inherit');
}