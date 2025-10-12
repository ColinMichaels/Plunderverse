import React, { useState } from "react";
import * as THREE from "three";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useCredits } from "../../lib/stores/economy/useCredits";
import { useEquipment } from "../../lib/stores/ship/useEquipment";
import { TransactionClient } from "../../services/TransactionClient";
import { planets } from "../../lib/planetData";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Fuel, Coins, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FastTravelMenuProps {
  onClose?: () => void;
}

export function FastTravelMenu({ onClose }: FastTravelMenuProps) {
  const { selectedPlanet, setSelectedPlanet, setShipPosition, shipPosition } = useSolarSystem();
  const { credits } = useCredits();
  const { equipment, getEquipment } = useEquipment();
  const [isTraveling, setIsTraveling] = useState(false);
  
  // Get fuel from equipment system
  const fuelTank = getEquipment('fuel-tank');
  const fuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  
  // Find current planet index safely
  const currentPlanetIndex = selectedPlanet 
    ? planets.findIndex(p => p.name === selectedPlanet)
    : 0; // Default to Mercury (index 0) if no planet selected
  
  // Ensure we have a valid index
  const selectedPlanetIndex = currentPlanetIndex >= 0 ? currentPlanetIndex : 0;
  
  // Check for fast travel module in equipment (e.g., warp drive or advanced navigation)
  const hasFastTravelModule = equipment.some(e => 
    e.name.toLowerCase().includes("fast travel") || 
    e.name.toLowerCase().includes("warp") ||
    e.name.toLowerCase().includes("quantum")
  );
  
  // Calculate planet position based on time
  const calculatePlanetPosition = (planet: any) => {
    const time = Date.now() * 0.001;
    const angle = time * planet.orbitalSpeed;
    const x = Math.cos(angle) * planet.distance;
    const z = Math.sin(angle) * planet.distance;
    return new THREE.Vector3(x, 0, z);
  };
  
  const calculateTravelCost = (targetIndex: number) => {
    const distance = Math.abs(targetIndex - selectedPlanetIndex);
    const baseFuel = distance * 15;
    const baseCredits = distance * 100;
    
    // Reduce cost if player has fast travel module
    const fuelCost = hasFastTravelModule ? Math.floor(baseFuel * 0.7) : baseFuel;
    const creditCost = hasFastTravelModule ? Math.floor(baseCredits * 0.7) : baseCredits;
    
    return { fuelCost, creditCost };
  };
  
  const handleFastTravel = async (targetIndex: number) => {
    if (targetIndex === selectedPlanetIndex) {
      toast.error("You are already at this planet");
      return;
    }
    
    const targetPlanet = planets[targetIndex];
    if (!targetPlanet) return;
    
    const { fuelCost, creditCost } = calculateTravelCost(targetIndex);
    
    if (fuel < fuelCost) {
      toast.error(`Not enough fuel! Need ${fuelCost}, have ${Math.floor(fuel)}`);
      return;
    }
    
    if (credits < creditCost) {
      toast.error(`Not enough credits! Need ${creditCost}, have ${credits}`);
      return;
    }
    
    setIsTraveling(true);
    
    try {
      // Use TransactionClient for server-authoritative transaction
      const transactionClient = TransactionClient.getInstance();
      const result = await transactionClient.fastTravel(
        targetPlanet.name,
        creditCost,
        fuelCost
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }
      
      console.log(`[FAST-TRAVEL] Transaction successful: ${result.transactionId}`);
      console.log(`[FAST-TRAVEL] New balances - Credits: ${result.newBalances?.credits}, Fuel: ${result.newBalances?.fuel}`);

      // Teleport to planet orbit
      const orbitDistance = targetPlanet.size * 3;
      const planetPos = calculatePlanetPosition(targetPlanet);
      const targetPosition = new THREE.Vector3(
        planetPos.x + orbitDistance,
        0,
        planetPos.z
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      setShipPosition(targetPosition);
      setSelectedPlanet(targetPlanet.name);

      console.log(`[FAST-TRAVEL] Traveled to ${targetPlanet.name} orbit`);
      toast.success(`Fast traveled to ${targetPlanet.name}!`);
      
      setTimeout(() => {
        setIsTraveling(false);
        if (onClose) onClose();
      }, 1000);
    } catch (error) {
      console.error('[FAST-TRAVEL] Failed:', error);
      setIsTraveling(false);
      toast.error(`Fast travel failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  return (
    <Card className="w-full max-w-2xl bg-black/80 border-cyan-500/50 text-white">
      <CardHeader>
        <CardTitle className="text-xl text-cyan-400">
          Fast Travel Menu
        </CardTitle>
        {hasFastTravelModule && (
          <p className="text-sm text-green-400">
            Fast Travel Module: 30% discount applied
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-orange-400" />
              <span>Fuel: {fuel}/{maxFuel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span>Credits: {credits}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {planets.map((planet, index) => {
              const { fuelCost, creditCost } = calculateTravelCost(index);
              const canAfford = fuel >= fuelCost && credits >= creditCost;
              const isCurrent = index === selectedPlanetIndex;
              
              return (
                <Button
                  key={planet.name}
                  variant={isCurrent ? "default" : "outline"}
                  disabled={isCurrent || !canAfford || isTraveling}
                  onClick={() => handleFastTravel(index)}
                  className={`
                    h-auto p-3 flex flex-col items-start gap-1
                    ${isCurrent ? 'bg-cyan-600' : 'bg-black/60'}
                    ${!canAfford && !isCurrent ? 'opacity-50' : ''}
                  `}
                >
                  <div className="font-bold">{planet.name}</div>
                  {!isCurrent && (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <Fuel className="w-3 h-3" />
                        <span>{fuelCost} fuel</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        <span>{creditCost} credits</span>
                      </div>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="text-xs text-cyan-200">Current Location</div>
                  )}
                </Button>
              );
            })}
          </div>
          
          {isTraveling && (
            <div className="text-center text-cyan-400 text-sm animate-pulse">
              Initiating fast travel...
            </div>
          )}
          
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full mt-4"
            >
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}