import { useState } from "react";
import { useInventory } from "../lib/stores/useInventory";

export function InventoryDisplay() {
  const { items, getStorageUsed, storageCapacity, getTotalValue } = useInventory();
  const [isVisible, setIsVisible] = useState(false);

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
    <div className="fixed top-4 right-4 z-40">
      {/* Inventory Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`mb-4 px-4 py-2 rounded-lg font-semibold transition-all ${
          items.length > 0 
            ? 'bg-cyan-600 hover:bg-cyan-700 text-white' 
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
        disabled={items.length === 0}
      >
        📦 Inventory ({items.length})
      </button>

      {/* Inventory Panel */}
      {isVisible && (
        <div className="bg-gray-900/95 border border-cyan-400 rounded-lg p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-cyan-400">Cargo Bay</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Storage Status */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300 text-sm">Storage</span>
              <span className="text-white text-sm">{storageUsed}/{storageCapacity}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  storagePercentage > 90 ? 'bg-red-500' : storagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
          </div>

          {/* Total Value */}
          <div className="mb-4 p-2 bg-yellow-900/30 border border-yellow-400 rounded">
            <div className="flex justify-between items-center">
              <span className="text-yellow-400">Total Value:</span>
              <span className="text-yellow-400 font-mono">{totalValue} credits</span>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No resources collected yet
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={index}
                  className={`${getRarityBg(item.rarity)} border rounded-lg p-3`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className={`font-semibold ${getRarityColor(item.rarity)}`}>
                        {item.type}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        From {item.planetSource}
                      </p>
                      <p className="text-xs text-gray-300 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-white font-bold">×{item.quantity}</div>
                      <div className="text-yellow-400 text-xs font-mono">
                        {item.value * item.quantity} credits
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions */}
          {items.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <button
                onClick={() => console.log('Trading interface coming soon!')}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold"
              >
                💰 Trade Resources
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}