import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { testMissionSystem } from "./testMissionSystem";
import "./autoTestMissions"; // This will auto-run after 5 seconds

// Make test available in console for debugging
(window as any).testMissionSystem = testMissionSystem;

// Run test after 3 seconds to let the game initialize
if (import.meta.env.DEV) {
  setTimeout(() => {
    console.log('[DEV] Mission system test available. Run testMissionSystem() in console to test.');
    console.log('[DEV] Auto-test will run in 5 seconds...');
  }, 3000);
}

createRoot(document.getElementById("root")!).render(<App />);
