import { useSolarSystem } from "../lib/stores/useSolarSystem";

export function CoordinatesDisplay() {
  const { cameraPosition } = useSolarSystem();

  const position = {
    x: Math.round(cameraPosition.x * 10) / 10,
    y: Math.round(cameraPosition.y * 10) / 10,
    z: Math.round(cameraPosition.z * 10) / 10
  };

  return (
    <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm min-w-[180px]">
      <h3 className="text-sm font-bold mb-2 text-green-400">COORDINATES</h3>
      <div className="space-y-1 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-gray-300">X:</span>
          <span className="text-white">{position.x.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Y:</span>
          <span className="text-white">{position.y.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Z:</span>
          <span className="text-white">{position.z.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}