import { useState } from "react";
import { useHints } from "../lib/stores/useHints";

interface HintContent {
  title: string;
  description: string;
  tips: string[];
}

const HINT_CONTENTS: Record<string, HintContent> = {
  "first-landing": {
    title: "Welcome to Your First Landing!",
    description: "You've successfully landed on a planet! Here's what you can do:",
    tips: [
      "🔨 Mine Resources - Press M to start mining valuable materials",
      "💰 Check Inventory - View your collected resources in the inventory panel",
      "⚙️ Manage Equipment - Monitor and upgrade your ship's equipment",
      "🚀 Take Off - Press L again to return to space exploration",
    ],
  },
  "first-mining": {
    title: "Mining Resources",
    description: "Mining is how you gather materials to upgrade your ship:",
    tips: [
      "⏱️ Mining takes time - Wait for the progress bar to complete",
      "💎 Different planets have different resources",
      "🔋 Mining consumes ship energy - Watch your power levels",
      "💸 Sell resources at the marketplace for credits or crypto",
    ],
  },
  "first-equipment": {
    title: "Equipment Management",
    description: "Your ship has various equipment that needs maintenance:",
    tips: [
      "⛽ Fuel Tank - Refuel regularly to keep exploring",
      "🔧 Hull Integrity - Repair damage from space travel",
      "⚡ Power Core - Maintains all ship systems",
      "🛠️ Upgrades - Purchase better equipment with credits",
    ],
  },
  "first-crypto": {
    title: "Cryptocurrency Trading",
    description: "Earn and trade cryptocurrency in the solar system:",
    tips: [
      "💰 Initialize Wallet - Create your crypto wallet to start trading",
      "⛏️ Mining Rewards - Earn crypto when you mine resources (0.1% of value)",
      "🏪 Marketplace - Buy and sell resources using cryptocurrency",
      "📊 Track Balance - Monitor your crypto balance in the wallet panel",
    ],
  },
  "autopilot": {
    title: "Autopilot Navigation",
    description: "Use autopilot to travel to distant planets efficiently:",
    tips: [
      "🎯 Select Target - Choose a planet from the navigation menu",
      "⚡ Autopilot Cost - Requires credits to activate (50 per use)",
      "⛽ Fuel Consumption - Autopilot uses fuel during travel",
      "🔄 Auto-Orbit - Automatically orbits the target planet on arrival",
    ],
  },
};

export function HintModal() {
  const { currentHint, dismissHint, disableHint } = useHints();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!currentHint) return null;

  const content = HINT_CONTENTS[currentHint];
  if (!content) {
    console.warn(`No content found for hint: ${currentHint}`);
    return null;
  }

  const handleClose = () => {
    if (dontShowAgain) {
      disableHint(currentHint);
    } else {
      dismissHint();
    }
    setDontShowAgain(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <h2 className="text-xl font-bold text-cyan-400">{content.title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        <p className="text-gray-300 mb-4">{content.description}</p>

        <div className="space-y-2 mb-6">
          {content.tips.map((tip, index) => (
            <div
              key={index}
              className="bg-slate-800/50 rounded p-3 text-sm text-gray-200 border border-slate-700"
            >
              {tip}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-300">
              Don't remind me again
            </span>
          </label>

          <button
            onClick={handleClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors font-semibold"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
