import { useEffect, useState } from "react";
import { useSolarSystem } from "../lib/stores/useSolarSystem";
import { planets } from "../lib/planetData";

export function LandingTransition() {
  const { selectedPlanet, isLanding, setIsLanding } = useSolarSystem();
  const [stage, setStage] = useState<"approach" | "descent" | "landed">("approach");
  const [progress, setProgress] = useState(0);

  const planet = planets.find(p => p.name === selectedPlanet);

  useEffect(() => {
    if (!isLanding) {
      setStage("approach");
      setProgress(0);
      return;
    }

    let progressInterval: NodeJS.Timeout;
    
    // Simulate landing sequence
    const landingSequence = async () => {
      // Approach phase
      setStage("approach");
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setStage("descent");
            return 0;
          }
          return prev + 2;
        });
      }, 50);

      // Wait for approach to complete
      setTimeout(() => {
        clearInterval(progressInterval);
        setStage("descent");
        setProgress(0);

        // Descent phase
        progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              setStage("landed");
              return 100;
            }
            return prev + 1.5;
          });
        }, 40);

        // Complete landing
        setTimeout(() => {
          clearInterval(progressInterval);
          setStage("landed");
          setTimeout(() => {
            setIsLanding(false);
          }, 2000);
        }, 3000);
      }, 2500);
    };

    landingSequence();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isLanding, setIsLanding]);

  if (!isLanding || !planet) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
      {/* Atmospheric entry effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-gradient-radial from-orange-500/20 via-transparent to-transparent"
          style={{
            opacity: stage === "approach" ? progress / 100 : stage === "descent" ? 0.8 : 0,
            transition: "opacity 0.5s ease"
          }}
        />
        
        {/* Descent particles */}
        {stage === "descent" && (
          <div className="absolute inset-0">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-8 bg-orange-300 opacity-70"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  animation: `fall 0.5s linear infinite`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  transform: `rotate(${45 + Math.random() * 90}deg)`
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 text-center max-w-2xl px-8">
        {/* Planet visualization */}
        <div className="mb-8 relative">
          <div 
            className="w-32 h-32 mx-auto rounded-full shadow-2xl"
            style={{ 
              backgroundColor: planet.color,
              boxShadow: `0 0 60px ${planet.color}40`,
              transform: `scale(${0.5 + (progress / 100) * 0.5})`
            }}
          />
          
          {/* Landing target indicator */}
          {stage === "descent" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-2 border-white rounded-full animate-pulse">
                <div className="w-full h-full border-2 border-cyan-400 rounded-full animate-ping" />
              </div>
            </div>
          )}
        </div>

        {/* Status text */}
        <h2 className="text-4xl font-bold text-white mb-4">
          {stage === "approach" && "Approaching"}
          {stage === "descent" && "Atmospheric Entry"}
          {stage === "landed" && "Landing Complete"}
        </h2>
        
        <h3 className="text-2xl text-blue-300 mb-6">{planet.name}</h3>

        {/* Progress bar */}
        <div className="w-full max-w-md mx-auto mb-6">
          <div className="bg-gray-800 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">
            {stage === "approach" && "Reducing velocity..."}
            {stage === "descent" && "Entering atmosphere..."}
            {stage === "landed" && "Systems nominal"}
          </p>
        </div>

        {/* Ship telemetry */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400">Altitude</div>
            <div className="text-white font-mono">
              {stage === "approach" ? Math.floor(1000 - (progress * 8)) : 
               stage === "descent" ? Math.floor(200 - (progress * 2)) : "0"} km
            </div>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <div className="text-gray-400">Velocity</div>
            <div className="text-white font-mono">
              {stage === "approach" ? Math.floor(500 - (progress * 4)) : 
               stage === "descent" ? Math.floor(50 - (progress * 0.5)) : "0"} m/s
            </div>
          </div>
        </div>

        {stage === "landed" && (
          <div className="mt-6 text-green-400 font-semibold">
            ✓ Successfully landed on {planet.name}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(225deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}