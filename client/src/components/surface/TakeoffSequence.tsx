import { useEffect, useState, useRef } from "react";
import { useLandedState } from "@/lib/stores/surface/useLandedState";
import { useSolarSystem } from "@/lib/stores/space/useSolarSystem";
import { planets } from "@/lib/planetData";
import { useAudio} from "@/lib/stores";
import { GameTransitionOverlay } from "@/components/screens/GameTransitionOverlay";
import * as THREE from "three";


type TakeoffStage = "preparing" | "igniting" | "ascending" | "breaking_atmosphere" | "entering_orbit" | "complete";

export function TakeoffSequence() {
  const { isTakingOff, setIsTakingOff, setNotLanded, landedPlanet } = useLandedState();
  const { setCameraPosition, getUniverseTime } = useSolarSystem();
  const [stage, setStage] = useState<TakeoffStage>("preparing");
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const cameraAnimationRef = useRef<NodeJS.Timeout>();
  const soundPlayedRef = useRef(false);
  const { playTakeoff } = useAudio();

  useEffect(() => {
    if (!isTakingOff) {
      setStage("preparing");
      setProgress(0);
      setShowOverlay(false);
      soundPlayedRef.current = false;
      return;
    }

    let progressInterval: NodeJS.Timeout;
    
    // Show overlay immediately when takeoff starts
    setShowOverlay(true);
    
    // Simulate takeoff sequence
    const takeoffSequence = async () => {
      // Preparing phase
      setStage("preparing");
      setStatusMessage("Preparing for Launch");
      setSubtitle(`Departing from ${landedPlanet}`);
      
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setStage("igniting");
            return 0;
          }
          return prev + 3;
        });
      }, 30);

      // Wait for preparing to complete
      setTimeout(() => {
        clearInterval(progressInterval);
        setStage("igniting");
        setStatusMessage("Engaging Thrusters");
        setSubtitle("Main engines online");
        setProgress(0);
        
        // Play takeoff sound prominently when engines engage
        if (!soundPlayedRef.current) {
          playTakeoff();
          soundPlayedRef.current = true;
          console.log(`[TAKEOFF] Playing takeoff sound for departure from ${landedPlanet}`);
        }

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
          setStatusMessage("Lifting Off");
          setSubtitle("Ascending from surface");
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
            setStatusMessage("Leaving Atmosphere");
            setSubtitle("Breaking through planetary boundary");
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
              setStatusMessage("Achieving Orbit");
              setSubtitle("Stabilizing trajectory");
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
                setStatusMessage("Takeoff Complete");
                setSubtitle("Welcome back to space");
                
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
                      // Fade out overlay before resetting
                      setTimeout(() => {
                        setShowOverlay(false);
                        // Reset states and return to space
                        setNotLanded();
                        setIsTakingOff(false);
                        console.log(`Successfully took off from ${landedPlanet}, camera at orbital position`);
                      }, 500);
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
  }, [isTakingOff, setIsTakingOff, setNotLanded, landedPlanet, setCameraPosition, getUniverseTime, playTakeoff]);

  // Don't render anything if not taking off
  if (!isTakingOff) return null;

  // Use the cinematic GameTransitionOverlay component
  return (
    <GameTransitionOverlay
      isVisible={showOverlay}
      status={statusMessage}
      subtitle={subtitle}
      progress={progress}
    />
  );
}
