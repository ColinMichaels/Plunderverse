import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { SpotLight } from "three";
import * as THREE from "three";
import { useFlashlight } from "../../lib/stores/surface/useFlashlight";

export function FlashlightSystem() {
  const { camera } = useThree();
  const spotLightRef = useRef<SpotLight>(null);
  const { isOn, batteryLevel, getBatteryStatus } = useFlashlight();

  useFrame(() => {
    if (!spotLightRef.current || !isOn) return;

    // Position the flashlight slightly in front of the camera
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion,
    );
    const flashlightPosition = camera.position
      .clone()
      .add(forward.multiplyScalar(0.3));

    // Position the light slightly below camera center to simulate chest/helmet mounting
    flashlightPosition.y -= 0.04;

    spotLightRef.current.position.copy(flashlightPosition);

    // Point the flashlight in the same direction as the camera
    const target = camera.position.clone().add(forward.multiplyScalar(10));
    spotLightRef.current.target.position.copy(target);
    spotLightRef.current.target.updateMatrixWorld();

    // Adjust intensity based on battery level
    const batteryStatus = getBatteryStatus();
    let intensity = 1.5; // Base intensity for full battery
    const intensityMultiplier = 1.35;

    switch (batteryStatus) {
      case "critical":
        intensity = 1 * intensityMultiplier; // Very dim when battery is critical
        break;
      case "low":
        intensity = 2.5 * intensityMultiplier; // Dimmer when battery is low
        break;
      case "good":
        intensity = 5 * intensityMultiplier; // Good brightness
        break;
      case "full":
        intensity = 10 * intensityMultiplier; // Maximum brightness
        break;
      default:
        intensity = 0 * intensityMultiplier; // Dead battery
    }

    spotLightRef.current.intensity = intensity;

    // Add subtle flickering when battery is very low
    if (batteryStatus === "critical" && batteryLevel > 0) {
      const flicker = 0.8 + Math.random() * 0.4; // Random flicker between 0.8 and 1.2
      spotLightRef.current.intensity *= flicker;
    }
  });

  // Don't render anything if flashlight is off or battery is dead
  if (!isOn || batteryLevel <= 0) {
    return null;
  }

  return (
    <>
      <spotLight
        ref={spotLightRef}
        color="#ffffff"
        intensity={100}
        distance={1000} // Effective range of the flashlight
        angle={Math.PI / 4.5} // 30-degree cone (typical flashlight beam)
        penumbra={0.3} // Soft edge falloff
        decay={0.1} // Realistic light falloff
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={125}
        shadow-bias={-0.0001}
      />

      {/* Helper to show the target (invisible in production) */}
      <object3D
        ref={(ref) => {
          if (ref && spotLightRef.current) {
            spotLightRef.current.target = ref;
          }
        }}
      />
    </>
  );
}
