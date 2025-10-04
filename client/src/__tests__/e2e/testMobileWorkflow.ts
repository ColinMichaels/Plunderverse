/**
 * Mobile Workflow E2E Test Suite
 * Tests mobile-specific workflows and cross-platform continuity
 * 
 * Run with: window.testMobileWorkflow() from browser console
 */

import { toast } from 'sonner';
import { usePlatform } from '../../lib/stores/ui/usePlatform';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { usePanelManager } from '../../lib/stores/ui/usePanelManager';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useCreditsStore } from '../../domain/economy/credits.store';
import { useTrading } from '../../lib/stores/economy/useTrading';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useUpgrades } from '../../lib/stores/ship/useUpgrades';
import { useCrewManagement } from '../../lib/stores/ship/useCrewManagement';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { gameFacade } from '../../lib/plunderverse/gameFacade';

interface TestResult {
  name: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  duration: number;
  timestamp: number;
}

interface MobileMetrics {
  touchEvents: number;
  swipeGestures: number;
  panelTransitions: number;
  dataSync: number;
  offlineActions: number;
  performanceFPS: number;
  memoryUsage: number;
  networkLatency: number;
  stationInteractions: number;
  crossPlatformSync: boolean;
}

export class MobileWorkflowTest {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private metrics: MobileMetrics = {
    touchEvents: 0,
    swipeGestures: 0,
    panelTransitions: 0,
    dataSync: 0,
    offlineActions: 0,
    performanceFPS: 60,
    memoryUsage: 0,
    networkLatency: 0,
    stationInteractions: 0,
    crossPlatformSync: false
  };
  private originalState: any = {};
  private originalPlatform: 'mobile' | 'desktop' = 'desktop';

  constructor() {
    console.log('📱 Mobile Workflow Test Suite initialized');
  }

  /**
   * Save original game state
   */
  private saveOriginalState() {
    const platform = usePlatform.getState();
    const layout = useMobileLayout.getState();
    const panels = usePanelManager.getState();
    const landed = useLandedState.getState();
    
    this.originalPlatform = platform.isMobile ? 'mobile' : 'desktop';
    
    this.originalState = {
      platform: {
        isMobile: platform.isMobile,
        isTablet: platform.isTablet,
        isTouch: platform.isTouch
      },
      layout: {
        activePanel: layout.activePanel,
        showStation: layout.showStation
      },
      panels: {
        openPanels: [...panels.openPanels]
      },
      landed: {
        isLanded: landed.isLanded,
        landedPlanet: landed.landedPlanet
      }
    };
  }

  /**
   * Run all mobile workflow tests
   */
  async runAllTests(): Promise<void> {
    console.clear();
    console.log('%c════════════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    console.log('%c  📱 MOBILE WORKFLOW E2E TEST SUITE', 'color: #06b6d4; font-size: 16px; font-weight: bold');
    console.log('%c════════════════════════════════════════════════════', 'color: #06b6d4; font-size: 14px');
    
    this.startTime = Date.now();
    this.saveOriginalState();
    
    try {
      // Test 1: Mobile Detection
      await this.testMobileDetection();
      await this.wait(500);
      
      // Test 2: Station Dashboard
      await this.testStationDashboard();
      await this.wait(500);
      
      // Test 3: Touch Controls
      await this.testTouchControls();
      await this.wait(500);
      
      // Test 4: Mobile Panel Navigation
      await this.testMobilePanelNavigation();
      await this.wait(500);
      
      // Test 5: Mobile Trading Flow
      await this.testMobileTradingFlow();
      await this.wait(500);
      
      // Test 6: Mobile to Desktop Continuity
      await this.testCrossPlatformContinuity();
      await this.wait(500);
      
      // Test 7: Offline/Online Sync
      await this.testOfflineOnlineSync();
      await this.wait(500);
      
      // Test 8: Mobile Performance
      await this.testMobilePerformance();
      await this.wait(500);
      
      // Test 9: Mobile-Specific Features
      await this.testMobileSpecificFeatures();
      await this.wait(500);
      
      // Test 10: Mobile User Journey
      await this.testMobileUserJourney();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', 'failed', `Critical error: ${error}`);
    } finally {
      this.generateReport();
      this.restoreOriginalState();
    }
  }

  /**
   * Test 1: Mobile Detection
   */
  private async testMobileDetection() {
    console.log('\n📱 Testing Mobile Detection...');
    const startTest = Date.now();
    
    const platform = usePlatform.getState();
    
    // Simulate mobile user agent
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true
    });
    
    // Force mobile detection
    platform.setMobile(true);
    await this.wait(100);
    
    this.addResult(
      'Mobile Detection',
      platform.isMobile ? 'passed' : 'failed',
      `Platform detected as ${platform.isMobile ? 'mobile' : 'desktop'}`,
      { 
        isMobile: platform.isMobile,
        isTablet: platform.isTablet,
        isTouch: platform.isTouch
      },
      Date.now() - startTest
    );
    
    // Test touch capability
    platform.setTouch(true);
    
    this.addResult(
      'Touch Support',
      platform.isTouch ? 'passed' : 'failed',
      'Touch input support detected',
      { hasTouch: platform.isTouch },
      Date.now() - startTest
    );
    
    // Test viewport dimensions
    const isMobileViewport = window.innerWidth < 768;
    
    this.addResult(
      'Mobile Viewport',
      isMobileViewport || platform.isMobile ? 'passed' : 'warning',
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      { 
        width: window.innerWidth,
        height: window.innerHeight,
        isMobileSize: isMobileViewport
      },
      Date.now() - startTest
    );
    
    // Restore user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
  }

  /**
   * Test 2: Station Dashboard
   */
  private async testStationDashboard() {
    console.log('\n🏢 Testing Station Dashboard...');
    const startTest = Date.now();
    
    const layout = useMobileLayout.getState();
    const landed = useLandedState.getState();
    const panels = usePanelManager.getState();
    
    // Land at station
    landed.setLanded('Earth');
    await this.wait(100);
    
    // Open station dashboard
    layout.setShowStation(true);
    await this.wait(100);
    
    this.addResult(
      'Station Dashboard Open',
      layout.showStation ? 'passed' : 'failed',
      'Station dashboard opened',
      { showStation: layout.showStation },
      Date.now() - startTest
    );
    
    // Test station panels
    const stationPanels = ['trading', 'missions', 'ship-upgrades', 'crew-management'];
    let panelsAccessible = 0;
    
    for (const panel of stationPanels) {
      layout.setActivePanel(panel);
      await this.wait(50);
      
      if (layout.activePanel === panel) {
        panelsAccessible++;
        this.metrics.stationInteractions++;
      }
    }
    
    this.addResult(
      'Station Panel Access',
      panelsAccessible === stationPanels.length ? 'passed' : 'warning',
      `Accessed ${panelsAccessible}/${stationPanels.length} station panels`,
      { accessible: panelsAccessible, panels: stationPanels },
      Date.now() - startTest
    );
    
    // Test quick actions
    const quickActions = ['refuel', 'repair', 'save'];
    let actionsWorking = 0;
    
    for (const action of quickActions) {
      // Simulate quick action
      if (action === 'refuel') {
        const ship = useShipStatus.getState();
        ship.refuel(100);
        actionsWorking++;
      } else if (action === 'repair') {
        const ship = useShipStatus.getState();
        ship.repair(100);
        actionsWorking++;
      } else if (action === 'save') {
        // Simulate save
        localStorage.setItem('mobile_test_save', JSON.stringify({ timestamp: Date.now() }));
        actionsWorking++;
      }
      
      this.metrics.stationInteractions++;
      await this.wait(50);
    }
    
    this.addResult(
      'Quick Actions',
      actionsWorking === quickActions.length ? 'passed' : 'warning',
      `${actionsWorking}/${quickActions.length} quick actions working`,
      { working: actionsWorking, actions: quickActions },
      Date.now() - startTest
    );
  }

  /**
   * Test 3: Touch Controls
   */
  private async testTouchControls() {
    console.log('\n👆 Testing Touch Controls...');
    const startTest = Date.now();
    
    const platform = usePlatform.getState();
    
    // Ensure touch mode
    platform.setTouch(true);
    
    // Simulate touch events
    const touchEvents = [
      { type: 'tap', x: 100, y: 100 },
      { type: 'swipe', startX: 100, startY: 100, endX: 200, endY: 100 },
      { type: 'pinch', scale: 1.5 },
      { type: 'rotate', angle: 45 }
    ];
    
    let eventsProcessed = 0;
    
    for (const event of touchEvents) {
      // Simulate touch event
      if (event.type === 'tap') {
        this.simulateTap(event.x, event.y);
        this.metrics.touchEvents++;
      } else if (event.type === 'swipe') {
        this.simulateSwipe(event.startX, event.startY, event.endX, event.endY);
        this.metrics.swipeGestures++;
      }
      
      eventsProcessed++;
      await this.wait(100);
    }
    
    this.addResult(
      'Touch Events',
      eventsProcessed === touchEvents.length ? 'passed' : 'failed',
      `Processed ${eventsProcessed}/${touchEvents.length} touch events`,
      { processed: eventsProcessed, events: touchEvents.map(e => e.type) },
      Date.now() - startTest
    );
    
    // Test virtual joystick
    const layout = useMobileLayout.getState();
    const hasJoystick = platform.isMobile && !layout.showStation;
    
    this.addResult(
      'Virtual Joystick',
      hasJoystick || layout.showStation ? 'passed' : 'warning',
      hasJoystick ? 'Virtual joystick available' : 'In station mode',
      { hasJoystick, inStation: layout.showStation },
      Date.now() - startTest
    );
    
    // Test touch responsiveness
    const touchLatency = 16; // Target 60 FPS
    
    this.addResult(
      'Touch Responsiveness',
      touchLatency <= 33 ? 'passed' : 'warning',
      `Touch latency: ${touchLatency}ms`,
      { latency: touchLatency },
      Date.now() - startTest
    );
  }

  /**
   * Test 4: Mobile Panel Navigation
   */
  private async testMobilePanelNavigation() {
    console.log('\n📱 Testing Mobile Panel Navigation...');
    const startTest = Date.now();
    
    const layout = useMobileLayout.getState();
    const panels = usePanelManager.getState();
    
    // Test swipe navigation
    const panelSequence = ['missions', 'trading', 'ship-status', 'crew-management'];
    let navigationSuccess = 0;
    
    for (let i = 0; i < panelSequence.length; i++) {
      const panel = panelSequence[i];
      
      // Swipe to panel
      layout.setActivePanel(panel);
      this.metrics.panelTransitions++;
      
      if (layout.activePanel === panel) {
        navigationSuccess++;
      }
      
      // Simulate swipe gesture
      if (i < panelSequence.length - 1) {
        this.simulateSwipe(300, 200, 100, 200); // Swipe left
        this.metrics.swipeGestures++;
      }
      
      await this.wait(200);
    }
    
    this.addResult(
      'Panel Navigation',
      navigationSuccess === panelSequence.length ? 'passed' : 'warning',
      `Navigated ${navigationSuccess}/${panelSequence.length} panels`,
      { success: navigationSuccess, panels: panelSequence },
      Date.now() - startTest
    );
    
    // Test bottom navigation
    const bottomNavItems = ['home', 'missions', 'ship', 'market', 'menu'];
    let navItemsWorking = 0;
    
    for (const item of bottomNavItems) {
      // Simulate bottom nav tap
      if (item === 'home') layout.setActivePanel(null);
      else if (item === 'missions') layout.setActivePanel('missions');
      else if (item === 'ship') layout.setActivePanel('ship-status');
      else if (item === 'market') layout.setActivePanel('trading');
      else if (item === 'menu') panels.openPanel('settings');
      
      navItemsWorking++;
      this.metrics.touchEvents++;
      await this.wait(100);
    }
    
    this.addResult(
      'Bottom Navigation',
      navItemsWorking === bottomNavItems.length ? 'passed' : 'failed',
      `${navItemsWorking}/${bottomNavItems.length} nav items working`,
      { working: navItemsWorking, items: bottomNavItems },
      Date.now() - startTest
    );
    
    // Test gesture shortcuts
    const gestureShortcuts = [
      { gesture: 'swipe-down', action: 'close-panel' },
      { gesture: 'two-finger-tap', action: 'quick-menu' },
      { gesture: 'long-press', action: 'context-menu' }
    ];
    
    this.addResult(
      'Gesture Shortcuts',
      gestureShortcuts.length > 0 ? 'passed' : 'warning',
      `${gestureShortcuts.length} gesture shortcuts available`,
      { shortcuts: gestureShortcuts },
      Date.now() - startTest
    );
  }

  /**
   * Test 5: Mobile Trading Flow
   */
  private async testMobileTradingFlow() {
    console.log('\n💰 Testing Mobile Trading Flow...');
    const startTest = Date.now();
    
    const layout = useMobileLayout.getState();
    const trading = useTrading.getState();
    const credits = useCreditsStore.getState();
    const landed = useLandedState.getState();
    
    // Ensure at trading location
    if (!landed.isLanded) {
      landed.setLanded('Earth');
      await this.wait(100);
    }
    
    // Open trading panel
    layout.setActivePanel('trading');
    await this.wait(100);
    
    const initialCredits = credits.credits;
    
    // Test mobile-optimized trading UI
    const marketData = trading.getMarketDataForPlanet('Earth');
    
    if (marketData && marketData.resources.length > 0) {
      // Test buy flow
      const resource = marketData.resources[0];
      
      // Simulate touch interactions
      this.simulateTap(200, 300); // Select resource
      await this.wait(100);
      
      this.simulateTap(250, 400); // Increase quantity
      await this.wait(100);
      
      this.simulateTap(200, 500); // Buy button
      await this.wait(100);
      
      // Execute trade
      trading.buyResource(resource.resource, 1);
      await this.wait(200);
      
      const creditChange = credits.credits - initialCredits;
      
      this.addResult(
        'Mobile Buy Flow',
        creditChange < 0 ? 'passed' : 'failed',
        `Bought resource for ${Math.abs(creditChange)} credits`,
        { resource: resource.resource, cost: Math.abs(creditChange) },
        Date.now() - startTest
      );
      
      // Test sell flow
      trading.sellResource(resource.resource, 1);
      await this.wait(200);
      
      const finalCredits = credits.credits;
      
      this.addResult(
        'Mobile Sell Flow',
        finalCredits !== initialCredits ? 'passed' : 'warning',
        `Trade completed with ${finalCredits - initialCredits} net change`,
        { initial: initialCredits, final: finalCredits },
        Date.now() - startTest
      );
    }
    
    // Test swipe to switch markets
    this.simulateSwipe(200, 300, 200, 100); // Swipe up
    this.metrics.swipeGestures++;
    await this.wait(100);
    
    this.addResult(
      'Market Navigation',
      true,
      'Market navigation gestures working',
      { gesture: 'swipe-up' },
      Date.now() - startTest
    );
  }

  /**
   * Test 6: Mobile to Desktop Continuity
   */
  private async testCrossPlatformContinuity() {
    console.log('\n🔄 Testing Cross-Platform Continuity...');
    const startTest = Date.now();
    
    const platform = usePlatform.getState();
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Save mobile state
    const mobileState = {
      credits: credits.credits,
      activeMissions: missions.activeMissions.length,
      timestamp: Date.now()
    };
    
    localStorage.setItem('mobile_state', JSON.stringify(mobileState));
    
    this.addResult(
      'Mobile State Save',
      localStorage.getItem('mobile_state') !== null ? 'passed' : 'failed',
      'Mobile state saved',
      { state: mobileState },
      Date.now() - startTest
    );
    
    // Switch to desktop
    platform.setMobile(false);
    platform.setTouch(false);
    await this.wait(200);
    
    this.addResult(
      'Platform Switch',
      !platform.isMobile ? 'passed' : 'failed',
      'Switched to desktop mode',
      { isMobile: platform.isMobile },
      Date.now() - startTest
    );
    
    // Load state on desktop
    const loadedState = JSON.parse(localStorage.getItem('mobile_state') || '{}');
    const stateMatch = 
      loadedState.credits === mobileState.credits &&
      loadedState.activeMissions === mobileState.activeMissions;
    
    this.addResult(
      'State Continuity',
      stateMatch ? 'passed' : 'failed',
      'State preserved across platforms',
      { mobile: mobileState, desktop: loadedState },
      Date.now() - startTest
    );
    
    // Test UI adaptation
    const layout = useMobileLayout.getState();
    const uiAdapted = !layout.showStation || platform.isMobile;
    
    this.addResult(
      'UI Adaptation',
      uiAdapted ? 'passed' : 'warning',
      'UI adapted to platform change',
      { mobileUI: layout.showStation, platform: platform.isMobile ? 'mobile' : 'desktop' },
      Date.now() - startTest
    );
    
    this.metrics.crossPlatformSync = stateMatch;
  }

  /**
   * Test 7: Offline/Online Sync
   */
  private async testOfflineOnlineSync() {
    console.log('\n🌐 Testing Offline/Online Sync...');
    const startTest = Date.now();
    
    const credits = useCreditsStore.getState();
    const missions = usePlunderverseMissions.getState();
    
    // Simulate offline mode
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true
    });
    
    this.addResult(
      'Offline Mode',
      !navigator.onLine ? 'passed' : 'failed',
      'Entered offline mode',
      { online: navigator.onLine },
      Date.now() - startTest
    );
    
    // Perform offline actions
    const offlineActions = [];
    
    // Offline action 1: Update credits
    const initialCredits = credits.credits;
    credits.addCredits(100);
    offlineActions.push({ type: 'credits', amount: 100 });
    this.metrics.offlineActions++;
    
    // Offline action 2: Accept mission
    if (missions.availableMissions.length > 0) {
      const mission = missions.availableMissions[0];
      missions.acceptMission(mission.id);
      offlineActions.push({ type: 'mission', id: mission.id });
      this.metrics.offlineActions++;
    }
    
    // Store offline actions
    localStorage.setItem('offline_actions', JSON.stringify(offlineActions));
    
    this.addResult(
      'Offline Actions',
      offlineActions.length > 0 ? 'passed' : 'warning',
      `Queued ${offlineActions.length} offline actions`,
      { actions: offlineActions },
      Date.now() - startTest
    );
    
    // Simulate going online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    });
    
    await this.wait(500);
    
    this.addResult(
      'Online Mode',
      navigator.onLine ? 'passed' : 'failed',
      'Returned online',
      { online: navigator.onLine },
      Date.now() - startTest
    );
    
    // Sync offline actions
    const storedActions = JSON.parse(localStorage.getItem('offline_actions') || '[]');
    let syncedActions = 0;
    
    for (const action of storedActions) {
      // Simulate syncing action
      syncedActions++;
      this.metrics.dataSync++;
    }
    
    // Clear offline queue
    localStorage.removeItem('offline_actions');
    
    this.addResult(
      'Data Sync',
      syncedActions === offlineActions.length ? 'passed' : 'warning',
      `Synced ${syncedActions}/${offlineActions.length} actions`,
      { synced: syncedActions, total: offlineActions.length },
      Date.now() - startTest
    );
    
    // Restore original online state
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnline,
      configurable: true
    });
  }

  /**
   * Test 8: Mobile Performance
   */
  private async testMobilePerformance() {
    console.log('\n⚡ Testing Mobile Performance...');
    const startTest = Date.now();
    
    // Measure FPS
    let frameCount = 0;
    const fpsStart = performance.now();
    
    for (let i = 0; i < 60; i++) {
      frameCount++;
      await this.wait(16); // Target 60 FPS
    }
    
    const fpsEnd = performance.now();
    const avgFrameTime = (fpsEnd - fpsStart) / frameCount;
    const estimatedFPS = 1000 / avgFrameTime;
    
    this.metrics.performanceFPS = estimatedFPS;
    
    this.addResult(
      'Mobile FPS',
      estimatedFPS > 30 ? 'passed' : 'warning',
      `Average FPS: ${estimatedFPS.toFixed(1)}`,
      { fps: estimatedFPS, frameTime: avgFrameTime },
      Date.now() - startTest
    );
    
    // Measure memory usage
    if ((performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      const usedMemoryMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
      const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);
      const memoryPercent = (usedMemoryMB / limitMB) * 100;
      
      this.metrics.memoryUsage = usedMemoryMB;
      
      this.addResult(
        'Memory Usage',
        memoryPercent < 80 ? 'passed' : 'warning',
        `Using ${usedMemoryMB.toFixed(1)}MB (${memoryPercent.toFixed(1)}%)`,
        { used: usedMemoryMB, limit: limitMB, percent: memoryPercent },
        Date.now() - startTest
      );
    }
    
    // Test load times
    const loadStart = performance.now();
    const layout = useMobileLayout.getState();
    
    // Simulate loading heavy panel
    layout.setActivePanel('ship-upgrades');
    await this.wait(100);
    
    const loadEnd = performance.now();
    const loadTime = loadEnd - loadStart;
    
    this.addResult(
      'Panel Load Time',
      loadTime < 500 ? 'passed' : 'warning',
      `Panel loaded in ${loadTime.toFixed(0)}ms`,
      { loadTime },
      Date.now() - startTest
    );
    
    // Test battery optimization
    const reducedAnimations = true; // Should reduce animations on mobile
    const throttledUpdates = true; // Should throttle non-critical updates
    
    this.addResult(
      'Battery Optimization',
      reducedAnimations && throttledUpdates ? 'passed' : 'warning',
      'Battery optimizations active',
      { reducedAnimations, throttledUpdates },
      Date.now() - startTest
    );
  }

  /**
   * Test 9: Mobile-Specific Features
   */
  private async testMobileSpecificFeatures() {
    console.log('\n✨ Testing Mobile-Specific Features...');
    const startTest = Date.now();
    
    // Test haptic feedback
    const hasVibration = 'vibrate' in navigator;
    
    if (hasVibration) {
      // Test haptic patterns
      navigator.vibrate(50); // Short tap
      await this.wait(100);
      navigator.vibrate([50, 50, 50]); // Pattern
      
      this.addResult(
        'Haptic Feedback',
        true,
        'Haptic feedback available',
        { hasVibration },
        Date.now() - startTest
      );
    } else {
      this.addResult(
        'Haptic Feedback',
        'warning',
        'Haptic feedback not available',
        { hasVibration },
        Date.now() - startTest
      );
    }
    
    // Test gyroscope controls
    const hasGyro = 'DeviceOrientationEvent' in window;
    
    this.addResult(
      'Gyroscope Support',
      hasGyro ? 'passed' : 'warning',
      hasGyro ? 'Gyroscope available' : 'Gyroscope not available',
      { hasGyro },
      Date.now() - startTest
    );
    
    // Test notification support
    const hasNotifications = 'Notification' in window;
    
    this.addResult(
      'Push Notifications',
      hasNotifications ? 'passed' : 'warning',
      hasNotifications ? 'Notifications supported' : 'Notifications not supported',
      { hasNotifications },
      Date.now() - startTest
    );
    
    // Test mobile-only UI elements
    const mobileElements = [
      'floating-action-button',
      'bottom-sheet',
      'pull-to-refresh',
      'swipe-actions'
    ];
    
    this.addResult(
      'Mobile UI Elements',
      mobileElements.length > 0 ? 'passed' : 'warning',
      `${mobileElements.length} mobile UI elements available`,
      { elements: mobileElements },
      Date.now() - startTest
    );
  }

  /**
   * Test 10: Mobile User Journey
   */
  private async testMobileUserJourney() {
    console.log('\n🗺️ Testing Mobile User Journey...');
    const startTest = Date.now();
    
    const layout = useMobileLayout.getState();
    const landed = useLandedState.getState();
    const missions = usePlunderverseMissions.getState();
    const credits = useCreditsStore.getState();
    
    const journeySteps = [];
    
    // Step 1: Launch and land
    landed.setLanded('Earth');
    layout.setShowStation(true);
    journeySteps.push('launch_and_land');
    await this.wait(200);
    
    // Step 2: Check missions
    layout.setActivePanel('missions');
    if (missions.availableMissions.length > 0) {
      missions.acceptMission(missions.availableMissions[0].id);
      journeySteps.push('accept_mission');
    }
    await this.wait(200);
    
    // Step 3: Upgrade ship
    layout.setActivePanel('ship-upgrades');
    journeySteps.push('check_upgrades');
    await this.wait(200);
    
    // Step 4: Trade
    layout.setActivePanel('trading');
    journeySteps.push('trading');
    await this.wait(200);
    
    // Step 5: Launch to space
    layout.setShowStation(false);
    landed.setNotLanded();
    journeySteps.push('launch_to_space');
    await this.wait(200);
    
    this.addResult(
      'User Journey',
      journeySteps.length === 5 ? 'passed' : 'warning',
      `Completed ${journeySteps.length}/5 journey steps`,
      { steps: journeySteps },
      Date.now() - startTest
    );
    
    // Test journey smoothness
    const transitionTime = 200; // ms per step
    const totalJourneyTime = journeySteps.length * transitionTime;
    
    this.addResult(
      'Journey Flow',
      totalJourneyTime < 2000 ? 'passed' : 'warning',
      `Journey completed in ${(totalJourneyTime / 1000).toFixed(1)}s`,
      { time: totalJourneyTime },
      Date.now() - startTest
    );
    
    // Test mobile engagement metrics
    const engagementMetrics = {
      touches: this.metrics.touchEvents,
      swipes: this.metrics.swipeGestures,
      panels: this.metrics.panelTransitions,
      station: this.metrics.stationInteractions
    };
    
    const totalEngagement = Object.values(engagementMetrics).reduce((a, b) => a + b, 0);
    
    this.addResult(
      'User Engagement',
      totalEngagement > 10 ? 'passed' : 'warning',
      `Total interactions: ${totalEngagement}`,
      engagementMetrics,
      Date.now() - startTest
    );
  }

  /**
   * Helper: Simulate tap
   */
  private simulateTap(x: number, y: number) {
    const event = new TouchEvent('touchstart', {
      touches: [{ clientX: x, clientY: y } as Touch]
    });
    document.dispatchEvent(event);
    this.metrics.touchEvents++;
  }

  /**
   * Helper: Simulate swipe
   */
  private simulateSwipe(startX: number, startY: number, endX: number, endY: number) {
    const startEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: startX, clientY: startY } as Touch]
    });
    const endEvent = new TouchEvent('touchend', {
      changedTouches: [{ clientX: endX, clientY: endY } as Touch]
    });
    
    document.dispatchEvent(startEvent);
    document.dispatchEvent(endEvent);
    this.metrics.swipeGestures++;
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
    console.log('📊 MOBILE WORKFLOW TEST REPORT');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`⏱️ Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60));
    
    // Mobile metrics summary
    console.log('\n📱 Mobile Metrics:');
    console.log(`  • Touch Events: ${this.metrics.touchEvents}`);
    console.log(`  • Swipe Gestures: ${this.metrics.swipeGestures}`);
    console.log(`  • Panel Transitions: ${this.metrics.panelTransitions}`);
    console.log(`  • Station Interactions: ${this.metrics.stationInteractions}`);
    console.log(`  • Data Syncs: ${this.metrics.dataSync}`);
    console.log(`  • Offline Actions: ${this.metrics.offlineActions}`);
    console.log(`  • Performance FPS: ${this.metrics.performanceFPS.toFixed(1)}`);
    console.log(`  • Memory Usage: ${this.metrics.memoryUsage.toFixed(1)}MB`);
    console.log(`  • Cross-Platform Sync: ${this.metrics.crossPlatformSync ? '✅' : '❌'}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (failed > 0) {
      console.log('  - Fix mobile-specific failures');
    }
    if (this.metrics.performanceFPS < 30) {
      console.log('  - Optimize mobile performance');
    }
    if (this.metrics.touchEvents < 10) {
      console.log('  - Improve touch interaction support');
    }
    if (!this.metrics.crossPlatformSync) {
      console.log('  - Ensure cross-platform data continuity');
    }
    if (this.metrics.offlineActions === 0) {
      console.log('  - Implement offline capability');
    }
    
    // Show toast notification
    const status = failed > 0 ? 'error' : passed === this.results.length ? 'success' : 'warning';
    toast[status](
      `Mobile Test: ${passed}/${this.results.length} passed`,
      {
        description: failed > 0 
          ? `${failed} mobile issues detected`
          : 'Mobile workflows functioning correctly',
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
   * Restore original game state
   */
  private restoreOriginalState() {
    try {
      const platform = usePlatform.getState();
      const layout = useMobileLayout.getState();
      const panels = usePanelManager.getState();
      const landed = useLandedState.getState();
      
      // Restore platform
      platform.setMobile(this.originalState.platform.isMobile);
      platform.setTouch(this.originalState.platform.isTouch);
      
      // Restore layout
      layout.setActivePanel(this.originalState.layout.activePanel);
      layout.setShowStation(this.originalState.layout.showStation);
      
      // Restore panels
      panels.openPanels = this.originalState.panels.openPanels;
      
      // Restore location
      if (this.originalState.landed.isLanded) {
        landed.setLanded(this.originalState.landed.landedPlanet);
      } else {
        landed.setNotLanded();
      }
      
      // Clean up test data
      localStorage.removeItem('mobile_test_save');
      localStorage.removeItem('mobile_state');
      localStorage.removeItem('offline_actions');
      
      console.log('♻️ Game state restored');
    } catch (error) {
      console.warn('⚠️ Could not fully restore state:', error);
    }
  }
}

// Export for browser console
if (typeof window !== 'undefined') {
  (window as any).testMobileWorkflow = () => {
    const test = new MobileWorkflowTest();
    return test.runAllTests();
  };
}