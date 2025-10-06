import { useState, useEffect, useRef } from "react";
import { useGame } from "../../lib/stores/ui/useGame";
import { useAuthStore } from "../../lib/stores/auth/useAuthStore";
import { usePlayer } from "../../lib/stores/player/usePlayer";
import { useCredits } from "../../lib/stores/economy/useCredits";
import { usePlunderverseMissions } from "../../lib/stores/economy/usePlunderverseMissions";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { useMusicPlayer } from "../../lib/stores/ui/useMusicPlayer";
import { MusicPlayer } from "./MusicPlayer";
import { VideoModal } from "../shared/VideoModal";
import { ImageGallery, GalleryImage } from "../shared/ImageGallery";
import { AuthScreen } from "../auth/AuthScreen";
import { gameApi } from "../../services/gameApi";
import { AUDIO_CONFIG } from "../../lib/audioConfig";
import { 
  Play, Image, Video, LogIn, UserPlus, Gamepad2, Star, 
  User, Coins, Trophy, MapPin, Shield, Sparkles, Award, Target
} from 'lucide-react';

export function EnhancedSplashScreen() {
  const [showHelp, setShowHelp] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [hasSaves, setHasSaves] = useState(false);
  
  const { isAuthenticated, isGuest, user } = useAuthStore();
  const { start } = useGame();
  const { loadTracks, selectTrack, play, isLoaded } = useMusicPlayer();
  
  // Timer ref for auto-play
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track if user started the game to prevent auto-play
  const hasStartedGameRef = useRef(false);
  
  // Get player stats from stores
  const { 
    level, 
    experience, 
    rankTitle, 
    reputation,
    planetsVisited,
    totalMiningOperations,
    totalJumps
  } = usePlayer();
  const { credits } = useCredits();
  const { completedMissionIds } = usePlunderverseMissions();
  
  // Check for existing saves when authenticated
  useEffect(() => {
    const checkSaves = async () => {
      if (isAuthenticated && !isGuest) {
        try {
          const { saves } = await gameApi.listSaves();
          setHasSaves(saves && saves.length > 0);
        } catch (error) {
          console.error('Failed to check saves:', error);
        }
      }
    };
    checkSaves();
  }, [isAuthenticated, isGuest]);

  // Auto-play theme song after random delay
  useEffect(() => {
    // Load tracks when component mounts
    if (!isLoaded) {
      loadTracks();
    }

    // Set up auto-play timer (15-45 seconds)
    const setupAutoPlay = async () => {
      // Wait a bit to ensure tracks are loaded
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Random delay between 15 and 45 seconds
      const randomDelay = Math.random() * (45000 - 15000) + 15000;
      
      console.log(`[EnhancedSplashScreen] Setting up auto-play timer for ${Math.round(randomDelay / 1000)} seconds`);
      
      autoPlayTimerRef.current = setTimeout(() => {
        // Only play if user hasn't started the game yet
        if (!hasStartedGameRef.current) {
          console.log('[EnhancedSplashScreen] Auto-playing Plunderverse Theme');
          selectTrack(0); // Select first track (Plunderverse Theme)
          play(); // Play the selected track
        }
      }, randomDelay);
    };

    setupAutoPlay();

    // Cleanup timer on unmount
    return () => {
      if (autoPlayTimerRef.current) {
        console.log('[EnhancedSplashScreen] Clearing auto-play timer');
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, []); // Only run once on mount
  
  // Game screenshots for gallery
  const gameScreenshots: GalleryImage[] = [
    {
      src: "/textures/planets/2k_earth_daymap.jpg",
      alt: "Earth - The Cradle of Humanity",
      caption: "Visit Earth, now under corporate control, where the wealthy live in orbital stations while the surface struggles"
    },
    {
      src: "/textures/planets/2k_mars.jpg",
      alt: "Mars - The Red Frontier",
      caption: "Explore Mars' independent colonies, where outlaws find refuge from corporate law enforcement"
    },
    {
      src: "/textures/planets/2k_jupiter.jpg",
      alt: "Jupiter - The Gas Giant",
      caption: "Navigate Jupiter's dangerous radiation fields to reach its resource-rich moons"
    },
    {
      src: "/textures/planets/2k_saturn.jpg",
      alt: "Saturn - Ring Mining Operations",
      caption: "Raid Saturn's ring mining stations for valuable resources and contraband"
    },
    {
      src: "/textures/sky.png",
      alt: "Deep Space Navigation",
      caption: "Travel through the vast emptiness between planets, avoiding patrols and ambushes"
    },
    {
      src: "/textures/planets/2k_moon.jpg",
      alt: "Luna - Earth's Moon",
      caption: "Trade in Luna's underground markets, where anything can be bought for the right price"
    }
  ];
  
  // Community videos (placeholder data)
  const communityVideos = [
    {
      id: "1",
      title: "Epic Space Battle Compilation",
      thumbnail: "/textures/planets/2k_mars.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: "2", 
      title: "How to Build Your Outlaw Empire",
      thumbnail: "/textures/planets/2k_earth_daymap.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: "3",
      title: "Best Smuggling Routes Guide",
      thumbnail: "/textures/planets/2k_jupiter.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    {
      id: "4",
      title: "Faction Reputation Explained",
      thumbnail: "/textures/planets/2k_saturn.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
  ];

  // Slideshow content
  const slideContent = [
    {
      type: "feature",
      text: "🏴‍☠️ Live as a Space Outlaw in 2149",
      subtext: "Navigate the bankrupt solar system's criminal underworld",
    },
    {
      type: "feature",
      text: "⚖️ Choose Your Path: Hero or Villain",
      subtext: "Every decision shapes your reputation and destiny",
    },
    {
      type: "feature",
      text: "👥 Recruit Your Crew",
      subtext: "Hire pilots, mechanics, and gunners with unique skills",
    },
    {
      type: "feature",
      text: "🎯 Dynamic Mission System",
      subtext: "Smuggle contraband, mine resources, or hunt bounties",
    },
    {
      type: "reason",
      text: "🔥 Heat & Notoriety System",
      subtext: "Stay under the radar or become the most wanted",
    }
  ];

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideContent.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slideContent.length]);

  // Pre-calculate star configurations
  const starConfigs = useState(() =>
    Array.from({ length: 60 }, (_, i) => {
      const size = Math.random() * 4 + 0.5;
      const brightness = Math.random() * 0.9 + 0.3;
      const twinkleSpeed = Math.random() * 8 + 4;
      const color = Math.random() > 0.6
        ? Math.random() > 0.5 ? "#E6F3FF" : "#FFF8E1"
        : "#FFFFFF";
      const angle = Math.random() * Math.PI * 2;
      const distanceFromCenter = Math.pow(Math.random(), 0.4) * 0.8;
      const x = 50 + Math.cos(angle) * distanceFromCenter * 50;
      const y = 50 + Math.sin(angle) * distanceFromCenter * 50;
      const depth = Math.random() * 10 + 1;
      const edgeSpeed = distanceFromCenter * 10 + 1;
      const travelSpeed = Math.random() * 2000 + 10;
      const radialX = Math.cos(angle) * edgeSpeed * (depth + 2);
      const radialY = Math.sin(angle) * edgeSpeed * (depth + 2);
      return {
        size, brightness, twinkleSpeed, color, x, y, depth,
        edgeSpeed, travelSpeed, radialX, radialY, distanceFromCenter,
      };
    }),
  )[0];

  const { setAmbientMusic, setLaserSound, playAmbientMusic, stopAmbientMusic } = useAudio();

  // Initialize sounds
  useEffect(() => {
    const { soundEffects } = AUDIO_CONFIG;
    const ambientAudio = new Audio(soundEffects.ambient.path);
    ambientAudio.volume = soundEffects.ambient.volume;
    ambientAudio.loop = soundEffects.ambient.loop ?? false;
    setAmbientMusic(ambientAudio);
    const zapAudio = new Audio(soundEffects.zap.path);
    zapAudio.volume = soundEffects.zap.volume;
    setLaserSound(zapAudio);
    playAmbientMusic();
    return () => stopAmbientMusic();
  }, [setAmbientMusic, setLaserSound, playAmbientMusic, stopAmbientMusic]);

  const handleBeginJourney = () => {
    if (isAuthenticated || isGuest) {
      hasStartedGameRef.current = true;
      // Clear the timer immediately when user starts the game
      if (autoPlayTimerRef.current) {
        console.log('[EnhancedSplashScreen] User started game, clearing auto-play timer');
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      start();
    } else {
      setShowAuthScreen(true);
    }
  };

  const handlePlayAsGuest = () => {
    hasStartedGameRef.current = true;
    // Clear the timer immediately when user starts the game
    if (autoPlayTimerRef.current) {
      console.log('[EnhancedSplashScreen] User started game (guest), clearing auto-play timer');
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    useAuthStore.getState().playAsGuest();
    start();
  };

  // Show auth screen when requested
  if (showAuthScreen) {
    return <AuthScreen onBack={() => setShowAuthScreen(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50 overflow-hidden">
      {/* Player Stats Panel - Only show when authenticated */}
      {isAuthenticated && !isGuest && (
        <div className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-md border border-cyan-400/30 rounded-lg p-4 max-w-sm">
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-cyan-400/20">
            <div className="bg-cyan-400/10 p-2 rounded-full">
              <User className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-cyan-400 font-bold text-lg">
                {user?.username || 'Space Outlaw'}
              </h3>
              <p className="text-xs text-slate-400">{rankTitle || 'Space Drifter'}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-300 text-sm">Credits</span>
              </div>
              <span className="text-yellow-400 font-bold">{credits.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300 text-sm">Level</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400 font-bold">Lvl {level}</span>
                <span className="text-xs text-slate-500">({experience} XP)</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-400" />
                <span className="text-slate-300 text-sm">Missions</span>
              </div>
              <span className="text-green-400 font-bold">{completedMissionIds.size} completed</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-slate-300 text-sm">Planets Visited</span>
              </div>
              <span className="text-orange-400 font-bold">{planetsVisited.length}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300 text-sm">Total Jumps</span>
              </div>
              <span className="text-blue-400 font-bold">{totalJumps}</span>
            </div>
            
            {/* Faction Standings */}
            {reputation && (
              <div className="mt-3 pt-3 border-t border-cyan-400/20">
                <p className="text-xs text-slate-400 mb-2">Faction Standings</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Corporations</span>
                    <span className={reputation.corporations >= 0 ? "text-green-400" : "text-red-400"}>
                      {reputation.corporations > 0 ? '+' : ''}{reputation.corporations}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Independents</span>
                    <span className={reputation.independents >= 0 ? "text-green-400" : "text-red-400"}>
                      {reputation.independents > 0 ? '+' : ''}{reputation.independents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Outlaws</span>
                    <span className={reputation.outlaws >= 0 ? "text-green-400" : "text-red-400"}>
                      {reputation.outlaws > 0 ? '+' : ''}{reputation.outlaws}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Starfield background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0">
          {starConfigs.map((config, i) => (
            <div
              key={i}
              className="absolute rounded-full star-fisheye"
              style={{
                width: `${config.size}px`,
                height: `${config.size}px`,
                left: `${config.x}%`,
                top: `${config.y}%`,
                backgroundColor: config.color,
                opacity: config.brightness,
                boxShadow: `0 0 ${config.size * 3}px ${config.color}`,
                animationDuration: `${config.twinkleSpeed}s`,
                animationDelay: `${i * 0.2}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      {/* Custom animations */}
      <style>{`
        .star-fisheye {
          animation: starTwinkle linear infinite;
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.8); }
        }
      `}</style>

      <div className="relative z-10 text-center max-w-6xl px-8">
        {/* Main Title */}
        <div className="mb-4">
          <h1 className="text-6xl md:text-8xl font-bold text-orange-400 mb-4 tracking-wider">
            PLUNDERVERSE
            <span className="absolute -top-2 -right-4 text-sm text-yellow-400 rotate-12">2149</span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-light text-orange-300 tracking-wide italic">
            {isAuthenticated && !isGuest 
              ? `Welcome back, ${user?.username || 'Captain'}. Your crew awaits your command.`
              : "The Solar System is Bankrupt. Survival Means Breaking the Law."}
          </h2>
        </div>

        {/* Animated Slideshow */}
        <div className="mb-8 h-20">
          <div key={currentSlide} className={`slide-${slideContent[currentSlide].type} max-w-3xl mx-auto`}>
            <p className="text-2xl font-semibold mb-2">{slideContent[currentSlide].text}</p>
            <p className="text-lg text-slate-400">{slideContent[currentSlide].subtext}</p>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="mb-8">
          {isAuthenticated || isGuest ? (
            <button
              onClick={handleBeginJourney}
              className="bg-orange-500 hover:bg-orange-400 text-slate-900 font-bold py-4 px-12 rounded-xl text-xl 
                         transform transition-all duration-300 hover:scale-105 shadow-lg border-2 border-orange-600"
            >
              <Gamepad2 className="inline mr-2" />
              {hasSaves ? 'CONTINUE JOURNEY' : 'BEGIN YOUR JOURNEY'}
            </button>
          ) : (
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => setShowAuthScreen(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-4 px-8 rounded-xl text-lg 
                           transform transition-all duration-300 hover:scale-105 shadow-lg border-2 border-cyan-600"
              >
                <LogIn className="inline mr-2" size={20} />
                Login
              </button>
              <button
                onClick={() => setShowAuthScreen(true)}
                className="bg-orange-500 hover:bg-orange-400 text-slate-900 font-bold py-4 px-8 rounded-xl text-lg 
                           transform transition-all duration-300 hover:scale-105 shadow-lg border-2 border-orange-600"
              >
                <UserPlus className="inline mr-2" size={20} />
                Sign Up
              </button>
              <button
                onClick={handlePlayAsGuest}
                className="bg-slate-700 hover:bg-slate-600 text-orange-400 font-bold py-4 px-8 rounded-xl text-lg 
                           border-2 border-slate-600 hover:border-orange-400 transition-all duration-300 hover:scale-105"
              >
                <Star className="inline mr-2" size={20} />
                Play as Guest
              </button>
            </div>
          )}
        </div>

        {/* Media Showcase Buttons */}
        <div className="mb-8 flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => setShowTrailer(true)}
            className="bg-red-600/80 hover:bg-red-500 text-white font-semibold py-3 px-6 rounded-xl 
                       border border-red-500 transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <Play size={20} />
            Watch Trailer
          </button>
          <button
            onClick={() => setShowGallery(true)}
            className="bg-blue-600/80 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl 
                       border border-blue-500 transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <Image size={20} />
            Screenshots
          </button>
          <button
            onClick={() => setShowVideos(true)}
            className="bg-purple-600/80 hover:bg-purple-500 text-white font-semibold py-3 px-6 rounded-xl 
                       border border-purple-500 transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            <Video size={20} />
            Community Videos
          </button>
        </div>

        {/* Menu Buttons */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={() => setShowHelp(true)}
            className="bg-slate-700 hover:bg-slate-600 text-orange-400 font-semibold py-3 px-8 
                       rounded-xl border border-slate-600 hover:border-orange-400 transition-all duration-300"
          >
            📖 HANDBOOK
          </button>
        </div>

        {/* Version */}
        <p className="text-slate-500 text-sm">
          Plunderverse Alpha v0.8 - A Firefly-Inspired Space Outlaw Adventure
        </p>
        <p className="text-slate-600 text-xs mt-2">
          {isAuthenticated ? `Logged in as ${useAuthStore.getState().user?.username || 'Captain'}` : 'Not logged in'}
        </p>
      </div>

      {/* Video Trailer Modal */}
      {showTrailer && (
        <VideoModal
          isOpen={showTrailer}
          onClose={() => setShowTrailer(false)}
          videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="Plunderverse - Official Trailer"
        />
      )}

      {/* Screenshot Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowGallery(false)} />
          <div className="relative bg-slate-900/95 border border-cyan-400/30 rounded-lg p-8 max-w-6xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Game Screenshots</h2>
            <ImageGallery images={gameScreenshots} columns={3} />
            <button
              onClick={() => setShowGallery(false)}
              className="mt-6 bg-orange-500 hover:bg-orange-400 text-slate-900 font-semibold py-2 px-6 rounded-lg"
            >
              Close Gallery
            </button>
          </div>
        </div>
      )}

      {/* Community Videos Modal */}
      {showVideos && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowVideos(false)} />
          <div className="relative bg-slate-900/95 border border-cyan-400/30 rounded-lg p-8 max-w-5xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">Community Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityVideos.map(video => (
                <div 
                  key={video.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedVideo(video.url)}
                >
                  <div className="relative overflow-hidden rounded-lg bg-slate-800">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="text-white" size={48} />
                    </div>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-cyan-400">{video.title}</h3>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowVideos(false)}
              className="mt-6 bg-orange-500 hover:bg-orange-400 text-slate-900 font-semibold py-2 px-6 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Selected Video Modal */}
      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo}
          title="Community Video"
        />
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-orange-400 mb-6">Outlaw's Handbook</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-orange-400 mb-3">Ship Controls</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex justify-between items-center bg-slate-700 p-2 rounded-lg">
                    <span className="text-slate-300 text-sm">Ship Forward</span>
                    <kbd className="bg-slate-600 text-orange-400 px-2 py-1 rounded text-xs font-mono">W / ↑</kbd>
                  </div>
                  <div className="flex justify-between items-center bg-slate-700 p-2 rounded-lg">
                    <span className="text-slate-300 text-sm">Ship Backward</span>
                    <kbd className="bg-slate-600 text-orange-400 px-2 py-1 rounded text-xs font-mono">S / ↓</kbd>
                  </div>
                  <div className="flex justify-between items-center bg-slate-700 p-2 rounded-lg">
                    <span className="text-slate-300 text-sm">Fire Weapons</span>
                    <kbd className="bg-slate-600 text-orange-400 px-2 py-1 rounded text-xs font-mono">Space</kbd>
                  </div>
                  <div className="flex justify-between items-center bg-slate-700 p-2 rounded-lg">
                    <span className="text-slate-300 text-sm">Land/Dock</span>
                    <kbd className="bg-slate-600 text-orange-400 px-2 py-1 rounded text-xs font-mono">L</kbd>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-orange-400 mb-3">Survival Tips</h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>• Keep your heat low - high notoriety brings bounty hunters</li>
                  <li>• Manage fuel carefully - running out leaves you stranded</li>
                  <li>• Build faction reputation for better prices and missions</li>
                  <li>• Your choices have consequences - think before acting</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-orange-500 hover:bg-orange-400 text-slate-900 font-semibold py-2 rounded-lg"
            >
              Ready to Break the Law
            </button>
          </div>
        </div>
      )}

      {/* Music Player */}
      <div className="absolute bottom-4 right-4">
        <MusicPlayer />
      </div>
    </div>
  );
}