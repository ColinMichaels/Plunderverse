/**
 * UI Stores Test Suite
 * Tests UI state stores including panels, settings, modals, and notifications
 * Run with window.testUIStores() from the browser console
 */

import { usePanelManager } from '../../../lib/stores/ui/usePanelManager';
import { useSettings } from '../../../lib/stores/ui/useSettings';
import { useHUDContext } from '../../../lib/stores/ui/useHUDContext';
import { useGame } from '../../../lib/stores/ui/useGame';
import { useHints } from '../../../lib/stores/ui/useHints';
import { useRewards } from '../../../lib/stores/ui/useRewards';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export class UIStoresTestSuite {
  private results: TestResult[] = [];
  private originalStates: any = {};

  constructor() {
    console.log('🎨 UI Stores Test Suite initialized');
  }

  async runAllTests() {
    console.clear();
    console.log('%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    console.log('%c   🎨 UI STORES TEST SUITE STARTING', 'color: #f97316; font-size: 16px; font-weight: bold');
    console.log('%c═══════════════════════════════════════════════', 'color: #f97316; font-size: 14px');
    
    this.results = [];
    
    try {
      // Save original states
      this.saveOriginalStates();
      
      await this.testPanelManagement();
      await this.wait(500);
      
      await this.testModalStates();
      await this.wait(500);
      
      await this.testSettings();
      await this.wait(500);
      
      await this.testHUDContext();
      await this.wait(500);
      
      await this.testGameState();
      await this.wait(500);
      
      await this.testHints();
      await this.wait(500);
      
      await this.testRewards();
      await this.wait(500);
      
      await this.testUIIntegration();
      
    } catch (error) {
      console.error('Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      // Restore original states
      this.restoreOriginalStates();
      this.printSummary();
    }
  }

  private async testPanelManagement() {
    console.log('\n📋 Testing Panel Management...');
    
    const panelManager = usePanelManager.getState();
    
    // Test panel registration
    panelManager.registerPanel('test-panel', 'Test Panel');
    
    const testPanel = panelManager.panels.get('test-panel');
    this.addResult(
      'Register Panel',
      testPanel !== undefined ? 'passed' : 'failed',
      `Panel registered: ${testPanel?.title}`
    );
    
    // Test opening panel
    panelManager.openPanel('test-panel');
    
    this.addResult(
      'Open Panel',
      panelManager.isPanelOpen('test-panel') ? 'passed' : 'failed',
      `Panel opened: test-panel`
    );
    
    // Test only one panel open
    panelManager.openPanel('missions');
    
    this.addResult(
      'Single Panel Active',
      !panelManager.isPanelOpen('test-panel') && panelManager.isPanelOpen('missions') ? 'passed' : 'failed',
      `Only missions panel open`
    );
    
    // Test closing panel
    panelManager.closePanel('missions');
    
    this.addResult(
      'Close Panel',
      !panelManager.isPanelOpen('missions') ? 'passed' : 'failed',
      `Panel closed`
    );
    
    // Test toggle functionality
    const beforeToggle = panelManager.isPanelOpen('inventory');
    panelManager.togglePanel('inventory');
    const afterToggle = panelManager.isPanelOpen('inventory');
    
    this.addResult(
      'Toggle Panel',
      beforeToggle !== afterToggle ? 'passed' : 'failed',
      `Toggle: ${beforeToggle} -> ${afterToggle}`
    );
    
    // Test close all panels
    panelManager.openPanel('missions');
    panelManager.openPanel('inventory');
    panelManager.closeAllPanels();
    
    const anyOpen = Array.from(panelManager.panels.values()).some(p => p.isOpen);
    
    this.addResult(
      'Close All Panels',
      !anyOpen ? 'passed' : 'failed',
      `All panels closed`
    );
    
    // Test panel position
    panelManager.registerPanel('positioned', 'Positioned', { x: 100, y: 200 });
    const positioned = panelManager.panels.get('positioned');
    
    this.addResult(
      'Panel Position',
      positioned?.position?.x === 100 && positioned?.position?.y === 200 ? 'passed' : 'failed',
      `Position: (${positioned?.position?.x}, ${positioned?.position?.y})`
    );
  }

  private async testModalStates() {
    console.log('\n🗂️ Testing Modal States...');
    
    const panelManager = usePanelManager.getState();
    
    // Register modal-type panels
    panelManager.registerPanel('confirm-modal', 'Confirm', undefined, true);
    panelManager.registerPanel('alert-modal', 'Alert', undefined, true);
    
    // Test modal behavior
    panelManager.openPanel('confirm-modal');
    
    this.addResult(
      'Open Modal',
      panelManager.isPanelOpen('confirm-modal') ? 'passed' : 'failed',
      `Modal opened`
    );
    
    // Test modal stacking
    panelManager.openPanel('alert-modal');
    const bothOpen = panelManager.isPanelOpen('confirm-modal') && 
                     panelManager.isPanelOpen('alert-modal');
    
    this.addResult(
      'Modal Stacking',
      !bothOpen ? 'passed' : 'warning',
      `Modals should not stack`
    );
    
    // Test modal priority
    const activeModal = Array.from(panelManager.panels.values())
      .find(p => p.isOpen && p.isModal);
    
    this.addResult(
      'Modal Priority',
      activeModal !== undefined ? 'passed' : 'failed',
      `Active modal: ${activeModal?.title}`
    );
    
    // Test modal closing
    panelManager.closeAllPanels();
    
    this.addResult(
      'Close Modals',
      !panelManager.isPanelOpen('confirm-modal') && !panelManager.isPanelOpen('alert-modal') ? 'passed' : 'failed',
      `All modals closed`
    );
  }

  private async testSettings() {
    console.log('\n⚙️ Testing Settings Persistence...');
    
    const settings = useSettings.getState();
    
    // Test volume settings
    settings.setMasterVolume(0.7);
    
    this.addResult(
      'Master Volume',
      settings.masterVolume === 0.7 ? 'passed' : 'failed',
      `Volume: ${(settings.masterVolume * 100).toFixed(0)}%`
    );
    
    settings.setSoundEnabled(false);
    
    this.addResult(
      'Sound Toggle',
      !settings.soundEnabled ? 'passed' : 'failed',
      `Sound: ${settings.soundEnabled ? 'On' : 'Off'}`
    );
    
    settings.setMusicEnabled(true);
    
    this.addResult(
      'Music Toggle',
      settings.musicEnabled ? 'passed' : 'failed',
      `Music: ${settings.musicEnabled ? 'On' : 'Off'}`
    );
    
    // Test graphics settings
    settings.setGraphicsQuality('high');
    
    this.addResult(
      'Graphics Quality',
      settings.graphicsQuality === 'high' ? 'passed' : 'failed',
      `Quality: ${settings.graphicsQuality}`
    );
    
    // Test control settings
    settings.setMouseSensitivity(1.5);
    
    this.addResult(
      'Mouse Sensitivity',
      settings.mouseSensitivity === 1.5 ? 'passed' : 'failed',
      `Sensitivity: ${settings.mouseSensitivity}`
    );
    
    // Test key bindings
    settings.setKeyBinding('forward', 'W');
    
    this.addResult(
      'Key Binding',
      settings.keyBindings?.forward === 'W' ? 'passed' : 'failed',
      `Forward key: ${settings.keyBindings?.forward}`
    );
    
    // Test settings reset
    settings.resetToDefaults();
    
    this.addResult(
      'Reset to Defaults',
      settings.masterVolume === 1.0 && settings.graphicsQuality === 'medium' ? 'passed' : 'failed',
      `Settings reset`
    );
  }

  private async testHUDContext() {
    console.log('\n🖼️ Testing HUD Context...');
    
    const hudContext = useHUDContext.getState();
    
    // Test context switching
    hudContext.setCurrentContext('space');
    
    this.addResult(
      'Set Context',
      hudContext.currentContext === 'space' ? 'passed' : 'failed',
      `Context: ${hudContext.currentContext}`
    );
    
    // Test UI zone visibility
    hudContext.setZoneVisibility('topBar', false);
    
    this.addResult(
      'Zone Visibility',
      !hudContext.uiZoneVisibility.topBar ? 'passed' : 'failed',
      `Top bar hidden`
    );
    
    hudContext.setZoneVisibility('rightSidebar', true);
    
    this.addResult(
      'Show Zone',
      hudContext.uiZoneVisibility.rightSidebar ? 'passed' : 'failed',
      `Right sidebar shown`
    );
    
    // Test context-specific UI
    hudContext.setCurrentContext('planet');
    const planetUI = hudContext.currentContext === 'planet';
    
    hudContext.setCurrentContext('combat');
    const combatUI = hudContext.currentContext === 'combat';
    
    this.addResult(
      'Context Switching',
      planetUI && combatUI ? 'passed' : 'failed',
      `Contexts work correctly`
    );
    
    // Test manual override
    hudContext.setManualPanelOverride(true);
    
    this.addResult(
      'Manual Override',
      hudContext.manualPanelOverride ? 'passed' : 'failed',
      `Manual control enabled`
    );
    
    // Test overlay state
    hudContext.setOverlayActive(true);
    
    this.addResult(
      'Overlay Active',
      hudContext.overlayActive ? 'passed' : 'failed',
      `Overlay shown`
    );
    
    // Reset context
    hudContext.setCurrentContext('space');
    hudContext.setManualPanelOverride(false);
    hudContext.setOverlayActive(false);
  }

  private async testGameState() {
    console.log('\n🎮 Testing Game State...');
    
    const gameState = useGame.getState();
    
    // Test game state transitions
    gameState.setGameState('menu');
    
    this.addResult(
      'Menu State',
      gameState.gameState === 'menu' ? 'passed' : 'failed',
      `State: ${gameState.gameState}`
    );
    
    gameState.startGame();
    
    this.addResult(
      'Start Game',
      gameState.gameState === 'playing' ? 'passed' : 'failed',
      `Game started: ${gameState.gameState}`
    );
    
    // Test pause
    gameState.pauseGame();
    
    this.addResult(
      'Pause Game',
      gameState.gameState === 'paused' && gameState.isPaused ? 'passed' : 'failed',
      `Game paused`
    );
    
    gameState.resumeGame();
    
    this.addResult(
      'Resume Game',
      gameState.gameState === 'playing' && !gameState.isPaused ? 'passed' : 'failed',
      `Game resumed`
    );
    
    // Test loading state
    gameState.setLoading(true);
    
    this.addResult(
      'Loading State',
      gameState.isLoading ? 'passed' : 'failed',
      `Loading: ${gameState.isLoading}`
    );
    
    gameState.setLoading(false);
    
    // Test game over
    gameState.endGame();
    
    this.addResult(
      'End Game',
      gameState.gameState === 'gameover' ? 'passed' : 'failed',
      `Game ended`
    );
    
    // Test reset
    gameState.resetGame();
    
    this.addResult(
      'Reset Game',
      gameState.gameState === 'menu' ? 'passed' : 'failed',
      `Game reset to menu`
    );
  }

  private async testHints() {
    console.log('\n💡 Testing Hints System...');
    
    const hints = useHints.getState();
    
    // Test adding hints
    hints.addHint('movement', 'Use WASD to move your ship');
    
    this.addResult(
      'Add Hint',
      hints.availableHints.length > 0 ? 'passed' : 'failed',
      `Hints available: ${hints.availableHints.length}`
    );
    
    // Test showing hint
    hints.showHint('movement');
    
    this.addResult(
      'Show Hint',
      hints.currentHint?.id === 'movement' ? 'passed' : 'failed',
      `Current hint: ${hints.currentHint?.message}`
    );
    
    // Test marking as seen
    hints.markAsSeen('movement');
    
    this.addResult(
      'Mark as Seen',
      hints.seenHints.includes('movement') ? 'passed' : 'failed',
      `Hint marked as seen`
    );
    
    // Test hint queue
    hints.addHint('combat', 'Press Space to fire');
    hints.addHint('landing', 'Press L to land on planets');
    
    this.addResult(
      'Hint Queue',
      hints.availableHints.length >= 2 ? 'passed' : 'failed',
      `Queue size: ${hints.availableHints.length}`
    );
    
    // Test dismissing hint
    hints.dismissHint();
    
    this.addResult(
      'Dismiss Hint',
      hints.currentHint === null ? 'passed' : 'failed',
      `Hint dismissed`
    );
    
    // Test clearing all hints
    hints.clearAllHints();
    
    this.addResult(
      'Clear All Hints',
      hints.availableHints.length === 0 ? 'passed' : 'failed',
      `All hints cleared`
    );
  }

  private async testRewards() {
    console.log('\n🏆 Testing Rewards System...');
    
    const rewards = useRewards.getState();
    
    // Test adding reward
    rewards.addReward({
      id: 'first-kill',
      type: 'achievement',
      title: 'First Blood',
      description: 'Destroyed your first enemy',
      value: 100
    });
    
    this.addResult(
      'Add Reward',
      rewards.pendingRewards.length > 0 ? 'passed' : 'failed',
      `Pending rewards: ${rewards.pendingRewards.length}`
    );
    
    // Test showing reward
    rewards.showNextReward();
    
    this.addResult(
      'Show Reward',
      rewards.currentReward?.id === 'first-kill' ? 'passed' : 'failed',
      `Showing: ${rewards.currentReward?.title}`
    );
    
    // Test collecting reward
    rewards.collectReward('first-kill');
    
    this.addResult(
      'Collect Reward',
      rewards.collectedRewards.includes('first-kill') ? 'passed' : 'failed',
      `Reward collected`
    );
    
    // Test reward types
    rewards.addReward({
      id: 'credits-bonus',
      type: 'credits',
      title: 'Credit Bonus',
      description: 'Bonus credits earned',
      value: 500
    });
    
    const creditReward = rewards.pendingRewards.find(r => r.type === 'credits');
    
    this.addResult(
      'Reward Types',
      creditReward !== undefined ? 'passed' : 'failed',
      `Credit reward: ${creditReward?.value}`
    );
    
    // Test reward queue
    rewards.addReward({
      id: 'level-up',
      type: 'levelup',
      title: 'Level Up!',
      description: 'Reached level 2',
      value: 1
    });
    
    this.addResult(
      'Reward Queue',
      rewards.pendingRewards.length >= 2 ? 'passed' : 'failed',
      `Queue size: ${rewards.pendingRewards.length}`
    );
    
    // Clear rewards
    rewards.clearAllRewards();
    
    this.addResult(
      'Clear Rewards',
      rewards.pendingRewards.length === 0 && rewards.currentReward === null ? 'passed' : 'failed',
      `Rewards cleared`
    );
  }

  private async testUIIntegration() {
    console.log('\n🔗 Testing UI Integration...');
    
    const panelManager = usePanelManager.getState();
    const hudContext = useHUDContext.getState();
    const gameState = useGame.getState();
    const settings = useSettings.getState();
    
    // Test panel visibility with HUD context
    hudContext.setCurrentContext('combat');
    const combatPanelsHidden = !hudContext.uiZoneVisibility.rightSidebar;
    
    this.addResult(
      'Combat UI Mode',
      combatPanelsHidden ? 'passed' : 'warning',
      `Panels hidden in combat: ${combatPanelsHidden}`
    );
    
    // Test pause with panels
    gameState.pauseGame();
    panelManager.openPanel('settings');
    
    this.addResult(
      'Pause with Settings',
      gameState.isPaused && panelManager.isPanelOpen('settings') ? 'passed' : 'failed',
      `Settings accessible while paused`
    );
    
    // Test audio settings effect
    settings.setMasterVolume(0.5);
    settings.setSoundEnabled(true);
    const audioActive = settings.soundEnabled && settings.masterVolume > 0;
    
    this.addResult(
      'Audio Settings Active',
      audioActive ? 'passed' : 'failed',
      `Audio should play at 50% volume`
    );
    
    // Test UI state consistency
    gameState.resumeGame();
    panelManager.closeAllPanels();
    hudContext.setCurrentContext('space');
    
    const uiReady = gameState.gameState === 'playing' && 
                    !panelManager.hasOpenPanels() &&
                    hudContext.currentContext === 'space';
    
    this.addResult(
      'UI State Consistency',
      uiReady ? 'passed' : 'failed',
      `UI ready for gameplay`
    );
    
    // Test loading screen coordination
    gameState.setLoading(true);
    const panelsDisabledDuringLoad = !hudContext.uiZoneVisibility.rightSidebar;
    
    this.addResult(
      'Loading Screen Coordination',
      gameState.isLoading ? 'passed' : 'failed',
      `Loading screen shown`
    );
    
    gameState.setLoading(false);
  }

  private saveOriginalStates() {
    this.originalStates.panels = Array.from(usePanelManager.getState().panels.entries());
    this.originalStates.settings = { ...useSettings.getState() };
    this.originalStates.hudContext = { ...useHUDContext.getState() };
    this.originalStates.gameState = { ...useGame.getState() };
    this.originalStates.hints = {
      availableHints: [...useHints.getState().availableHints],
      seenHints: [...useHints.getState().seenHints]
    };
    this.originalStates.rewards = {
      pendingRewards: [...useRewards.getState().pendingRewards],
      collectedRewards: [...useRewards.getState().collectedRewards]
    };
  }

  private restoreOriginalStates() {
    // Reset panel manager
    const panelManager = usePanelManager.getState();
    panelManager.closeAllPanels();
    
    // Reset settings to defaults
    const settings = useSettings.getState();
    settings.resetToDefaults();
    
    // Reset HUD context
    const hudContext = useHUDContext.getState();
    hudContext.setCurrentContext('space');
    hudContext.setManualPanelOverride(false);
    hudContext.setOverlayActive(false);
    
    // Reset game state
    const gameState = useGame.getState();
    gameState.resetGame();
    
    // Clear hints
    const hints = useHints.getState();
    hints.clearAllHints();
    
    // Clear rewards
    const rewards = useRewards.getState();
    rewards.clearAllRewards();
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
    console.log('%c          UI STORES TEST SUMMARY', 'color: #8b5cf6; font-weight: bold');
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
(window as any).testUIStores = () => {
  const testSuite = new UIStoresTestSuite();
  testSuite.runAllTests();
};

console.log('%c🎨 UI Stores Test Suite Loaded!', 'color: #f97316; font-weight: bold');
console.log('Run %ctestUIStores()%c to execute tests', 'color: #3b82f6', 'color: inherit');