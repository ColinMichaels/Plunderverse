import React, { useState, useEffect } from 'react';
import { usePlayer } from '../../lib/stores/player/usePlayer';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../lib/stores/ship/useEquipment';
import { useSolarSystem } from '../../lib/stores/space/useSolarSystem';
import { useCredits } from '../../lib/stores/economy/useCredits';
import { useInventory } from '../../lib/stores/economy/useInventory';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useMobileLayout } from '../../stores/useMobileLayout';
import { useHeatSystem } from '../../lib/stores/player/useHeatSystem';
import { MobileSlidePanel } from './MobileSlidePanel';
import { ShipRepairPanel } from './panels/ShipRepairPanel';
import { ShipUpgradePanel } from './panels/ShipUpgradePanel';
import { MarketPanel } from './panels/MarketPanel';
import { TradingPanel } from './panels/TradingPanel';
import { TradeHistoryPanel } from './panels/TradeHistoryPanel';
import { MissionsPanel } from './panels/MissionsPanel';
import { useTradeHistory } from '../../lib/stores/economy/useTradeHistory';
import { usePlunderverseMissions } from '../../lib/stores/economy/usePlunderverseMissions';
import { toast } from 'sonner';
import ReputationWarning from '../ReputationWarning';
import { 
  Fuel, 
  Package, 
  Shield, 
  Flame, 
  ChevronRight,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  ShoppingCart,
  Wrench,
  AlertTriangle,
  Settings,
  Sparkles,
  History,
  Store,
  Coins,
  Flag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'overview' | 'trade' | 'crew' | 'missions' | 'ship';
type ResourcePanelType = 'fuel' | 'cargo' | 'hull' | 'heat' | null;

// Station data (would normally come from a store)
const STATION_DATA = {
  fuelPrice: 10, // per unit
  repairPrice: 5, // per hull %
  layLowCost: 100, // base cost
  emergencyJumpCost: 500,
  faction: 'Independent',
  services: ['Refuel', 'Repair', 'Trade', 'Lay Low']
};

/**
 * StationDashboard - Enhanced mobile UI for station management
 * Features interactive resource management, transactions, and station services
 */
export const StationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ResourcePanelType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRepairPanel, setShowRepairPanel] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [showMarketPanel, setShowMarketPanel] = useState(false);
  const [showTradingPanel, setShowTradingPanel] = useState(false);
  const [showTradeHistoryPanel, setShowTradeHistoryPanel] = useState(false);
  const [showMissionsPanel, setShowMissionsPanel] = useState(false);
  
  // Fuel management state
  const [fuelAmount, setFuelAmount] = useState(10);
  const [selectedCargoToJettison, setSelectedCargoToJettison] = useState<string[]>([]);
  const [repairAmount, setRepairAmount] = useState(100);
  const [layLowDays, setLayLowDays] = useState(1);
  
  // Store hooks for shared state
  const player = usePlayer();
  const ship = useShipStatus();
  const equipment = useEquipment();
  const { credits, spendCredits, earnCredits } = useCredits();
  const inventory = useInventory();
  const { landedPlanet } = useLandedState();
  const { config } = useMobileLayout();
  const heatSystem = useHeatSystem();
  const { selectedPlanet } = useSolarSystem();
  const tradeHistory = useTradeHistory();
  const missions = usePlunderverseMissions();
  
  // Get fuel data from equipment store
  const fuelTank = equipment.getEquipment('fuel-tank');
  const fuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  const fuelPercentage = (fuel / maxFuel) * 100;
  
  // Get hull percentage
  const hullPercentage = ship.hull;
  const hullDamage = 100 - hullPercentage;
  
  // Get current location name
  const locationName = landedPlanet || selectedPlanet || 'Unknown Station';
  
  // Calculate prices with faction modifiers
  const priceModifier = heatSystem.applyPriceModifiers(1);
  const actualFuelPrice = Math.round(STATION_DATA.fuelPrice * priceModifier);
  const actualRepairPrice = Math.round(STATION_DATA.repairPrice * priceModifier);
  const actualLayLowCost = Math.round(STATION_DATA.layLowCost * priceModifier);
  
  // Haptic feedback helper
  const triggerHaptic = (duration = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };
  
  // Toggle card expansion
  const handleCardTap = (cardId: string) => {
    triggerHaptic();
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };
  
  // Handle fuel purchase
  const handleRefuel = async () => {
    const cost = Math.round(fuelAmount * actualFuelPrice);
    
    if (credits < cost) {
      toast.error('Insufficient credits', {
        description: `Need ${cost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }
    
    setIsProcessing(true);
    
    // Animate the transaction
    setTimeout(() => {
      if (spendCredits(cost)) {
        const result = equipment.replenishFuel(fuelAmount, credits - cost);
        if (result.success) {
          toast.success('Refuel successful', {
            description: `Added ${fuelAmount} fuel for ${cost} credits`
          });
          triggerHaptic();
          setActivePanel(null);
        }
      }
      setIsProcessing(false);
    }, 500);
  };
  
  // Handle hull repair
  const handleRepair = async () => {
    const actualRepairAmount = Math.min(repairAmount, hullDamage);
    const cost = Math.round(actualRepairAmount * actualRepairPrice);
    
    if (credits < cost) {
      toast.error('Insufficient credits', {
        description: `Need ${cost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      if (spendCredits(cost)) {
        ship.repairHull(actualRepairAmount);
        toast.success('Repair successful', {
          description: `Repaired ${actualRepairAmount}% hull for ${cost} credits`
        });
        triggerHaptic();
        setActivePanel(null);
      }
      setIsProcessing(false);
    }, 500);
  };
  
  // Handle cargo jettison
  const handleJettisonCargo = () => {
    if (selectedCargoToJettison.length === 0) {
      toast.error('No cargo selected');
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      selectedCargoToJettison.forEach(itemType => {
        const quantity = inventory.getResourceQuantity(itemType);
        if (quantity > 0) {
          inventory.removeResource(itemType, quantity);
        }
      });
      
      toast.success('Cargo jettisoned', {
        description: `Freed ${selectedCargoToJettison.length} cargo slot(s)`
      });
      triggerHaptic();
      setSelectedCargoToJettison([]);
      setActivePanel(null);
      setIsProcessing(false);
    }, 500);
  };
  
  // Handle laying low
  const handleLayLow = () => {
    const cost = actualLayLowCost * layLowDays;
    
    if (credits < cost) {
      toast.error('Insufficient credits', {
        description: `Need ${cost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      if (spendCredits(cost)) {
        heatSystem.startLayingLow(locationName);
        const heatReduction = Math.min(20 * layLowDays, player.heat);
        player.updateHeat(-heatReduction);
        
        toast.success('Laying low', {
          description: `Heat reduced by ${heatReduction}. Stay hidden for ${layLowDays} day(s)`
        });
        triggerHaptic();
        setActivePanel(null);
      }
      setIsProcessing(false);
    }, 500);
  };
  
  // Quick actions
  const handleQuickRefuel = () => {
    const fuelNeeded = maxFuel - fuel;
    const cost = Math.round(fuelNeeded * actualFuelPrice);
    
    if (fuelNeeded <= 0) {
      toast.info('Tank already full');
      return;
    }
    
    if (credits < cost) {
      toast.error('Insufficient credits for full refuel', {
        description: `Need ${cost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      if (spendCredits(cost)) {
        const result = equipment.replenishFuel(fuelNeeded, credits - cost);
        if (result.success) {
          toast.success('Quick refuel complete', {
            description: `Tank filled for ${cost} credits`
          });
          triggerHaptic();
        }
      }
      setIsProcessing(false);
    }, 500);
  };
  
  const handleAutoRepair = () => {
    if (hullDamage <= 0) {
      toast.info('Hull already at 100%');
      return;
    }
    
    const cost = Math.round(hullDamage * actualRepairPrice);
    
    if (credits < cost) {
      toast.error('Insufficient credits for full repair', {
        description: `Need ${cost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      if (spendCredits(cost)) {
        ship.repairHull(hullDamage);
        toast.success('Auto repair complete', {
          description: `Hull fully repaired for ${cost} credits`
        });
        triggerHaptic();
      }
      setIsProcessing(false);
    }, 500);
  };
  
  const handleEmergencyJump = () => {
    const cost = STATION_DATA.emergencyJumpCost;
    
    if (credits < cost) {
      toast.error('Insufficient credits for emergency jump', {
        description: `Need ${cost} credits, have ${credits}`
      });
      triggerHaptic(30);
      return;
    }
    
    setIsProcessing(true);
    
    setTimeout(() => {
      if (spendCredits(cost)) {
        player.updateHeat(-player.heat); // Reset heat to 0
        toast.success('Emergency jump activated', {
          description: 'Heat signature scrambled, wanted level reset'
        });
        triggerHaptic(20);
      }
      setIsProcessing(false);
    }, 500);
  };

  // Resource card component
  const ResourceCard = ({ 
    id, 
    title, 
    icon, 
    value, 
    max, 
    unit, 
    color,
    gradientColor,
    onAction,
    actionLabel,
    details
  }: any) => {
    const isExpanded = expandedCard === id;
    const percentage = max ? (value / max) * 100 : 0;
    
    return (
      <motion.div
        layout
        className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4
                   ${isExpanded ? 'col-span-2' : ''} cursor-pointer active:scale-98 transition-transform`}
        onClick={() => handleCardTap(id)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">{title}</span>
          <div className="flex items-center gap-2">
            {icon}
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-lg font-semibold text-white">
              {typeof value === 'number' ? Math.round(value) : value}
            </span>
            {max && (
              <span className="text-xs text-gray-500">
                / {max} {unit}
              </span>
            )}
          </div>
          
          {max && (
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${gradientColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </div>
        
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-slate-700 space-y-3"
          >
            {details && (
              <div className="space-y-2 text-sm">
                {details.map((detail: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-500">{detail.label}</span>
                    <span className={detail.valueColor || 'text-gray-400'}>{detail.value}</span>
                  </div>
                ))}
              </div>
            )}
            
            {onAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic();
                  onAction();
                }}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-2 rounded-lg
                         font-semibold active:scale-95 transition-transform"
              >
                {actionLabel}
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header Bar */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 border-b-2 border-orange-600/30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600/20 border border-orange-600 
                            flex items-center justify-center">
                <span className="text-orange-400 font-bold text-sm">
                  {player.level}
                </span>
              </div>
              <div>
                <h1 className="text-white font-semibold">Commander</h1>
                <p className="text-xs text-orange-400">{player.rankTitle}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Credits</p>
              <p className="text-lg font-mono text-cyan-400">{credits.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Station Info */}
          <div className="bg-slate-700/50 rounded px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 flex items-center gap-1">
                📍 {locationName}
              </p>
              <p className="text-xs text-orange-400">
                {STATION_DATA.faction}
              </p>
            </div>
            {heatSystem.wantedLevel > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <p className="text-xs text-red-400">
                  {heatSystem.wantedLevelInfo.name} - Prices +{Math.round((priceModifier - 1) * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Resource Overview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <ResourceCard
                id="fuel"
                title="Fuel"
                icon={<Fuel className="w-5 h-5 text-yellow-400" />}
                value={fuel}
                max={maxFuel}
                unit=""
                gradientColor="bg-gradient-to-r from-yellow-500 to-orange-500"
                onAction={() => setActivePanel('fuel')}
                actionLabel="Manage Fuel"
                details={[
                  { label: 'Efficiency', value: `${(ship.upgrades.thrustEfficiency * 100).toFixed(0)}%`, valueColor: 'text-green-400' },
                  { label: 'Price/unit', value: `${actualFuelPrice}c`, valueColor: 'text-yellow-400' },
                  { label: 'Full tank cost', value: `${Math.round((maxFuel - fuel) * actualFuelPrice)}c` }
                ]}
              />
              
              <ResourceCard
                id="cargo"
                title="Cargo"
                icon={<Package className="w-5 h-5 text-blue-400" />}
                value={inventory.getStorageUsed()}
                max={inventory.storageCapacity}
                unit="tons"
                gradientColor="bg-gradient-to-r from-blue-500 to-cyan-500"
                onAction={() => setActivePanel('cargo')}
                actionLabel="Manage Cargo"
                details={[
                  { label: 'Total value', value: `${inventory.getTotalValue()}c`, valueColor: 'text-cyan-400' },
                  { label: 'Items', value: inventory.items.length },
                  { label: 'Free space', value: `${inventory.storageCapacity - inventory.getStorageUsed()} tons` }
                ]}
              />
              
              <ResourceCard
                id="hull"
                title="Hull"
                icon={<Shield className="w-5 h-5 text-green-400" />}
                value={hullPercentage}
                max={100}
                unit="%"
                gradientColor={`${
                  hullPercentage > 70 ? 'bg-green-500' :
                  hullPercentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                onAction={() => setActivePanel('hull')}
                actionLabel="Repair Hull"
                details={[
                  { label: 'Damage', value: `${hullDamage.toFixed(0)}%`, valueColor: hullDamage > 0 ? 'text-red-400' : 'text-green-400' },
                  { label: 'Repair cost', value: `${actualRepairPrice}c per %` },
                  { label: 'Full repair', value: `${Math.round(hullDamage * actualRepairPrice)}c` }
                ]}
              />
              
              <ResourceCard
                id="heat"
                title="Heat"
                icon={<Flame className="w-5 h-5 text-red-400" />}
                value={player.heat}
                max={100}
                unit=""
                gradientColor={`${
                  player.heat < 30 ? 'bg-blue-500' :
                  player.heat < 70 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                onAction={() => setActivePanel('heat')}
                actionLabel="Manage Heat"
                details={[
                  { label: 'Wanted level', value: heatSystem.wantedLevelInfo.name, valueColor: `text-[${heatSystem.wantedLevelInfo.color}]` },
                  { label: 'Encounter chance', value: `${(heatSystem.wantedLevelInfo.encounterChance * 100).toFixed(0)}%` },
                  { label: 'Price markup', value: `+${(heatSystem.wantedLevelInfo.priceMarkup * 100).toFixed(0)}%`, valueColor: 'text-red-400' }
                ]}
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleQuickRefuel}
                  disabled={isProcessing || fuel >= maxFuel}
                  className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]
                           disabled:opacity-50 disabled:active:scale-100"
                >
                  <Zap className="w-5 h-5" />
                  <span>Quick Refuel</span>
                </button>
                
                <button
                  onClick={handleAutoRepair}
                  disabled={isProcessing || hullPercentage >= 100}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]
                           disabled:opacity-50 disabled:active:scale-100"
                >
                  <Wrench className="w-5 h-5" />
                  <span>Auto Repair</span>
                </button>
                
                <button
                  onClick={() => setShowMarketPanel(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]"
                >
                  <Store className="w-5 h-5" />
                  <span>Market Prices</span>
                </button>
                
                <button
                  onClick={handleEmergencyJump}
                  disabled={isProcessing || player.heat <= 0}
                  className="bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold
                           py-4 px-6 rounded-lg flex items-center justify-center gap-3
                           active:scale-95 transition-transform min-h-[60px]
                           disabled:opacity-50 disabled:active:scale-100"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>Emergency Jump</span>
                </button>
              </div>
              
              {/* Trading & Mission Actions */}
              <div className="grid grid-cols-4 gap-3 mt-3">
                <button
                  onClick={() => setShowTradingPanel(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold
                           py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1
                           active:scale-95 transition-transform"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-xs">Trade</span>
                </button>
                
                <button
                  onClick={() => setShowMissionsPanel(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold
                           py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1
                           active:scale-95 transition-transform relative"
                >
                  <Flag className="w-5 h-5" />
                  <span className="text-xs">Missions</span>
                  {missions.missions.filter(m => m.status === 'active' && !m.completed).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white rounded-full text-xs flex items-center justify-center">
                      {missions.missions.filter(m => m.status === 'active' && !m.completed).length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    // Quick sell functionality
                    const sellableItems = inventory.items;
                    if (sellableItems.length === 0) {
                      toast.info('No items to sell');
                      return;
                    }
                    
                    let totalEarnings = 0;
                    sellableItems.forEach(item => {
                      const basePrice = 50; // Base price fallback
                      const sellPrice = Math.round(basePrice * 0.8 * priceModifier);
                      totalEarnings += sellPrice * item.quantity;
                    });
                    
                    // Clear inventory and add credits
                    inventory.items.forEach(item => {
                      inventory.removeResource(item.type, item.quantity);
                    });
                    earnCredits(totalEarnings);
                    
                    toast.success(`Quick sell complete: +${totalEarnings}c`);
                    triggerHaptic(20);
                  }}
                  disabled={isProcessing || inventory.items.length === 0}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold
                           py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1
                           active:scale-95 transition-transform
                           disabled:opacity-50 disabled:active:scale-100"
                >
                  <Coins className="w-5 h-5" />
                  <span className="text-xs">Quick Sell</span>
                </button>
                
                <button
                  onClick={() => setShowTradeHistoryPanel(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold
                           py-3 px-4 rounded-lg flex flex-col items-center justify-center gap-1
                           active:scale-95 transition-transform"
                >
                  <History className="w-5 h-5" />
                  <span className="text-xs">History</span>
                </button>
              </div>
            </div>

            {/* Station Services */}
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Station Services</h3>
              <div className="flex flex-wrap gap-2">
                {STATION_DATA.services.map(service => (
                  <span key={service} className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-cyan-400">
                    {service}
                  </span>
                ))}
              </div>
            </div>

            {/* Player Stats */}
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Commander Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Experience</span>
                  <span className="text-cyan-400">{player.experience} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Notoriety</span>
                  <span className="text-orange-400">{player.notoriety}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Planets Visited</span>
                  <span className="text-green-400">{player.planetsVisited.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Jumps</span>
                  <span className="text-purple-400">{player.totalJumps}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trade' && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Market Prices</h2>
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4 space-y-3`}>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Fuel</span>
                <span className="text-yellow-400">{actualFuelPrice}c per unit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Repairs</span>
                <span className="text-green-400">{actualRepairPrice}c per %</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Lay Low</span>
                <span className="text-blue-400">{actualLayLowCost}c per day</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Emergency Jump</span>
                <span className="text-red-400">{STATION_DATA.emergencyJumpCost}c</span>
              </div>
              {priceModifier > 1 && (
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-red-400">
                    ⚠️ Prices increased by {Math.round((priceModifier - 1) * 100)}% due to wanted level
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'crew' && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Crew Management</h2>
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <p className="text-gray-400">Crew management coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Mission Board</h2>
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <p className="text-gray-400">Mission board coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'ship' && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Ship Management</h2>
            
            {/* Ship Status Overview */}
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">System Status</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Hull Integrity</span>
                  <span className={`text-sm font-semibold ${
                    ship.hull > 70 ? 'text-green-400' : 
                    ship.hull > 30 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{Math.round(ship.hull)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Shield Status</span>
                  <span className={`text-sm font-semibold ${
                    ship.shield > 70 ? 'text-cyan-400' : 
                    ship.shield > 30 ? 'text-yellow-400' : 'text-red-400'
                  }`}>{Math.round(ship.shield)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Engine Health</span>
                  <span className={`text-sm font-semibold ${
                    equipment.getPerformanceMultiplier('engine-main') > 0.8 ? 'text-purple-400' :
                    equipment.getPerformanceMultiplier('engine-main') > 0.5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {(equipment.getPerformanceMultiplier('engine-main') * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Combat Rating</span>
                  <span className="text-sm font-semibold text-orange-400">
                    {Math.round((ship.hull + ship.shield + (equipment.getPerformanceMultiplier('drill-mk1') * 100)) / 3)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ship Management Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  triggerHaptic();
                  setShowRepairPanel(true);
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold
                         py-4 px-6 rounded-lg flex flex-col items-center justify-center gap-2
                         active:scale-95 transition-transform min-h-[100px]"
              >
                <Wrench className="w-8 h-8" />
                <span className="text-sm">Repair Bay</span>
                <span className="text-xs opacity-75">Fix & Maintain</span>
              </button>
              
              <button
                onClick={() => {
                  triggerHaptic();
                  setShowUpgradePanel(true);
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold
                         py-4 px-6 rounded-lg flex flex-col items-center justify-center gap-2
                         active:scale-95 transition-transform min-h-[100px]"
              >
                <Settings className="w-8 h-8" />
                <span className="text-sm">Upgrade Shop</span>
                <span className="text-xs opacity-75">Enhance Systems</span>
              </button>
            </div>

            {/* Current Upgrades */}
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Active Upgrades</h3>
              <div className="space-y-2">
                {ship.upgrades.warpCapability && (
                  <div className="flex items-center gap-3 p-2 bg-purple-900/30 border border-purple-600/30 rounded-lg">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Warp Drive</p>
                      <p className="text-xs text-purple-400">FTL Travel Enabled</p>
                    </div>
                  </div>
                )}
                {ship.upgrades.fuelCapacity > 1 && (
                  <div className="flex items-center gap-3 p-2 bg-orange-900/30 border border-orange-600/30 rounded-lg">
                    <Fuel className="w-4 h-4 text-orange-400" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Expanded Fuel Tank</p>
                      <p className="text-xs text-orange-400">Capacity: {ship.upgrades.fuelCapacity}x</p>
                    </div>
                  </div>
                )}
                {ship.upgrades.thrustEfficiency < 1 && (
                  <div className="flex items-center gap-3 p-2 bg-green-900/30 border border-green-600/30 rounded-lg">
                    <Zap className="w-4 h-4 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Efficient Thrusters</p>
                      <p className="text-xs text-green-400">Fuel Usage: {(ship.upgrades.thrustEfficiency * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                )}
                {!ship.upgrades.warpCapability && ship.upgrades.fuelCapacity <= 1 && ship.upgrades.thrustEfficiency >= 1 && (
                  <p className="text-gray-500 text-sm text-center py-2">No upgrades installed</p>
                )}
              </div>
            </div>

            {/* Ship Statistics */}
            <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Ship Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Cargo Capacity</span>
                  <span className="text-cyan-400">{inventory.storageCapacity} tons</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Speed</span>
                  <span className="text-purple-400">{ship.upgrades.thrustEfficiency < 1 ? '130%' : '100%'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Defensive Rating</span>
                  <span className="text-green-400">{Math.round((ship.hull + ship.shield) / 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Maintenance Status</span>
                  <span className={`${
                    equipment.getPerformanceMultiplier('maintenance-kit') > 0.8 ? 'text-green-400' :
                    equipment.getPerformanceMultiplier('maintenance-kit') > 0.5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {equipment.getPerformanceMultiplier('maintenance-kit') > 0.8 ? 'Good' :
                     equipment.getPerformanceMultiplier('maintenance-kit') > 0.5 ? 'Fair' : 'Poor'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-slate-900 border-t-2 border-slate-700">
        <div className="grid grid-cols-5 h-16">
          {[
            { id: 'overview', icon: '🏠', label: 'Overview' },
            { id: 'trade', icon: '💰', label: 'Market' },
            { id: 'crew', icon: '👥', label: 'Crew' },
            { id: 'missions', icon: '📋', label: 'Missions' },
            { id: 'ship', icon: '🚀', label: 'Ship' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic();
                setActiveTab(tab.id as TabType);
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors
                        ${activeTab === tab.id 
                          ? 'text-orange-400 bg-slate-800' 
                          : 'text-gray-400 active:bg-slate-800'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Resource Management Panels */}
      
      {/* Fuel Management Panel */}
      {/* Fuel Management Panel - Optimized for mobile */}
      <MobileSlidePanel
        isOpen={activePanel === 'fuel'}
        onClose={() => setActivePanel(null)}
        title="Fuel Management"
        height="full"
      >
        <div className="space-y-3 pb-4">
          {/* Compact Fuel Level Display */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Current Fuel</span>
              <span className="text-yellow-400 font-mono text-sm">{Math.round(fuel)} / {maxFuel}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                style={{ width: `${fuelPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Compact Purchase Controls */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Price per unit</span>
              <span className="text-cyan-400">{actualFuelPrice} credits</span>
            </div>
            
            {/* Compact Slider */}
            <div className="bg-slate-800/30 rounded-lg p-2">
              <label className="text-xs text-gray-400 block mb-1">
                Amount to purchase: <span className="text-yellow-400">{fuelAmount}</span> units
              </label>
              <input
                type="range"
                min="1"
                max={Math.min(100, maxFuel - fuel)}
                value={fuelAmount}
                onChange={(e) => setFuelAmount(Number(e.target.value))}
                className="w-full h-1"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">Total Cost:</span>
                <span className="text-xs text-cyan-400 font-mono">{fuelAmount * actualFuelPrice}c</span>
              </div>
            </div>
            
            {/* Compact Button */}
            <button
              onClick={handleRefuel}
              disabled={isProcessing || credits < fuelAmount * actualFuelPrice}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-2.5 rounded-lg
                       font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : `Purchase ${fuelAmount} Fuel`}
            </button>
          </div>
        </div>
      </MobileSlidePanel>

      {/* Cargo Management Panel - Optimized for mobile */}
      <MobileSlidePanel
        isOpen={activePanel === 'cargo'}
        onClose={() => setActivePanel(null)}
        title="Cargo Management"
        height="full"
      >
        <div className="space-y-3 pb-4">
          {/* Compact Cargo Hold Display */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Cargo Hold</span>
              <span className="text-blue-400 font-mono text-sm">
                {inventory.getStorageUsed()} / {inventory.storageCapacity} tons
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                style={{ width: `${(inventory.getStorageUsed() / inventory.storageCapacity) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Compact Manifest */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400">Cargo Manifest</h3>
            {inventory.items.length > 0 ? (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {inventory.items.map(item => (
                  <div key={item.type} className="bg-slate-800/50 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{item.type}</p>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                          <span className="text-xs text-yellow-500">{item.value * item.quantity}c</span>
                          <span className="text-xs text-blue-500">{item.planetSource}</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedCargoToJettison.includes(item.type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCargoToJettison([...selectedCargoToJettison, item.type]);
                          } else {
                            setSelectedCargoToJettison(selectedCargoToJettison.filter(t => t !== item.type));
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No cargo in hold</p>
            )}
          </div>
          
          {inventory.items.length > 0 && (
            <button
              onClick={handleJettisonCargo}
              disabled={isProcessing || selectedCargoToJettison.length === 0}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-lg
                       font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : `Jettison ${selectedCargoToJettison.length} Selected`}
            </button>
          )}
        </div>
      </MobileSlidePanel>

      {/* Hull Repair Panel - Optimized for mobile */}
      <MobileSlidePanel
        isOpen={activePanel === 'hull'}
        onClose={() => setActivePanel(null)}
        title="Hull Repair"
        height="full"
      >
        <div className="space-y-3 pb-4">
          {/* Compact Hull Status Display */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Hull Integrity</span>
              <span className={`font-mono text-sm ${
                hullPercentage > 70 ? 'text-green-400' :
                hullPercentage > 30 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {Math.round(hullPercentage)}%
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  hullPercentage > 70 ? 'bg-green-500' :
                  hullPercentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${hullPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Compact Repair Controls */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Damage</span>
              <span className="text-red-400">{Math.round(hullDamage)}%</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Repair cost per %</span>
              <span className="text-cyan-400">{actualRepairPrice} credits</span>
            </div>
            
            {/* Compact Slider */}
            <div className="bg-slate-800/30 rounded-lg p-2">
              <label className="text-xs text-gray-400 block mb-1">
                Repair amount: <span className="text-green-400">{repairAmount}</span>%
              </label>
              <input
                type="range"
                min="1"
                max={Math.round(hullDamage)}
                value={repairAmount}
                onChange={(e) => setRepairAmount(Number(e.target.value))}
                className="w-full h-1"
                disabled={hullDamage === 0}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">Total Cost:</span>
                <span className="text-xs text-cyan-400 font-mono">
                  {Math.round(Math.min(repairAmount, hullDamage) * actualRepairPrice)}c
                </span>
              </div>
            </div>
            
            {/* Compact Button */}
            <button
              onClick={handleRepair}
              disabled={isProcessing || hullDamage === 0 || credits < repairAmount * actualRepairPrice}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-lg
                       font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 
               hullDamage === 0 ? 'Hull at 100%' : 
               `Repair ${Math.min(repairAmount, Math.round(hullDamage))}% Hull`}
            </button>
          </div>
        </div>
      </MobileSlidePanel>

      {/* Heat Management Panel - Optimized for mobile */}
      <MobileSlidePanel
        isOpen={activePanel === 'heat'}
        onClose={() => setActivePanel(null)}
        title="Heat Management"
        height="full"  
      >
        <div className="space-y-3 pb-4">
          {/* Compact Heat Level Display */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Heat Level</span>
              <span className={`font-mono text-sm ${
                player.heat < 30 ? 'text-blue-400' :
                player.heat < 70 ? 'text-orange-400' : 'text-red-400'
              }`}>
                {player.heat} / 100
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  player.heat < 30 ? 'bg-blue-500' :
                  player.heat < 70 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${player.heat}%` }}
              />
            </div>
          </div>
          
          {/* Compact Wanted Level */}
          <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{heatSystem.wantedLevelInfo.icon}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">{heatSystem.wantedLevelInfo.name}</p>
                <p className="text-xs text-gray-400 line-clamp-1">{heatSystem.wantedLevelInfo.description}</p>
              </div>
            </div>
          </div>
          
          {/* Compact Consequences */}
          <div className="bg-slate-800/30 rounded-lg p-2">
            <h3 className="text-xs font-semibold text-gray-400 mb-1">Consequences</h3>
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Patrol encounters</span>
                <span className="text-orange-400">{(heatSystem.wantedLevelInfo.encounterChance * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price markup</span>
                <span className="text-red-400">+{(heatSystem.wantedLevelInfo.priceMarkup * 100).toFixed(0)}%</span>
              </div>
              {heatSystem.bountyHunterActive && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Bounty on head</span>
                  <span className="text-yellow-400">{heatSystem.bountyAmount}c</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Compact Lay Low Section */}
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <h3 className="text-xs font-semibold text-gray-400">Lay Low Options</h3>
            
            {/* Compact Slider */}
            <div className="bg-slate-800/30 rounded-lg p-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-400">
                  Days to lay low: <span className="text-cyan-400">{layLowDays}</span>
                </label>
                <span className="text-xs text-blue-400">-{Math.min(20 * layLowDays, player.heat)} heat</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={layLowDays}
                onChange={(e) => setLayLowDays(Number(e.target.value))}
                className="w-full h-1"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">Cost:</span>
                <span className="text-xs text-cyan-400 font-mono">{actualLayLowCost * layLowDays}c</span>
              </div>
            </div>
            
            {/* Compact Buttons */}
            <button
              onClick={handleLayLow}
              disabled={isProcessing || player.heat === 0 || credits < actualLayLowCost * layLowDays}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-lg
                       font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 
               player.heat === 0 ? 'No Heat to Reduce' : 
               `Lay Low for ${layLowDays} Day${layLowDays > 1 ? 's' : ''}`}
            </button>
            
            {heatSystem.fakeIdAvailable && (
              <button
                onClick={() => {
                  if (credits >= 1000) {
                    if (spendCredits(1000)) {
                      heatSystem.purchaseFakeId();
                      toast.success('Fake ID purchased', {
                        description: 'Temporary immunity from routine checks'
                      });
                      triggerHaptic();
                    }
                  } else {
                    toast.error('Insufficient credits', {
                      description: 'Need 1000 credits for fake ID'
                    });
                  }
                }}
                disabled={isProcessing || credits < 1000}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg
                         font-semibold text-sm active:scale-95 transition-transform disabled:opacity-50"
              >
                Purchase Fake ID (1000c)
              </button>
            )}
          </div>
        </div>
      </MobileSlidePanel>

      {/* Ship Repair Panel */}
      <AnimatePresence>
        {showRepairPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <ShipRepairPanel onClose={() => setShowRepairPanel(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ship Upgrade Panel */}
      <AnimatePresence>
        {showUpgradePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <ShipUpgradePanel onClose={() => setShowUpgradePanel(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market Overview Panel */}
      <MobileSlidePanel
        isOpen={showMarketPanel}
        onClose={() => setShowMarketPanel(false)}
        title="Market Overview"
        height="full"
      >
        <MarketPanel
          station={locationName}
          faction={STATION_DATA.faction.toLowerCase()}
          onItemSelect={(item, price) => {
            setShowMarketPanel(false);
            setShowTradingPanel(true);
          }}
          onClose={() => setShowMarketPanel(false)}
        />
      </MobileSlidePanel>

      {/* Trading Panel */}
      <MobileSlidePanel
        isOpen={showTradingPanel}
        onClose={() => setShowTradingPanel(false)}
        title="Trading Terminal"
        height="full"
      >
        <TradingPanel
          station={locationName}
          faction={STATION_DATA.faction.toLowerCase()}
          onClose={() => setShowTradingPanel(false)}
        />
      </MobileSlidePanel>

      {/* Trade History Panel */}
      <MobileSlidePanel
        isOpen={showTradeHistoryPanel}
        onClose={() => setShowTradeHistoryPanel(false)}
        title="Trade History"
        height="full"
      >
        <TradeHistoryPanel
          onClose={() => setShowTradeHistoryPanel(false)}
        />
      </MobileSlidePanel>

      {/* Missions Panel */}
      <MobileSlidePanel
        isOpen={showMissionsPanel}
        onClose={() => setShowMissionsPanel(false)}
        title="Mission Board"
        height="full"
      >
        <MissionsPanel
          onClose={() => setShowMissionsPanel(false)}
        />
      </MobileSlidePanel>
      
      {/* Reputation Warning */}
      <ReputationWarning />
    </div>
  );
};