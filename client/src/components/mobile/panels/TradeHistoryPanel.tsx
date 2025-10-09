import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  History,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Package,
  MapPin,
  DollarSign,
  Award,
  AlertCircle,
  ChevronDown,
  Trash2,
  Star
} from 'lucide-react';
import { useTradeHistory } from '../../../lib/stores/economy/useTradeHistory';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { useAutoScroll } from '../../../hooks/useAutoScroll';
import { MARKET_ITEMS } from '../../../lib/stores/economy/marketData';
import { toast } from 'sonner';
import { triggerHaptic } from '../../../utils/hapticFeedback';

interface TradeHistoryPanelProps {
  onClose?: () => void;
}

type FilterType = 'all' | 'buy' | 'sell' | 'profitable' | 'losses';

export const TradeHistoryPanel: React.FC<TradeHistoryPanelProps> = ({ onClose }) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterItem, setFilterItem] = useState<string | null>(null);
  const [filterStation, setFilterStation] = useState<string | null>(null);
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  
  const { config } = useMobileLayout();
  const tradeHistory = useTradeHistory();
  
  // Auto-scroll for mobile lists
  const { containerRef, scrollToTop } = useAutoScroll();

  // Scroll to top when filters change
  useEffect(() => {
    scrollToTop();
  }, [filterType, filterItem, filterStation, scrollToTop]);
  
  // Get filtered transactions
  const filteredTransactions = useMemo(() => {
    let transactions = tradeHistory.getRecentTransactions(50);
    
    // Apply type filter
    switch (filterType) {
      case 'buy':
        transactions = transactions.filter(t => t.transactionType === 'buy');
        break;
      case 'sell':
        transactions = transactions.filter(t => t.transactionType === 'sell');
        break;
      case 'profitable':
        transactions = transactions.filter(t => t.transactionType === 'sell' && (t.profit || 0) > 0);
        break;
      case 'losses':
        transactions = transactions.filter(t => t.transactionType === 'sell' && (t.profit || 0) < 0);
        break;
    }
    
    // Apply item filter
    if (filterItem) {
      transactions = transactions.filter(t => t.itemType === filterItem);
    }
    
    // Apply station filter
    if (filterStation) {
      transactions = transactions.filter(t => t.station === filterStation);
    }
    
    return transactions;
  }, [filterType, filterItem, filterStation, tradeHistory]);
  
  // Get unique stations from history
  const stations = useMemo(() => {
    const stationSet = new Set<string>();
    tradeHistory.transactions.forEach(t => stationSet.add(t.station));
    return Array.from(stationSet);
  }, [tradeHistory.transactions]);
  
  // Get unique items from history
  const tradedItems = useMemo(() => {
    const itemSet = new Set<string>();
    tradeHistory.transactions.forEach(t => itemSet.add(t.itemType));
    return Array.from(itemSet);
  }, [tradeHistory.transactions]);
  
  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };
  
  // Get item info
  const getItemInfo = (itemId: string) => {
    return MARKET_ITEMS.find(item => item.id === itemId);
  };
  
  // Toggle favorite item
  const toggleFavorite = (itemType: string) => {
    tradeHistory.toggleFavoriteItem(itemType);
    triggerHaptic();
    
    const isFavorite = tradeHistory.favoriteItems.includes(itemType);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };
  
  // Clear history confirmation
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all trade history?')) {
      tradeHistory.clearHistory();
      toast.success('Trade history cleared');
      triggerHaptic(20);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 border-b border-purple-600/30 px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <History className="w-4 h-4 text-purple-400" />
            Trade History
          </h2>
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg bg-slate-700/50 text-red-400 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Stats Toggle */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between text-[10px] text-gray-400 
                   hover:text-white transition-colors"
        >
          <span>Trading Statistics</span>
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showStats ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {/* Trading Stats */}
      {showStats && tradeHistory.stats && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-slate-900/50 border-b border-slate-700 px-4 py-3"
        >
          {/* Main Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-xs text-gray-500">Total Profit</div>
              <div className={`text-lg font-mono ${
                tradeHistory.stats.totalProfit > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {tradeHistory.stats.totalProfit > 0 ? '+' : ''}
                {tradeHistory.stats.totalProfit}c
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-xs text-gray-500">Spent</div>
              <div className="text-lg font-mono text-red-400">
                {tradeHistory.stats.totalSpent}c
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-xs text-gray-500">Earned</div>
              <div className="text-lg font-mono text-green-400">
                {tradeHistory.stats.totalEarned}c
              </div>
            </div>
          </div>
          
          {/* Best/Worst Deals */}
          <div className="space-y-2">
            {tradeHistory.stats.bestDeal && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Award className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Best Deal</span>
                  </div>
                  <span className="text-xs text-green-400 font-mono">
                    +{tradeHistory.stats.bestDeal.profit}c profit
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {tradeHistory.stats.bestDeal.quantity}x {tradeHistory.stats.bestDeal.itemName}
                </div>
              </div>
            )}
            
            {tradeHistory.stats.worstDeal && tradeHistory.stats.worstDeal.profit! < 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">Worst Deal</span>
                  </div>
                  <span className="text-xs text-red-400 font-mono">
                    {tradeHistory.stats.worstDeal.profit}c loss
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {tradeHistory.stats.worstDeal.quantity}x {tradeHistory.stats.worstDeal.itemName}
                </div>
              </div>
            )}
          </div>
          
          {/* Favorite Items */}
          {tradeHistory.stats.favoriteItems.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Most Traded Items</div>
              <div className="flex flex-wrap gap-1">
                {tradeHistory.stats.favoriteItems.map(itemId => {
                  const item = getItemInfo(itemId);
                  if (!item) return null;
                  return (
                    <span key={itemId} className="px-2 py-1 bg-slate-700/50 rounded-full text-xs text-cyan-400">
                      {item.icon} {item.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
      
      {/* Filters */}
      <div className="bg-slate-900/50 px-4 py-2 space-y-2">
        {/* Type Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {(['all', 'buy', 'sell', 'profitable', 'losses'] as FilterType[]).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                       ${filterType === type 
                         ? 'bg-purple-600 text-white' 
                         : 'bg-slate-700 text-gray-400'}`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Item/Station Filters */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterItem || ''}
            onChange={(e) => setFilterItem(e.target.value || null)}
            className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 focus:outline-none
                     focus:ring-2 focus:ring-purple-600"
          >
            <option value="">All Items</option>
            {tradedItems.map(itemId => {
              const item = getItemInfo(itemId);
              return (
                <option key={itemId} value={itemId}>
                  {item?.name || itemId}
                </option>
              );
            })}
          </select>
          
          <select
            value={filterStation || ''}
            onChange={(e) => setFilterStation(e.target.value || null)}
            className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 focus:outline-none
                     focus:ring-2 focus:ring-purple-600"
          >
            <option value="">All Stations</option>
            {stations.map(station => (
              <option key={station} value={station}>{station}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Transactions List */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {tradeHistory.transactions.length === 0 
              ? 'No trades yet'
              : 'No trades match the current filters'}
          </div>
        ) : (
          filteredTransactions.map(transaction => {
            const item = getItemInfo(transaction.itemType);
            const isExpanded = expandedTransaction === transaction.id;
            const isFavorite = tradeHistory.favoriteItems.includes(transaction.itemType);
            
            return (
              <motion.div
                key={transaction.id}
                layout
                className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop}
                         ${config.panel.radius} p-3 cursor-pointer transition-all`}
                onClick={() => {
                  setExpandedTransaction(isExpanded ? null : transaction.id);
                  triggerHaptic();
                }}
              >
                {/* Transaction Summary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                 ${transaction.transactionType === 'buy'
                                   ? 'bg-green-500/20 text-green-400'
                                   : 'bg-orange-500/20 text-orange-400'}`}>
                      {transaction.transactionType === 'buy' ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : (
                        <TrendingUp className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {transaction.quantity}x {transaction.itemName}
                        </span>
                        {item && <span className="text-lg">{item.icon}</span>}
                        {isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTime(transaction.timestamp)}</span>
                        <MapPin className="w-3 h-3" />
                        <span>{transaction.station}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-mono ${
                      transaction.transactionType === 'buy' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {transaction.transactionType === 'buy' ? '-' : '+'}
                      {transaction.totalPrice}c
                    </div>
                    {transaction.profit !== undefined && (
                      <div className={`text-xs ${
                        transaction.profit > 0 ? 'text-green-400' : transaction.profit < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {transaction.profit > 0 ? '+' : ''}{transaction.profit}c profit
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-slate-700"
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price/Unit:</span>
                        <span className="text-gray-400">{transaction.pricePerUnit}c</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quantity:</span>
                        <span className="text-gray-400">{transaction.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Planet:</span>
                        <span className="text-gray-400">{transaction.planet}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Faction:</span>
                        <span className="text-gray-400">{transaction.faction}</span>
                      </div>
                      {transaction.heatLevel !== undefined && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-500">Heat at Trade:</span>
                          <span className={`${
                            transaction.heatLevel > 50 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {transaction.heatLevel} heat
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Favorite Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(transaction.itemType);
                      }}
                      className="mt-3 w-full py-2 bg-slate-700 rounded-lg text-xs font-semibold
                               text-yellow-400 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Star className={`w-3 h-3 ${isFavorite ? 'fill-yellow-400' : ''}`} />
                      {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
      
      {/* Summary Footer */}
      <div className="bg-slate-900 border-t border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Showing {filteredTransactions.length} of {tradeHistory.transactions.length} trades
          </span>
          <span className={`font-mono ${
            tradeHistory.stats.totalProfit > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            Net: {tradeHistory.stats.totalProfit > 0 ? '+' : ''}{tradeHistory.stats.totalProfit}c
          </span>
        </div>
      </div>
    </div>
  );
};