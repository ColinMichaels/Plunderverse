// Apply WebSocket patch FIRST to fix undefined port issues
import "./utils/websocketPatch";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Temporarily disable test imports to fix app loading
// import "./__tests__/index"; // Import all tests from index
// import "./autoTestMissions"; // This will auto-run after 5 seconds
// import { testTerrainGeneration } from "./testTerrainGeneration";
// import { testSurfaceScatter } from "./testSurfaceScatter";
// import { testAtmosphericEffects } from "./testAtmosphericEffects";
// import { runAllImprovementTests } from "./testAllImprovements";

// Test functions are disabled to prevent import errors

// Temporarily disable tests to fix app loading
// if (import.meta.env.DEV) {
//   setTimeout(() => {
//     console.log('[DEV] Mission system test available. Run testMissionSystem() in console to test.');
//     console.log('[DEV] Auto-test will run in 5 seconds...');
//   }, 3000);
// }

// Add console log to verify script is running
console.log('[Main] React app starting...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('[Main] Root element not found!');
} else {
  console.log('[Main] Root element found, rendering app...');
  createRoot(rootElement).render(<App />);
  console.log('[Main] App rendered successfully');
}
