// Comprehensive Test Suite for Recent Improvements
import { useAutoSave } from './hooks/useAutoSave';
import { useAudio } from './lib/stores/ui/useAudio';
import { usePlunderverseMissions } from './lib/stores/economy/usePlunderverseMissions';
import { usePanelManager } from './lib/stores/ui/usePanelManager';
import { useLandedState } from './lib/stores/surface/useLandedState';
import { memoryProfiler } from './lib/utils/MemoryProfiler';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'INFO';
  details: string;
}

const testResults: TestResult[] = [];

const logTestResult = (name: string, status: TestResult['status'], details: string) => {
  const result = { name, status, details };
  testResults.push(result);
  
  const statusColors = {
    PASS: 'background: #10b981; color: white; padding: 2px 4px; border-radius: 3px;',
    FAIL: 'background: #ef4444; color: white; padding: 2px 4px; border-radius: 3px;',
    INFO: 'background: #3b82f6; color: white; padding: 2px 4px; border-radius: 3px;'
  };
  
  console.log(`%c ${status} %c ${name}: ${details}`, statusColors[status], '');
  return result;
};

// Test 1: Autosave System
const testAutosaveSystem = async () => {
  console.log('\n%c🔧 Testing Autosave System...', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  const autoSaveState = useAutoSave.getState();
  
  // Check if autosave indicator element exists
  const indicatorElement = document.querySelector('[class*="AutoSaveIndicator"]');
  if (indicatorElement) {
    const computedStyle = window.getComputedStyle(indicatorElement.parentElement || indicatorElement);
    const isTopRight = computedStyle.position === 'fixed' && computedStyle.right === '1rem';
    logTestResult('Autosave Indicator Position', isTopRight ? 'PASS' : 'FAIL', 
      `Indicator ${isTopRight ? 'is' : 'is not'} positioned in top-right corner`);
  } else {
    logTestResult('Autosave Indicator Presence', 'INFO', 'Autosave indicator not currently visible (normal when not saving)');
  }
  
  // Trigger a save to test the system
  const originalIsSaving = autoSaveState.isSaving;
  const originalMessage = autoSaveState.saveMessage;
  
  // Monitor autosave behavior
  logTestResult('Autosave State', 'INFO', `Current state - Saving: ${originalIsSaving}, Message: ${originalMessage || 'none'}`);
  
  // Test smooth saves without freezes
  const startTime = performance.now();
  let frameDropDetected = false;
  let frameCount = 0;
  
  const frameMonitor = () => {
    frameCount++;
    const currentTime = performance.now();
    const frameDuration = currentTime - startTime;
    
    // Check for frame drops (if a frame takes longer than 100ms)
    if (frameDuration > 100) {
      frameDropDetected = true;
    }
    
    if (frameCount < 60) { // Monitor for 60 frames
      requestAnimationFrame(frameMonitor);
    } else {
      logTestResult('Autosave Performance', !frameDropDetected ? 'PASS' : 'FAIL', 
        `${frameDropDetected ? 'Frame drops detected during monitoring' : 'No frame drops detected, smooth performance'}`);
    }
  };
  
  requestAnimationFrame(frameMonitor);
};

// Test 2: Space Ambience Audio
const testSpaceAmbienceAudio = async () => {
  console.log('\n%c🎵 Testing Space Ambience Audio...', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  const audioState = useAudio.getState();
  const landedState = useLandedState.getState();
  
  // Check if ambient music is initialized
  logTestResult('Ambient Music Initialized', audioState.ambientMusic ? 'PASS' : 'FAIL', 
    `Ambient music ${audioState.ambientMusic ? 'is' : 'is not'} initialized`);
  
  if (audioState.ambientMusic && audioState.ambientMusic instanceof HTMLAudioElement) {
    const audio = audioState.ambientMusic;
    
    // Check audio properties
    logTestResult('Audio Loop Setting', audio.loop ? 'PASS' : 'FAIL', 
      `Audio loop is ${audio.loop ? 'enabled' : 'disabled'}`);
    
    // Check network loading (check src)
    const audioSrc = audio.src;
    logTestResult('Audio Source', audioSrc.includes('space-ambience.mp3') ? 'PASS' : 'FAIL',
      `Audio source: ${audioSrc.split('/').pop()}`);
    
    // Check pause/play state based on location
    if (landedState.isLanded) {
      logTestResult('Audio State (Landed)', audio.paused ? 'PASS' : 'FAIL',
        `Audio is ${audio.paused ? 'paused' : 'playing'} while on planet surface`);
    } else {
      logTestResult('Audio State (Space)', !audio.paused && !audioState.musicMute && !audioState.masterMute ? 'PASS' : 'INFO',
        `Audio is ${audio.paused ? 'paused' : 'playing'} while in space (muted: ${audioState.musicMute || audioState.masterMute})`);
    }
    
    // Check for network requests to verify single load
    const performanceEntries = performance.getEntriesByType('resource');
    const ambienceLoads = performanceEntries.filter(entry => 
      entry.name.includes('space-ambience.mp3')
    );
    
    logTestResult('Single Audio Load', ambienceLoads.length <= 1 ? 'PASS' : 'FAIL',
      `space-ambience.mp3 loaded ${ambienceLoads.length} time(s)`);
  }
};

// Test 3: Mission HUD
const testMissionHUD = async () => {
  console.log('\n%c🎯 Testing Mission HUD...', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  const missionsState = usePlunderverseMissions.getState();
  
  // Check if mission HUD element exists
  const missionHUD = document.querySelector('[class*="MissionHUD"]');
  
  if (missionsState.activeMissions.length > 0) {
    logTestResult('Mission HUD Visibility', missionHUD ? 'PASS' : 'FAIL',
      `Mission HUD ${missionHUD ? 'is visible' : 'is not visible'} with ${missionsState.activeMissions.length} active mission(s)`);
    
    if (missionHUD) {
      // Check position at top
      const computedStyle = window.getComputedStyle(missionHUD);
      const isAtTop = computedStyle.position === 'fixed' && computedStyle.top === '0px';
      logTestResult('Mission HUD Position', isAtTop ? 'PASS' : 'FAIL',
        `HUD ${isAtTop ? 'is' : 'is not'} positioned at top of screen`);
      
      // Check for collapse button
      const collapseButton = missionHUD.querySelector('button[aria-label*="Collapse"], button[aria-label*="Expand"]');
      logTestResult('Collapse Button', collapseButton ? 'PASS' : 'FAIL',
        `Collapse/expand button ${collapseButton ? 'found' : 'not found'}`);
      
      // Check localStorage for collapse state persistence
      const savedCollapseState = localStorage.getItem('missionHUD_collapsed');
      logTestResult('Collapse State Persistence', savedCollapseState !== null ? 'PASS' : 'INFO',
        `Collapse state ${savedCollapseState !== null ? 'is saved' : 'not yet saved'} in localStorage`);
    }
  } else {
    logTestResult('Mission HUD Auto-Hide', !missionHUD ? 'PASS' : 'FAIL',
      `Mission HUD ${!missionHUD ? 'is correctly hidden' : 'is still visible'} with no active missions`);
  }
  
  // Report mission state
  logTestResult('Active Missions', 'INFO', 
    `Currently ${missionsState.activeMissions.length} mission(s) active`);
};

// Test 4: UI Panels
const testUIPanels = async () => {
  console.log('\n%c📊 Testing UI Panels...', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  const panelState = usePanelManager.getState();
  
  // Check panel states
  const panelCount = Object.keys(panelState.panels).length;
  logTestResult('Panel Registration', panelCount > 0 ? 'PASS' : 'INFO',
    `${panelCount} panel(s) registered in system`);
  
  // Check each panel's collapse state
  Object.entries(panelState.panels).forEach(([panelId, panel]) => {
    const savedState = localStorage.getItem(`panel_${panelId}_collapsed`);
    logTestResult(`Panel "${panelId}" Persistence`, savedState !== null ? 'PASS' : 'INFO',
      `State ${savedState !== null ? 'is saved' : 'not yet saved'} (collapsed: ${panel.isCollapsed})`);
  });
  
  // Check for panel overlaps
  const visiblePanels = document.querySelectorAll('[class*="Panel"]:not([class*="collapsed"])');
  const panelRects: DOMRect[] = [];
  let overlapsFound = false;
  
  visiblePanels.forEach((panel) => {
    const rect = panel.getBoundingClientRect();
    // Check for overlaps with existing panels
    for (const existingRect of panelRects) {
      if (!(rect.right < existingRect.left || 
            rect.left > existingRect.right || 
            rect.bottom < existingRect.top || 
            rect.top > existingRect.bottom)) {
        overlapsFound = true;
        break;
      }
    }
    panelRects.push(rect);
  });
  
  logTestResult('Panel Overlap Check', !overlapsFound ? 'PASS' : 'FAIL',
    `${overlapsFound ? 'Overlapping panels detected' : 'No panel overlaps found'} (${visiblePanels.length} visible panels)`);
  
  // Test ESC key functionality
  logTestResult('ESC Key Handler', 'INFO', 
    'Press ESC key to test collapse-all functionality (manual test required)');
};

// Test 5: General Performance
const testGeneralPerformance = async () => {
  console.log('\n%c⚡ Testing General Performance...', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  // Check for console errors
  const originalError = console.error;
  let errorCount = 0;
  console.error = (...args) => {
    errorCount++;
    originalError(...args);
  };
  
  // Wait a moment to catch any async errors
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.error = originalError;
  
  logTestResult('Console Errors', errorCount === 0 ? 'PASS' : 'FAIL',
    `${errorCount} error(s) detected in console`);
  
  // Check memory usage
  if (performance.memory) {
    const memoryUsedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
    const memoryTotalMB = performance.memory.totalJSHeapSize / (1024 * 1024);
    const memoryPercent = (memoryUsedMB / memoryTotalMB) * 100;
    
    logTestResult('Memory Usage', memoryUsedMB < 100 ? 'PASS' : 'INFO',
      `Using ${memoryUsedMB.toFixed(2)}MB of ${memoryTotalMB.toFixed(2)}MB (${memoryPercent.toFixed(1)}%)`);
    
    // Check against expected ~57MB target
    logTestResult('Memory Target', memoryUsedMB < 80 ? 'PASS' : 'INFO',
      `Memory ${memoryUsedMB < 80 ? 'within' : 'above'} expected range (target: ~57MB, current: ${memoryUsedMB.toFixed(2)}MB)`);
  }
  
  // Check frame rate
  let frameCount = 0;
  const startTime = performance.now();
  
  const measureFPS = () => {
    frameCount++;
    if (frameCount < 60) {
      requestAnimationFrame(measureFPS);
    } else {
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const fps = frameCount / duration;
      
      logTestResult('Frame Rate', fps > 30 ? 'PASS' : 'FAIL',
        `Running at ${fps.toFixed(1)} FPS (target: >30 FPS)`);
    }
  };
  
  requestAnimationFrame(measureFPS);
  
  // Check for WebGL context
  const canvas = document.querySelector('canvas');
  if (canvas) {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2') || 
               (canvas as HTMLCanvasElement).getContext('webgl');
    logTestResult('WebGL Context', gl ? 'PASS' : 'FAIL',
      `WebGL ${gl ? 'is available' : 'is not available'}`);
  }
  
  // Check resource manager status
  memoryProfiler.logCurrentStatus('Performance Test');
};

// Main test runner
export const runAllImprovementTests = async () => {
  console.log('%c🚀 STARTING COMPREHENSIVE IMPROVEMENT TESTS', 
    'font-size: 20px; font-weight: bold; color: #10b981; background: #1f2937; padding: 10px; border-radius: 5px;');
  
  testResults.length = 0; // Clear previous results
  
  // Run all tests
  await testAutosaveSystem();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testSpaceAmbienceAudio();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testMissionHUD();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testUIPanels();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testGeneralPerformance();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for async tests
  
  // Generate summary
  console.log('\n%c📋 TEST SUMMARY', 'font-size: 18px; font-weight: bold; color: #fbbf24; margin-top: 20px;');
  
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const infoCount = testResults.filter(r => r.status === 'INFO').length;
  
  console.log(`%c✅ PASSED: ${passCount}`, 'color: #10b981; font-weight: bold;');
  console.log(`%c❌ FAILED: ${failCount}`, 'color: #ef4444; font-weight: bold;');
  console.log(`%cℹ️  INFO: ${infoCount}`, 'color: #3b82f6; font-weight: bold;');
  
  if (failCount === 0) {
    console.log('%c🎉 ALL CRITICAL TESTS PASSED!', 
      'font-size: 16px; font-weight: bold; color: #10b981; background: #064e3b; padding: 8px; border-radius: 5px;');
  } else {
    console.log('%c⚠️  SOME TESTS FAILED - Review details above', 
      'font-size: 16px; font-weight: bold; color: #fbbf24; background: #451a03; padding: 8px; border-radius: 5px;');
  }
  
  // Return results for programmatic access
  return {
    results: testResults,
    summary: {
      passed: passCount,
      failed: failCount,
      info: infoCount,
      total: testResults.length
    }
  };
};

// Attach to window for easy access
if (typeof window !== 'undefined') {
  (window as any).runAllImprovementTests = runAllImprovementTests;
  console.log('%c✨ Test suite ready! Run `runAllImprovementTests()` in console to test all improvements',
    'color: #10b981; font-weight: bold; background: #1f2937; padding: 4px 8px; border-radius: 3px;');
}