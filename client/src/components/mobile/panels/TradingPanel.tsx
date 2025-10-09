import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Info,
  Star
} from 'lucide-react';
import { useCredits } from '../../../lib/stores/economy/useCredits';
import { useInventory } from '../../../lib/stores/economy/useInventory';
import { useHeatSystem } from '../../../lib/stores/player/useHeatSystem';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';
import { useTradeHistory } from '../../../lib/stores/economy/useTradeHistory';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { useAutoScroll } from '../../../hooks/useAutoScroll';
import { 
  MARKET_ITEMS,
  MarketItem,
  calculateFinalPrice,
  generatePlanetMarketConditions,
  getSupplyDemandIndicator,
  getDemandIndicator,
  getPriceTrend,
  recordPurchase,
  recordSale,
  CATEGORY_CONFIG,
  getItemById
} from '../../../lib/stores/economy/enhancedMarketData';
import { toast } from 'sonner';
import { triggerHaptic } from '../../../utils/hapticFeedback';
import { MobileSyncAdapter } from '../../../services/MobileSyncAdapter';

interface TradingPanelProps {
  station?: string;
  faction?: string;
  onClose?: () => void;
}

type TabType = 'buy' | 'sell';

export const TradingPanel: React.FC<TradingPanelProps> = ({
  station = 'Unknown Station',
  faction = 'independents',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);
  
  const { config } = useMobileLayout();
  const { credits, spendCredits, earnCredits } = useCredits();
  const inventory = useInventory();
  const heatSystem = useHeatSystem();
  const player = usePlayer();
  const { landedPlanet } = useLandedState();
  const tradeHistory = useTradeHistory();
  
  // Auto-scroll for mobile lists
  const { containerRef, scrollToTop } = useAutoScroll();

  // Scroll to top when tab changes
  useEffect(() => {
    scrollToTop();
  }, [activeTab, scrollToTop]);
  
  // Generate market conditions with planet economy
  const marketConditions = useMemo(() => {
    return generatePlanetMarketConditions(landedPlanet || station);
  }, [landedPlanet, station]);
  
  // Check if faction will trade with player
  const canTrade = useMemo(() => {
    const factionRep = player.reputation[faction as keyof typeof player.reputation] || 0;
    if (factionRep <= -50) {
      return { allowed: false, reason: `${faction} refuses to trade with enemies (Reputation: ${factionRep})` };
    }
    return { allowed: true, reason: '' };
  }, [player.reputation, faction]);
  
  // Get available items for buying
  const buyableItems = useMemo(() => {
    if (!canTrade.allowed) return [];
    
    // Filter items based on faction and reputation
    const factionRep = player.reputation[faction as keyof typeof player.reputation] || 0;
    
    return MARKET_ITEMS.filter(item => {
      // Basic availability check
      if (!marketConditions.available.includes(item.id)) return false;
      
      // Faction-specific item restrictions
      if (faction === 'corporations') {
        // Corps won't sell contraband unless you're corrupt (negative rep)
        if ((item.category === 'contraband' || item.illegal) && factionRep > -20) {
          return false;
        }
        // Advanced shields and legal cargo for good standing
        if (item.category === 'shields' && item.rarity === 'rare' && factionRep < 20) {
          return false;
        }
      } else if (faction === 'outlaws') {
        // Outlaws focus on contraband and illegal items
        if (item.category === 'contraband' && factionRep < -20) {
          return false; // Need some outlaw cred for contraband
        }
        // Special black market items for high rep
        if (item.rarity === 'legendary' && item.illegal && factionRep < 50) {
          return false;
        }
      } else if (faction === 'independents') {
        // Independents have diverse goods but limit rare items
        if (item.rarity === 'legendary' && factionRep < 30) {
          return false;
        }
      }
      
      return true;
    });
  }, [marketConditions, canTrade.allowed, player.reputation, faction]);
  
  // Get player's inventory items for selling
  const sellableItems = useMemo(() => {
    return inventory.items.map(invItem => {
      const marketItem = MARKET_ITEMS.find(m => m.id === invItem.type);
      if (!marketItem) return null;
      return {
        ...marketItem,
        quantity: invItem.quantity,
        planetSource: invItem.planetSource || 'Unknown'
      };
    }).filter(Boolean);
  }, [inventory.items]);
  
  // Calculate price with planet economy modifiers
  const getItemPrice = (item: MarketItem, isSelling = false): number => {
    const heatModifier = heatSystem.applyPriceModifiers(1);
    const planetName = landedPlanet || station;
    const specialDeal = marketConditions.specialDeals.find(d => d.itemId === item.id);
    
    let price = calculateFinalPrice(item, planetName, faction, heatModifier, isSelling);
    
    // Apply special deal discount for buying
    if (!isSelling && specialDeal) {
      price = Math.round(price * (1 - specialDeal.discount));
    }
    
    return price;
  };
  
  // Calculate profit for selling
  const calculateProfit = (item: MarketItem, sellPrice: number, qty: number): number => {
    return tradeHistory.calculateProfit(item.id, sellPrice, qty);
  };
  
  
  // Handle quantity change
  const adjustQuantity = (delta: number) => {
    triggerHaptic();
    const newQty = Math.max(1, quantity + delta);
    
    if (activeTab === 'buy' && selectedItem) {
      // Check cargo capacity
      const currentUsed = inventory.getStorageUsed();
      const maxQty = Math.floor((inventory.storageCapacity - currentUsed) / selectedItem.weight);
      setQuantity(Math.min(newQty, Math.max(1, maxQty)));
    } else if (activeTab === 'sell' && selectedItem) {
      // Check available quantity
      const invItem = inventory.items.find(i => i.type === selectedItem.id);
      const maxQty = invItem?.quantity || 1;
      setQuantity(Math.min(newQty, maxQty));
    } else {
      setQuantity(newQty);
    }
  };
  
  // Set max quantity
  const setMaxQuantity = () => {
    triggerHaptic();
    if (activeTab === 'buy' && selectedItem) {
      const currentUsed = inventory.getStorageUsed();
      const spaceAvailable = inventory.storageCapacity - currentUsed;
      const maxBySpace = Math.floor(spaceAvailable / selectedItem.weight);
      const pricePerUnit = getItemPrice(selectedItem);
      const maxByCredits = Math.floor(credits / pricePerUnit);
      setQuantity(Math.max(1, Math.min(maxBySpace, maxByCredits)));
    } else if (activeTab === 'sell' && selectedItem) {
      const invItem = inventory.items.find(i => i.type === selectedItem.id);
      setQuantity(invItem?.quantity || 1);
    }
  };
  
  // Execute buy transaction
  const executeBuy = () => {
    if (!selectedItem || quantity <= 0) return;
    
    const pricePerUnit = getItemPrice(selectedItem);
    const totalCost = pricePerUnit * quantity;
    const spaceNeeded = selectedItem.weight * quantity;
    const currentUsed = inventory.getStorageUsed();
    const spaceAvailable = inventory.storageCapacity - currentUsed;
    
    // Validate transaction
    if (credits < totalCost) {
      toast.error('Insufficient credits', {
        description: `Need ${totalCost}c, have ${credits}c`
      });
      triggerHaptic(30);
      return;
    }
    
    if (spaceAvailable < spaceNeeded) {
      toast.error('Insufficient cargo space', {
        description: `Need ${spaceNeeded} units, have ${spaceAvailable} available`
      });
      triggerHaptic(30);
      return;
    }
    
    // Show confirmation for large or illegal purchases
    if (totalCost > credits * 0.5 || selectedItem.illegal) {
      setPendingTransaction({
        type: 'buy',
        item: selectedItem,
        quantity,
        pricePerUnit,
        totalCost,
        spaceNeeded
      });
      setShowConfirmation(true);
      return;
    }
    
    processBuyTransaction(selectedItem, quantity, pricePerUnit, totalCost);
  };
  
  const processBuyTransaction = async (item: MarketItem, qty: number, pricePerUnit: number, totalCost: number) => {
    setIsProcessing(true);
    
    // Use MobileSyncAdapter for server-authoritative transaction
    const mobileSyncAdapter = MobileSyncAdapter.getInstance();
    const success = await mobileSyncAdapter.processTrade(
      'buy',
      item.id,
      item.name,
      qty,
      pricePerUnit,
      station
    );
    
    if (success) {
      // Add item to inventory locally (server already validated)
      const resourceData = {
        type: item.id,
        rarity: item.rarity,
        value: item.basePrice,
        description: item.description,
        complexity: 1
      };
      
      const added = inventory.addResource(resourceData, qty, landedPlanet || station);
      
      if (added) {
        // Record purchase for supply/demand tracking
        const planetName = landedPlanet || station;
        recordPurchase(planetName, item.id, qty, pricePerUnit);
        
        // Apply heat if contraband
        if (item.heatOnPurchase) {
          heatSystem.applyHeat('minor_smuggling', item.heatOnPurchase / 5);
          player.updateHeat(item.heatOnPurchase);
        }
        
        // Record transaction
        tradeHistory.addTransaction({
          itemType: item.id,
          itemName: item.name,
          quantity: qty,
          pricePerUnit,
          totalPrice: totalCost,
          transactionType: 'buy',
          station,
          planet: planetName,
          faction,
          heatLevel: player.heat
        });
        
        // Reset selection
        setSelectedItem(null);
        setQuantity(1);
      }
    }
    
    setIsProcessing(false);
    setShowConfirmation(false);
    setPendingTransaction(null);
    triggerHaptic();
  };
  
  // Execute sell transaction
  const executeSell = () => {
    if (!selectedItem || quantity <= 0) return;
    
    const pricePerUnit = getItemPrice(selectedItem, true);
    const totalEarnings = pricePerUnit * quantity;
    const profit = calculateProfit(selectedItem, pricePerUnit, quantity);
    
    // Validate transaction
    const invItem = inventory.items.find(i => i.type === selectedItem.id);
    if (!invItem || invItem.quantity < quantity) {
      toast.error('Insufficient quantity', {
        description: `You only have ${invItem?.quantity || 0}x ${selectedItem.name}`
      });
      triggerHaptic(30);
      return;
    }
    
    // Show confirmation for large sales
    if (quantity > 10 || selectedItem.illegal) {
      setPendingTransaction({
        type: 'sell',
        item: selectedItem,
        quantity,
        pricePerUnit,
        totalEarnings,
        profit
      });
      setShowConfirmation(true);
      return;
    }
    
    processSellTransaction(selectedItem, quantity, pricePerUnit, totalEarnings, profit);
  };
  
  const processSellTransaction = async (
    item: MarketItem, 
    qty: number, 
    pricePerUnit: number, 
    totalEarnings: number,
    profit: number
  ) => {
    setIsProcessing(true);
    
    // Remove from inventory first
    const removed = inventory.removeResource(item.id, qty);
    
    if (removed) {
      // Use MobileSyncAdapter for server-authoritative transaction
      const mobileSyncAdapter = MobileSyncAdapter.getInstance();
      const success = await mobileSyncAdapter.processTrade(
        'sell',
        item.id,
        item.name,
        qty,
        pricePerUnit,
        station
      );
      
      if (success) {
        // Record sale for supply/demand tracking
        const planetName = landedPlanet || station;
        recordSale(planetName, item.id, qty, pricePerUnit);
        
        // Record transaction
        tradeHistory.addTransaction({
          itemType: item.id,
          itemName: item.name,
          quantity: qty,
          pricePerUnit,
          totalPrice: totalEarnings,
          transactionType: 'sell',
          station,
          planet: planetName,
          profit,
          faction,
          heatLevel: player.heat
        });
        
        // Additional profit toast (adapter already shows base toast)
        if (profit > 0) {
          toast.info(`Profit: +${profit}c`, {
            description: 'Nice trade!'
          });
        }
        
        // Reset selection
        setSelectedItem(null);
        setQuantity(1);
      } else {
        // Restore inventory if transaction failed
        const resourceData = {
          type: item.id,
          rarity: item.rarity,
          value: item.basePrice,
          description: item.description,
          complexity: 1
        };
        inventory.addResource(resourceData, qty, landedPlanet || station);
        toast.error('Transaction failed - items returned to inventory');
      }
    } else {
      toast.error('Failed to remove items from inventory');
    }
    
    setIsProcessing(false);
    setShowConfirmation(false);
    setPendingTransaction(null);
    triggerHaptic();
  };
  
  // Quick sell all cargo
  const quickSellAll = () => {
    if (sellableItems.length === 0) {
      toast.info('No items to sell');
      return;
    }
    
    setIsProcessing(true);
    let totalEarnings = 0;
    let totalProfit = 0;
    let itemsSold = 0;
    
    setTimeout(() => {
      sellableItems.forEach((item: any) => {
        if (!item) return;
        
        const pricePerUnit = getItemPrice(item, true);
        const earnings = pricePerUnit * item.quantity;
        const profit = calculateProfit(item, pricePerUnit, item.quantity);
        
        if (inventory.removeResource(item.id, item.quantity)) {
          earnCredits(earnings);
          totalEarnings += earnings;
          totalProfit += profit;
          itemsSold++;
          
          // Record transaction
          tradeHistory.addTransaction({
            itemType: item.id,
            itemName: item.name,
            quantity: item.quantity,
            pricePerUnit,
            totalPrice: earnings,
            transactionType: 'sell',
            station,
            planet: landedPlanet || station,
            profit,
            faction,
            heatLevel: player.heat
          });
        }
      });
      
      if (itemsSold > 0) {
        toast.success('Quick sale complete', {
          description: `Sold ${itemsSold} items for ${totalEarnings}c (Profit: ${totalProfit > 0 ? '+' : ''}${totalProfit}c)`
        });
      } else {
        toast.error('Failed to sell items');
      }
      
      setIsProcessing(false);
      triggerHaptic(20);
    }, 500);
  };
  
  // Fill cargo with profitable items
  const fillCargoBay = () => {
    const spaceAvailable = inventory.storageCapacity - inventory.getStorageUsed();
    if (spaceAvailable <= 0) {
      toast.info('Cargo bay is full');
      return;
    }
    
    // Find most profitable items
    const profitableItems = buyableItems
      .map(item => {
        const buyPrice = getItemPrice(item);
        const avgSellPrice = tradeHistory.getAveragePrices(item.id).sellAvg;
        const potentialProfit = avgSellPrice > 0 ? avgSellPrice - buyPrice : item.basePrice - buyPrice;
        return { item, buyPrice, potentialProfit, profitPerWeight: potentialProfit / item.weight };
      })
      .filter(p => p.potentialProfit > 0 && !p.item.illegal)
      .sort((a, b) => b.profitPerWeight - a.profitPerWeight);
    
    if (profitableItems.length === 0) {
      toast.info('No profitable items available');
      return;
    }
    
    setIsProcessing(true);
    let totalSpent = 0;
    let itemsBought = 0;
    let remainingSpace = spaceAvailable;
    let remainingCredits = credits;
    
    setTimeout(() => {
      for (const { item, buyPrice } of profitableItems) {
        if (remainingSpace <= 0 || remainingCredits <= buyPrice) break;
        
        const maxQty = Math.min(
          Math.floor(remainingSpace / item.weight),
          Math.floor(remainingCredits / buyPrice)
        );
        
        if (maxQty > 0) {
          const qty = Math.min(maxQty, 5); // Limit to 5 per item for diversity
          const cost = buyPrice * qty;
          
          if (spendCredits(cost)) {
            const resourceData = {
              type: item.id,
              rarity: item.rarity,
              value: item.basePrice,
              description: item.description,
              complexity: 1
            };
            
            if (inventory.addResource(resourceData, qty, landedPlanet || station)) {
              totalSpent += cost;
              itemsBought++;
              remainingSpace -= item.weight * qty;
              remainingCredits -= cost;
              
              // Record transaction
              tradeHistory.addTransaction({
                itemType: item.id,
                itemName: item.name,
                quantity: qty,
                pricePerUnit: buyPrice,
                totalPrice: cost,
                transactionType: 'buy',
                station,
                planet: landedPlanet || station,
                faction,
                heatLevel: player.heat
              });
            } else {
              earnCredits(cost); // Refund if failed
            }
          }
        }
      }
      
      if (itemsBought > 0) {
        toast.success('Cargo filled with profitable items', {
          description: `Bought ${itemsBought} different items for ${totalSpent}c`
        });
      } else {
        toast.error('Failed to fill cargo');
      }
      
      setIsProcessing(false);
      triggerHaptic(20);
    }, 500);
  };
  
  // Get faction reputation status
  const factionRep = player.reputation[faction as keyof typeof player.reputation] || 0;
  const getReputationColor = () => {
    if (factionRep >= 75) return 'text-green-400';
    if (factionRep >= 50) return 'text-green-300';
    if (factionRep >= 20) return 'text-blue-300';
    if (factionRep <= -50) return 'text-red-500';
    if (factionRep <= -20) return 'text-orange-400';
    return 'text-gray-400';
  };
  
  const getReputationStatus = () => {
    if (factionRep >= 75) return 'Allied';
    if (factionRep >= 50) return 'Friendly';
    if (factionRep >= 20) return 'Liked';
    if (factionRep <= -50) return 'Hostile';
    if (factionRep <= -20) return 'Unfriendly';
    return 'Neutral';
  };
  
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Service Refusal Warning */}
      {!canTrade.allowed && (
        <div className="bg-red-900/30 border-2 border-red-600 p-4 m-4 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
            <div>
              <p className="text-red-400 font-bold">ACCESS DENIED</p>
              <p className="text-red-300 text-sm">{canTrade.reason}</p>
              <p className="text-gray-400 text-xs mt-1">Improve your reputation to gain access to trading services</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 border-b-2 border-cyan-600/30 p-2">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-base font-bold text-white flex items-center gap-1.5">
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
            Trading
          </h1>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Credits</p>
            <p className="text-sm font-mono text-cyan-400">{credits.toLocaleString()}c</p>
          </div>
        </div>

        {/* Stats Bar with Tabs */}
        <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-2 py-1 mb-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">{inventory.getStorageUsed()}/{inventory.storageCapacity}</span>
            </div>
            <div className={`${getReputationColor()} text-[10px] font-semibold`}>
              {getReputationStatus()}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setActiveTab('buy');
                setSelectedItem(null);
                setQuantity(1);
                triggerHaptic();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
                        ${activeTab === 'buy' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-gray-300'}`}
            >
              Buy
            </button>
            <button
              onClick={() => {
                setActiveTab('sell');
                setSelectedItem(null);
                setQuantity(1);
                triggerHaptic();
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors
                        ${activeTab === 'sell' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-gray-300'}`}
            >
              Sell
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-400">{station}</span>
          <span className="text-cyan-400">{marketConditions.economyType?.toUpperCase()}</span>
        </div>
      </header>
      
      {/* Quick Actions */}
      <div className="bg-slate-800/50 px-4 py-2 flex gap-2">
        {activeTab === 'sell' ? (
          <>
            <button
              onClick={quickSellAll}
              disabled={isProcessing || sellableItems.length === 0}
              className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white 
                       py-2 px-3 rounded-lg font-semibold text-sm active:scale-95
                       disabled:opacity-50 disabled:active:scale-100 flex items-center 
                       justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Quick Sell All
            </button>
          </>
        ) : (
          <button
            onClick={fillCargoBay}
            disabled={isProcessing || inventory.getStorageUsed() >= inventory.storageCapacity}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                     py-2 px-3 rounded-lg font-semibold text-sm active:scale-95
                     disabled:opacity-50 disabled:active:scale-100 flex items-center 
                     justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            Fill Cargo (Smart)
          </button>
        )}
      </div>
      
      {/* Items List */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activeTab === 'buy' ? (
          // Buy Tab - Show market items
          buyableItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items available for purchase
            </div>
          ) : (
            buyableItems.map(item => {
              const price = getItemPrice(item);
              const isSelected = selectedItem?.id === item.id;
              const isFavorite = tradeHistory.favoriteItems.includes(item.id);
              const specialDeal = marketConditions.specialDeals.find(d => d.itemId === item.id);
              const planetName = landedPlanet || station;
              const supplyIndicator = getSupplyDemandIndicator(planetName, item.id);
              const demandIndicator = getDemandIndicator(planetName, item.id);
              const priceTrend = getPriceTrend(planetName, item.id);
              
              return (
                <motion.div
                  key={item.id}
                  className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop}
                           ${config.panel.radius} p-3 cursor-pointer transition-all
                           ${isSelected ? 'border-green-500 bg-green-500/10' : ''}
                           ${item.illegal ? 'border-red-500/30' : ''}`}
                  onClick={() => {
                    setSelectedItem(item);
                    setQuantity(1);
                    triggerHaptic();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{item.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{item.name}</span>
                          {isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                          {specialDeal && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-xs text-yellow-400 rounded-full">
                              -{Math.round(specialDeal.discount * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{item.weight} units</span>
                          <span>{item.rarity}</span>
                          {item.illegal && (
                            <span className="text-red-400">+{item.heatOnPurchase} heat</span>
                          )}
                        </div>
                        {/* Supply/Demand Indicators */}
                        <div className="flex items-center gap-2 mt-1">
                          {supplyIndicator === 'abundant' && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              Abundant
                            </span>
                          )}
                          {supplyIndicator === 'scarce' && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Scarce
                            </span>
                          )}
                          {demandIndicator === 'high' && (
                            <span className="text-xs text-orange-400">High Demand</span>
                          )}
                          {demandIndicator === 'low' && (
                            <span className="text-xs text-blue-400">Low Demand</span>
                          )}
                          {priceTrend === 'rising' && (
                            <span className="text-xs text-yellow-400">📈</span>
                          )}
                          {priceTrend === 'falling' && (
                            <span className="text-xs text-cyan-400">📉</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono text-green-400">{price}c</div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-green-400 ml-auto mt-1" />}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )
        ) : (
          // Sell Tab - Show player inventory
          sellableItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No items in cargo to sell
            </div>
          ) : (
            sellableItems.map((item: any) => {
              if (!item) return null;
              const sellPrice = getItemPrice(item, true);
              const profit = calculateProfit(item, sellPrice, item.quantity);
              const isSelected = selectedItem?.id === item.id;
              
              return (
                <motion.div
                  key={`${item.id}-${item.planetSource}`}
                  className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop}
                           ${config.panel.radius} p-3 cursor-pointer transition-all
                           ${isSelected ? 'border-orange-500 bg-orange-500/10' : ''}
                           ${profit > 0 ? 'border-green-500/30' : profit < 0 ? 'border-red-500/30' : ''}`}
                  onClick={() => {
                    setSelectedItem(item);
                    setQuantity(Math.min(item.quantity, 1));
                    triggerHaptic();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{item.icon}</div>
                      <div>
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>Qty: {item.quantity}</span>
                          <span>From: {item.planetSource}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono text-orange-400">{sellPrice}c/ea</div>
                      <div className={`text-xs ${profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {profit > 0 ? '+' : ''}{profit}c profit
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-orange-400 ml-auto mt-1" />}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )
        )}
      </div>
      
      {/* Transaction Panel */}
      {selectedItem && (
        <div className="bg-slate-900 border-t-2 border-cyan-600/30 px-4 py-4">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">{selectedItem.name}</span>
              <span className="text-sm text-cyan-400">
                {activeTab === 'buy' ? getItemPrice(selectedItem) : getItemPrice(selectedItem, true)}c each
              </span>
            </div>
            
            {/* Quantity Selector */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustQuantity(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center
                         active:scale-95 disabled:opacity-50"
              >
                <Minus className="w-4 h-4 text-white" />
              </button>
              
              <div className="flex-1 bg-slate-800 rounded-lg px-3 py-2">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-transparent text-center text-white font-mono text-lg
                           focus:outline-none"
                />
              </div>
              
              <button
                onClick={() => adjustQuantity(1)}
                className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center
                         active:scale-95"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              
              <button
                onClick={setMaxQuantity}
                className="px-3 h-10 bg-slate-700 rounded-lg text-xs text-cyan-400 font-semibold
                         active:scale-95"
              >
                MAX
              </button>
            </div>
          </div>
          
          {/* Transaction Summary */}
          <div className="bg-slate-800/50 rounded-lg p-3 mb-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Quantity:</span>
              <span className="text-white">{quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                {activeTab === 'buy' ? 'Total Cost:' : 'Total Earnings:'}
              </span>
              <span className={`font-mono ${activeTab === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                {activeTab === 'buy' 
                  ? getItemPrice(selectedItem) * quantity 
                  : getItemPrice(selectedItem, true) * quantity}c
              </span>
            </div>
            {activeTab === 'buy' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Space Required:</span>
                <span className="text-white">{selectedItem.weight * quantity} units</span>
              </div>
            )}
            {activeTab === 'sell' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Expected Profit:</span>
                <span className={`font-mono ${
                  calculateProfit(selectedItem, getItemPrice(selectedItem, true), quantity) > 0 
                    ? 'text-green-400' : 'text-red-400'
                }`}>
                  {calculateProfit(selectedItem, getItemPrice(selectedItem, true), quantity) > 0 ? '+' : ''}
                  {calculateProfit(selectedItem, getItemPrice(selectedItem, true), quantity)}c
                </span>
              </div>
            )}
            {selectedItem.illegal && activeTab === 'buy' && (
              <div className="flex items-center gap-2 pt-2 text-xs text-red-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Will increase heat by {(selectedItem.heatOnPurchase || 0) * quantity}</span>
              </div>
            )}
          </div>
          
          {/* Execute Button */}
          <button
            onClick={activeTab === 'buy' ? executeBuy : executeSell}
            disabled={isProcessing}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all
                     active:scale-95 disabled:opacity-50 disabled:active:scale-100
                     ${activeTab === 'buy'
                       ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                       : 'bg-gradient-to-r from-orange-600 to-red-600'}`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                Processing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {activeTab === 'buy' ? <ShoppingCart className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                {activeTab === 'buy' ? 'Purchase' : 'Sell'} for{' '}
                {activeTab === 'buy' 
                  ? getItemPrice(selectedItem) * quantity 
                  : getItemPrice(selectedItem, true) * quantity}c
              </span>
            )}
          </button>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmation && pendingTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmation(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-900 border-2 border-cyan-600/50 rounded-xl p-4 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-3">Confirm Transaction</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{pendingTransaction.item.icon}</span>
                  <span className="font-semibold text-white">
                    {pendingTransaction.quantity}x {pendingTransaction.item.name}
                  </span>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price per unit:</span>
                    <span className="text-white">{pendingTransaction.pricePerUnit}c</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      {pendingTransaction.type === 'buy' ? 'Total Cost:' : 'Total Earnings:'}
                    </span>
                    <span className={`font-mono ${
                      pendingTransaction.type === 'buy' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {pendingTransaction.type === 'buy' 
                        ? pendingTransaction.totalCost 
                        : pendingTransaction.totalEarnings}c
                    </span>
                  </div>
                  {pendingTransaction.profit !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expected Profit:</span>
                      <span className={`font-mono ${
                        pendingTransaction.profit > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {pendingTransaction.profit > 0 ? '+' : ''}{pendingTransaction.profit}c
                      </span>
                    </div>
                  )}
                </div>
                
                {pendingTransaction.item.illegal && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>
                        This is contraband! Heat will increase by{' '}
                        {(pendingTransaction.item.heatOnPurchase || 0) * pendingTransaction.quantity}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setPendingTransaction(null);
                    triggerHaptic();
                  }}
                  className="py-2 px-4 bg-slate-700 text-white rounded-lg font-semibold
                           active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (pendingTransaction.type === 'buy') {
                      processBuyTransaction(
                        pendingTransaction.item,
                        pendingTransaction.quantity,
                        pendingTransaction.pricePerUnit,
                        pendingTransaction.totalCost
                      );
                    } else {
                      processSellTransaction(
                        pendingTransaction.item,
                        pendingTransaction.quantity,
                        pendingTransaction.pricePerUnit,
                        pendingTransaction.totalEarnings,
                        pendingTransaction.profit
                      );
                    }
                  }}
                  className={`py-2 px-4 rounded-lg font-semibold text-white active:scale-95
                           ${pendingTransaction.type === 'buy'
                             ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                             : 'bg-gradient-to-r from-orange-600 to-red-600'}`}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};