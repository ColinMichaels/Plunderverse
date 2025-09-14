import { useShipStatus } from "../lib/stores/useShipStatus";
import { useEquipment } from "../lib/stores/useEquipment";

export function ShipStatusHUD() {
  const { shield, hull, isDestroyed, isCritical, lastDamageSource } = useShipStatus();
  const { getEquipment } = useEquipment();
  
  // Get fuel from equipment system
  const fuelTank = getEquipment('fuel-tank');
  const fuel = fuelTank ? (fuelTank.currentDurability / fuelTank.maxDurability) * 100 : 0;

  const getMeterColor = (value: number, type: "fuel" | "shield" | "hull") => {
    if (value > 60) {
      return type === "fuel" ? "bg-blue-500" : type === "shield" ? "bg-cyan-500" : "bg-green-500";
    } else if (value > 30) {
      return "bg-yellow-500";
    } else {
      return "bg-red-500";
    }
  };

  const getMeterGradient = (value: number, type: "fuel" | "shield" | "hull") => {
    const baseColors = {
      fuel: "from-blue-600 to-blue-400",
      shield: "from-cyan-600 to-cyan-400", 
      hull: "from-green-600 to-green-400"
    };

    if (value > 60) {
      return `bg-gradient-to-r ${baseColors[type]}`;
    } else if (value > 30) {
      return "bg-gradient-to-r from-yellow-600 to-yellow-400";
    } else {
      return "bg-gradient-to-r from-red-600 to-red-400";
    }
  };

  if (isDestroyed) {
    return (
      <div className="fixed inset-0 bg-red-900/80 flex items-center justify-center z-40">
        <div className="text-center">
          <h2 className="text-6xl font-bold text-red-400 mb-4">SHIP DESTROYED</h2>
          <p className="text-xl text-white mb-6">
            {lastDamageSource && `Destroyed by: ${lastDamageSource}`}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg"
          >
            Restart Mission
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/90 text-white p-4 rounded-lg backdrop-blur-sm min-w-[400px]">
      <h3 className="text-sm font-bold mb-3 text-center text-blue-400">SHIP STATUS</h3>
      
      {/* Critical warning */}
      {isCritical && (
        <div className="mb-3 p-2 bg-red-900/50 border border-red-500 rounded text-center animate-pulse">
          <span className="text-red-400 font-bold">⚠️ CRITICAL SYSTEMS</span>
        </div>
      )}

      {/* Status meters */}
      <div className="space-y-3">
        {/* Fuel */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-300">FUEL</span>
            <span className="text-xs font-mono text-white">{Math.round(fuel)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getMeterGradient(fuel, "fuel")}`}
              style={{ width: `${fuel}%` }}
            />
          </div>
        </div>

        {/* Shield */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-300">SHIELDS</span>
            <span className="text-xs font-mono text-white">{Math.round(shield)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getMeterGradient(shield, "shield")}`}
              style={{ width: `${shield}%` }}
            />
          </div>
        </div>

        {/* Hull */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-300">HULL</span>
            <span className="text-xs font-mono text-white">{Math.round(hull)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getMeterGradient(hull, "hull")}`}
              style={{ width: `${hull}%` }}
            />
          </div>
        </div>
      </div>

      {/* Damage indicator */}
      {lastDamageSource && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-600 rounded text-center">
          <span className="text-red-400 text-xs">
            Last damage: {lastDamageSource}
          </span>
        </div>
      )}
    </div>
  );
}