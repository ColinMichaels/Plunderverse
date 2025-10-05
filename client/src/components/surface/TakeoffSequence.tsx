import { useEffect, useState, useRef } from "react";
import { useLandedState } from "@/lib/stores/surface/useLandedState";
import { useSolarSystem } from "@/lib/stores/space/useSolarSystem";
import { planets } from "@/lib/planetData";
import { useAudio} from "@/lib/stores";
import * as THREE from "three";

type TakeoffStage = "preparing" | "igniting" | "ascending" | "breaking_atmosphere" | "entering_orbit" | "complete";

export function TakeoffSequence() {
  const { isTakingOff, setIsTakingOff, setNotLanded, landedPlanet } = useLandedState();
  const { setCameraPosition, getUniverseTime } = useSolarSystem();
  const [stage, setStage] = useState<TakeoffStage>("preparing");
  const [progress, setProgress] = useState(0);
  const cameraAnimationRef = useRef<NodeJS.Timeout>();
  const { playTakeoff } = useAudio();

  useEffect(() => {
    if (!isTakingOff) {
      setStage("preparing");
      setProgress(0);
      return;
    }

    let progressInterval: NodeJS.Timeout;
    
    // Simulate takeoff sequence
    const takeoffSequence = async () => {
      // Preparing phase
      setStage("preparing");
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setStage("igniting");
            playTakeoff();
            return 0;
          }
          return prev + 3;
        });
      }, 30);

      // Wait for preparing to complete
      setTimeout(() => {
        clearInterval(progressInterval);
        setStage("igniting");
        setProgress(0);

        // Igniting phase
        progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              setStage("ascending");
              return 0;
            }
            return prev + 2.5;
          });
        }, 30);

        // Ascending phase
        setTimeout(() => {
          clearInterval(progressInterval);
          setStage("ascending");
          setProgress(0);
          
          progressInterval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 100) {
                clearInterval(progressInterval);
                setStage("breaking_atmosphere");
                return 0;
              }
              return prev + 2;
            });
          }, 40);
          
          // Breaking atmosphere phase
          setTimeout(() => {
            clearInterval(progressInterval);
            setStage("breaking_atmosphere");
            setProgress(0);
            
            progressInterval = setInterval(() => {
              setProgress(prev => {
                if (prev >= 100) {
                  clearInterval(progressInterval);
                  setStage("entering_orbit");
                  return 0;
                }
                return prev + 2;
              });
            }, 35);
            
            // Entering orbit phase
            setTimeout(() => {
              clearInterval(progressInterval);
              setStage("entering_orbit");
              setProgress(0);
              
              progressInterval = setInterval(() => {
                setProgress(prev => {
                  if (prev >= 100) {
                    clearInterval(progressInterval);
                    setStage("complete");
                    return 100;
                  }
                  return prev + 3;
                });
              }, 30);
              
              // Complete takeoff
              setTimeout(() => {
                clearInterval(progressInterval);
                setStage("complete");
                
                // Camera pull-back effect - position camera in orbit around planet
                const planet = planets.find((p) => p.name === landedPlanet);
                if (planet) {
                  // Calculate the planet's current orbital position using universe time
                  const universeTime = getUniverseTime();
                  const angle = universeTime * planet.orbitalSpeed;
                  const orbitX = Math.cos(angle) * planet.distance;
                  const orbitZ = Math.sin(angle) * planet.distance;
                  
                  // Use exponential easing for camera pull-back
                  let cameraDistance = planet.size * 2; // Start close
                  const targetDistance = planet.size * 8; // End at orbital distance
                  const pullbackDuration = 2000; // 2 seconds for camera animation
                  const startTime = Date.now();
                  
                  cameraAnimationRef.current = setInterval(() => {
                    const elapsed = Date.now() - startTime;
                    const t = Math.min(elapsed / pullbackDuration, 1);
                    
                    // Exponential easing for natural acceleration
                    const easedT = 1 - Math.pow(1 - t, 3);
                    cameraDistance = THREE.MathUtils.lerp(planet.size * 2, targetDistance, easedT);
                    
                    // Calculate camera position
                    const cameraPosition = new THREE.Vector3(
                      orbitX + Math.cos(angle) * cameraDistance,
                      10 + (easedT * 5), // Gradually increase elevation
                      orbitZ + Math.sin(angle) * cameraDistance
                    );
                    
                    setCameraPosition(cameraPosition);
                    
                    if (t >= 1) {
                      clearInterval(cameraAnimationRef.current);
                      // Reset states and return to space
                      setNotLanded();
                      setIsTakingOff(false);
                      console.log(`Successfully took off from ${landedPlanet}, camera at orbital position`);
                    }
                  }, 16); // ~60fps
                }
              }, 1000);
            }, 1750); // Breaking atmosphere duration
          }, 2000); // Ascending duration
        }, 1200); // Igniting duration
      }, 1000); // Preparing duration
    };

    takeoffSequence();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (cameraAnimationRef.current) clearInterval(cameraAnimationRef.current);
    };
  }, [isTakingOff, setIsTakingOff, setNotLanded, landedPlanet, setCameraPosition, getUniverseTime]);

  if (!isTakingOff) return null;

  const getStageMessage = () => {
    switch (stage) {
      case "preparing": return "Preparing engines...";
      case "igniting": return "Igniting thrusters...";
      case "ascending": return "Ascending from surface...";
      case "breaking_atmosphere": return "Breaking atmosphere...";
      case "entering_orbit": return "Entering orbit...";
      case "complete": return "Takeoff complete!";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Main takeoff UI */}
      <div className="relative">
        {/* Animated ship icon */}
        <div className={`mb-8 transition-transform duration-1000 ${
          stage === "ascending" || stage === "breaking_atmosphere" ? "-translate-y-8" : ""
        }`}>
          <div className="text-6xl animate-pulse">🚀</div>
        </div>

        {/* Stage message */}
        <h2 className="text-3xl font-bold text-white mb-4 text-center animate-pulse">
          {getStageMessage()}
        </h2>

        {/* Planet name */}
        <p className="text-xl text-gray-300 mb-8 text-center">
          Departing from {landedPlanet}
        </p>

        {/* Progress bar */}
        <div className="w-96 bg-gray-800 rounded-full h-4 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-100 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress percentage */}
        <p className="text-center text-gray-400 mt-2">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Atmospheric effect overlay */}
      {(stage === "ascending" || stage === "breaking_atmosphere") && (
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-blue-500/10 to-cyan-400/20 animate-pulse pointer-events-none" />
      )}

      {/* Space transition effect */}
      {stage === "entering_orbit" && (
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-900/30 to-transparent animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
