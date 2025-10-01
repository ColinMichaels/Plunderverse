import { useState, useEffect } from "react";
import { useCrypto } from "../../../lib/stores/useCrypto";
import { useInventoryDisplayData } from "../../../domain/economy/selectors";
import { SpaceUIPanel } from "../../ui/SpaceUIPanel";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/dialog";

interface SellOrderForm {
  resourceType: string;
  quantity: number;
  pricePerUnit: number;
  maxQuantity: number;
}

interface BuyOrderForm {
  resourceType: string;
  quantity: number;
  pricePerUnit: number;
}

export function CryptoMarketplace() {
  const {
    isInitialized,
    balance,
    currency,
    marketPrice,
    showMarketplace,
    isProcessingTransaction,
    lastTransactionResult,
    toggleMarketplace,
    sellResource,
    buyResource,
    clearLastTransactionResult
  } = useCrypto();

  const { items: inventoryItems } = useInventoryDisplayData();

  const [activeTab, setActiveTab] = useState<'sell' | 'buy'>('sell');
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [showBuyDialog, setShowBuyDialog] = useState(false);

  const [sellOrder, setSellOrder] = useState<SellOrderForm>({
    resourceType: '',
    quantity: 1,
    pricePerUnit: 0,
    maxQuantity: 0
  });

  const [buyOrder, setBuyOrder] = useState<BuyOrderForm>({
    resourceType: '',
    quantity: 1,
    pricePerUnit: 0
  });

  // Clear transaction result after 5 seconds
  useEffect(() => {
    if (lastTransactionResult) {
      const timer = setTimeout(() => {
        clearLastTransactionResult();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastTransactionResult, clearLastTransactionResult]);

  const handleSellResource = async () => {
    if (!sellOrder.resourceType || sellOrder.quantity <= 0 || sellOrder.pricePerUnit <= 0) {
      alert("Please fill in all fields with valid values");
      return;
    }

    if (sellOrder.quantity > sellOrder.maxQuantity) {
      alert(`You only have ${sellOrder.maxQuantity} of ${sellOrder.resourceType}`);
      return;
    }

    const success = await sellResource(sellOrder.resourceType, sellOrder.quantity, sellOrder.pricePerUnit);
    
    if (success) {
      setSellOrder({ resourceType: '', quantity: 1, pricePerUnit: 0, maxQuantity: 0 });
      setShowSellDialog(false);
    }
  };

  const handleBuyResource = async () => {
    if (!buyOrder.resourceType || buyOrder.quantity <= 0 || buyOrder.pricePerUnit <= 0) {
      alert("Please fill in all fields with valid values");
      return;
    }

    const totalCost = buyOrder.quantity * buyOrder.pricePerUnit;
    if (totalCost > balance) {
      alert(`Insufficient funds. Need: ${totalCost} ${currency}, Have: ${balance} ${currency}`);
      return;
    }

    const success = await buyResource(buyOrder.resourceType, buyOrder.quantity, buyOrder.pricePerUnit);
    
    if (success) {
      setBuyOrder({ resourceType: '', quantity: 1, pricePerUnit: 0 });
      setShowBuyDialog(false);
    }
  };

  const openSellDialog = (resourceType: string, maxQuantity: number) => {
    setSellOrder({
      resourceType,
      quantity: Math.min(1, maxQuantity),
      pricePerUnit: 0,
      maxQuantity
    });
    setShowSellDialog(true);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'legendary': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getSuggestedPrice = (resourceValue: number) => {
    // Suggest crypto price based on resource value and market conditions
    const basePrice = resourceValue * 0.001; // 0.1% of credit value as base crypto price
    const marketMultiplier = marketPrice ? (marketPrice.priceInUSD * 10) : 1;
    return Math.max(0.000001, basePrice / marketMultiplier);
  };

  if (!isInitialized) {
    return (
      <SpaceUIPanel
        id="crypto-marketplace"
        title="CRYPTO MARKETPLACE"
        icon="🏪"
        zone="right-sidebar"
        priority={3}
        defaultExpanded={false}
      >
        <div className="space-y-3 text-center">
          <div className="text-yellow-400">
            Marketplace unavailable
          </div>
          <div className="text-sm text-slate-400">
            Initialize crypto wallet to access trading
          </div>
        </div>
      </SpaceUIPanel>
    );
  }

  return (
    <SpaceUIPanel
      id="crypto-marketplace"
      title="CRYPTO MARKETPLACE"
      icon="🏪"
      zone="right-sidebar"
      priority={3}
      defaultExpanded={showMarketplace}
    >
      <div className="space-y-3">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-800 rounded p-1">
          <button
            onClick={() => setActiveTab('sell')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === 'sell'
                ? 'bg-red-600 text-white'
                : 'text-red-400 hover:bg-slate-700'
            }`}
          >
            SELL
          </button>
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              activeTab === 'buy'
                ? 'bg-green-600 text-white'
                : 'text-green-400 hover:bg-slate-700'
            }`}
          >
            BUY
          </button>
        </div>

        {/* Balance Display */}
        <div className="space-status-bar border border-cyan-400/30 bg-cyan-900/20 rounded">
          <div className="space-status-item">
            <span className="text-cyan-300 font-mono text-xs">BALANCE:</span>
            <span className="text-cyan-400 font-bold font-mono text-xs">
              {balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {currency}
            </span>
          </div>
        </div>

        {/* Sell Tab */}
        {activeTab === 'sell' && (
          <div className="space-y-2">
            <div className="text-sm text-slate-300 font-medium">Your Resources</div>
            
            {inventoryItems.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-4">
                No resources to sell
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {inventoryItems.map((item, index) => (
                  <div key={index} className="bg-slate-800/50 rounded p-2 border border-slate-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{item.type}</span>
                          <span className={`text-xs ${getRarityColor(item.rarity)}`}>
                            {item.rarity.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Qty: {item.quantity} | Value: {item.value}cr each
                        </div>
                        <div className="text-xs text-cyan-400">
                          Suggested: {getSuggestedPrice(item.value).toFixed(6)} {currency}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openSellDialog(item.type, item.quantity)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs"
                        disabled={isProcessingTransaction}
                      >
                        SELL
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <div className="space-y-2">
            <div className="text-sm text-slate-300 font-medium">Buy Resources</div>
            
            <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
              <DialogTrigger asChild>
                <Button
                  className="w-full bg-green-600 hover:bg-green-500 text-white"
                  disabled={isProcessingTransaction || balance <= 0}
                >
                  🛒 CREATE BUY ORDER
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border border-slate-600">
                <DialogHeader>
                  <DialogTitle className="text-green-400">Create Buy Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Resource Type</label>
                    <Input
                      value={buyOrder.resourceType}
                      onChange={(e) => setBuyOrder(prev => ({ ...prev, resourceType: e.target.value }))}
                      placeholder="e.g., Iron, Gold, Platinum"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Quantity</label>
                    <Input
                      type="number"
                      value={buyOrder.quantity}
                      onChange={(e) => setBuyOrder(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">
                      Price per Unit ({currency})
                    </label>
                    <Input
                      type="number"
                      value={buyOrder.pricePerUnit}
                      onChange={(e) => setBuyOrder(prev => ({ ...prev, pricePerUnit: parseFloat(e.target.value) || 0 }))}
                      step="0.000001"
                      min="0"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="text-sm text-slate-400">
                    Total Cost: {(buyOrder.quantity * buyOrder.pricePerUnit).toFixed(6)} {currency}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowBuyDialog(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBuyResource}
                      disabled={isProcessingTransaction}
                      className="flex-1 bg-green-600 hover:bg-green-500"
                    >
                      {isProcessingTransaction ? "Processing..." : "Create Order"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="text-xs text-slate-400 text-center">
              Buy orders will be matched with sell orders from other players
            </div>
          </div>
        )}

        {/* Sell Dialog */}
        <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
          <DialogContent className="bg-slate-800 border border-slate-600">
            <DialogHeader>
              <DialogTitle className="text-red-400">Sell {sellOrder.resourceType}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Quantity (Max: {sellOrder.maxQuantity})
                </label>
                <Input
                  type="number"
                  value={sellOrder.quantity}
                  onChange={(e) => setSellOrder(prev => ({ 
                    ...prev, 
                    quantity: Math.min(parseInt(e.target.value) || 1, prev.maxQuantity)
                  }))}
                  min="1"
                  max={sellOrder.maxQuantity}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Price per Unit ({currency})
                </label>
                <Input
                  type="number"
                  value={sellOrder.pricePerUnit}
                  onChange={(e) => setSellOrder(prev => ({ ...prev, pricePerUnit: parseFloat(e.target.value) || 0 }))}
                  step="0.000001"
                  min="0"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="text-sm text-slate-400">
                Total Revenue: {(sellOrder.quantity * sellOrder.pricePerUnit).toFixed(6)} {currency}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowSellDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSellResource}
                  disabled={isProcessingTransaction}
                  className="flex-1 bg-red-600 hover:bg-red-500"
                >
                  {isProcessingTransaction ? "Processing..." : "Create Sell Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction Result */}
        {lastTransactionResult && (
          <div className={`space-status-bar border rounded ${
            lastTransactionResult.success 
              ? 'border-green-400/30 bg-green-900/20' 
              : 'border-red-400/30 bg-red-900/20'
          }`}>
            <div className="space-status-item">
              <span className={`text-xs ${
                lastTransactionResult.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {lastTransactionResult.success ? '✅' : '❌'} {lastTransactionResult.message}
              </span>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessingTransaction && (
          <div className="space-status-bar border border-yellow-400/30 bg-yellow-900/20 rounded">
            <div className="space-status-item">
              <span className="text-yellow-400 text-xs">
                ⏳ Processing order...
              </span>
            </div>
          </div>
        )}
      </div>
    </SpaceUIPanel>
  );
}