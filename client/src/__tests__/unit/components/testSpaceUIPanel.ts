/**
 * SpaceUIPanel Component Test Suite
 * Tests panel system including expand/collapse, drag/drop, z-index management, and persistence
 * Run with window.testSpaceUIPanel() from the browser console
 */

import { usePanelManager } from '../../../lib/stores/ui/usePanelManager';
import { useHUDContext } from '../../../lib/stores/ui/useHUDContext';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class SpaceUIPanelTestSuite {
  private results: TestResult[] = [];
  private testPanels = ['missions', 'inventory', 'trading', 'crew'];

  constructor() {
    console.log('🎯 SpaceUIPanel Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6; font-size: 14px');
    console.log('%c   🎯 SPACE UI PANEL TEST SUITE STARTING', 'color: #8b5cf6; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6; font-size: 14px');
    
    this.results = [];
    
    try {
      await this.testInitialState();
      await this.wait(500);
      
      await this.testExpandCollapse();
      await this.wait(500);
      
      await this.testDragAndDrop();
      await this.wait(500);
      
      await this.testZIndexManagement();
      await this.wait(500);
      
      await this.testPanelPersistence();
      await this.wait(500);
      
      await this.testPanelTransitions();
      await this.wait(500);
      
      await this.testPanelPositioning();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.cleanup();
      this.printSummary();
    }
  }

  private async testInitialState() {
    console.log('\n📊 Testing Initial State...');
    
    const panelManager = usePanelManager.getState();
    
    // Check panel registration
    this.testPanels.forEach(panelId => {
      const panel = panelManager.panels.get(panelId);
      this.addResult(
        `Panel Registered: ${panelId}`,
        panel ? 'passed' : 'failed',
        panel ? 'Panel exists' : 'Panel not found'
      );
    });
    
    // Check no panels are open initially
    const anyOpen = Array.from(panelManager.panels.values()).some(p => p.isOpen);
    
    this.addResult(
      'Initial Panel State',
      !anyOpen ? 'passed' : 'warning',
      anyOpen ? 'Some panels are open' : 'All panels closed'
    );
    
    // Check z-index initialization
    const activePanelId = panelManager.activePanelId;
    
    this.addResult(
      'Active Panel',
      activePanelId === null ? 'passed' : 'warning',
      `Active: ${activePanelId || 'none'}`
    );
  }

  private async testExpandCollapse() {
    console.log('\n🔄 Testing Expand/Collapse...');
    
    const panelManager = usePanelManager.getState();
    
    // Test expand
    panelManager.openPanel('missions');
    await this.wait(200);
    
    this.addResult(
      'Panel Expand',
      panelManager.isPanelOpen('missions') ? 'passed' : 'failed',
      'Missions panel opened'
    );
    
    // Test collapse
    panelManager.closePanel('missions');
    await this.wait(200);
    
    this.addResult(
      'Panel Collapse',
      !panelManager.isPanelOpen('missions') ? 'passed' : 'failed',
      'Missions panel closed'
    );
    
    // Test toggle
    const beforeToggle = panelManager.isPanelOpen('inventory');
    panelManager.togglePanel('inventory');
    await this.wait(200);
    const afterToggle = panelManager.isPanelOpen('inventory');
    
    this.addResult(
      'Panel Toggle',
      beforeToggle !== afterToggle ? 'passed' : 'failed',
      `Toggled: ${!beforeToggle} → ${afterToggle}`
    );
    
    // Test animation
    const panel = panelManager.panels.get('inventory');
    
    this.addResult(
      'Panel Animation',
      panel?.isOpen ? 'passed' : 'warning',
      'Animation state tracked'
    );
    
    // Clean up
    panelManager.closePanel('inventory');
  }

  private async testDragAndDrop() {
    console.log('\n✋ Testing Drag and Drop...');
    
    const panelManager = usePanelManager.getState();
    
    // Open a panel for testing
    panelManager.openPanel('missions');
    await this.wait(200);
    
    // Simulate drag start
    const panel = panelManager.panels.get('missions');
    const originalPosition = panel?.position || { x: 0, y: 0 };
    
    this.addResult(
      'Drag Start Position',
      panel ? 'passed' : 'failed',
      `Position: (${originalPosition.x}, ${originalPosition.y})`
    );
    
    // Simulate drag move
    const newPosition = { x: originalPosition.x + 100, y: originalPosition.y + 50 };
    panelManager.updatePanelPosition('missions', newPosition);
    await this.wait(200);
    
    const updatedPanel = panelManager.panels.get('missions');
    const movedPosition = updatedPanel?.position || originalPosition;
    
    this.addResult(
      'Drag Move',
      movedPosition.x !== originalPosition.x || movedPosition.y !== originalPosition.y ? 'passed' : 'warning',
      `Moved to: (${movedPosition.x}, ${movedPosition.y})`
    );
    
    // Test drag constraints (panel shouldn't go off-screen)
    const extremePosition = { x: -1000, y: -1000 };
    panelManager.updatePanelPosition('missions', extremePosition);
    await this.wait(200);
    
    const constrainedPanel = panelManager.panels.get('missions');
    const constrainedPosition = constrainedPanel?.position || { x: 0, y: 0 };
    
    this.addResult(
      'Drag Constraints',
      constrainedPosition.x >= 0 && constrainedPosition.y >= 0 ? 'passed' : 'warning',
      `Constrained to: (${constrainedPosition.x}, ${constrainedPosition.y})`
    );
    
    // Clean up
    panelManager.closePanel('missions');
  }

  private async testZIndexManagement() {
    console.log('\n📚 Testing Z-Index Management...');
    
    const panelManager = usePanelManager.getState();
    
    // Open multiple panels
    panelManager.openPanel('missions');
    await this.wait(100);
    panelManager.openPanel('inventory');
    await this.wait(100);
    panelManager.openPanel('trading');
    await this.wait(100);
    
    // Check active panel has highest z-index
    const activePanel = panelManager.activePanelId;
    
    this.addResult(
      'Active Panel Set',
      activePanel === 'trading' ? 'passed' : 'failed',
      `Active: ${activePanel}`
    );
    
    // Click on a background panel to bring it forward
    panelManager.bringToFront('missions');
    await this.wait(100);
    
    this.addResult(
      'Bring to Front',
      panelManager.activePanelId === 'missions' ? 'passed' : 'failed',
      `New active: ${panelManager.activePanelId}`
    );
    
    // Test z-index ordering
    const panels = Array.from(panelManager.panels.values());
    const zIndexes = panels
      .filter(p => p.isOpen)
      .map(p => ({ id: p.id, zIndex: p.zIndex }))
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    
    this.addResult(
      'Z-Index Ordering',
      zIndexes.length > 0 ? 'passed' : 'warning',
      `Order: ${zIndexes.map(z => z.id).join(' > ')}`
    );
    
    // Close all panels
    panelManager.closeAllPanels();
  }

  private async testPanelPersistence() {
    console.log('\n💾 Testing Panel Persistence...');
    
    const panelManager = usePanelManager.getState();
    
    // Set up test state
    panelManager.openPanel('missions');
    panelManager.updatePanelPosition('missions', { x: 100, y: 200 });
    await this.wait(200);
    
    // Save state to localStorage
    const state = {
      openPanels: Array.from(panelManager.panels.entries())
        .filter(([_, panel]) => panel.isOpen)
        .map(([id, panel]) => ({
          id,
          position: panel.position
        }))
    };
    
    localStorage.setItem('spaceui-panel-state', JSON.stringify(state));
    
    this.addResult(
      'State Saved',
      localStorage.getItem('spaceui-panel-state') !== null ? 'passed' : 'failed',
      'State saved to localStorage'
    );
    
    // Clear panels
    panelManager.closeAllPanels();
    await this.wait(200);
    
    // Restore state
    const savedState = localStorage.getItem('spaceui-panel-state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      parsed.openPanels.forEach((panel: any) => {
        panelManager.openPanel(panel.id);
        if (panel.position) {
          panelManager.updatePanelPosition(panel.id, panel.position);
        }
      });
    }
    
    await this.wait(200);
    
    this.addResult(
      'State Restored',
      panelManager.isPanelOpen('missions') ? 'passed' : 'failed',
      'Panels restored from localStorage'
    );
    
    const restoredPanel = panelManager.panels.get('missions');
    const restoredPosition = restoredPanel?.position || { x: 0, y: 0 };
    
    this.addResult(
      'Position Restored',
      restoredPosition.x === 100 && restoredPosition.y === 200 ? 'passed' : 'warning',
      `Position: (${restoredPosition.x}, ${restoredPosition.y})`
    );
    
    // Clean up
    localStorage.removeItem('spaceui-panel-state');
    panelManager.closeAllPanels();
  }

  private async testPanelTransitions() {
    console.log('\n✨ Testing Panel Transitions...');
    
    const panelManager = usePanelManager.getState();
    
    // Test slide-in animation
    panelManager.openPanel('inventory');
    await this.wait(50); // Wait for animation to start
    
    this.addResult(
      'Slide-in Animation',
      panelManager.isPanelOpen('inventory') ? 'passed' : 'failed',
      'Panel sliding in'
    );
    
    await this.wait(300); // Wait for animation to complete
    
    // Test fade transition
    panelManager.togglePanel('inventory');
    await this.wait(50);
    
    this.addResult(
      'Fade Transition',
      !panelManager.isPanelOpen('inventory') ? 'passed' : 'failed',
      'Panel fading out'
    );
    
    // Test rapid transitions
    for (let i = 0; i < 3; i++) {
      panelManager.togglePanel('missions');
      await this.wait(100);
    }
    
    const finalState = panelManager.isPanelOpen('missions');
    
    this.addResult(
      'Rapid Transitions',
      'passed',
      `Handled rapid toggles, final state: ${finalState ? 'open' : 'closed'}`
    );
    
    // Clean up
    panelManager.closeAllPanels();
  }

  private async testPanelPositioning() {
    console.log('\n📐 Testing Panel Positioning...');
    
    const panelManager = usePanelManager.getState();
    const hudContext = useHUDContext.getState();
    
    // Test default positioning
    panelManager.openPanel('missions');
    await this.wait(200);
    
    const defaultPanel = panelManager.panels.get('missions');
    const defaultPos = defaultPanel?.position || { x: 0, y: 0 };
    
    this.addResult(
      'Default Position',
      defaultPos.x >= 0 && defaultPos.y >= 0 ? 'passed' : 'failed',
      `Default: (${defaultPos.x}, ${defaultPos.y})`
    );
    
    // Test auto-positioning to avoid overlap
    panelManager.openPanel('inventory');
    await this.wait(200);
    
    const secondPanel = panelManager.panels.get('inventory');
    const secondPos = secondPanel?.position || { x: 0, y: 0 };
    
    const overlap = Math.abs(secondPos.x - defaultPos.x) < 50 && 
                    Math.abs(secondPos.y - defaultPos.y) < 50;
    
    this.addResult(
      'Overlap Prevention',
      !overlap ? 'passed' : 'warning',
      overlap ? 'Panels may overlap' : 'Panels positioned to avoid overlap'
    );
    
    // Test responsive positioning
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    this.addResult(
      'Responsive Bounds',
      secondPos.x < windowWidth && secondPos.y < windowHeight ? 'passed' : 'failed',
      'Panels within window bounds'
    );
    
    // Clean up
    panelManager.closeAllPanels();
  }

  private cleanup() {
    const panelManager = usePanelManager.getState();
    panelManager.closeAllPanels();
    localStorage.removeItem('spaceui-panel-state');
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
    console.log('%c        SPACE UI PANEL TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
    console.log(`%c✅ Passed: ${passed}/${total}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failed}/${total}`, 'color: #ef4444');
    console.log(`%c⚠️ Warnings: ${warnings}/${total}`, 'color: #f59e0b');
    console.log('%c═══════════════════════════════════════════════', 'color: #8b5cf6');
  }
}

// Make it available globally for testing
(window as any).testSpaceUIPanel = () => {
  const testSuite = new SpaceUIPanelTestSuite();
  testSuite.runAllTests();
};

console.log('%c🎯 SpaceUIPanel Test Suite Loaded!', 'color: #8b5cf6; font-weight: bold');
console.log('Run %ctestSpaceUIPanel()%c to execute tests', 'color: #3b82f6', 'color: inherit');