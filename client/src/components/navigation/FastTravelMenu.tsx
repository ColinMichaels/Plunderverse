import React from "react";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useShipStatus } from "../../lib/stores/ship/useShipStatus";
import { useCredits } from "../../lib/stores/economy/useCredits";
import { useEquipment } from "../../lib/stores/ship/useEquipment";
import { planets } from "../../lib/planetData";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Fuel, Coins, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface FastTravelMenuProps {
  onClose?: () => void;
}

export function FastTravelMenu({ onClose }: FastTravelMenuProps) {
  const { selectedPlanet, setSelectedPlanet } = useSolarSystem();
  const { fuel, maxFuel, consumeFuel } = useShipStatus();
  const { credits, deductCredits } = useCredits();
  const { equipment } = useEquipment();
  
  // Find current planet index safely
  const currentPlanetIndex = selectedPlanet 
    ? planets.findIndex(p => p.name === selectedPlanet)
    : 0; // Default to Mercury (index 0) if no planet selected
  
  // Ensure we have a valid index
  const selectedPlanetIndex = currentPlanetIndex >= 0 ? currentPlanetIndex : 0;
  
  const hasFastTravelModule = equipment.some(e => e.type === "navigation" && e.name.includes("Fast Travel"));
  
  const calculateTravelCost = (targetIndex: number) => {
    const distance = Math.abs(targetIndex - selectedPlanetIndex);
    const baseFuel = distance * 15;
    const baseCredits = distance * 100;
    
    // Reduce cost if player has fast travel module
    const fuelCost = hasFastTravelModule ? Math.floor(baseFuel * 0.7) : baseFuel;
    const creditCost = hasFastTravelModule ? Math.floor(baseCredits * 0.7) : baseCredits;
    
    return { fuelCost, creditCost };
  };
  
  const handleFastTravel = (targetIndex: number) => {
    if (targetIndex === selectedPlanetIndex) {
      toast.error("You are already at this planet");
      return;
    }
    
    const { fuelCost, creditCost } = calculateTravelCost(targetIndex);
    
    if (fuel < fuelCost) {
      toast.error(`Not enough fuel! Need ${fuelCost}, have ${fuel}`);
      return;
    }
    
    if (credits < creditCost) {
      toast.error(`Not enough credits! Need ${creditCost}, have ${credits}`);
      return;
    }
    
    // Perform the fast travel
    consumeFuel(fuelCost);
    deductCredits(creditCost);
    
    // Update selected planet using planet name
    const targetPlanet = planets[targetIndex];
    if (targetPlanet) {
      setSelectedPlanet(targetPlanet.name);
      toast.success(`Fast traveled to ${targetPlanet.name}!`);
    }
    
    if (onClose) onClose();
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
                  disabled={isCurrent || !canAfford}
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