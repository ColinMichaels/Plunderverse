import { useState } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useFlashlight } from "../../lib/stores/useFlashlight";
import { useLandedState } from "../../lib/stores/useLandedState";
import { useMining } from "../../lib/stores/useMining";
import { useInventoryDisplayData } from "../../domain/economy/selectors";
import { useEquipment } from "../../lib/stores/useEquipment";
import { planets } from "../../lib/planetData";
import { DraggablePanel } from "../ui/DraggablePanel";

export function SurfaceStatsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const player = usePlayer();
  const { isOn, batteryLevel, getBatteryStatus, isCharging } = useFlashlight();
  const { isLanded, landedPlanet } = useLandedState();
  const { isActive: isMining, targetResource, clicksCompleted, clicksRequired } = useMining();
  const inventoryData = useInventoryDisplayData();
  const { getPerformanceMultiplier, getConditionStatus } = useEquipment();
  
  const planet = planets.find((p) => p.name === landedPlanet);
  
  const totalUnits = inventoryData.storageUsed;
  const lastChangedItem = inventoryData.items.length > 0 ? inventoryData.items[inventoryData.items.length - 1] : null;
  
  const drillPerformance = getPerformanceMultiplier("drill-mk1");
  const extractorPerformance = getPerformanceMultiplier("extractor-basic");
  const drillStatus = getConditionStatus("drill-mk1");
  const extractorStatus = getConditionStatus("extractor-basic");
  
  const getOxygenColor = (percentage: number) => {
    if (percentage >= 50) return "text-green-400";
    if (percentage >= 25) return "text-yellow-400";
    return "text-red-400";
  };
  
  const getBatteryColor = () => {
    const status = getBatteryStatus();
    if (status === "critical" || status === "dead") return "text-red-400";
    if (status === "low") return "text-yellow-400";
    if (isCharging) return "text-cyan-400";
    return "text-green-400";
  };
  
  const getEquipmentColor = (status: string) => {
    if (status === "excellent" || status === "good") return "text-green-400";
    if (status === "fair") return "text-yellow-400";
    return "text-red-400";
  };
  
  if (!isLanded) return null;
  
  if (!isExpanded) {
    return (
      <DraggablePanel
        defaultPosition={{ x: window.innerWidth - 440, y: window.innerHeight - 80 }}
        bounds="window"
      >
        <div className="bg-gray-900/90 backdrop-blur-sm border border-cyan-400/50 rounded-lg p-2 flex items-center gap-3 z-50 cursor-move">
        <div 
          className={`font-mono text-xs ${getBatteryColor()}`}
          title={`Flashlight Battery: ${Math.round(batteryLevel)}% - ${isOn ? "ON" : "OFF"}${isCharging ? " (Charging)" : ""}`}
        >
          💡 {Math.round(batteryLevel)}%{isCharging ? "⚡" : ""}
        </div>
        
        <div 
          className={`font-mono text-xs ${isMining ? "text-cyan-400" : "text-gray-500"}`}
          title={isMining ? `Mining ${targetResource?.type}: ${clicksCompleted}/${clicksRequired} clicks` : "Mining Inactive"}
        >
          ⛏️ {isMining ? `${clicksCompleted}/${clicksRequired}` : "Off"}
        </div>
        
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center"
          title="Expand Stats Panel"
        >
          <span className="text-xl">⬇️</span>
        </button>
        </div>
      </DraggablePanel>
    );
  }
  
  return (
    <DraggablePanel
      defaultPosition={{ x: window.innerWidth - 440, y: window.innerHeight - 320 }}
      handle=".surface-stats-header"
      bounds="window"
    >
      <div className="bg-gray-900/90 backdrop-blur-sm border border-cyan-400/50 rounded-lg p-4 z-50 min-w-[320px]">
        <div className="surface-stats-header flex items-center justify-between mb-3 cursor-move">
          <h3 className="text-cyan-400 font-bold text-sm">Surface Stats</h3>
          <button
            onClick={() => setIsExpanded(false)}
            className="bg-gray-900/90 hover:bg-cyan-600/90 text-cyan-400 hover:text-white w-10 h-10 rounded-lg border border-cyan-400/50 hover:border-cyan-400 transition-all backdrop-blur-sm flex items-center justify-center"
            title="Collapse Stats Panel"
          >
            <span className="text-xl">⬆️</span>
          </button>
        </div>
      
      <div className="space-y-3 text-xs font-mono">
        <div className="border-b border-cyan-400/30 pb-2">
          <div className="text-cyan-300 font-semibold mb-1">Life Support</div>
          <div className={`${getOxygenColor(player.oxygenPercentage)}`}>
            O₂ Level: {player.oxygenPercentage}%
          </div>
          <div className="text-gray-300">
            Suit Status: {player.suitStatus}
          </div>
          <div className="text-gray-300">
            Temperature: {planet?.surfaceTemperature}°C
          </div>
        </div>
        
        <div className="border-b border-cyan-400/30 pb-2">
          <div className="text-cyan-300 font-semibold mb-1">Power</div>
          <div className={getBatteryColor()}>
            Flashlight: {isOn ? "ON" : "OFF"} ({Math.round(batteryLevel)}%)
            {isCharging && " ⚡ Charging"}
          </div>
        </div>
        
        <div className="border-b border-cyan-400/30 pb-2">
          <div className="text-cyan-300 font-semibold mb-1">Mission</div>
          <div className="text-green-400">
            Landing: ✓ {landedPlanet}
          </div>
          <div className={isMining ? "text-cyan-400" : "text-gray-500"}>
            Mining: {isMining ? `✓ ${targetResource?.type}` : "✗ Inactive"}
          </div>
          {isMining && (
            <div className="text-gray-300 ml-4">
              Progress: {clicksCompleted}/{clicksRequired} clicks
            </div>
          )}
        </div>
        
        <div className="border-b border-cyan-400/30 pb-2">
          <div className="text-cyan-300 font-semibold mb-1">Cargo</div>
          <div className="text-gray-300">
            Total Units: {totalUnits}
          </div>
          <div className="text-gray-300">
            Storage: {inventoryData.storageUsed}/{inventoryData.storageCapacity}
          </div>
          {lastChangedItem && (
            <div className="text-gray-400 text-[10px]">
              Last: {lastChangedItem.quantity}x {lastChangedItem.type}
            </div>
          )}
        </div>
        
        <div>
          <div className="text-cyan-300 font-semibold mb-1">Equipment</div>
          <div className={getEquipmentColor(drillStatus)}>
            Drill: {(drillPerformance * 100).toFixed(0)}% ({drillStatus})
          </div>
          <div className={getEquipmentColor(extractorStatus)}>
            Extractor: {(extractorPerformance * 100).toFixed(0)}% ({extractorStatus})
          </div>
          {(drillStatus === "broken" || extractorStatus === "broken") && (
            <div className="text-red-400 mt-1">⚠️ EQUIPMENT BROKEN</div>
          )}
        </div>
      </div>
      </div>
    </DraggablePanel>
  );
}
