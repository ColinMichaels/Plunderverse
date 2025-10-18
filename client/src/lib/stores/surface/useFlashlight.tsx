import { create } from "zustand";

interface FlashlightState {
  // Core state
  isOn: boolean;
  batteryLevel: number; // 0-100 percentage
  isCharging: boolean;

  // Battery management
  maxBattery: number; // Maximum battery capacity
  drainRate: number; // Battery drain per second when on
  chargeRate: number; // Battery charge per second when charging

  // Actions
  toggle: () => void;
  turnOn: () => void;
  turnOff: () => void;
  startCharging: () => void;
  stopCharging: () => void;
  updateBattery: (deltaTime: number) => void;

  // Utility
  canTurnOn: () => boolean;
  getBatteryStatus: () => "full" | "good" | "low" | "critical" | "dead";
}

export const useFlashlight = create<FlashlightState>((set, get) => ({
  // Initial state
  isOn: false,
  batteryLevel: 100, // Start with full battery
  isCharging: false,
  maxBattery: 100,
  drainRate: 0.5, // Drain 0.5% per second when on (200 seconds to empty)
  chargeRate: 5, // Charge 5% per second when charging (20 seconds to full charge)

  // Toggle flashlight on/off
  toggle: () => {
    const state = get();
    if (state.isOn) {
      set({ isOn: false });
      console.log("[FLASHLIGHT] Turned off");
    } else if (state.canTurnOn()) {
      set({ isOn: true });
      console.log(
        `[FLASHLIGHT] Turned on (Battery: ${Math.round(state.batteryLevel)}%)`,
      );
    } else {
      console.log("[FLASHLIGHT] Cannot turn on - battery too low");
    }
  },

  // Turn flashlight on (if possible)
  turnOn: () => {
    const state = get();
    if (state.canTurnOn()) {
      set({ isOn: true });
      console.log(
        `[FLASHLIGHT] Turned on (Battery: ${Math.round(state.batteryLevel)}%)`,
      );
    } else {
      console.log("[FLASHLIGHT] Cannot turn on - battery too low");
    }
  },

  // Turn flashlight off
  turnOff: () => {
    set({ isOn: false });
    console.log("[FLASHLIGHT] Turned off");
  },

  // Start charging the battery
  startCharging: () => {
    set({ isCharging: true });
    console.log("[FLASHLIGHT] Started charging");
  },

  // Stop charging the battery
  stopCharging: () => {
    set({ isCharging: false });
    console.log("[FLASHLIGHT] Stopped charging");
  },

  // Update battery level based on time elapsed
  updateBattery: (deltaTime: number) => {
    const state = get();
    let newBatteryLevel = state.batteryLevel;

    // Drain battery if flashlight is on
    if (state.isOn) {
      newBatteryLevel -= state.drainRate * deltaTime;

      // Turn off flashlight if battery is depleted
      if (newBatteryLevel <= 0) {
        newBatteryLevel = 0;
        console.log("[FLASHLIGHT] Battery depleted - flashlight turned off");
        set({ isOn: false, batteryLevel: 0 });
        return;
      }
    }

    // Charge battery if charging
    if (state.isCharging) {
      newBatteryLevel += state.chargeRate * deltaTime;

      // Cap at maximum battery level
      if (newBatteryLevel >= state.maxBattery) {
        newBatteryLevel = state.maxBattery;
        console.log("[FLASHLIGHT] Battery fully charged");
        set({ isCharging: false, batteryLevel: state.maxBattery });
        return;
      }
    }

    // Update battery level
    if (newBatteryLevel !== state.batteryLevel) {
      set({
        batteryLevel: Math.max(0, Math.min(state.maxBattery, newBatteryLevel)),
      });
    }
  },

  // Check if flashlight can be turned on
  canTurnOn: () => {
    const state = get();
    return state.batteryLevel > 5; // Require at least 5% battery
  },

  // Get battery status description
  getBatteryStatus: () => {
    const state = get();
    const level = state.batteryLevel;

    if (level <= 0) return "dead";
    if (level <= 10) return "critical";
    if (level <= 25) return "low";
    if (level <= 75) return "good";
    return "full";
  },
}));
