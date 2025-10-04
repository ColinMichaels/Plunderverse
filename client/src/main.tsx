import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./__tests__/index"; // Import all tests from index
import "./autoTestMissions"; // This will auto-run after 5 seconds
import { testTerrainGeneration } from "./testTerrainGeneration";
import { testSurfaceScatter } from "./testSurfaceScatter";
import { testAtmosphericEffects } from "./testAtmosphericEffects";
import { runAllImprovementTests } from "./testAllImprovements";
import { runCombatSystemTest } from "./testCombatSystem";

// Test functions are now available through window.tests and through backward-compatible function names
(window as any).testTerrainGeneration = testTerrainGeneration;
(window as any).testSurfaceScatter = testSurfaceScatter;
(window as any).testAtmosphericEffects = testAtmosphericEffects;
(window as any).runCombatTest = runCombatSystemTest;

// Run test after 3 seconds to let the game initialize
if (import.meta.env.DEV) {
  setTimeout(() => {
    console.log('[DEV] Mission system test available. Run testMissionSystem() in console to test.');
    console.log('[DEV] Auto-test will run in 5 seconds...');
  }, 3000);
  
  // Test terrain generation after 7 seconds
  setTimeout(() => {
    console.log('[DEV] Testing terrain generation system...');
    testTerrainGeneration();
  }, 7000);
  
  // Test surface scatter after 9 seconds
  setTimeout(() => {
    console.log('[DEV] Testing surface scatter system...');
    testSurfaceScatter();
  }, 9000);
  
  // Test atmospheric effects after 11 seconds
  setTimeout(() => {
    console.log('[DEV] Testing atmospheric effects system...');
    testAtmosphericEffects();
  }, 11000);
}

createRoot(document.getElementById("root")!).render(<App />);
