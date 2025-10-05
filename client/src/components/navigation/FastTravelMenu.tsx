import { useState } from 'react';
import { Rocket, Zap, Fuel, Coins, X, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolarSystem } from '@/lib/stores/space/useSolarSystem';
import { useShipStatus } from '@/lib/stores/ship/useShipStatus';
import { useCreditsStore } from '@/domain/economy/credits.store';
import { useEquipment } from '@/lib/stores/ship/useEquipment';
import { planets } from '@/lib/planetData';
import * as THREE from 'three';

interface FastTravelMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAST_TRAVEL_BASE_FEE = 50; // Base credit fee
const FUEL_COST_PER_100_UNITS = 10; // Fuel percentage cost per 100 distance units

export function FastTravelMenu({ isOpen, onClose }: FastTravelMenuProps) {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [isTraveling, setIsTraveling] = useState(false);
  
  const { shipPosition, setShipPosition, selectedPlanet: currentPlanet } = useSolarSystem();
  const shipStatus = useShipStatus();
  const { credits, spendCredits } = useCreditsStore();
  const { equipment, updateEquipment } = useEquipment();

  // Get fuel equipment
  const fuelEquipment = equipment.find(e => e.type === 'fuel');
  const currentFuel = fuelEquipment 
    ? Math.round((fuelEquipment.currentDurability / fuelEquipment.maxDurability) * 100)
    : 0; // No fuel if equipment missing

  // Calculate distance and costs
  const calculateCosts = (targetPlanet: string) => {
    const planet = planets.find(p => p.name === targetPlanet);
    if (!planet) return { distance: 0, fuelCost: 0, creditFee: 0, totalCredits: 0 };
    
    // Safety check for ship position
    if (!shipPosition || shipPosition.x === undefined) {
      return { distance: 0, fuelCost: 0, creditFee: 0, totalCredits: 0 };
    }

    // Calculate distance from current position to planet
    const planetPos = new THREE.Vector3(planet.position.x, 0, planet.position.z);
    const currentPos = new THREE.Vector3(shipPosition.x, shipPosition.y, shipPosition.z);
    const distance = currentPos.distanceTo(planetPos);

    // Calculate costs - fuel cost as percentage (10% per 100 distance units)
    const fuelCost = Math.ceil((distance / 100) * FUEL_COST_PER_100_UNITS);
    const fuelCostClamped = Math.min(fuelCost, 100); // Cap at 100%
    const creditFee = FAST_TRAVEL_BASE_FEE;
    const totalCredits = creditFee;

    return { distance, fuelCost: fuelCostClamped, creditFee, totalCredits };
  };

  // Check if can afford travel
  const canTravel = (targetPlanet: string) => {
    const costs = calculateCosts(targetPlanet);
    // Need fuel equipment to travel
    if (!fuelEquipment) return false;
    return credits >= costs.totalCredits && currentFuel >= costs.fuelCost;
  };

  // Execute fast travel
  const handleFastTravel = async () => {
    if (!selectedPlanet) return;

    const planet = planets.find(p => p.name === selectedPlanet);
    if (!planet) return;

    // Check affordability and fuel equipment FIRST
    if (!canTravel(selectedPlanet)) {
      if (!fuelEquipment) {
        alert('Cannot fast travel: No fuel tank equipped!');
      } else {
        alert('Insufficient fuel or credits for fast travel!');
      }
      return; // Critical: Stop execution here
    }

    const costs = calculateCosts(selectedPlanet);

    setIsTraveling(true);
    
    // Track what we've deducted for rollback
    let creditsDeducted = false;
    let fuelDeducted = false;
    let originalFuelDurability = fuelEquipment?.currentDurability || 0;

    try {
      // Step 1: Try to deduct credits - verify it succeeded
      creditsDeducted = spendCredits(costs.totalCredits);
      if (!creditsDeducted) {
        throw new Error('Failed to deduct credits - insufficient funds');
      }
      console.log(`[FAST-TRAVEL] Deducted ${costs.totalCredits} credits for fast travel`);

      // Step 2: Deduct fuel - only after credits were successfully deducted
      if (!fuelEquipment) {
        throw new Error('Fuel equipment missing');
      }
      
      const fuelToDeduct = (costs.fuelCost / 100) * fuelEquipment.maxDurability;
      const newFuelDurability = Math.max(0, fuelEquipment.currentDurability - fuelToDeduct);
      
      // Verify fuel equipment still exists and update it
      const currentEquipment = equipment.find(e => e.id === fuelEquipment.id);
      if (!currentEquipment) {
        throw new Error('Fuel equipment no longer exists');
      }
      
      // Try to update fuel and verify it worked
      try {
        updateEquipment(fuelEquipment.id, {
          currentDurability: newFuelDurability
        });
        
        // Verify the update actually happened by checking state
        const updatedEquipment = useEquipment.getState().equipment.find(e => e.id === fuelEquipment.id);
        if (!updatedEquipment || Math.abs(updatedEquipment.currentDurability - newFuelDurability) > 0.01) {
          throw new Error('Fuel deduction failed - equipment state not updated');
        }
        
        fuelDeducted = true;
        console.log(`[FAST-TRAVEL] Consumed ${costs.fuelCost}% fuel (${fuelToDeduct.toFixed(1)} units)`);
      } catch (fuelError) {
        throw new Error(`Failed to deduct fuel: ${fuelError instanceof Error ? fuelError.message : 'Unknown error'}`);
      }

      // Step 3: Teleport to planet orbit
      const orbitDistance = planet.size * 3;
      const targetPosition = new THREE.Vector3(
        planet.position.x + orbitDistance,
        0,
        planet.position.z
      );

      // Smooth transition
      await new Promise(resolve => setTimeout(resolve, 500));
      setShipPosition(targetPosition.x, targetPosition.y, targetPosition.z);

      console.log(`[FAST-TRAVEL] Traveled to ${selectedPlanet} orbit`);
      console.log(`[FAST-TRAVEL] Distance: ${costs.distance.toFixed(1)} units`);
      
      // Close menu after short delay
      setTimeout(() => {
        setIsTraveling(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('[FAST-TRAVEL] Failed:', error);
      
      // ROLLBACK: Refund what we deducted (with verification)
      let creditRefundSuccess = false;
      let fuelRestoreSuccess = false;
      
      try {
        if (creditsDeducted) {
          const creditsBefore = useCreditsStore.getState().credits;
          useCreditsStore.getState().addCredits(costs.totalCredits);
          const creditsAfter = useCreditsStore.getState().credits;
          
          // Verify refund actually happened
          if (creditsAfter >= creditsBefore + costs.totalCredits) {
            creditRefundSuccess = true;
            console.log(`[FAST-TRAVEL-ROLLBACK] Refunded ${costs.totalCredits} credits (verified)`);
          } else {
            console.error('[FAST-TRAVEL-ROLLBACK] Credit refund verification failed:', {
              before: creditsBefore,
              after: creditsAfter,
              expected: creditsBefore + costs.totalCredits
            });
          }
        } else {
          creditRefundSuccess = true; // Nothing to refund
        }
      } catch (rollbackError) {
        console.error('[FAST-TRAVEL-ROLLBACK] Failed to refund credits:', rollbackError);
      }
      
      try {
        if (fuelDeducted && fuelEquipment) {
          updateEquipment(fuelEquipment.id, {
            currentDurability: originalFuelDurability
          });
          
          // Verify fuel was actually restored
          const restoredEquipment = useEquipment.getState().equipment.find(e => e.id === fuelEquipment.id);
          if (restoredEquipment && Math.abs(restoredEquipment.currentDurability - originalFuelDurability) < 0.01) {
            fuelRestoreSuccess = true;
            console.log(`[FAST-TRAVEL-ROLLBACK] Restored fuel to ${originalFuelDurability} (verified)`);
          } else {
            console.error('[FAST-TRAVEL-ROLLBACK] Fuel restore verification failed:', {
              expected: originalFuelDurability,
              actual: restoredEquipment?.currentDurability,
              equipmentExists: !!restoredEquipment
            });
          }
        } else {
          fuelRestoreSuccess = true; // Nothing to restore
        }
      } catch (rollbackError) {
        console.error('[FAST-TRAVEL-ROLLBACK] Failed to restore fuel:', rollbackError);
      }
      
      // Log rollback status
      if (!creditRefundSuccess || !fuelRestoreSuccess) {
        console.error('[FAST-TRAVEL-ROLLBACK] INCOMPLETE ROLLBACK - Some resources may not have been refunded!', {
          creditsRefunded: creditRefundSuccess,
          fuelRestored: fuelRestoreSuccess
        });
      }
      
      setIsTraveling(false);
      alert(`Fast travel failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl mx-4 bg-gray-900/95 border border-cyan-500/30 rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
            <div className="flex items-center space-x-3">
              <Zap className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-cyan-400">Fast Travel</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Current Status */}
          <div className="p-4 bg-gray-800/50 border-b border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-400">Credits:</span>
                <span className="text-cyan-400 font-mono font-bold">{credits}c</span>
              </div>
              <div className="flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-orange-400" />
                <span className="text-gray-400">Fuel:</span>
                <span className="text-orange-400 font-mono font-bold">{currentFuel}%</span>
              </div>
            </div>
            {!fuelEquipment && (
              <div className="mt-3 p-2 bg-red-900/20 border border-red-500/50 rounded text-xs text-red-400">
                ⚠️ No fuel tank equipped! Install fuel equipment to use fast travel.
              </div>
            )}
          </div>

          {/* Planet List */}
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {planets
                .filter(p => p.name !== currentPlanet) // Don't show current planet
                .map(planet => {
                  const costs = calculateCosts(planet.name);
                  const affordable = canTravel(planet.name);
                  const isSelected = selectedPlanet === planet.name;

                  return (
                    <button
                      key={planet.name}
                      onClick={() => setSelectedPlanet(planet.name)}
                      className={`
                        w-full p-4 rounded-lg border transition-all text-left
                        ${isSelected 
                          ? 'bg-cyan-900/30 border-cyan-400 shadow-lg' 
                          : 'bg-gray-800/30 border-gray-700 hover:border-cyan-400/50 hover:bg-gray-800/50'
                        }
                        ${!affordable && 'opacity-70'}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Navigation className="w-5 h-5 text-cyan-400" />
                            <h3 className="text-lg font-bold text-white">{planet.name}</h3>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Distance:</span>
                              <span className="ml-1 text-gray-300 font-mono">
                                {costs.distance.toFixed(0)} AU
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Fuel:</span>
                              <span className={`ml-1 font-mono ${currentFuel >= costs.fuelCost ? 'text-orange-400' : 'text-red-400'}`}>
                                -{costs.fuelCost}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Fee:</span>
                              <span className={`ml-1 font-mono ${credits >= costs.totalCredits ? 'text-cyan-400' : 'text-red-400'}`}>
                                {costs.totalCredits}c
                              </span>
                            </div>
                          </div>
                          
                          {!affordable && (
                            <p className="text-xs text-red-400 mt-2">
                              ⚠️ Insufficient resources
                            </p>
                          )}
                        </div>
                        
                        {isSelected && (
                          <Rocket className="w-6 h-6 text-cyan-400 ml-4" />
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-cyan-500/20 bg-gray-800/30">
            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFastTravel}
                disabled={!selectedPlanet || isTraveling || !canTravel(selectedPlanet!)}
                className={`
                  flex-1 px-6 py-3 rounded-lg font-bold transition-all flex items-center justify-center space-x-2
                  ${selectedPlanet && canTravel(selectedPlanet) && !isTraveling
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isTraveling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Traveling...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Fast Travel</span>
                  </>
                )}
              </button>
            </div>
            
            {selectedPlanet && (
              <p className="text-xs text-center text-gray-500 mt-3">
                Fast travel will teleport your ship to {selectedPlanet} orbit
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
