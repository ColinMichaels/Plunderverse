import { useEffect, useState } from "react";
import { useEquipment } from "../lib/stores/useEquipment";

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
    <div className="fixed top-20 right-4 z-30 max-w-sm">
      <div className="bg-red-900/90 border border-red-500 rounded-lg p-3 animate-pulse">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-red-400 text-lg">⚠️</span>
          <h3 className="text-red-400 font-semibold">Equipment Alert</h3>
          <button
            onClick={() => setShowWarning(false)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
        
        <div className="text-sm text-red-200">
          Critical condition detected:
        </div>
        
        <ul className="text-xs text-red-300 mt-1">
          {criticalEquipment.map((name, index) => (
            <li key={index}>• {name}</li>
          ))}
        </ul>
        
        <div className="text-xs text-red-400 mt-2">
          Equipment needs immediate maintenance!
        </div>
      </div>
    </div>
  );
}