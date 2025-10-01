import { useState, useEffect } from "react";
import { useGame } from "../../lib/stores/ui/useGame";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { MusicPlayer } from "./MusicPlayer";
import { AUDIO_CONFIG } from "../../lib/audioConfig";

export function SplashScreen() {
  const [showOptions, setShowOptions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  // Removed mouse tracking for smoother space travel animation

  // Slideshow content for game features, reasons to play, and player quotes
  const slideContent = [
    {
      type: "feature",
      text: "🚀 Realistic Physics-Based Space Flight",
      subtext: "Experience authentic rocket propulsion and momentum",
    },
    {
      type: "feature",
      text: "🪐 Explore Our Solar System",
      subtext: "Visit Mercury, Venus, Earth, Mars and beyond",
    },
    {
      type: "feature",
      text: "⛏️ Mine Resources & Manage Inventory",
      subtext: "Discover rare materials on alien worlds",
    },
    {
      type: "reason",
      text: "🎓 Educational & Entertaining",
      subtext: "Learn real astronomy while having fun",
    },
    {
      type: "reason",
      text: "🌌 Beautiful Cosmic Environments",
      subtext: "Stunning 3D graphics powered by Three.js",
    },
    {
      type: "reason",
      text: "😌 Relaxing Space Exploration",
      subtext: "Peaceful journey through the cosmos",
    },
    {
      type: "quote",
      text: '"Like Kerbal Space Program meets No Man\'s Sky!"',
      subtext: "- Steam Player Review",
    },
    {
      type: "quote",
      text: '"The most realistic space physics I\'ve experienced"',
      subtext: "- SpaceGamer2024",
    },
    {
      type: "quote",
      text: '"I lost hours just exploring the planets"',
      subtext: "- AstronautDreamer",
    },
  ];

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideContent.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval);
  }, [slideContent.length]);

  // Pre-calculate star configurations to avoid render inconsistencies
  const starConfigs = useState(() =>
    Array.from({ length: 60 }, (_, i) => {
      const size = Math.random() * 4 + 0.5;
      const brightness = Math.random() * 0.9 + 0.3;
      const twinkleSpeed = Math.random() * 8 + 4;
      const color =
        Math.random() > 0.6
          ? Math.random() > 0.5
            ? "#E6F3FF"
            : "#FFF8E1"
          : "#FFFFFF";

      // Fish-eye positioning - more stars towards edges
      const angle = Math.random() * Math.PI * 2; // Random angle
      const distanceFromCenter = Math.pow(Math.random(), 0.4) * 0.8; // Bias towards edges
      const centerX = 50; // Center percentage
      const centerY = 50;
      const x = centerX + Math.cos(angle) * distanceFromCenter * 50;
      const y = centerY + Math.sin(angle) * distanceFromCenter * 50;

      const depth = Math.random() * 10 + 1;
      const edgeSpeed = distanceFromCenter * 10 + 1; // Faster at edges
      const travelSpeed = Math.random() * 2000 + 10;

      // Radial movement - outward from center
      const radialX = Math.cos(angle) * edgeSpeed * (depth + 2);
      const radialY = Math.sin(angle) * edgeSpeed * (depth + 2);

      return {
        size,
        brightness,
        twinkleSpeed,
        color,
        x,
        y,
        depth,
        edgeSpeed,
        travelSpeed,
        radialX,
        radialY,
        distanceFromCenter,
      };
    }),
  )[0];

  // Pre-calculate nebula configurations
  const nebulaConfigs = useState(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distanceFromCenter = Math.pow(Math.random(), 0.3) * 0.9; // Even more bias towards edges
      const centerX = 50;
      const centerY = 50;
      const x = centerX + Math.cos(angle) * distanceFromCenter * 50;
      const y = centerY + Math.sin(angle) * distanceFromCenter * 50;

      const depth = Math.random() * 4 + 2;
      const edgeSpeed = distanceFromCenter * 3 + 1;
      const glowSpeed = Math.random() * 6 + 6;
      const travelSpeed = Math.random() * 25 + 15;

      const radialX = Math.cos(angle) * edgeSpeed * (depth + 3);
      const radialY = Math.sin(angle) * edgeSpeed * (depth + 3);

      return {
        x,
        y,
        depth,
        edgeSpeed,
        glowSpeed,
        travelSpeed,
        radialX,
        radialY,
        distanceFromCenter,
      };
    }),
  )[0];

  const { start } = useGame();
  const {
    toggleMute,
    isMuted,
    setAmbientMusic,
    setLaserSound,
    playAmbientMusic,
    stopAmbientMusic,
  } = useAudio();

  // Initialize sounds and start ambient music
  useEffect(() => {
    const { soundEffects } = AUDIO_CONFIG;
    
    // Load space ambience
    const ambientAudio = new Audio(soundEffects.ambient.path);
    ambientAudio.volume = soundEffects.ambient.volume;
    ambientAudio.loop = soundEffects.ambient.loop ?? false;
    setAmbientMusic(ambientAudio);

    // Load zap sound
    const zapAudio = new Audio(soundEffects.zap.path);
    zapAudio.volume = soundEffects.zap.volume;
    setLaserSound(zapAudio);

    // Play ambient music when splash screen loads
    playAmbientMusic();

    // Cleanup when component unmounts
    return () => {
      stopAmbientMusic();
    };
  }, [setAmbientMusic, setLaserSound, playAmbientMusic, stopAmbientMusic]);

  const handleEnterCockpit = () => {
    start();
  };

  const keyBindings = [
    { action: "Move Forward", keys: "W / ↑" },
    { action: "Move Backward", keys: "S / ↓" },
    { action: "Move Left", keys: "A / ←" },
    { action: "Move Right", keys: "D / →" },
    { action: "Move Up", keys: "Q" },
    { action: "Move Down", keys: "E" },
    { action: "Fire Lasers", keys: "Space" },
    { action: "Land on Planet", keys: "L" },
    { action: "Toggle Info", keys: "I" },
    { action: "Look Around", keys: "Mouse" },
  ];

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50 overflow-hidden">
      {/* Enhanced photorealistic starfield background */}
      <div className="absolute inset-0">
        {/* Fish-eye wide angle lens effect - stars radiating from center */}
        <div className="absolute inset-0">
          {starConfigs.map((config, i) => (
            <div
              key={i}
              className="absolute rounded-full star-fisheye"
              style={
                {
                  width: `${config.size}px`,
                  height: `${config.size}px`,
                  left: `${config.x}%`,
                  top: `${config.y}%`,
                  backgroundColor: config.color,
                  opacity: config.brightness,
                  boxShadow: `0 0 ${config.size * 3}px ${config.color}, 0 0 ${config.size * 6}px ${config.color}30`,
                  animationDuration: `${config.twinkleSpeed}s, ${config.travelSpeed}s`,
                  animationDelay: `${i * 0.2}s, ${i * 0.5}s`,
                  "--radial-x": `${config.radialX}px`,
                  "--radial-y": `${config.radialY}px`,
                  "--distance": config.distanceFromCenter,
                  "--depth": config.depth,
                  "--edge-speed": config.edgeSpeed,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* Nebula particles with fish-eye radial effect */}
        <div className="absolute inset-0">
          {nebulaConfigs.map((config, i) => (
            <div
              key={`particle-${i}`}
              className="absolute rounded-full nebula-fisheye"
              style={
                {
                  width: "4px",
                  height: "4px",
                  left: `${config.x}%`,
                  top: `${config.y}%`,
                  backgroundColor: "#4FC3F7",
                  boxShadow: "0 0 12px #4FC3F7, 0 0 24px #4FC3F740",
                  animationDuration: `${config.glowSpeed}s, ${config.travelSpeed}s`,
                  animationDelay: `${i * 1.2}s, ${i * 1.8}s`,
                  "--radial-x": `${config.radialX}px`,
                  "--radial-y": `${config.radialY}px`,
                  "--distance": config.distanceFromCenter,
                  "--depth": config.depth,
                  "--edge-speed": config.edgeSpeed,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* Space dust with travel effect */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-gray-900/10 to-gray-950/20 space-travel"></div>
      </div>

      {/* Custom CSS animations for fish-eye wide angle effect */}
      <style>{`
        .star-fisheye {
          animation: starTwinkle linear infinite, fisheyeTravel linear infinite;
        }
        
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); blur:0.5px; } }
          50% { opacity: 1; transform: scale(1.8); blur:3px; }
        }
        
        @keyframes fisheyeTravel {
          0% { 
            transform: translate(0, 0) scale(1); 
          }
          25% { 
            transform: translate(calc(var(--radial-x) * 0.3), calc(var(--radial-y) * 0.3)) scale(calc(1 + var(--distance) * 0.2)); 
          }
          50% { 
            transform: translate(calc(var(--radial-x) * 0.7), calc(var(--radial-y) * 0.7)) scale(calc(1 + var(--distance) * 0.5)); 
          }
          75% { 
            transform: translate(calc(var(--radial-x) * 0.5), calc(var(--radial-y) * 0.5)) scale(calc(1 + var(--distance) * 0.3)); 
          }
          100% { 
            transform: translate(0, 0) scale(1); 
          }
        }
        
        .nebula-fisheye {
          animation: nebulaGlow ease-in-out infinite, nebulaFisheye linear infinite;
        }
        
        @keyframes nebulaGlow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.9; }
        }
        
        @keyframes nebulaFisheye {
          0% { 
            transform: translate(0, 0) scale(1); 
          }
          33% { 
            transform: translate(calc(var(--radial-x) * 0.4), calc(var(--radial-y) * 0.4)) scale(calc(1 + var(--distance) * 0.3)); 
          }
          66% { 
            transform: translate(calc(var(--radial-x) * 0.8), calc(var(--radial-y) * 0.8)) scale(calc(1 + var(--distance) * 0.6)); 
          }
          100% { 
            transform: translate(0, 0) scale(1); 
          }
        }
        
        .space-travel {
          animation: spaceDust 20s ease-in-out infinite;
        }
        
        @keyframes spaceDust {
          0%, 100% { 
            transform: translateX(0) translateY(0) scale(1) rotate(0deg); 
            opacity: 0.3;
          }
          50% { 
            transform: translateX(3px) translateY(-2px) scale(1.05) rotate(0.5deg); 
            opacity: 0.6;
          }
        }
        
        .content-float {
          animation: contentFloat 8s ease-in-out infinite;
        }
        
        @keyframes contentFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        .slideshow-enter {
          animation: slideZoomIn 1.8s ease-out forwards;
          opacity: 0;
          transform: scale(0.3) translateY(20px);
        }
        
        .slideshow-exit {
          animation: slideZoomOut 1.5s ease-in forwards;
        }
        
        @keyframes slideZoomIn {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(20px);
          }
          60% {
            opacity: 0.8;
            transform: scale(1.1) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes slideZoomOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) translateY(-10px);
          }
        }
        
        .slide-feature {
          color: #22d3ee;
        }
        
        .slide-reason {
          color: #a3e635;
        }
        
        .slide-quote {
          color: #fbbf24;
          font-style: italic;
        }
      `}</style>

      <div className="relative z-10 text-center max-w-4xl px-8 content-float">
        {/* Enhanced Main Title with animations */}
        <div className="relative mb-4">
          <h1 className="text-6xl md:text-8xl font-bold text-cyan-400 mb-4 tracking-wider">
            SOLAR SYSTEM
          </h1>
        </div>

        <div className="relative mb-8">
          <h2 className="text-3xl md:text-4xl font-light text-cyan-300 tracking-wide">
            EXPLORER
          </h2>
        </div>

        {/* Animated Slideshow */}
        <div className="mb-12 h-24 flex flex-col items-center justify-center">
          <div
            key={currentSlide}
            className={`slideshow-enter slide-${slideContent[currentSlide].type} max-w-3xl mx-auto text-center`}
          >
            <p className="text-2xl md:text-3xl font-semibold mb-2 leading-relaxed">
              {slideContent[currentSlide].text}
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              {slideContent[currentSlide].subtext}
            </p>
          </div>
        </div>

        {/* Main Action Button */}
        <button
          onClick={handleEnterCockpit}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-4 px-12 rounded-xl text-xl mb-8 
                     transform transition-all duration-300 hover:scale-105 shadow-lg"
        >
          🚀 ENTER THE COCKPIT
        </button>

        {/* Menu Buttons */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => setShowOptions(true)}
            className="bg-slate-700 hover:bg-slate-600 text-cyan-400 font-semibold py-3 px-8 
                       rounded-xl border border-slate-600 hover:border-cyan-400 transition-all duration-300 hover:scale-105"
          >
            ⚙️ OPTIONS
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="bg-slate-700 hover:bg-slate-600 text-cyan-400 font-semibold py-3 px-8 
                       rounded-xl border border-slate-600 hover:border-cyan-400 transition-all duration-300 hover:scale-105"
          >
            ❓ HELP
          </button>
        </div>

        {/* Version/Credits */}
        <p className="text-slate-500 text-sm">
          Version 1.0.0 - Built with React, Three.js, and Tailwind CSS by{" "}
          <a
            href="https://colinmichaels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-cyan-400 transition-colors duration-300 underline decoration-slate-600 hover:decoration-cyan-400"
          >
            Colin Michaels
          </a>
        </p>
      </div>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-cyan-400 mb-6">Options</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Audio</span>
                <button
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isMuted
                      ? "bg-red-600 hover:bg-red-500 text-white"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                  }`}
                >
                  {isMuted ? "🔇 Muted" : "🔊 Enabled"}
                </button>
              </div>

              <div className="border-t border-slate-600 pt-4">
                <p className="text-sm text-slate-400">
                  Experience realistic space flight with momentum-based controls
                  and authentic rocket physics.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowOptions(false)}
              className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-cyan-400 mb-6">
              Flight Manual
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">
                  Controls
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {keyBindings.map((binding, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-slate-700 p-2 rounded-lg"
                    >
                      <span className="text-slate-300 text-sm">
                        {binding.action}
                      </span>
                      <kbd className="bg-slate-600 text-cyan-400 px-2 py-1 rounded text-xs font-mono">
                        {binding.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">
                  Gameplay Tips
                </h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>
                    • Use realistic momentum-based movement - thrusters build up
                    speed gradually
                  </li>
                  <li>
                    • Approach planets to learn about them and see detailed
                    information
                  </li>
                  <li>• Use the mini map to navigate the solar system</li>
                  <li>
                    • Fire lasers to defend yourself in the vastness of space
                  </li>
                  <li>• Land on planets by pressing 'L' when near them</li>
                  <li>
                    • Your coordinates are displayed in the top-right corner
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-2 rounded-lg transition-colors"
            >
              Launch Mission
            </button>
          </div>
        </div>
      )}
      {/* Music Player - prominently displayed */}
      <div className="absolute bottom-4 right-4">
        <div className="animate-pulse mb-1">
          <div className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
            <span>🎵</span>
            <span>MUSIC PLAYER</span>
          </div>
        </div>
        <MusicPlayer />
      </div>
    </div>
  );
}
