import { useState, useEffect, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
} from "@react-three/postprocessing";
import { WebGLCheckWrapper } from "../shared/WebGLCheckWrapper";
import { useGame } from "../../lib/stores/ui/useGame";
import { useAuthStore } from "../../lib/stores/auth/useAuthStore";
import { usePlayer } from "../../lib/stores/player/usePlayer";
import { useCredits } from "../../lib/stores/economy/useCredits";
import { usePlunderverseMissions } from "../../lib/stores/economy/usePlunderverseMissions";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { useMusicPlayer } from "../../lib/stores/ui/useMusicPlayer";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useLandedState } from "../../lib/stores/surface/useLandedState";
import { MusicPlayer } from "./MusicPlayer";
import { VideoModal } from "../shared/VideoModal";
import { ImageGallery, GalleryImage } from "../shared/ImageGallery";
import { AuthScreen } from "../auth/AuthScreen";
import { GameTransitionOverlay } from "./GameTransitionOverlay";
import { HandbookContent } from "./HandbookContent";
import { gameApi } from "../../services/gameApi";
import { restoreGameState } from "../../utils/saveGame";
import { AUDIO_CONFIG } from "../../lib/audioConfig";
import { SolarSystemBackground } from "../space/SolarSystemBackground";
import { SplashSolarSystem } from "../space/SplashSolarSystem";
import {
  Play,
  Image,
  Video,
  LogIn,
  UserPlus,
  Gamepad2,
  Star,
  User,
  Coins,
  MapPin,
  Sparkles,
  Award,
  Target,
  ChevronDown,
  ChevronUp,
  Github,
  AlertCircle,
  Camera,
  X,
} from "lucide-react";

export function EnhancedSplashScreen() {
  const [showHelp, setShowHelp] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [useFullSystem] = useState(true); // Enable full system for better preloading
  const [showTrailer, setShowTrailer] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [hasSaves, setHasSaves] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStatus, setTransitionStatus] = useState("");
  const [transitionSubtitle, setTransitionSubtitle] = useState("");
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [showCanvas, setShowCanvas] = useState(true); // Control Canvas visibility
  const [cameraMode, setCameraMode] = useState<"simple" | "cinematic">(
    "cinematic",
  ); // Camera mode toggle
  const [showDevelopmentNotice, setShowDevelopmentNotice] = useState(true); // Control dev notice visibility
  const [showAccountMenu, setShowAccountMenu] = useState(false); // User account dropdown menu
  const [showCinematicMenu, setShowCinematicMenu] = useState(false); // Cinematic sequence dropdown
  const [selectedSequence, setSelectedSequence] = useState(0); // Selected cinematic sequence index

  const { isAuthenticated, isGuest, user, logout } = useAuthStore();
  const { start } = useGame();
  const { setSelectedPlanet } = useSolarSystem();
  const { setLanded } = useLandedState();
  // Removed music player hooks since MusicPlayer component handles its own state

  // Track if user started the game
  const hasStartedGameRef = useRef(false);

  const gameVersion = "v0.8";

  // Cinematic sequence options
  const cinematicSequences = [
    { name: "Mars Flyby", description: "Epic Mars flyby" },
    { name: "Jupiter Orbital Cruise", description: "Cruise around Jupiter" },
    {
      name: "Saturn Dramatic Approach",
      description: "Dramatic approach to Saturn",
    },
    { name: "System Overview", description: "Overview of inner solar system" },
    { name: "Sun Skim", description: "Close sun skim" },
    { name: "Venus to Earth", description: "Venus to Earth transition" },
    { name: "Neptune Flyby", description: "Neptune distant view" },
    { name: "Mercury Fast Pass", description: "Mercury fast pass" },
    { name: "Earth Orbital Cruise", description: "Earth orbital cruise" },
    { name: "System Pullback", description: "Cinematic system pullback" },
  ];

  // Get player stats from stores
  const {
    level,
    experience,
    rankTitle,
    reputation,
    planetsVisited,
    totalJumps,
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
          console.error("Failed to check saves:", error);
        }
      }
    };
    checkSaves();
  }, [isAuthenticated, isGuest]);

  // Note: Removed auto-play logic since MusicPlayer component handles its own initialization
  // This prevents duplicate music playing from both the splash screen and MusicPlayer component
  // The MusicPlayer component below will handle all music playback

  // Game screenshots for gallery
  const gameScreenshots: GalleryImage[] = [
    {
      src: "/screenshots/Screenshot 2025-10-01 at 10.55.04 AM.jpg",
      alt: "Plunderverse Space Combat",
      caption:
        "Engage in thrilling space battles as you navigate the dangerous solar system",
    },
    {
      src: "/screenshots/Screenshot 2025-10-02 at 1.27.37 AM.jpg",
      alt: "Plunderverse Planetary View",
      caption: "Explore diverse planets and moons throughout the solar system",
    },
    {
      src: "/textures/planets/2k_earth_daymap.jpg",
      alt: "Earth - The Cradle of Humanity",
      caption:
        "Visit Earth, now under corporate control, where the wealthy live in orbital stations while the surface struggles",
    },
    {
      src: "/textures/planets/2k_mars.jpg",
      alt: "Mars - The Red Frontier",
      caption:
        "Explore Mars' independent colonies, where outlaws find refuge from corporate law enforcement",
    },
    {
      src: "/textures/planets/2k_jupiter.jpg",
      alt: "Jupiter - The Gas Giant",
      caption:
        "Navigate Jupiter's dangerous radiation fields to reach its resource-rich moons",
    },
    {
      src: "/textures/planets/2k_saturn.jpg",
      alt: "Saturn - Ring Mining Operations",
      caption:
        "Raid Saturn's ring mining stations for valuable resources and contraband",
    },
  ];

  // Community videos (placeholder data)
  const communityVideos = [
    {
      id: "1",
      title: "Epic Space Battle Compilation",
      thumbnail: "/textures/planets/2k_mars.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    {
      id: "2",
      title: "How to Build Your Outlaw Empire",
      thumbnail: "/textures/planets/2k_earth_daymap.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    {
      id: "3",
      title: "Best Smuggling Routes Guide",
      thumbnail: "/textures/planets/2k_jupiter.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    {
      id: "4",
      title: "Faction Reputation Explained",
      thumbnail: "/textures/planets/2k_saturn.jpg",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
  ];

  // Slideshow content
  const slideContent = [
    {
      type: "feature",
      text: "Live as a Space Outlaw in 2149",
      subtext: "Navigate the bankrupt solar system's criminal underworld",
    },
    {
      type: "feature",
      text: "Choose Your Path: Hero or Villain",
      subtext: "Every decision shapes your reputation and destiny",
    },
    {
      type: "feature",
      text: "Recruit Your Crew",
      subtext: "Hire pilots, mechanics, and gunners with unique skills",
    },
    {
      type: "feature",
      text: "Dynamic Mission System",
      subtext: "Smuggle contraband, mine resources, or hunt bounties",
    },
    {
      type: "reason",
      text: "Heat & Notoriety System",
      subtext: "Stay under the radar or become the most wanted",
    },
  ];

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideContent.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slideContent.length]);

  const { setAmbientMusic, setLaserSound, playAmbientMusic, stopAmbientMusic } =
    useAudio();

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

  // Function to fade out music smoothly
  const fadeOutMusic = async () => {
    const player = useMusicPlayer.getState();
    const currentTrack = player.getCurrentTrack();

    if (currentTrack?.audio && player.isPlaying) {
      console.log("[EnhancedSplashScreen] Starting music fade-out...");

      const fadeOutDuration = 1500; // 1.5 seconds for smooth fade
      const fadeOutSteps = 30; // 30 steps for smooth fade
      const stepDuration = fadeOutDuration / fadeOutSteps;
      const currentVolume = player.volume;
      const volumeStep = currentVolume / fadeOutSteps;

      // Gradually reduce volume
      for (let i = 0; i < fadeOutSteps; i++) {
        const newVolume = currentVolume - volumeStep * (i + 1);
        player.setVolume(Math.max(0, newVolume));
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }

      // Pause and cleanup after fade completes
      player.pause();
      player.cleanup();
      console.log("[EnhancedSplashScreen] Music fade-out complete");

      // Reset volume for next time music plays
      player.setVolume(currentVolume);
    }
  };

  const handleBeginJourney = async () => {
    if (isAuthenticated || isGuest) {
      hasStartedGameRef.current = true;

      // Fade out music smoothly before transition
      await fadeOutMusic();

      // Hide canvas before transition to prevent WebGL context conflicts
      setShowCanvas(false);

      // Wait a moment for WebGL context to be properly disposed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start transition
      setIsTransitioning(true);
      setTransitionStatus("Initializing Systems");
      setTransitionSubtitle("Preparing your ship for departure...");
      setTransitionProgress(10);

      try {
        // Check for saved game
        let savedLocation: string | null = null;
        let isLanded = false;

        if (isAuthenticated && !isGuest) {
          setTransitionStatus("Loading Your Ship");
          setTransitionSubtitle("Retrieving saved position...");
          setTransitionProgress(30);

          try {
            const latestSave = await gameApi.getLatestSave();
            if (latestSave) {
              console.log(
                "[EnhancedSplashScreen] Found saved game, loading state...",
              );

              setTransitionStatus("Restoring Ship Systems");
              setTransitionSubtitle("Loading your saved progress...");
              setTransitionProgress(50);

              // Restore the game state
              await restoreGameState(latestSave);

              // Get the saved location from the restored state
              savedLocation = latestSave.location || null;

              // Check if player was landed on a planet
              if (savedLocation && savedLocation !== "Space") {
                isLanded = true;
                setTransitionStatus("Approaching " + savedLocation);
                setTransitionSubtitle("Preparing landing sequence...");
              } else {
                setTransitionStatus("Returning to Deep Space");
                setTransitionSubtitle("Navigation systems online...");
              }

              setTransitionProgress(70);
            }
          } catch (error) {
            console.error("[EnhancedSplashScreen] Error loading save:", error);
            // Continue with new game if save fails
          }
        }

        // If no saved location or new player, default to Earth
        if (!savedLocation) {
          savedLocation = "Earth";
          isLanded = false; // Start in space view of Earth
          setTransitionStatus("Approaching Earth");
          setTransitionSubtitle("Welcome to the Plunderverse, Captain...");
          setTransitionProgress(70);
        }

        // Simulate loading time for cinematic effect
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setTransitionStatus("Systems Online");
        setTransitionSubtitle("Ready for adventure!");
        setTransitionProgress(90);

        // Set the appropriate game state based on saved location
        if (savedLocation !== "Space") {
          setSelectedPlanet(savedLocation);
        }

        if (isLanded) {
          setLanded(savedLocation);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTransitionProgress(100);

        // Short delay before starting the game
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Start the game - this will trigger the phase change
        start();
      } catch (error) {
        console.error("[EnhancedSplashScreen] Error during transition:", error);
        // Fallback to just starting the game
        setIsTransitioning(false);
        start();
      }
    } else {
      setShowAuthScreen(true);
    }
  };

  const handlePlayAsGuest = async () => {
    hasStartedGameRef.current = true;

    useAuthStore.getState().playAsGuest();

    // Fade out music smoothly before transition
    await fadeOutMusic();

    // Hide canvas before transition to prevent WebGL context conflicts
    setShowCanvas(false);

    // Wait a moment for WebGL context to be properly disposed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start transition for guest player
    setIsTransitioning(true);
    setTransitionStatus("Initializing Systems");
    setTransitionSubtitle("Preparing your ship for departure...");
    setTransitionProgress(10);

    try {
      // Simulate loading time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTransitionStatus("Approaching Earth");
      setTransitionSubtitle("Welcome to the Plunderverse, Captain...");
      setTransitionProgress(50);

      // Set default starting position for guest
      setSelectedPlanet("Earth");

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setTransitionStatus("Systems Online");
      setTransitionSubtitle("Ready for adventure!");
      setTransitionProgress(90);

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTransitionProgress(100);

      // Short delay before starting the game
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Start the game
      start();
    } catch (error) {
      console.error(
        "[EnhancedSplashScreen] Error during guest transition:",
        error,
      );
      // Fallback to just starting the game
      setIsTransitioning(false);
      start();
    }
  };

  // Show auth screen when requested
  if (showAuthScreen) {
    return <AuthScreen onClose={() => setShowAuthScreen(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50 overflow-hidden">
      {/* 3D Solar System Background - Only render when not transitioning */}
      {showCanvas && (
        <div className="absolute inset-0 z-0">
          <WebGLCheckWrapper
            fallbackMessage="WebGL is required for the 3D background. You can still access the game menu."
            showNavigation={false}
          >
            <Canvas
              camera={{ position: [30, 10, 30], fov: 75 }}
              style={{ background: "#000" }}
              gl={{
                antialias: true,
                powerPreference: "high-performance",
                preserveDrawingBuffer: false,
                failIfMajorPerformanceCaveat: false,
              }}
            >
              <Suspense fallback={null}>
                {/* Use full solar system for better preloading if enabled */}
                {useFullSystem ? (
                  <SplashSolarSystem
                    useFullComponents={true}
                    cameraMode={cameraMode}
                    selectedSequenceIndex={selectedSequence}
                  />
                ) : (
                  <SolarSystemBackground />
                )}
                {/* Post-processing effects for sun glow and depth */}
                <EffectComposer>
                  <Bloom
                    intensity={2.5}
                    luminanceThreshold={0.4}
                    luminanceSmoothing={0.9}
                    radius={0.95}
                    levels={8}
                    mipmapBlur={true}
                  />
                  <DepthOfField
                    focusDistance={0.01}
                    focalLength={0.02}
                    bokehScale={4}
                    height={480}
                  />
                  <Vignette offset={0.3} darkness={0.4} />
                </EffectComposer>
              </Suspense>
            </Canvas>
          </WebGLCheckWrapper>
        </div>
      )}

      {/* Very light overlay for depth - minimal opacity to show more background */}
      <div className="absolute inset-0 z-10" />

      {/* Compact Player Stats Widget - Only show when authenticated */}
      {isAuthenticated && !isGuest && (
        <div
          className="absolute top-6 right-6 z-30 transition-all duration-300 ease-in-out"
          onMouseEnter={() => setIsStatsExpanded(true)}
          onMouseLeave={() => setIsStatsExpanded(false)}
          onClick={() => setIsStatsExpanded(true)}
        >
          {/* Minimized View - Always visible */}
          <div
            className={`bg-black/30 border border-cyan-400/20 rounded-lg px-3 py-2 
                          transition-all duration-300 ${isStatsExpanded ? "opacity-0 pointer-events-none" : "opacity-100"}`}
          >
            <div className="flex items-center gap-3">
              <div className="bg-cyan-400/10 p-1.5 rounded-full">
                <User className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-cyan-400 text-sm font-semibold">
                  {user?.username || "Captain"}
                </span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-purple-300">Lvl {level}</span>
                  <span className="text-yellow-300">
                    {credits.toLocaleString()} ₢
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3 h-3 text-cyan-400/50 ml-2" />
            </div>

            {/* Quick Faction Indicators */}
            {reputation && (
              <div className="flex gap-2 mt-1.5 ml-8">
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${reputation.corporations >= 0 ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <span className="text-[10px] text-slate-400">Corp</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${reputation.independents >= 0 ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <span className="text-[10px] text-slate-400">Indie</span>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${reputation.outlaws >= 0 ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <span className="text-[10px] text-slate-400">Outlaw</span>
                </div>
              </div>
            )}
          </div>

          {/* Expanded View - Shown on hover */}
          <div
            className={`absolute top-0 right-0 bg-black/50 border border-cyan-400/30 
                          rounded-lg p-3 min-w-[280px] transition-all duration-300 transform origin-top-right
                          ${isStatsExpanded ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-400/20">
              {/* User Account Menu - Top Right */}
              {(isAuthenticated || isGuest) && (
                <div className="relative">
                  {/* Dropdown Menu */}

                  <div
                    className="mt-2 w-56 bg-black/90 backdrop-blur-sm border border-cyan-400/30 
                                    rounded-lg shadow-xl overflow-hidden"
                  >
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-cyan-400/20 bg-cyan-400/5">
                      <p className="text-xs text-cyan-400/70 uppercase tracking-wide mb-1">
                        {isGuest ? "Guest Mode" : "Signed In As"}
                      </p>
                      <p className="text-sm font-medium text-cyan-300">
                        {isGuest
                          ? "Playing as Guest"
                          : user?.email || "Unknown"}
                      </p>
                    </div>

                    {/* Menu Options */}
                    <div className="py-1">
                      <button
                        onClick={async () => {
                          setShowAccountMenu(false);
                          await logout();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 
                                     hover:text-red-300 transition-colors flex items-center gap-2"
                      >
                        <LogIn className="w-4 h-4 rotate-180" />
                        {isGuest ? "Exit Guest Mode" : "Logout"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* User Stats  panel*/}

              <div className="bg-cyan-400/10 p-1.5 rounded-full">
                <User className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-cyan-400 font-bold text-sm">
                  {user?.username || "Space Outlaw"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {rankTitle || "Space Drifter"}
                </p>
              </div>
              <ChevronUp className="w-3 h-3 text-cyan-400/50 ml-auto" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className="text-slate-300 text-xs">Credits</span>
                </div>
                <span className="text-yellow-400 font-semibold text-xs">
                  {credits.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3 h-3 text-purple-400" />
                  <span className="text-slate-300 text-xs">Level</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-400 font-semibold text-xs">
                    Lvl {level}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({experience} XP)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-green-400" />
                  <span className="text-slate-300 text-xs">Missions</span>
                </div>
                <span className="text-green-400 font-semibold text-xs">
                  {completedMissionIds.size}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  <span className="text-slate-300 text-xs">Planets</span>
                </div>
                <span className="text-orange-400 font-semibold text-xs">
                  {planetsVisited.length}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span className="text-slate-300 text-xs">Jumps</span>
                </div>
                <span className="text-blue-400 font-semibold text-xs">
                  {totalJumps}
                </span>
              </div>

              {/* Faction Standings */}
              {reputation && (
                <div className="mt-2 pt-2 border-t border-cyan-400/20">
                  <p className="text-[10px] text-slate-400 mb-1">
                    Faction Standings
                  </p>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Corporations</span>
                      <span
                        className={
                          reputation.corporations >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {reputation.corporations > 0 ? "+" : ""}
                        {reputation.corporations}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Independents</span>
                      <span
                        className={
                          reputation.independents >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {reputation.independents > 0 ? "+" : ""}
                        {reputation.independents}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Outlaws</span>
                      <span
                        className={
                          reputation.outlaws >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {reputation.outlaws > 0 ? "+" : ""}
                        {reputation.outlaws}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-20 text-center max-w-6xl px-8 bg-black/30 rounded-2xl p-12 border border-white/10">
        {/* Main Title */}
        <div className="mb-4">
          <div className="relative inline-block mb-4">
            <img
              src="/media/Plunderverse_logo.png"
              alt="Plunderverse - Space Outlaw Adventure Game"
              className="w-auto h-48 md:h-64 lg:h-72 object-contain drop-shadow-[0_0_30px_rgba(251,146,60,0.6)]"
            />
            <span className="absolute -top-2 -right-4 text-sm text-yellow-400 rotate-12 font-bold">
              2149
            </span>
            {/* BETA Badge - Prominent and animated */}
            <div className="absolute -top-6 -left-8 md:-top-8 md:-left-10 transform -rotate-12 animate-pulse">
              <div className="relative">
                <div
                  className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 px-6 py-3 md:px-8 md:py-4 
                                rounded-xl shadow-2xl border-4 border-amber-400
                                drop-shadow-[0_0_25px_rgba(251,146,60,0.8)]"
                >
                  <span
                    className="text-white font-black text-2xl md:text-3xl lg:text-4xl tracking-wider
                                   drop-shadow-[2px_2px_4px_rgba(0,0,0,0.8)]"
                  >
                    BETA
                  </span>
                </div>
                {/* Decorative corner ribbons */}
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-orange-700 transform rotate-45"></div>
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-orange-700 transform rotate-45"></div>
                {/* Glowing effect animation */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 
                                rounded-xl opacity-50 blur-md animate-ping"
                ></div>
              </div>
            </div>
            {/* Additional BETA warning text */}
            <div
              className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-xs 
                            bg-orange-900/80 px-4 py-1 rounded-full border border-orange-500/50"
            >
              <span className="text-orange-300 text-xs md:text-base font-semibold uppercase tracking-wide">
                Early Access
              </span>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-light text-orange-300 tracking-wide italic mt-12">
            {isAuthenticated && !isGuest
              ? `Welcome back, ${user?.username || "Captain"}.`
              : "The Solar System is Bankrupt. Survival Means Breaking the Law."}
          </h2>
        </div>

        {/* Animated Slideshow */}
        <div className="mb-8 h-20">
          <div
            key={currentSlide}
            className={`slide-${slideContent[currentSlide].type} max-w-3xl mx-auto`}
          >
            <p className="text-2xl text-white/60 font-semibold mb-2">
              {slideContent[currentSlide].text}
            </p>
            <p className="text-lg text-slate-400">
              {slideContent[currentSlide].subtext}
            </p>
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
              {hasSaves ? "CONTINUE JOURNEY" : "BEGIN YOUR JOURNEY"}
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
          Plunderverse Alpha {gameVersion} - Space Outlaw Adventure
        </p>
        <p className="text-slate-600 text-xs mt-2">
          {isAuthenticated
            ? `Logged in as ${useAuthStore.getState().user?.username || "Captain"}`
            : "Not logged in"}
        </p>
      </div>

      {/* Video Trailer Modal */}
      {showTrailer && (
        <VideoModal
          isOpen={showTrailer}
          onClose={() => setShowTrailer(false)}
          videoUrl="https://www.youtube.com/embed/flJzsWREAuc"
          title="Plunderverse - Official Trailer"
        />
      )}

      {/* Screenshot Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setShowGallery(false)}
          />
          <div className="relative bg-slate-900/95 border border-cyan-400/30 rounded-lg p-8 max-w-6xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">
              Game Screenshots
            </h2>
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
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setShowVideos(false)}
          />
          <div className="relative bg-slate-900/95 border border-cyan-400/30 rounded-lg p-8 max-w-5xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-cyan-400 mb-6">
              Community Videos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityVideos.map((video) => (
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
                  <h3 className="mt-2 text-lg font-semibold text-cyan-400">
                    {video.title}
                  </h3>
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
          <div className="bg-slate-800 border border-amber-400/30 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <style>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(251, 146, 60, 0.4);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(251, 146, 60, 0.6);
              }
            `}</style>

            {/* Modal Header */}
            <h2 className="text-2xl font-bold text-amber-400 mb-4 flex items-center">
              <Gamepad2 className="w-6 h-6 mr-2" />
              Plunderverse Handbook
            </h2>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
              <HandbookContent />
            </div>

            {/* Close Button - Fixed at bottom */}
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-lg
                         transform transition-all duration-200 hover:scale-105 shadow-lg flex-shrink-0"
            >
              Ready to Break the Law
            </button>
          </div>
        </div>
      )}

      {/* Development Disclaimer */}
      {showDevelopmentNotice && (
        <div className="absolute bottom-4 left-4 z-30 max-w-md">
          <div className="bg-black/60 backdrop-blur-sm border border-amber-400/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="text-amber-400 text-sm font-semibold flex items-center justify-between">
                  <span>Development Build</span>
                  <button
                    onClick={() => setShowDevelopmentNotice(false)}
                    className="ml-2 p-1 rounded hover:bg-amber-400/20 transition-colors"
                    aria-label="Close development notice"
                  >
                    <X className="w-4 h-4 text-amber-400" />
                  </button>
                </h4>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>
                    This game is still in active development and not ready for
                    full release.
                  </p>
                  <p>Expect tons of bugs, glitches, and unfinished features.</p>
                  <p>
                    We're actively looking for developers to help build this
                    game!
                  </p>
                  <p className="pt-1">
                    <span>Join the development on </span>
                    <a
                      href="https://github.com/plunderverse/game"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 
                                 underline underline-offset-2 transition-colors"
                    >
                      <Github className="w-3 h-3" />
                      <span>GitHub</span>
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right Controls - Music Player and Camera Controls */}
      <div className="absolute bottom-4 right-4 z-30 flex items-end gap-3">
        {/* Cinematic Sequence Selector - Only show when in cinematic mode */}
        {cameraMode === "cinematic" && (
          <div className="relative">
            {/* Sequence Selector Button */}
            <button
              onClick={() => setShowCinematicMenu(!showCinematicMenu)}
              className="bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg px-3 py-2
                         hover:bg-black/80 hover:border-cyan-400/50 transition-all duration-300 group"
              title="Select cinematic sequence"
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                <span className="text-sm text-cyan-400 group-hover:text-cyan-300 font-medium">
                  Scene {selectedSequence + 1}
                </span>
                <ChevronUp
                  className={`w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-transform duration-200 ${showCinematicMenu ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {/* Dropdown Menu - Opens upward */}
            {showCinematicMenu && (
              <div
                className="absolute bottom-full right-0 mb-2 w-64 bg-black/90 backdrop-blur-sm border border-cyan-400/30 
                              rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto"
              >
                {/* Menu Header */}
                <div className="px-4 py-3 border-b border-cyan-400/20 bg-cyan-400/5 sticky top-0">
                  <p className="text-xs text-cyan-400/70 uppercase tracking-wide">
                    Cinematic Sequences
                  </p>
                </div>

                {/* Sequence Options */}
                <div className="py-1">
                  {cinematicSequences.map((sequence, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedSequence(index);
                        setShowCinematicMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-start gap-3
                                 ${
                                   selectedSequence === index
                                     ? "bg-cyan-400/20 text-cyan-200 border-l-2 border-cyan-400"
                                     : "text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200"
                                 }`}
                    >
                      <span className="text-xs text-cyan-400/70 font-mono mt-0.5 min-w-[1.5rem]">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{sequence.name}</p>
                        <p className="text-xs text-cyan-400/60 mt-0.5">
                          {sequence.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Camera Mode Toggle */}
        <button
          onClick={() =>
            setCameraMode(cameraMode === "cinematic" ? "simple" : "cinematic")
          }
          className="bg-black/60 backdrop-blur-sm border border-cyan-400/30 rounded-lg px-3 py-2
                     hover:bg-black/80 hover:border-cyan-400/50 transition-all duration-300 group"
          title={`Switch to ${cameraMode === "cinematic" ? "Simple" : "Cinematic"} camera`}
        >
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
            <span className="text-sm text-cyan-400 group-hover:text-cyan-300 font-medium">
              {cameraMode === "cinematic" ? "Cinematic" : "Simple"}
            </span>
          </div>
        </button>

        {/* Music Player */}
        <MusicPlayer />
      </div>

      {/* Game Transition Overlay */}
      <GameTransitionOverlay
        isVisible={isTransitioning}
        status={transitionStatus}
        subtitle={transitionSubtitle}
        progress={transitionProgress}
      />
    </div>
  );
}
