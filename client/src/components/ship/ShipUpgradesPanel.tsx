import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpgrades, type Upgrade, type UpgradeTier } from '../../lib/stores/ship/useUpgrades';
import { useCredits } from '../../lib/stores/economy/useCredits';
import { useShipStatus } from '../../lib/stores/ship/useShipStatus';
import { useLandedState } from '../../lib/stores/surface/useLandedState';
import { useHUDContext } from '../../lib/stores/ui/useHUDContext';
import { toast } from 'sonner';
import {
  Zap,
  Shield,
  Cpu,
  Package,
  Navigation,
  Activity,
  ChevronRight,
  Lock,
  Unlock,
  Star,
  DollarSign,
  TrendingUp,
  Award,
  Info,
  Wrench,
  Building,
  Globe
} from 'lucide-react';

interface UpgradeCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  upgrades: Upgrade[];
}

export const ShipUpgradesPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('hull');
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const { catalog, ownedUpgrades, purchaseUpgrade, getUpgradesByCategory, isOwned } = useUpgrades();
  const { credits } = useCredits();
  const ship = useShipStatus();
  const { isLanded, landedPlanet } = useLandedState();
  const { isDocked, dockedStationName } = useHUDContext();
  
  const categories: UpgradeCategory[] = [
    {
      id: 'hull',
      label: 'Hull & Armor',
      icon: <Shield className="w-4 h-4" />,
      color: 'from-green-500 to-emerald-500',
      upgrades: getUpgradesByCategory('hull')
    },
    {
      id: 'shields',
      label: 'Shield Systems',
      icon: <Zap className="w-4 h-4" />,
      color: 'from-cyan-500 to-blue-500',
      upgrades: getUpgradesByCategory('shields')
    },
    {
      id: 'weapons',
      label: 'Weapons',
      icon: <Activity className="w-4 h-4" />,
      color: 'from-red-500 to-orange-500',
      upgrades: getUpgradesByCategory('weapons')
    },
    {
      id: 'engine',
      label: 'Engines',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'from-purple-500 to-pink-500',
      upgrades: getUpgradesByCategory('engine')
    },
    {
      id: 'cargo',
      label: 'Cargo Bay',
      icon: <Package className="w-4 h-4" />,
      color: 'from-yellow-500 to-amber-500',
      upgrades: getUpgradesByCategory('cargo')
    },
    {
      id: 'scanner',
      label: 'Scanners',
      icon: <Navigation className="w-4 h-4" />,
      color: 'from-indigo-500 to-purple-500',
      upgrades: getUpgradesByCategory('scanner' as any)
    }
  ];
  
  const getTierColor = (tier: UpgradeTier) => {
    switch (tier) {
      case 'basic': return 'text-gray-400';
      case 'advanced': return 'text-blue-400';
      case 'elite': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };
  
  const getTierBgColor = (tier: UpgradeTier) => {
    switch (tier) {
      case 'basic': return 'bg-gray-500/20 border-gray-500/30';
      case 'advanced': return 'bg-blue-500/20 border-blue-500/30';
      case 'elite': return 'bg-purple-500/20 border-purple-500/30';
      case 'legendary': return 'bg-yellow-500/20 border-yellow-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };
  
  const handlePurchaseUpgrade = (upgradeId: string) => {
    const upgrade = catalog.find((u: Upgrade) => u.id === upgradeId);
    if (!upgrade) return;
    
    if (credits < upgrade.cost) {
      toast.error(`Insufficient credits! Need ${upgrade.cost} credits`);
      return;
    }
    
    const success = purchaseUpgrade(upgradeId);
    if (success) {
      toast.success(`Purchased ${upgrade.name} for ${upgrade.cost} credits`);
    } else {
      toast.error(`Failed to purchase ${upgrade.name}`);
    }
  };
  
  const currentCategory = categories.find(c => c.id === selectedCategory);
  
  // Determine context for title and content
  const getTitle = () => {
    if (isDocked) return 'STATION UPGRADES';
    if (isLanded) return 'FIELD REPAIRS';
    return 'SHIP UPGRADES';
  };
  
  const getIcon = () => {
    if (isDocked) return <Building className="w-5 h-5 text-purple-400" />;
    if (isLanded) return <Wrench className="w-5 h-5 text-purple-400" />;
    return <Zap className="w-5 h-5 text-purple-400" />;
  };
  
  const getLocationText = () => {
    if (isDocked) return `Docked at ${dockedStationName || 'Station'}`;
    if (isLanded) return `Landed on ${landedPlanet || 'Surface'}`;
    return 'In Space';
  };
  
  const getContextMessage = () => {
    if (isDocked) {
      return 'Full station facilities available. All upgrades accessible at standard prices.';
    }
    if (isLanded) {
      return 'Limited field repairs available. Basic upgrades only, 20% price increase.';
    }
    return 'Upgrades unavailable while in space. Dock at a station or land on a planet.';
  };
  
  const getPriceModifier = () => {
    if (isDocked) return 1.0;
    if (isLanded) return 1.2; // 20% price increase for field repairs
    return 1.0;
  };
  
  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-lg border border-purple-500/30 p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="font-mono text-sm text-purple-400">{getTitle()}</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <DollarSign className="w-3 h-3" />
          <span className="font-mono">{credits}</span>
        </div>
      </div>
      
      {/* Context Information */}
      <div className="mb-3 p-2 bg-slate-800/40 rounded text-xs">
        <div className="flex items-center gap-1 text-gray-400 mb-1">
          <Globe className="w-3 h-3" />
          <span>{getLocationText()}</span>
        </div>
        <p className="text-gray-500">{getContextMessage()}</p>
      </div>
      
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-2 py-1 rounded text-xs font-mono transition-all ${
              selectedCategory === category.id
                ? 'bg-gradient-to-r ' + category.color + ' text-white'
                : 'bg-slate-800/30 text-gray-400 hover:bg-slate-800/50'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center gap-1">
              {category.icon}
              <span>{category.label}</span>
            </div>
          </motion.button>
        ))}
      </div>
      
      {/* Upgrades List */}
      <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/30">
        {currentCategory?.upgrades.map((upgrade) => (
          <motion.div
            key={upgrade.id}
            onClick={() => setSelectedUpgrade(selectedUpgrade === upgrade.id ? null : upgrade.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedUpgrade === upgrade.id
                ? getTierBgColor(upgrade.tier)
                : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={getTierColor(upgrade.tier)}>
                    <Star className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-mono text-gray-200">{upgrade.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${getTierColor(upgrade.tier)}`}>
                    {upgrade.tier.toUpperCase()}
                  </span>
                  {isOwned(upgrade.id) && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      OWNED
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                {!isOwned(upgrade.id) && (
                  <>
                    <div className={`text-xs font-mono ${
                      credits >= Math.round(upgrade.cost * getPriceModifier()) ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {Math.round(upgrade.cost * getPriceModifier())} credits
                      {isLanded && !isDocked && (
                        <div className="text-yellow-500 text-[10px]">+20% field</div>
                      )}
                    </div>
                    <div className="mt-1">
                      {credits >= Math.round(upgrade.cost * getPriceModifier()) ? (
                        <Unlock className="w-3 h-3 text-green-400" />
                      ) : (
                        <Lock className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Expanded Details */}
            {selectedUpgrade === upgrade.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 pt-3 border-t border-slate-700/50 space-y-2"
              >
                <p className="text-xs text-gray-400">{upgrade.description}</p>
                
                {/* Effects */}
                {upgrade.effects && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 mb-1">EFFECTS:</div>
                    {Object.entries(upgrade.effects).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="text-cyan-400 font-mono">
                          {typeof value === 'number' && value > 0 ? '+' : ''}{value}
                          {key.includes('Multiplier') ? 'x' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Requirements */}
                {upgrade.requirements && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 mb-1">REQUIREMENTS:</div>
                    {Object.entries(upgrade.requirements).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="text-yellow-400 font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Purchase Button */}
                {!isOwned(upgrade.id) && credits >= Math.round(upgrade.cost * getPriceModifier()) && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchaseUpgrade(upgrade.id);
                    }}
                    className={`w-full px-3 py-1.5 rounded text-xs font-mono transition-all ${
                      credits >= Math.round(upgrade.cost * getPriceModifier())
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                        : 'bg-slate-700/30 border border-slate-600/30 text-gray-500 cursor-not-allowed'
                    }`}
                    whileHover={credits >= Math.round(upgrade.cost * getPriceModifier()) ? { scale: 1.05 } : {}}
                    whileTap={credits >= Math.round(upgrade.cost * getPriceModifier()) ? { scale: 0.95 } : {}}
                  >
                    PURCHASE UPGRADE
                  </motion.button>
                )}
                
                {!isOwned(upgrade.id) && credits < Math.round(upgrade.cost * getPriceModifier()) && (
                  <div className="p-2 bg-gray-500/10 border border-gray-500/30 rounded">
                    <p className="text-xs text-gray-400">
                      Insufficient credits
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
        
        {currentCategory?.upgrades.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Info className="w-8 h-8 mx-auto mb-2" />
            <p className="text-xs">No upgrades available in this category</p>
          </div>
        )}
      </div>
      
      {/* Stats Summary */}
      <div className="mt-4 p-2 bg-slate-800/30 rounded border border-slate-700/30">
        <div className="text-xs text-gray-400 mb-1">CURRENT STATS:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Hull:</span>
            <span className="font-mono text-green-400">{ship.hull}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Shield:</span>
            <span className="font-mono text-cyan-400">{ship.shield}/100</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Warp:</span>
            <span className="font-mono text-purple-400">{ship.upgrades.warpCapability ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Fuel Eff:</span>
            <span className="font-mono text-yellow-400">{Math.round(ship.upgrades.thrustEfficiency * 100)}%</span>
          </div>
        </div>
      </div>
      
      {/* Keyboard Shortcut */}
      <div className="mt-2 text-center text-xs text-gray-500">
        Press <span className="text-purple-400 font-mono">U</span> to toggle upgrades panel
      </div>
    </div>
  );
};