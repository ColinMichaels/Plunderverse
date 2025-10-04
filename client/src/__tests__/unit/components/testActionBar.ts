/**
 * ActionBar Component Test Suite
 * Tests the main action bar functionality including keyboard shortcuts, button clicks, and visibility
 * Run with window.testActionBar() from the browser console
 */

import { usePanelManager } from '../../../lib/stores/ui/usePanelManager';
import { useHUDContext } from '../../../lib/stores/ui/useHUDContext';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class ActionBarTestSuite {
  private results: TestResult[] = [];
  private readonly ACTION_BUTTONS = [
    { id: 'missions', icon: '📋', label: 'Missions', shortcut: 'F1' },
    { id: 'inventory', icon: '💼', label: 'Inventory', shortcut: 'F2' },
    { id: 'trading', icon: '💱', label: 'Trading', shortcut: 'F3' },
    { id: 'crew', icon: '👥', label: 'Crew', shortcut: 'F4' },
    { id: 'story', icon: '📖', label: 'Story', shortcut: 'F5' },
    { id: 'controls', icon: '❓', label: 'Controls', shortcut: 'F6' },
    { id: 'settings', icon: '⚙️', label: 'Settings', shortcut: 'F7' },
    { id: 'crypto', icon: '💰', label: 'Crypto', shortcut: 'F8' },
  ];

  constructor() {
    console.log('🎮 ActionBar Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-size: 14px');
    console.log('%c   🎮 ACTION BAR TEST SUITE STARTING', 'color: #10b981; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #10b981; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testInitialState();
      await this.wait(500);
      
      await this.testKeyboardShortcuts();
      await this.wait(500);
      
      await this.testButtonClicks();
      await this.wait(500);
      
      await this.testVisibilityConditions();
      await this.wait(500);
      
      await this.testPanelStates();
      await this.wait(500);
      
      await this.testTooltips();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.printSummary();
    }
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const panelManager = usePanelManager.getState();
    const hudContext = useHUDContext.getState();
    
    // Check if panels are registered
    this.ACTION_BUTTONS.forEach(button => {
      const panel = panelManager.panels.get(button.id);
      this.addResult(
        `Panel Registered: ${button.label}`,
        panel ? 'passed' : 'warning',
        panel ? 'Panel exists' : 'Panel not found'
      );
    });
    
    // Check initial visibility
    const rightSidebarVisible = hudContext.uiZoneVisibility.rightSidebar;
    this.addResult(
      'Right Sidebar Visible',
      rightSidebarVisible ? 'passed' : 'failed',
      `Visibility: ${rightSidebarVisible}`
    );
  }

  private async testKeyboardShortcuts() {
    console.log('\n⌨️ Testing Keyboard Shortcuts...');
    
    const panelManager = usePanelManager.getState();
    const hudContext = useHUDContext.getState();
    
    // Test F1-F8 keys
    for (let i = 1; i <= 8; i++) {
      const button = this.ACTION_BUTTONS[i - 1];
      const beforeState = panelManager.isPanelOpen(button.id);
      
      // Simulate F key press
      this.simulateKeyPress(`F${i}`);
      await this.wait(200);
      
      const afterState = panelManager.isPanelOpen(button.id);
      const changed = beforeState !== afterState;
      
      this.addResult(
        `F${i} Shortcut (${button.label})`,
        changed ? 'passed' : 'failed',
        changed ? 'Panel toggled' : 'No change detected'
      );
      
      // Close the panel if it opened
      if (afterState) {
        panelManager.closePanel(button.id);
        await this.wait(100);
      }
    }
    
    // Test ESC to close all panels
    panelManager.openPanel('missions');
    panelManager.openPanel('inventory');
    await this.wait(200);
    
    this.simulateKeyPress('Escape');
    await this.wait(200);
    
    const anyOpen = Array.from(panelManager.panels.values()).some(p => p.isOpen);
    this.addResult(
      'ESC Closes All Panels',
      !anyOpen ? 'passed' : 'failed',
      anyOpen ? 'Some panels still open' : 'All panels closed'
    );
  }

  private async testButtonClicks() {
    console.log('\n🖱️ Testing Button Clicks...');
    
    const panelManager = usePanelManager.getState();
    
    // Test clicking each button
    for (const button of this.ACTION_BUTTONS) {
      // Find the button element in the DOM
      const buttonElement = this.findButtonElement(button.icon);
      
      if (buttonElement) {
        const beforeState = panelManager.isPanelOpen(button.id);
        
        // Simulate click
        buttonElement.click();
        await this.wait(200);
        
        const afterState = panelManager.isPanelOpen(button.id);
        const changed = beforeState !== afterState;
        
        this.addResult(
          `Button Click: ${button.label}`,
          changed ? 'passed' : 'failed',
          changed ? 'Button click worked' : 'Button click failed'
        );
        
        // Close the panel
        if (afterState) {
          panelManager.closePanel(button.id);
          await this.wait(100);
        }
      } else {
        this.addResult(
          `Button Click: ${button.label}`,
          'warning',
          'Button element not found in DOM'
        );
      }
    }
  }

  private async testVisibilityConditions() {
    console.log('\n👁️ Testing Visibility Conditions...');
    
    const landed = useLandedState.getState();
    const hudContext = useHUDContext.getState();
    const originalLandedState = landed.isLanded;
    
    // Test in space
    landed.setNotLanded();
    hudContext.setCurrentContext('space');
    await this.wait(200);
    
    const spaceVisibility = hudContext.uiZoneVisibility.rightSidebar;
    this.addResult(
      'Action Bar Visible in Space',
      spaceVisibility ? 'passed' : 'failed',
      `Visibility: ${spaceVisibility}`
    );
    
    // Test when landed
    landed.setLanded('Mars');
    hudContext.setCurrentContext('planet');
    await this.wait(200);
    
    const planetVisibility = hudContext.uiZoneVisibility.rightSidebar;
    this.addResult(
      'Action Bar Visible on Planet',
      planetVisibility ? 'passed' : 'failed',
      `Visibility: ${planetVisibility}`
    );
    
    // Test in minigame context
    hudContext.setCurrentContext('minigame');
    await this.wait(200);
    
    const minigameVisibility = hudContext.uiZoneVisibility.rightSidebar;
    this.addResult(
      'Action Bar Hidden in Minigame',
      !minigameVisibility ? 'passed' : 'failed',
      `Visibility: ${minigameVisibility}`
    );
    
    // Restore original state
    if (originalLandedState) {
      landed.setLanded('Earth');
    } else {
      landed.setNotLanded();
    }
    hudContext.setCurrentContext('space');
  }

  private async testPanelStates() {
    console.log('\n📊 Testing Panel States...');
    
    const panelManager = usePanelManager.getState();
    
    // Test only one panel can be open at a time
    panelManager.openPanel('missions');
    await this.wait(100);
    
    panelManager.openPanel('inventory');
    await this.wait(100);
    
    const missionsOpen = panelManager.isPanelOpen('missions');
    const inventoryOpen = panelManager.isPanelOpen('inventory');
    
    this.addResult(
      'Only One Panel Open',
      !missionsOpen && inventoryOpen ? 'passed' : 'failed',
      `Missions: ${missionsOpen}, Inventory: ${inventoryOpen}`
    );
    
    // Test toggle functionality
    const beforeToggle = panelManager.isPanelOpen('inventory');
    panelManager.togglePanel('inventory');
    await this.wait(100);
    const afterToggle = panelManager.isPanelOpen('inventory');
    
    this.addResult(
      'Toggle Panel Function',
      beforeToggle !== afterToggle ? 'passed' : 'failed',
      `Before: ${beforeToggle}, After: ${afterToggle}`
    );
    
    // Test manual override
    const hudContext = useHUDContext.getState();
    hudContext.setManualPanelOverride(true);
    await this.wait(100);
    
    this.addResult(
      'Manual Override Set',
      hudContext.manualPanelOverride ? 'passed' : 'failed',
      `Override: ${hudContext.manualPanelOverride}`
    );
    
    // Clean up
    panelManager.closeAllPanels();
    hudContext.setManualPanelOverride(false);
  }

  private async testTooltips() {
    console.log('\n💬 Testing Tooltips...');
    
    // Find action buttons in DOM
    const buttons = document.querySelectorAll('[title]');
    let tooltipsFound = 0;
    
    this.ACTION_BUTTONS.forEach(button => {
      const element = this.findButtonElement(button.icon);
      if (element) {
        const title = element.getAttribute('title');
        const hasTooltip = title && title.includes(button.label) && title.includes(button.shortcut);
        
        if (hasTooltip) {
          tooltipsFound++;
        }
        
        this.addResult(
          `Tooltip: ${button.label}`,
          hasTooltip ? 'passed' : 'warning',
          hasTooltip ? `Tooltip: "${title}"` : 'No tooltip found'
        );
      }
    });
    
    this.addResult(
      'Tooltips Summary',
      tooltipsFound >= 4 ? 'passed' : 'warning',
      `Found ${tooltipsFound}/${this.ACTION_BUTTONS.length} tooltips`
    );
  }

  private findButtonElement(icon: string): HTMLElement | null {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent?.includes(icon)) {
        return button;
      }
    }
    return null;
  }

  private simulateKeyPress(key: string) {
    const event = new KeyboardEvent('keydown', {
      key: key,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
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
    console.log('%c          ACTION BAR TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
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
(window as any).testActionBar = () => {
  const testSuite = new ActionBarTestSuite();
  testSuite.runAllTests();
};

console.log('%c🎮 ActionBar Test Suite Loaded!', 'color: #10b981; font-weight: bold');
console.log('Run %ctestActionBar()%c to execute tests', 'color: #3b82f6', 'color: inherit');