import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Package,
  AlertTriangle,
  Star,
  Info,
  ChevronRight,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { useHeatSystem } from '../../../lib/stores/player/useHeatSystem';
import { useLandedState } from '../../../lib/stores/surface/useLandedState';
import { useTradeHistory } from '../../../lib/stores/economy/useTradeHistory';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { 
  MARKET_ITEMS, 
  MarketItem,
  calculateFinalPrice,
  generateMarketConditions,
  isProfitableTrade
} from '../../../lib/stores/economy/marketData';
import { toast } from 'sonner';

interface MarketPanelProps {
  station?: string;
  faction?: string;
  onItemSelect?: (item: MarketItem, price: number) => void;
  onClose?: () => void;
}

// Category configuration for display
const CATEGORIES = [
  { id: 'fuel', name: 'Fuel', icon: '⛽', color: 'from-yellow-500 to-orange-500' },
  { id: 'food', name: 'Food', icon: '🍱', color: 'from-green-500 to-lime-500' },
  { id: 'medicine', name: 'Medicine', icon: '💊', color: 'from-blue-500 to-cyan-500' },
  { id: 'electronics', name: 'Electronics', icon: '💻', color: 'from-purple-500 to-pink-500' },
  { id: 'weapons', name: 'Weapons', icon: '🔫', color: 'from-red-500 to-rose-500' },
  { id: 'contraband', name: 'Contraband', icon: '⚠️', color: 'from-gray-600 to-gray-800' }
];

export const MarketPanel: React.FC<MarketPanelProps> = ({ 
  station = 'Unknown Station',
  faction = 'independents',
  onItemSelect,
  onClose 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  
  const { config } = useMobileLayout();
  const heatSystem = useHeatSystem();
  const { landedPlanet } = useLandedState();
  const tradeHistory = useTradeHistory();
  
  // Generate market conditions for this station
  const marketConditions = useMemo(() => {
    return generateMarketConditions(landedPlanet || station);
  }, [landedPlanet, station]);
  
  // Filter items based on availability and category
  const displayItems = useMemo(() => {
    let items = MARKET_ITEMS.filter(item => 
      marketConditions.available.includes(item.id)
    );
    
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    return items;
  }, [selectedCategory, marketConditions]);
  
  // Calculate price for an item with all modifiers
  const getItemPrice = (item: MarketItem): number => {
    const heatModifier = heatSystem.applyPriceModifiers(1);
    const supplyDemandModifier = marketConditions.supplyDemand[item.id] || 1;
    const specialDeal = marketConditions.specialDeals.find(d => d.itemId === item.id);
    
    let price = calculateFinalPrice(item, faction, heatModifier, supplyDemandModifier);
    
    // Apply special deal discount if exists
    if (specialDeal) {
      price = Math.round(price * (1 - specialDeal.discount));
    }
    
    return price;
  };
  
  // Get price trend for an item
  const getPriceTrend = (item: MarketItem): { trend: 'up' | 'down' | 'stable'; percentage: number } => {
    const trends = tradeHistory.getTradingTrends();
    const itemTrend = trends.find(t => t.itemType === item.id);
    
    if (!itemTrend) {
      // Check current vs base price
      const currentPrice = getItemPrice(item);
      const percentage = ((currentPrice - item.basePrice) / item.basePrice) * 100;
      
      if (percentage > 5) return { trend: 'up', percentage };
      if (percentage < -5) return { trend: 'down', percentage };
      return { trend: 'stable', percentage: 0 };
    }
    
    return { trend: itemTrend.trend, percentage: itemTrend.change };
  };
  
  // Check if item is a good deal
  const isGoodDeal = (item: MarketItem): boolean => {
    const currentPrice = getItemPrice(item);
    const avgPrices = tradeHistory.getAveragePrices(item.id);
    
    // Good buy if current price is 20% below average sell price
    if (avgPrices.sellAvg > 0) {
      return isProfitableTrade(currentPrice, avgPrices.sellAvg, 1.2);
    }
    
    // Or if it's below base price
    return currentPrice < item.basePrice * 0.9;
  };
  
  // Check for special deal
  const hasSpecialDeal = (itemId: string): { hasit: boolean; discount: number } => {
    const deal = marketConditions.specialDeals.find(d => d.itemId === itemId);
    return { hasit: !!deal, discount: deal ? Math.round(deal.discount * 100) : 0 };
  };
  
  // Handle item selection
  const handleItemClick = (item: MarketItem) => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    
    if (expandedItem === item.id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(item.id);
    }
    
    if (onItemSelect) {
      onItemSelect(item, getItemPrice(item));
    }
  };
  
  // Check price alerts
  useEffect(() => {
    const currentPrices: Record<string, number> = {};
    displayItems.forEach(item => {
      currentPrices[item.id] = getItemPrice(item);
    });
    
    const alerts = tradeHistory.checkPriceAlerts(currentPrices);
    alerts.forEach(alert => {
      toast.info('Price Alert!', { description: alert });
    });
  }, [displayItems]);
  
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 border-b border-cyan-600/30 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white">Market Overview</h2>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg bg-slate-700/50 text-cyan-400"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Station: {station}</span>
          <span className="text-orange-400">Faction: {faction}</span>
        </div>
        
        {heatSystem.wantedLevel > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Prices +{Math.round((heatSystem.applyPriceModifiers(1) - 1) * 100)}% due to heat</span>
          </div>
        )}
      </div>
      
      {/* Info Panel */}
      {showInfo && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-slate-800/50 border-b border-slate-700 px-4 py-3 text-xs space-y-2"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-red-400" />
            <span className="text-gray-400">Price rising from average</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-3 h-3 text-green-400" />
            <span className="text-gray-400">Price falling from average</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span className="text-gray-400">Special deal available</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-green-400" />
            <span className="text-gray-400">Profitable trade opportunity</span>
          </div>
        </motion.div>
      )}
      
      {/* Category Tabs */}
      <div className="bg-slate-900/50 px-2 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap
                     ${selectedCategory === 'all' 
                       ? 'bg-cyan-600 text-white' 
                       : 'bg-slate-700 text-gray-400'}`}
          >
            All Items
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1
                       ${selectedCategory === cat.id 
                         ? 'bg-gradient-to-r ' + cat.color + ' text-white' 
                         : 'bg-slate-700 text-gray-400'}`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items available in this category
          </div>
        ) : (
          displayItems.map(item => {
            const price = getItemPrice(item);
            const trend = getPriceTrend(item);
            const goodDeal = isGoodDeal(item);
            const specialDeal = hasSpecialDeal(item.id);
            const avgPrices = tradeHistory.getAveragePrices(item.id);
            const isFavorite = tradeHistory.favoriteItems.includes(item.id);
            const isExpanded = expandedItem === item.id;
            
            return (
              <motion.div
                key={item.id}
                layout
                className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} 
                         ${config.panel.radius} p-3 cursor-pointer active:scale-98 transition-transform
                         ${goodDeal ? 'border-green-500/50' : ''}
                         ${item.illegal ? 'border-red-500/30' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {/* Main Item Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        {isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                        {specialDeal.hasit && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 
                                       rounded-full text-xs text-yellow-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {specialDeal.discount}% OFF
                          </span>
                        )}
                        {item.illegal && (
                          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/50 
                                       rounded-full text-xs text-red-400">
                            Illegal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{item.category}</span>
                        {goodDeal && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Good Deal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono text-cyan-400">{price}c</span>
                        {trend.trend === 'up' && (
                          <TrendingUp className="w-4 h-4 text-red-400" />
                        )}
                        {trend.trend === 'down' && (
                          <TrendingDown className="w-4 h-4 text-green-400" />
                        )}
                        {trend.trend === 'stable' && (
                          <Minus className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      {trend.percentage !== 0 && (
                        <span className={`text-xs ${trend.trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
                          {trend.percentage > 0 ? '+' : ''}{trend.percentage}%
                        </span>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform 
                                          ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-slate-700 space-y-2"
                  >
                    <p className="text-xs text-gray-400">{item.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Price:</span>
                        <span className="text-gray-400">{item.basePrice}c</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Weight:</span>
                        <span className="text-gray-400">{item.weight} units</span>
                      </div>
                      {avgPrices.buyAvg > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg Buy:</span>
                          <span className="text-gray-400">{avgPrices.buyAvg}c</span>
                        </div>
                      )}
                      {avgPrices.sellAvg > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg Sell:</span>
                          <span className="text-gray-400">{avgPrices.sellAvg}c</span>
                        </div>
                      )}
                      {item.heatOnPurchase && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-500">Heat on Purchase:</span>
                          <span className="text-red-400">+{item.heatOnPurchase} heat</span>
                        </div>
                      )}
                    </div>
                    
                    {item.illegal && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                        <div className="flex items-center gap-2 text-xs text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Carrying this item increases heat and patrol risk</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
      
      {/* Special Deals Summary */}
      {marketConditions.specialDeals.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-t border-yellow-600/30 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <Sparkles className="w-4 h-4" />
            <span>{marketConditions.specialDeals.length} special deals active at this station!</span>
          </div>
        </div>
      )}
    </div>
  );
};