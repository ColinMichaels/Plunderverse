import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShipStatus } from '../../../lib/stores/ship/useShipStatus';
import { useEquipment } from '../../../lib/stores/ship/useEquipment';
import { useUpgrades, type Upgrade, type UpgradeTier } from '../../../lib/stores/ship/useUpgrades';
import { useCredits } from '../../../lib/stores/economy/useCredits';
import { usePlayer } from '../../../lib/stores/player/usePlayer';
import { useInventory } from '../../../lib/stores/economy/useInventory';
import { useMobileLayout } from '../../../stores/useMobileLayout';
import { toast } from 'sonner';
import { triggerHaptic } from '../../../utils/hapticFeedback';
import { 
  Shield, 
  Zap, 
  Cpu, 
  Package, 
  Navigation, 
  Settings,
  Star,
  Lock,
  ChevronRight,
  TrendingUp,
  Rocket,
  Sparkles,
  Award,
  ShoppingCart,
  Info,
  Check,
  X,
  Activity
} from 'lucide-react';

// Icon mapping for upgrades
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'hull': return <Shield className="w-5 h-5" />;
    case 'shields': return <Zap className="w-5 h-5" />;
    case 'engine': return <Rocket className="w-5 h-5" />;
    case 'weapons': return <Activity className="w-5 h-5" />;
    case 'cargo': return <Package className="w-5 h-5" />;
    case 'special': return <Sparkles className="w-5 h-5" />;
    default: return <Star className="w-5 h-5" />;
  }
};

export const ShipUpgradePanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Upgrade | null>(null);
  const [viewMode, setViewMode] = useState<'shop' | 'inventory'>('shop');
  
  const ship = useShipStatus();
  const equipment = useEquipment();
  const upgrades = useUpgrades();
  const { credits, spendCredits } = useCredits();
  const player = usePlayer();
  const inventory = useInventory();
  const { config } = useMobileLayout();

  // Define upgrade tiers with colors
  const tierConfig = {
    basic: { color: 'text-gray-400', bg: 'bg-gray-600', gradient: 'from-gray-500 to-gray-600' },
    advanced: { color: 'text-green-400', bg: 'bg-green-600', gradient: 'from-green-500 to-green-600' },
    elite: { color: 'text-purple-400', bg: 'bg-purple-600', gradient: 'from-purple-500 to-purple-600' },
    legendary: { color: 'text-orange-400', bg: 'bg-orange-600', gradient: 'from-orange-500 to-amber-600' }
  };

  // Get upgrades from store
  const allUpgrades = upgrades.catalog;
  const ownedUpgrades = upgrades.getOwnedUpgrades();
  const equippedUpgrades = upgrades.getEquippedUpgrades();
  
  // Filter upgrades by category
  const filteredUpgrades = selectedCategory === 'all' 
    ? allUpgrades 
    : allUpgrades.filter(u => u.category === selectedCategory);

  // Check if player meets requirements
  const meetsRequirements = (upgrade: Upgrade) => {
    return upgrades.meetsRequirements(upgrade.id, player.level, player.notoriety);
  };

  // Handle purchase
  const handlePurchase = (upgrade: Upgrade) => {
    if (!meetsRequirements(upgrade)) {
      toast.error('Requirements not met', {
        description: 'Check level and reputation requirements'
      });
      return;
    }

    if (credits < upgrade.cost) {
      toast.error('Insufficient credits', {
        description: `Need ${upgrade.cost} credits, have ${credits}`
      });
      return;
    }

    setSelectedItem(upgrade);
    setShowPurchaseDialog(true);
  };

  const confirmPurchase = () => {
    if (!selectedItem) return;

    if (spendCredits(selectedItem.cost)) {
      // Purchase the upgrade in the store
      if (upgrades.purchaseUpgrade(selectedItem.id)) {
        // Auto-equip the upgrade
        upgrades.equipUpgrade(selectedItem.id);
        
        // Apply specific effects based on upgrade type
        applyUpgradeEffects(selectedItem);
        
        toast.success('Upgrade purchased!', {
          description: `${selectedItem.name} has been installed`
        });
      } else {
        toast.error('Failed to purchase upgrade');
      }
      
      setShowPurchaseDialog(false);
      setSelectedItem(null);
    } else {
      toast.error('Insufficient credits');
    }
  };

  // Apply upgrade effects to ship systems
  const applyUpgradeEffects = (upgrade: Upgrade) => {
    const bonuses = upgrade.effects || {};
    
    // Apply engine upgrades
    if (upgrade.category === 'engine') {
      if (upgrade.id === 'engine-warp') {
        ship.upgradeShip('warpCapability', 0);
      } else if (upgrade.id === 'engine-turbo') {
        ship.upgradeShip('thrustEfficiency', 0.8); // Better efficiency
      }
    }
    
    // Apply cargo upgrades
    if (upgrade.category === 'cargo') {
      if (bonuses.cargoBonus) {
        inventory.upgradeStorage(bonuses.cargoBonus);
      }
    }
    
    // Apply hull/shield bonuses directly if needed
    if (bonuses.hullBonus) {
      // Hull bonuses would increase max hull capacity
      console.log(`Applied hull bonus: +${bonuses.hullBonus}%`);
    }
    
    if (bonuses.shieldBonus) {
      // Shield bonuses would increase max shield capacity
      console.log(`Applied shield bonus: +${bonuses.shieldBonus}%`);
    }
  };

  // Handle equip/unequip
  const handleEquipToggle = (upgrade: Upgrade) => {
    if (upgrades.isEquipped(upgrade.id)) {
      upgrades.unequipUpgrade(upgrade.id);
      toast.info(`${upgrade.name} unequipped`);
    } else {
      upgrades.equipUpgrade(upgrade.id);
      applyUpgradeEffects(upgrade);
      toast.success(`${upgrade.name} equipped`);
    }
  };


  // Calculate ship stats with bonuses
  const calculateShipStats = () => {
    const bonuses = upgrades.getTotalBonuses();
    const baseSpeed = 100;
    const baseDefense = Math.round((ship.hull + ship.shield) / 2);
    
    return {
      combatRating: Math.round(
        (ship.hull + ship.shield + (equipment.getPerformanceMultiplier('drill-mk1') * 100)) / 3 +
        (bonuses.damageBonus || 0)
      ),
      cargoCapacity: inventory.storageCapacity + (bonuses.cargoBonus || 0),
      speed: baseSpeed + (bonuses.speedBonus || 0) + (bonuses.thrustEfficiencyBonus || 0),
      defense: baseDefense + ((bonuses.hullBonus || 0) + (bonuses.shieldBonus || 0)) / 2,
      maneuverability: bonuses.speedBonus && bonuses.speedBonus > 0 ? 'Enhanced' : 'Standard'
    };
  };

  const shipStats = calculateShipStats();

  // Category tabs
  const categories = [
    { id: 'all', label: 'All', icon: <Star className="w-4 h-4" /> },
    { id: 'hull', label: 'Hull', icon: <Shield className="w-4 h-4" /> },
    { id: 'shields', label: 'Shields', icon: <Zap className="w-4 h-4" /> },
    { id: 'engine', label: 'Engine', icon: <Rocket className="w-4 h-4" /> },
    { id: 'weapons', label: 'Weapons', icon: <Activity className="w-4 h-4" /> },
    { id: 'cargo', label: 'Cargo', icon: <Package className="w-4 h-4" /> },
    { id: 'special', label: 'Special', icon: <Sparkles className="w-4 h-4" /> }
  ];

  // Upgrade card component
  const UpgradeCard = ({ upgrade }: { upgrade: Upgrade }) => {
    const isExpanded = selectedUpgrade === upgrade.id;
    const isOwned = upgrades.isOwned(upgrade.id);
    const isEquipped = upgrades.isEquipped(upgrade.id);
    const canPurchase = meetsRequirements(upgrade) && credits >= upgrade.cost && !isOwned;
    const tier = tierConfig[upgrade.tier];

    return (
      <motion.div
        layout
        className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4
                   ${isExpanded ? 'ring-2 ring-orange-500' : ''} 
                   cursor-pointer active:scale-98 transition-all`}
        onClick={() => {
          triggerHaptic();
          setSelectedUpgrade(isExpanded ? null : upgrade.id);
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${tier.gradient}`}>
              {getCategoryIcon(upgrade.category)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{upgrade.name}</h3>
                {isOwned && (
                  <span className="px-2 py-0.5 bg-green-600/30 border border-green-600 rounded text-xs text-green-400">
                    Owned
                  </span>
                )}
                {isEquipped && (
                  <span className="px-2 py-0.5 bg-blue-600/30 border border-blue-600 rounded text-xs text-blue-400">
                    Equipped
                  </span>
                )}
              </div>
              <p className={`text-xs uppercase tracking-wider ${tier.color}`}>
                {upgrade.tier}
              </p>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-3">{upgrade.description}</p>

        {/* Price and requirements */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isOwned && <span className="text-cyan-400 font-mono text-lg">{upgrade.cost}c</span>}
            {!meetsRequirements(upgrade) && !isOwned && (
              <Lock className="w-4 h-4 text-red-400" />
            )}
          </div>
          {upgrade.requirements.level && (
            <span className={`text-xs ${player.level >= upgrade.requirements.level ? 'text-green-400' : 'text-red-400'}`}>
              Lv.{upgrade.requirements.level}
            </span>
          )}
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-700 space-y-3"
            >
              {/* Benefits */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-400">Benefits</h4>
                {upgrade.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{benefit.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${tier.color}`}>
                        {benefit.value}
                      </span>
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Requirements */}
              {Object.keys(upgrade.requirements).length > 0 && !isOwned && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-400">Requirements</h4>
                  {upgrade.requirements.level && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Level</span>
                      <span className={`text-sm ${player.level >= upgrade.requirements.level ? 'text-green-400' : 'text-red-400'}`}>
                        {player.level} / {upgrade.requirements.level}
                        {player.level >= upgrade.requirements.level && <Check className="w-3 h-3 inline ml-1" />}
                        {player.level < upgrade.requirements.level && <X className="w-3 h-3 inline ml-1" />}
                      </span>
                    </div>
                  )}
                  {upgrade.requirements.reputation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Reputation</span>
                      <span className={`text-sm ${player.notoriety >= upgrade.requirements.reputation ? 'text-green-400' : 'text-red-400'}`}>
                        {player.notoriety} / {upgrade.requirements.reputation}
                        {player.notoriety >= upgrade.requirements.reputation && <Check className="w-3 h-3 inline ml-1" />}
                        {player.notoriety < upgrade.requirements.reputation && <X className="w-3 h-3 inline ml-1" />}
                      </span>
                    </div>
                  )}
                  {upgrade.requirements.previousUpgrade && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Prerequisite</span>
                      <span className={`text-sm ${upgrades.isOwned(upgrade.requirements.previousUpgrade) ? 'text-green-400' : 'text-red-400'}`}>
                        {allUpgrades.find(u => u.id === upgrade.requirements.previousUpgrade)?.name || upgrade.requirements.previousUpgrade}
                        {upgrades.isOwned(upgrade.requirements.previousUpgrade) && <Check className="w-3 h-3 inline ml-1" />}
                        {!upgrades.isOwned(upgrade.requirements.previousUpgrade) && <X className="w-3 h-3 inline ml-1" />}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {!isOwned && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic();
                    handlePurchase(upgrade);
                  }}
                  disabled={!canPurchase}
                  className={`w-full py-2 rounded-lg font-semibold transition-all active:scale-95
                            ${canPurchase 
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                              : 'bg-slate-700 text-gray-500'}`}
                >
                  {!meetsRequirements(upgrade) ? 'Requirements Not Met' :
                   credits < upgrade.cost ? 'Insufficient Credits' :
                   'Purchase Upgrade'}
                </button>
              )}
              
              {isOwned && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic();
                    handleEquipToggle(upgrade);
                  }}
                  className={`w-full py-2 rounded-lg font-semibold transition-all active:scale-95
                            ${isEquipped 
                              ? 'bg-red-600/30 border border-red-600 text-red-400' 
                              : 'bg-blue-600/30 border border-blue-600 text-blue-400'}`}
                >
                  {isEquipped ? 'Unequip' : 'Equip'}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Inventory view
  const InventoryView = () => (
    <div className="space-y-4">
      <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Owned Upgrades</h3>
        {ownedUpgrades.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No upgrades owned yet</p>
        ) : (
          <div className="space-y-3">
            {ownedUpgrades.map(upgrade => {
              const isEquipped = upgrades.isEquipped(upgrade.id);
              const tier = tierConfig[upgrade.tier];
              
              return (
                <div key={upgrade.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${tier.gradient}`}>
                      {getCategoryIcon(upgrade.category)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{upgrade.name}</h4>
                      <p className={`text-xs uppercase ${tier.color}`}>{upgrade.tier} • {upgrade.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEquipped ? (
                      <button
                        onClick={() => handleEquipToggle(upgrade)}
                        className="px-3 py-1 bg-red-600/30 border border-red-600 rounded text-xs text-red-400"
                      >
                        Unequip
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEquipToggle(upgrade)}
                        className="px-3 py-1 bg-blue-600/30 border border-blue-600 rounded text-xs text-blue-400"
                      >
                        Equip
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Currently equipped summary */}
      {equippedUpgrades.length > 0 && (
        <div className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-4`}>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Active Bonuses</h3>
          <div className="space-y-2">
            {Object.entries(upgrades.getTotalBonuses()).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-gray-500 capitalize">{key.replace(/Bonus$/, '')}</span>
                <span className="text-green-400">+{value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-800 border-b-2 border-orange-600/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-400" />
            Ship Upgrades
          </h1>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 bg-slate-700/50 rounded-lg p-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">Combat</p>
            <p className="text-sm font-bold text-orange-400">{shipStats.combatRating}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Cargo</p>
            <p className="text-sm font-bold text-cyan-400">{shipStats.cargoCapacity}t</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Speed</p>
            <p className="text-sm font-bold text-purple-400">{shipStats.speed}%</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setViewMode('shop')}
            className={`flex-1 py-2 rounded text-sm font-semibold transition-colors
                      ${viewMode === 'shop' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300'}`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-1" />
            Shop
          </button>
          <button
            onClick={() => setViewMode('inventory')}
            className={`flex-1 py-2 rounded text-sm font-semibold transition-colors
                      ${viewMode === 'inventory' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300'}`}
          >
            <Package className="w-4 h-4 inline mr-1" />
            Inventory
          </button>
        </div>
      </header>

      {/* Category tabs (shop view only) */}
      {viewMode === 'shop' && (
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic();
                  setSelectedCategory(cat.id);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-colors
                          ${selectedCategory === cat.id 
                            ? 'bg-orange-600 text-white' 
                            : 'bg-slate-700 text-gray-300'}`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        {viewMode === 'shop' ? (
          <div className="space-y-3">
            {filteredUpgrades.map(upgrade => (
              <UpgradeCard key={upgrade.id} upgrade={upgrade} />
            ))}
          </div>
        ) : (
          <InventoryView />
        )}
      </main>

      {/* Bottom info bar */}
      <footer className="bg-slate-900 border-t-2 border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">
              Credits: <span className="text-cyan-400 font-mono">{credits}c</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-400">Lv.{player.level}</span>
          </div>
        </div>
      </footer>

      {/* Purchase confirmation dialog */}
      <AnimatePresence>
        {showPurchaseDialog && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className={`${config.panel.bg} ${config.panel.border} ${config.panel.backdrop} ${config.panel.radius} p-6 max-w-sm w-full`}
            >
              <h3 className="text-lg font-bold text-white mb-3">Confirm Purchase</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${tierConfig[selectedItem.tier].gradient}`}>
                    {getCategoryIcon(selectedItem.category)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedItem.name}</p>
                    <p className={`text-xs uppercase ${tierConfig[selectedItem.tier].color}`}>
                      {selectedItem.tier}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                  {selectedItem.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">{benefit.label}</span>
                      <span className="text-green-400">{benefit.value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                  <span className="text-gray-400">Total Cost</span>
                  <span className="text-cyan-400 font-mono text-lg">{selectedItem.cost}c</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPurchaseDialog(false)}
                  className="flex-1 bg-slate-700 text-white py-2 rounded-lg font-semibold active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPurchase}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg
                           font-semibold active:scale-95"
                >
                  Purchase
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};