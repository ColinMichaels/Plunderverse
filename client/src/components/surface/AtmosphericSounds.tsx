import { useEffect, useRef, useState, useCallback } from "react";
import { Howl } from "howler";
import { useWind } from "../../lib/stores/surface/useWind";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useAudio } from "../../lib/stores/ui/useAudio";
import { ResourceManager } from "../../lib/utils/ResourceManager";
import { AUDIO_CONFIG } from "../../lib/audioConfig";

interface AtmosphericSoundsProps {
  planetName: string;
  stormActive?: boolean;
}

export function AtmosphericSounds({
  planetName,
  stormActive = false,
}: AtmosphericSoundsProps) {
  // Get the sound effects cache and volume from the audio store
  const { soundEffectsCache, sfxVolume, masterVolume } = useAudio();
  
  const { intensity: windIntensity } = useWind();
  const { time } = useSolarSystem();

  // Apply volume multiplication: sfxVolume × masterVolume with validation
  const rawSoundVolume = sfxVolume * masterVolume;
  const soundVolume = isFinite(rawSoundVolume) ? Math.max(0, Math.min(1, rawSoundVolume)) : 0;

  // Store references to active sounds
  const activeWindSoundRef = useRef<Howl | null>(null);
  const activeStormSoundRef = useRef<Howl | null>(null);
  const activeRainSoundRef = useRef<Howl | null>(null);
  
  // Store sound IDs for playing instances
  const windSoundIdRef = useRef<number | null>(null);
  const stormSoundIdRef = useRef<number | null>(null);
  const rainSoundIdRef = useRef<number | null>(null);
  
  // Timeouts for fade-outs
  const stormTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rainTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Resource Manager instance
  const resourceManager = ResourceManager.getInstance();
  
  // Create stable sound keys that don't change on every render
  const windSoundKey = `wind-${planetName}`;
  const stormSoundKey = `storm-${planetName}`;
  const rainSoundKey = `rain-${planetName}`;

  // Ensure windIntensity is a valid finite number
  const safeWindIntensity = isFinite(windIntensity) ? windIntensity : 0.5;

  // Rain decision - decided once on mount
  const [rainDecision] = useState(() => Math.random() > 0.7);

  // Calculate wind parameters based on planet
  const getWindParams = useCallback((planet: string, intensity: number) => {
    let shouldPlayWind = false;
    let windVolume = 0.3;
    let windRate = 1.0;  // Playback rate for pitch variation

    switch (planet) {
      case "Mars":
        shouldPlayWind = true;
        windVolume = 0.2 + intensity * 0.4;  // 0.2 to 0.6 range
        windRate = 0.8 + intensity * 0.4;    // Deeper sound for dust storms
        break;
      case "Venus":
        shouldPlayWind = true;
        windVolume = 0.15 + intensity * 0.1; // 0.15 to 0.25 - Muffled thick atmosphere
        windRate = 0.6;                      // Very low pitch for dense atmosphere
        break;
      case "Earth":
        shouldPlayWind = intensity > 0.2;
        windVolume = 0.1 + intensity * 0.3;  // 0.1 to 0.4 range
        windRate = 0.9 + intensity * 0.2;    // Natural wind sound
        break;
      case "Jupiter":
      case "Saturn":
      case "Neptune":
        shouldPlayWind = true;
        windVolume = 0.3 + intensity * 0.5;  // 0.3 to 0.8 - Strong winds
        windRate = 1.0 + intensity * 0.5;    // Higher pitch for fast winds
        break;
      case "Moon":
      case "Mercury":
        shouldPlayWind = false; // No atmosphere
        windVolume = 0;
        windRate = 1.0;
        break;
      default:
        shouldPlayWind = intensity > 0.3;
        windVolume = 0.15 + intensity * 0.25;
        windRate = 0.9 + intensity * 0.2;
        break;
    }

    return { shouldPlayWind, windVolume, windRate };
  }, []);

  // Initialize wind sound
  useEffect(() => {
    if (soundVolume === 0) return;

    const { shouldPlayWind, windVolume, windRate } = getWindParams(planetName, safeWindIntensity);

    const playWindSound = async () => {
      if (shouldPlayWind && !activeWindSoundRef.current) {
        try {
          // Get or load the sound from cache
          const windSound = await soundEffectsCache.getSound(windSoundKey, {
            path: AUDIO_CONFIG.soundEffects.wind.path,
            volume: windVolume * soundVolume,
            loop: true
          });
          
          activeWindSoundRef.current = windSound;
          
          // Set the rate to vary pitch with intensity
          const safeRate = Math.max(0.5, Math.min(2, windRate));
          windSound.rate(safeRate);
          
          // Play the sound and store the ID
          windSoundIdRef.current = windSound.play();
          
          // Register with ResourceManager
          resourceManager.registerAudio(
            windSoundKey,
            windSound,
            ["atmospheric-sounds", `planet-${planetName}-sounds`, "wind"],
          );
          
          console.log(`[AtmosphericSounds] Playing cached wind sound for ${planetName}`);
        } catch (error) {
          console.error(`[AtmosphericSounds] Failed to play wind sound:`, error);
        }
      }
    };

    // Update wind volume if already playing
    if (activeWindSoundRef.current && windSoundIdRef.current !== null) {
      const updateVolume = Math.max(0, Math.min(1, windVolume * soundVolume));
      activeWindSoundRef.current.volume(updateVolume);
    } else {
      playWindSound();
    }

    return () => {
      // Only stop and cleanup when planet changes
      if (activeWindSoundRef.current && windSoundIdRef.current !== null) {
        console.log(`[AtmosphericSounds] Stopping wind sound for ${planetName}`);
        activeWindSoundRef.current.stop(windSoundIdRef.current);
        windSoundIdRef.current = null;
        activeWindSoundRef.current = null;
        resourceManager.disposeResource(windSoundKey);
      }
    };
  }, [planetName, soundVolume]); // Remove windIntensity from dependencies to prevent re-runs

  // Update wind volume/rate separately when intensity changes
  useEffect(() => {
    if (activeWindSoundRef.current && windSoundIdRef.current !== null) {
      const { windVolume, windRate } = getWindParams(planetName, safeWindIntensity);
      const updateVolume = Math.max(0, Math.min(1, windVolume * soundVolume));
      activeWindSoundRef.current.volume(updateVolume);
      
      const safeRate = Math.max(0.5, Math.min(2, windRate));
      activeWindSoundRef.current.rate(safeRate);
    }
  }, [safeWindIntensity, planetName, soundVolume, getWindParams]);

  // Storm sounds
  useEffect(() => {
    if (soundVolume === 0) return;

    const playStormSound = async () => {
      if (stormActive && !activeStormSoundRef.current) {
        try {
          const stormVolume = Math.max(0, Math.min(1, 0.3 * soundVolume));  // Reduced from 0.6 to 0.3
          
          // Get or load the storm sound from cache
          const stormSound = await soundEffectsCache.getSound(stormSoundKey, {
            path: AUDIO_CONFIG.soundEffects.wind.path,
            volume: stormVolume,
            loop: true
          });
          
          activeStormSoundRef.current = stormSound;
          stormSound.rate(1.0); // Slow it down for rumbling effect
          
          // Play the sound and store the ID
          stormSoundIdRef.current = stormSound.play();
          
          // Register with ResourceManager
          resourceManager.registerAudio(
            stormSoundKey,
            stormSound,
            ["atmospheric-sounds", `planet-${planetName}-sounds`, "storm"],
          );
          
          console.log(`[AtmosphericSounds] Playing cached storm sound for ${planetName}`);
        } catch (error) {
          console.error(`[AtmosphericSounds] Failed to play storm sound:`, error);
        }
      } else if (!stormActive && activeStormSoundRef.current && stormSoundIdRef.current !== null) {
        // Clear any existing timeout
        if (stormTimeoutRef.current) {
          clearTimeout(stormTimeoutRef.current);
        }

        // Fade out and stop
        activeStormSoundRef.current.fade(activeStormSoundRef.current.volume(), 0, 2000);
        stormTimeoutRef.current = setTimeout(() => {
          if (activeStormSoundRef.current && stormSoundIdRef.current !== null) {
            console.log(`[AtmosphericSounds] Stopping storm sound for ${planetName}`);
            activeStormSoundRef.current.stop(stormSoundIdRef.current);
            stormSoundIdRef.current = null;
            activeStormSoundRef.current = null;
            resourceManager.disposeResource(stormSoundKey);
          }
          stormTimeoutRef.current = null;
        }, 2000);
      }
    };

    playStormSound();

    return () => {
      // Clear timeout on cleanup
      if (stormTimeoutRef.current) {
        clearTimeout(stormTimeoutRef.current);
        stormTimeoutRef.current = null;
      }
      if (activeStormSoundRef.current && stormSoundIdRef.current !== null) {
        console.log(`[AtmosphericSounds] Cleanup stopping storm sound for ${planetName}`);
        activeStormSoundRef.current.stop(stormSoundIdRef.current);
        stormSoundIdRef.current = null;
        activeStormSoundRef.current = null;
        resourceManager.disposeResource(stormSoundKey);
      }
    };
  }, [stormActive, planetName, soundVolume]); // Stable dependencies

  // Rain sounds for Earth
  useEffect(() => {
    if (soundVolume === 0) return;

    const timeOfDay = (time * 10) % 24;
    const isRaining =
      planetName === "Earth" &&
      rainDecision &&
      timeOfDay > 10 &&
      timeOfDay < 18;

    const playRainSound = async () => {
      if (isRaining && !activeRainSoundRef.current) {
        try {
          const rainVolume = Math.max(0, Math.min(1, 0.2 * soundVolume));
          
          // Get or load the rain sound from cache
          const rainSound = await soundEffectsCache.getSound(rainSoundKey, {
            path: AUDIO_CONFIG.soundEffects.rain.path,
            volume: rainVolume,
            loop: true
          });
          
          activeRainSoundRef.current = rainSound;
          rainSound.rate(1.0);
          
          // Play the sound and store the ID
          rainSoundIdRef.current = rainSound.play();
          
          // Register with ResourceManager
          resourceManager.registerAudio(
            rainSoundKey,
            rainSound,
            ["atmospheric-sounds", `planet-${planetName}-sounds`, "rain"],
          );
          
          console.log(`[AtmosphericSounds] Playing cached rain sound for Earth`);
        } catch (error) {
          console.error(`[AtmosphericSounds] Failed to play rain sound:`, error);
        }
      } else if (!isRaining && activeRainSoundRef.current && rainSoundIdRef.current !== null) {
        // Clear any existing timeout
        if (rainTimeoutRef.current) {
          clearTimeout(rainTimeoutRef.current);
        }

        // Fade out and stop
        activeRainSoundRef.current.fade(activeRainSoundRef.current.volume(), 0, 3000);
        rainTimeoutRef.current = setTimeout(() => {
          if (activeRainSoundRef.current && rainSoundIdRef.current !== null) {
            console.log(`[AtmosphericSounds] Stopping rain sound for ${planetName}`);
            activeRainSoundRef.current.stop(rainSoundIdRef.current);
            rainSoundIdRef.current = null;
            activeRainSoundRef.current = null;
            resourceManager.disposeResource(rainSoundKey);
          }
          rainTimeoutRef.current = null;
        }, 3000);
      }
    };

    playRainSound();

    return () => {
      // Clear timeout on cleanup
      if (rainTimeoutRef.current) {
        clearTimeout(rainTimeoutRef.current);
        rainTimeoutRef.current = null;
      }
      if (activeRainSoundRef.current && rainSoundIdRef.current !== null) {
        console.log(`[AtmosphericSounds] Cleanup stopping rain sound for ${planetName}`);
        activeRainSoundRef.current.stop(rainSoundIdRef.current);
        rainSoundIdRef.current = null;
        activeRainSoundRef.current = null;
        resourceManager.disposeResource(rainSoundKey);
      }
    };
  }, [planetName, time, soundVolume, rainDecision]); // Add rainDecision to dependencies

  // Cleanup all atmospheric sounds when component unmounts
  useEffect(() => {
    console.log(
      `[AtmosphericSounds] Initializing atmospheric sounds for planet: ${planetName}`,
    );

    return () => {
      console.log(
        `[AtmosphericSounds] Cleaning up all atmospheric sounds for planet: ${planetName}`,
      );
      
      // Stop all active sounds
      if (activeWindSoundRef.current && windSoundIdRef.current !== null) {
        activeWindSoundRef.current.stop(windSoundIdRef.current);
      }
      if (activeStormSoundRef.current && stormSoundIdRef.current !== null) {
        activeStormSoundRef.current.stop(stormSoundIdRef.current);
      }
      if (activeRainSoundRef.current && rainSoundIdRef.current !== null) {
        activeRainSoundRef.current.stop(rainSoundIdRef.current);
      }
      
      // Dispose all resources tagged with atmospheric-sounds
      resourceManager.disposeByTag("atmospheric-sounds");
      resourceManager.disposeByTag(`planet-${planetName}-sounds`);
    };
  }, [planetName]);

  return null; // This component only handles sound, no visual output
}