import {useEffect, useRef} from 'react';
import {useParrot} from '@/lib/stores/useParrot';
import {useShipStatus} from '@/lib/stores/ship/useShipStatus';
import {useEquipment} from '@/lib/stores/ship/useEquipment';
import {usePlunderverseMissions} from '@/lib/stores/economy/usePlunderverseMissions';
import {useHeatSystem} from '@/lib/stores/player/useHeatSystem';
import {useLandedState} from '@/lib/stores/surface/useLandedState';
import {parrotSpeechService} from '@/services/ParrotSpeechService';

export function useParrotEvents() {
  const parrot = useParrot();
  const shipStatus = useShipStatus();
  const equipment = useEquipment();
  const missions = usePlunderverseMissions();
  const heatSystem = useHeatSystem();
  const { isTakingOff } = useLandedState();

    // === Speech helpers & cooldowns ===
    const takingOffRef = useRef(isTakingOff);
    useEffect(() => {
        takingOffRef.current = isTakingOff;
    }, [isTakingOff]);

    type Tone = 'info' | 'warning' | 'critical';
    const lastSaidRef = useRef<Record<string, number>>({});
    const GLOBAL_COOLDOWN_MS = 8000; // minimum gap between any two utterances
    const CATEGORY_COOLDOWN: Record<Tone, number> = {
        info: 60000,
        warning: 45000,
        critical: 20000,
    };

    function canSpeak(key: string, tone: Tone): boolean {
        const now = Date.now();
        const lastAny = lastSaidRef.current['*'] || 0;
        if (now - lastAny < GLOBAL_COOLDOWN_MS) return false;
        const last = lastSaidRef.current[key] || 0;
        return now - last >= (CATEGORY_COOLDOWN[tone] || 30000);
    }

    async function say(text: string, tone: Tone = 'info', key?: string) {
        if (takingOffRef.current) return; // hard block during takeoff
        const k = key || text.slice(0, 48);
        if (!canSpeak(k, tone)) return;
        try {
            parrot.setCurrentMessage({text, tone});
            parrot.setSpeaking(true);
            await parrotSpeechService.speak(text);
        } catch (e) {
            console.warn('[ParrotEvents] Speech failed, falling back to log:', e);
            console.log(`[Parrot] (${tone})`, text);
        } finally {
            parrot.setSpeaking(false);
            const now = Date.now();
            lastSaidRef.current[k] = now;
            lastSaidRef.current['*'] = now;
        }
    }

  // Track when takeoff state changes for debug logging
  const previousTakeoffState = useRef(false);

  // Track fuel percentage
  const fuelTank = equipment.getEquipment('fuel-tank');
  const fuel = fuelTank?.currentDurability || 0;
  const maxFuel = fuelTank?.maxDurability || 100;
  const fuelPercentage = (fuel / maxFuel) * 100;

  // Debug logging for takeoff state changes
  useEffect(() => {
    if (isTakingOff !== previousTakeoffState.current) {
      console.log(`[ParrotEvents] Takeoff state changed: ${previousTakeoffState.current} -> ${isTakingOff}`);

      if (isTakingOff) {
        console.log('[ParrotEvents] 🚀 TAKEOFF INITIATED - Pausing parrot speech');
        // Stop any current speech immediately
          try {
              parrotSpeechService.stop();
          } catch {
          }
        parrot.setSpeaking(false);
      } else if (previousTakeoffState.current) {
        console.log('[ParrotEvents] 🛬 TAKEOFF COMPLETE - Resuming parrot speech');
      }

      previousTakeoffState.current = isTakingOff;
    }
  }, [isTakingOff, parrot]);

  useEffect(() => {
    // Skip fuel warnings during takeoff
    if (isTakingOff) return;

    if (fuelPercentage < 20 && fuelPercentage > 0) {
        say("Squawk! Fuel reserves be runnin' low, Cap'n! Only " + Math.floor(fuelPercentage) + '% left!', 'warning', 'fuel-low');
    } else if (fuelPercentage === 0) {
        say("Blimey! We're outta fuel, Cap'n! Dead in space we are!", 'critical', 'fuel-empty');
    }
  }, [fuelPercentage, parrot, isTakingOff]);

  useEffect(() => {
    // Skip status warnings during takeoff
    if (isTakingOff) return;

    const hull = shipStatus.hull;
    const shield = shipStatus.shield;

    if (hull < 30 && hull > 0) {
        say("Avast! Hull integrity critical, Cap'n! Need repairs now!", 'critical', 'hull-critical');
    } else if (shield < 20 && shield > 5) {
        // Only warn when shields are critically low but not completely failed (dead)
        // This prevents the annoying loop on the death screen
        say("Squawk! Shields be failin', Cap'n!", 'warning', 'shields-low');
    }
  }, [shipStatus.hull, shipStatus.shield, parrot, isTakingOff]);

  useEffect(() => {
    // Skip mission reminders during takeoff
    if (isTakingOff) return;

      const activeMissions = missions.activeMissions.filter(m => m.active && !m.completed);
    const completedCount = missions.activeMissions.filter(m => m.completed).length;

    if (activeMissions.length > 0 && Math.random() < 0.1) {
      const mission = activeMissions[0];
        say(`Reminder, Cap'n: We still got that ${mission.title} mission to finish!`, 'info', 'mission-reminder');
    }

    if (completedCount > 0) {
        say(`Har har! ${completedCount} missions in the bag, Cap'n! Nice work!`, 'info', 'missions-complete');
    }
  }, [missions.activeMissions.length, parrot, isTakingOff]);

  useEffect(() => {
    // Skip heat warnings during takeoff
    if (isTakingOff) return;

      const heat = heatSystem.currentHeat;
    const wantedLevel = heatSystem.wantedLevel;

    if (wantedLevel >= 4) {
        say("Squawk! Yer wanted across the system, Cap'n! Patrols everywhere!", 'critical', 'wanted-high');
    } else if (heat > 50) {
        say("Avast! Heat levels be risin', Cap'n! Keep yer head down!", 'warning', 'heat-high');
    }
  }, [heatSystem.currentHeat, heatSystem.wantedLevel, parrot, isTakingOff]);


  useEffect(() => {
    // Don't set up interval if we're taking off
    if (isTakingOff) {
      console.log('[ParrotEvents] Skipping random comment interval setup during takeoff');
      return;
    }
    
    const interval = setInterval(() => {
      // Double-check we're not taking off before speaking
      if (!useLandedState.getState().isTakingOff) {
        parrot.randomComment();
      } else {
        console.log('[ParrotEvents] Suppressed random comment during takeoff');
      }
    }, 45000);
    
    console.log('[ParrotEvents] Random comment interval started');

    return () => {
      console.log('[ParrotEvents] Random comment interval cleared');
      clearInterval(interval);
    };
  }, [parrot, isTakingOff]);

  useEffect(() => {
    // Don't set up interval if we're taking off
    if (isTakingOff) {
      console.log('[ParrotEvents] Skipping memory recall interval setup during takeoff');
      return;
    }
    
    const memoryInterval = setInterval(() => {
      // Double-check we're not taking off before speaking
      if (!useLandedState.getState().isTakingOff) {
        if (Math.random() < 0.2) {
          parrot.recallMemory();
        }
      } else {
        console.log('[ParrotEvents] Suppressed memory recall during takeoff');
      }
    }, 90000);
    
    console.log('[ParrotEvents] Memory recall interval started');

    return () => {
      console.log('[ParrotEvents] Memory recall interval cleared');
      clearInterval(memoryInterval);
    };
  }, [parrot, isTakingOff]);
}
