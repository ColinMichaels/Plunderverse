import { useEffect } from 'react';
import { useParrot } from '@/lib/stores/useParrot';
import { useShipStatus } from '@/lib/stores/ship/useShipStatus';
import { useEquipment } from '@/lib/stores/ship/useEquipment';
import { usePlunderverseMissions } from '@/lib/stores/economy/usePlunderverseMissions';
import { useHeatSystem } from '@/lib/stores/player/useHeatSystem';

export function useParrotEvents() {
  const parrot = useParrot();
  const shipStatus = useShipStatus();
  const equipment = useEquipment();
  const missions = usePlunderverseMissions();
  const heatSystem = useHeatSystem();

  // Track fuel percentage
  const fuelTank = equipment.getEquipment('fuel-tank');
  const fuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  const fuelPercentage = (fuel / maxFuel) * 100;

  useEffect(() => {
    if (fuelPercentage < 20 && fuelPercentage > 0) {
      parrot.comment('Squawk! Fuel reserves be runnin\' low, Cap\'n! Only ' + Math.floor(fuelPercentage) + '% left!', 'warning');
    } else if (fuelPercentage === 0) {
      parrot.comment('Blimey! We\'re outta fuel, Cap\'n! Dead in space we are!', 'critical');
    }
  }, [fuelPercentage, parrot]);

  useEffect(() => {
    const hull = shipStatus.hull;
    const shield = shipStatus.shield;

    if (hull < 30 && hull > 0) {
      parrot.comment('Avast! Hull integrity critical, Cap\'n! Need repairs now!', 'critical');
    } else if (shield < 20 && shield > 0) {
      parrot.comment('Squawk! Shields be failin\', Cap\'n!', 'warning');
    }
  }, [shipStatus.hull, shipStatus.shield, parrot]);

  useEffect(() => {
    const activeMissions = missions.activeMissions.filter(m => m.active && !m.completed);
    const completedCount = missions.activeMissions.filter(m => m.completed).length;

    if (activeMissions.length > 0 && Math.random() < 0.1) {
      const mission = activeMissions[0];
      parrot.comment(`Reminder, Cap\'n: We still got that ${mission.title} mission to finish!`, 'info');
    }

    if (completedCount > 0) {
      parrot.comment(`Har har! ${completedCount} missions in the bag, Cap\'n! Nice work!`, 'info');
    }
  }, [missions.activeMissions.length, parrot]);

  useEffect(() => {
    const heat = heatSystem.currentHeat;
    const wantedLevel = heatSystem.wantedLevel;

    if (wantedLevel >= 4) {
      parrot.comment('Squawk! Yer wanted across the system, Cap\'n! Patrols everywhere!', 'critical');
    } else if (heat > 50) {
      parrot.comment('Avast! Heat levels be risin\', Cap\'n! Keep yer head down!', 'warning');
    }
  }, [heatSystem.currentHeat, heatSystem.wantedLevel, parrot]);


  useEffect(() => {
    const interval = setInterval(() => {
      parrot.randomComment();
    }, 45000);

    return () => clearInterval(interval);
  }, [parrot]);

  useEffect(() => {
    const memoryInterval = setInterval(() => {
      if (Math.random() < 0.2) {
        parrot.recallMemory();
      }
    }, 90000);

    return () => clearInterval(memoryInterval);
  }, [parrot]);
}
