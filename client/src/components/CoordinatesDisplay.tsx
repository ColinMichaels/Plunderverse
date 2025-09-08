import { useThree } from "@react-three/fiber";
import { useState, useEffect } from "react";

export function CoordinatesDisplay() {
  const { camera } = useThree();
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: Math.round(camera.position.x * 10) / 10,
        y: Math.round(camera.position.y * 10) / 10,
        z: Math.round(camera.position.z * 10) / 10
      });
    };

    // Update position every 100ms for smooth display
    const interval = setInterval(updatePosition, 100);
    return () => clearInterval(interval);
  }, [camera]);

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