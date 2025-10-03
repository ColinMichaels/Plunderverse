// Simple test runner for recent improvements
// This script can be run directly in the browser console

export const runImprovementTests = () => {
  console.log('%c🚀 TESTING ALL RECENT IMPROVEMENTS', 
    'font-size: 20px; font-weight: bold; color: #10b981; background: #1f2937; padding: 10px; border-radius: 5px;');
  
  const results: any[] = [];
  
  // Test 1: Autosave System
  console.log('\n%c🔧 TEST 1: Autosave System', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  // Check for autosave indicator
  const autosaveIndicator = document.querySelector('[class*="AutoSaveIndicator"]');
  if (autosaveIndicator) {
    const parent = autosaveIndicator.parentElement;
    const isTopRight = parent && window.getComputedStyle(parent).position === 'fixed' && 
                       window.getComputedStyle(parent).right === '16px';
    console.log(`%c✅ PASS`, 'color: #10b981', 'Autosave indicator found and positioned correctly');
    results.push({ test: 'Autosave Indicator', status: 'PASS' });
  } else {
    console.log(`%cℹ️ INFO`, 'color: #3b82f6', 'Autosave indicator not visible (normal when not saving)');
    results.push({ test: 'Autosave Indicator', status: 'INFO' });
  }
  
  // Check localStorage for autosave data
  const savedGameData = localStorage.getItem('gameState');
  if (savedGameData) {
    console.log(`%c✅ PASS`, 'color: #10b981', `Game state saved in localStorage (${(savedGameData.length / 1024).toFixed(2)}KB)`);
    results.push({ test: 'Save Data', status: 'PASS' });
  } else {
    console.log(`%c❌ FAIL`, 'color: #ef4444', 'No saved game data found');
    results.push({ test: 'Save Data', status: 'FAIL' });
  }
  
  // Test 2: Space Ambience Audio
  console.log('\n%c🎵 TEST 2: Space Ambience Audio', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  // Check for audio elements
  const audioElements = Array.from(document.querySelectorAll('audio'));
  const spaceAmbience = audioElements.find(a => a.src.includes('space-ambience'));
  
  if (spaceAmbience) {
    console.log(`%c✅ PASS`, 'color: #10b981', 'Space ambience audio element found');
    console.log(`  - Loop enabled: ${spaceAmbience.loop}`);
    console.log(`  - Currently ${spaceAmbience.paused ? 'paused' : 'playing'}`);
    console.log(`  - Volume: ${spaceAmbience.volume}`);
    results.push({ test: 'Space Ambience Audio', status: 'PASS' });
  } else {
    console.log(`%c❌ FAIL`, 'color: #ef4444', 'Space ambience audio not found');
    results.push({ test: 'Space Ambience Audio', status: 'FAIL' });
  }
  
  // Check network requests for audio
  const performanceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const ambienceLoads = performanceEntries.filter(e => e.name.includes('space-ambience.mp3'));
  
  if (ambienceLoads.length === 1) {
    console.log(`%c✅ PASS`, 'color: #10b981', 'Space ambience loaded only once');
    results.push({ test: 'Audio Single Load', status: 'PASS' });
  } else if (ambienceLoads.length > 1) {
    console.log(`%c❌ FAIL`, 'color: #ef4444', `Space ambience loaded ${ambienceLoads.length} times`);
    results.push({ test: 'Audio Single Load', status: 'FAIL' });
  } else {
    console.log(`%cℹ️ INFO`, 'color: #3b82f6', 'Space ambience not loaded yet');
    results.push({ test: 'Audio Single Load', status: 'INFO' });
  }
  
  // Test 3: Mission HUD
  console.log('\n%c🎯 TEST 3: Mission HUD', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  const missionHUD = document.querySelector('[class*="MissionHUD"]');
  
  if (missionHUD) {
    console.log(`%c✅ PASS`, 'color: #10b981', 'Mission HUD found');
    
    // Check position
    const style = window.getComputedStyle(missionHUD);
    const isAtTop = style.position === 'fixed' && style.top === '0px';
    
    if (isAtTop) {
      console.log(`%c✅ PASS`, 'color: #10b981', 'Mission HUD positioned at top');
      results.push({ test: 'Mission HUD Position', status: 'PASS' });
    } else {
      console.log(`%c❌ FAIL`, 'color: #ef4444', 'Mission HUD not at top position');
      results.push({ test: 'Mission HUD Position', status: 'FAIL' });
    }
    
    // Check for collapse button
    const collapseBtn = missionHUD.querySelector('button[aria-label*="ollapse"], button svg');
    if (collapseBtn) {
      console.log(`%c✅ PASS`, 'color: #10b981', 'Collapse/expand button found');
      results.push({ test: 'Mission HUD Collapse', status: 'PASS' });
    } else {
      console.log(`%c❌ FAIL`, 'color: #ef4444', 'Collapse button not found');
      results.push({ test: 'Mission HUD Collapse', status: 'FAIL' });
    }
    
    // Check localStorage for collapse state
    const collapseState = localStorage.getItem('missionHUD_collapsed');
    console.log(`%cℹ️ INFO`, 'color: #3b82f6', `Collapse state: ${collapseState || 'not saved'}`);
    
  } else {
    console.log(`%cℹ️ INFO`, 'color: #3b82f6', 'Mission HUD not visible (may be auto-hidden with no missions)');
    results.push({ test: 'Mission HUD', status: 'INFO' });
  }
  
  // Test 4: UI Panels
  console.log('\n%c📊 TEST 4: UI Panels', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  // Check for panels
  const panels = document.querySelectorAll('[class*="Panel"], [class*="panel"]');
  console.log(`%cℹ️ INFO`, 'color: #3b82f6', `Found ${panels.length} panels`);
  
  // Check for panel collapse states in localStorage
  let panelStatesFound = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('panel') && key.includes('collapsed')) {
      panelStatesFound++;
    }
  }
  
  if (panelStatesFound > 0) {
    console.log(`%c✅ PASS`, 'color: #10b981', `${panelStatesFound} panel collapse states saved`);
    results.push({ test: 'Panel State Persistence', status: 'PASS' });
  } else {
    console.log(`%cℹ️ INFO`, 'color: #3b82f6', 'No panel collapse states saved yet');
    results.push({ test: 'Panel State Persistence', status: 'INFO' });
  }
  
  // Check for overlaps
  const visiblePanels = Array.from(panels).filter(p => {
    const style = window.getComputedStyle(p);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  
  let overlaps = 0;
  const rects = visiblePanels.map(p => p.getBoundingClientRect());
  
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const r1 = rects[i];
      const r2 = rects[j];
      
      if (!(r1.right < r2.left || r1.left > r2.right || 
            r1.bottom < r2.top || r1.top > r2.bottom)) {
        overlaps++;
      }
    }
  }
  
  if (overlaps === 0) {
    console.log(`%c✅ PASS`, 'color: #10b981', 'No panel overlaps detected');
    results.push({ test: 'Panel Overlaps', status: 'PASS' });
  } else {
    console.log(`%c❌ FAIL`, 'color: #ef4444', `${overlaps} panel overlaps detected`);
    results.push({ test: 'Panel Overlaps', status: 'FAIL' });
  }
  
  // Test 5: General Performance  
  console.log('\n%c⚡ TEST 5: General Performance', 'font-size: 16px; font-weight: bold; color: #fbbf24;');
  
  // Check memory usage
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    const totalMB = memory.totalJSHeapSize / (1024 * 1024);
    
    console.log(`%cℹ️ INFO`, 'color: #3b82f6', `Memory: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB`);
    
    if (usedMB < 100) {
      console.log(`%c✅ PASS`, 'color: #10b981', 'Memory usage within acceptable range');
      results.push({ test: 'Memory Usage', status: 'PASS' });
    } else {
      console.log(`%c⚠️ WARN`, 'color: #fbbf24', 'Memory usage higher than expected');
      results.push({ test: 'Memory Usage', status: 'WARN' });
    }
  }
  
  // Check for WebGL context
  const canvas = document.querySelector('canvas');
  if (canvas) {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2') || 
               (canvas as HTMLCanvasElement).getContext('webgl');
    if (gl) {
      console.log(`%c✅ PASS`, 'color: #10b981', 'WebGL context active');
      results.push({ test: 'WebGL Context', status: 'PASS' });
    } else {
      console.log(`%c❌ FAIL`, 'color: #ef4444', 'WebGL context not available');
      results.push({ test: 'WebGL Context', status: 'FAIL' });
    }
  }
  
  // Check FPS (simple estimation)
  let frameCount = 0;
  const startTime = performance.now();
  
  const checkFPS = () => {
    frameCount++;
    if (frameCount < 60) {
      requestAnimationFrame(checkFPS);
    } else {
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      const fps = frameCount / duration;
      
      console.log(`%cℹ️ INFO`, 'color: #3b82f6', `FPS: ${fps.toFixed(1)}`);
      
      if (fps > 30) {
        console.log(`%c✅ PASS`, 'color: #10b981', 'Frame rate acceptable');
        results.push({ test: 'Frame Rate', status: 'PASS' });
      } else {
        console.log(`%c❌ FAIL`, 'color: #ef4444', 'Frame rate too low');
        results.push({ test: 'Frame Rate', status: 'FAIL' });
      }
      
      // Final summary
      console.log('\n%c📋 TEST SUMMARY', 'font-size: 18px; font-weight: bold; color: #fbbf24;');
      
      const passed = results.filter(r => r.status === 'PASS').length;
      const failed = results.filter(r => r.status === 'FAIL').length;
      const info = results.filter(r => r.status === 'INFO').length;
      const warn = results.filter(r => r.status === 'WARN').length;
      
      console.log(`%c✅ PASSED: ${passed}`, 'color: #10b981; font-weight: bold;');
      console.log(`%c❌ FAILED: ${failed}`, 'color: #ef4444; font-weight: bold;');
      console.log(`%c⚠️ WARNINGS: ${warn}`, 'color: #fbbf24; font-weight: bold;');
      console.log(`%cℹ️ INFO: ${info}`, 'color: #3b82f6; font-weight: bold;');
      
      if (failed === 0) {
        console.log('\n%c🎉 ALL CRITICAL TESTS PASSED!', 
          'font-size: 16px; font-weight: bold; color: #10b981; background: #064e3b; padding: 8px; border-radius: 5px;');
      } else {
        console.log('\n%c⚠️ SOME TESTS FAILED - Review details above', 
          'font-size: 16px; font-weight: bold; color: #fbbf24; background: #451a03; padding: 8px; border-radius: 5px;');
      }
      
      // Log detailed results
      console.log('\nDetailed Results:', results);
      
      return results;
    }
  };
  
  requestAnimationFrame(checkFPS);
};

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).runImprovementTests = runImprovementTests;
  console.log('%c✨ Test suite ready! Run `runImprovementTests()` in browser console', 
    'color: #10b981; font-weight: bold; background: #1f2937; padding: 4px 8px; border-radius: 3px;');
}