import { useState } from "react";
import { useInventory } from "../lib/stores/useInventory";
import { TradingInterface } from "./TradingInterface";
import { SpaceUIPanel } from "./SpaceUIPanel";

export function InventoryDisplay() {
  const { items, getStorageUsed, storageCapacity, getTotalValue } = useInventory();
  const [showTrading, setShowTrading] = useState(false);

  const storageUsed = getStorageUsed();
  const storagePercentage = (storageUsed / storageCapacity) * 100;
  const totalValue = getTotalValue();

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'legendary': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-800/50 border-gray-600';
      case 'uncommon': return 'bg-green-900/50 border-green-600';
      case 'rare': return 'bg-blue-900/50 border-blue-600';
      case 'legendary': return 'bg-purple-900/50 border-purple-600';
      default: return 'bg-gray-800/50 border-gray-600';
    }
  };

  return (
    <SpaceUIPanel
      id="inventory"
      title="CARGO BAY"
      icon="📦"
      zone="top-right"
      priority={1}
      defaultExpanded={false}
    >
      <div className="space-y-3">
        {/* Storage Status */}
        <div className="space-status-bar">
          <div className="space-status-item">
            <span className="text-cyan-400 font-mono">STORAGE:</span>
            <span className="font-mono">{storageUsed}/{storageCapacity}</span>
          </div>
        </div>
        
        <div className="space-progress-bar">
          <div 
            className={`space-progress-fill ${
              storagePercentage > 90 ? 'bg-red-400' : storagePercentage > 70 ? 'bg-yellow-400' : ''
            }`}
            style={{ width: `${storagePercentage}%` }}
          />
        </div>

        {/* Total Value */}
        <div className="space-status-bar border border-yellow-400/30 bg-yellow-900/20 rounded">
          <div className="space-status-item col-span-2">
            <span className="text-yellow-300 font-mono">TOTAL VALUE:</span>
            <span className="text-yellow-400 font-bold font-mono">{totalValue}cr</span>
          </div>
        </div>

        {/* Trading Button */}
        <button
          onClick={() => setShowTrading(!showTrading)}
          className="space-button w-full"
        >
          💰 {showTrading ? 'CLOSE' : 'OPEN'} TRADING
        </button>

        {/* Trading Interface */}
        {showTrading && (
          <TradingInterface 
            isVisible={showTrading} 
            onClose={() => setShowTrading(false)} 
          />
        )}

        {/* Items List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center text-slate-400 py-4">
              <p className="font-mono">🌌 EMPTY CARGO BAY</p>
              <p className="text-xs font-mono">GO MINE SOME ASTEROIDS!</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className={`p-2 rounded border ${getRarityBg(item.rarity)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className={`font-semibold font-mono text-xs ${getRarityColor(item.rarity)}`}>
                      {item.type.toUpperCase()}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      FROM {item.planetSource}
                    </p>
                    <p className="text-xs text-slate-300 font-mono">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-white font-bold font-mono">×{item.quantity}</div>
                    <div className="text-yellow-400 text-xs font-mono">
                      {item.value * item.quantity}cr
                    </div>
                    <div className={`text-xs px-1 py-0.5 rounded font-mono ${getRarityBg(item.rarity)}`}>
                      {item.rarity.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </SpaceUIPanel>
  );
}