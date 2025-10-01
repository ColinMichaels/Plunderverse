import { useEffect, useState } from "react";
import { useEquipment } from "../../lib/stores/useEquipment";
import { SpaceUIPanel } from "../ui/SpaceUIPanel";

export function EquipmentWarning() {
  const { equipment, getConditionStatus } = useEquipment();
  const [criticalEquipment, setCriticalEquipment] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const critical = equipment.filter(eq => {
      const condition = getConditionStatus(eq.id);
      return condition === 'critical' || condition === 'broken';
    });
    
    const criticalNames = critical.map(eq => eq.name);
    setCriticalEquipment(criticalNames);
    setShowWarning(criticalNames.length > 0);
  }, [equipment, getConditionStatus]);

  if (!showWarning) return null;

  return (
    <SpaceUIPanel
      id="equipment-warning"
      title="SYSTEM ALERT"
      icon="⚠️"
      zone="left-sidebar"
      priority={4}
      defaultExpanded={false}
      canCollapse={true}
    >
      <div className="space-y-2 bg-red-900/30 border border-red-500/50 rounded p-2 animate-pulse">
        <div className="text-xs text-red-200 font-mono">
          CRITICAL CONDITION DETECTED:
        </div>
        
        <ul className="text-xs text-red-300 space-y-1 font-mono">
          {criticalEquipment.map((name, index) => (
            <li key={index} className="flex items-center space-x-2">
              <span className="text-red-400">●</span>
              <span>{name.toUpperCase()}</span>
            </li>
          ))}
        </ul>
        
        <div className="text-xs text-red-400 font-mono border-t border-red-500/30 pt-2">
          ⚠️ IMMEDIATE MAINTENANCE REQUIRED!
        </div>
        
        <button
          onClick={() => setShowWarning(false)}
          className="space-button text-xs w-full bg-red-600/50 hover:bg-red-600/70"
        >
          ACKNOWLEDGE
        </button>
      </div>
    </SpaceUIPanel>
  );
}