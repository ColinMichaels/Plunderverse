import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import { useWind } from "../../lib/stores/surface/useWind";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { ResourceManager } from "../../lib/utils/ResourceManager";

interface AtmosphericSoundsProps {
  planetName: string;
  stormActive?: boolean;
}

export function AtmosphericSounds({ planetName, stormActive = false }: AtmosphericSoundsProps) {
  // TODO: Add soundVolume to Settings when audio settings are implemented
  let rawSoundVolume = 0.5; // Default volume for now
  const { intensity: windIntensity } = useWind();
  const { time } = useSolarSystem();
  
  // Ensure soundVolume is always a valid finite number
  const soundVolume = isFinite(rawSoundVolume) ? rawSoundVolume : 0.5;
  
  const windSoundRef = useRef<Howl | null>(null);
  const stormSoundRef = useRef<Howl | null>(null);
  const rainSoundRef = useRef<Howl | null>(null);
  const stormTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rainTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Resource Manager instance
  const resourceManager = ResourceManager.getInstance();
  const windSoundIdRef = useRef<string>(`wind-sound-${planetName}-${Date.now()}`);
  const stormSoundIdRef = useRef<string>(`storm-sound-${planetName}-${Date.now()}`);
  const rainSoundIdRef = useRef<string>(`rain-sound-${planetName}-${Date.now()}`);
  
  // Ensure windIntensity is a valid finite number
  const safeWindIntensity = (isFinite(windIntensity) ? windIntensity : 0.5);
  
  // Initialize wind sound
  useEffect(() => {
    if (soundVolume === 0) return;
    
    // Different wind sounds based on planet
    let shouldPlayWind = false;
    let windVolume = 0.3;
    
    switch (planetName) {
      case "Mars":
        shouldPlayWind = true;
        windVolume = 0.4 + safeWindIntensity * 0.3;
        break;
      case "Venus":
        shouldPlayWind = true;
        windVolume = 0.2; // Muffled due to thick atmosphere
        break;
      case "Earth":
        shouldPlayWind = safeWindIntensity > 0.3;
        windVolume = 0.2 + safeWindIntensity * 0.2;
        break;
      case "Jupiter":
      case "Saturn":
      case "Neptune":
        shouldPlayWind = true;
        windVolume = 0.5 + safeWindIntensity * 0.4; // Strong winds
        break;
      case "Moon":
      case "Mercury":
        shouldPlayWind = false; // No atmosphere
        break;
    }
    
    if (shouldPlayWind && !windSoundRef.current) {
      // Create a wind sound using the space ambience as a base
      // Ensure all values are finite
      const safeVolume = isFinite(windVolume * soundVolume) ? windVolume * soundVolume : 0.3;
      const safeRate = isFinite(0.5 + safeWindIntensity * 0.5) ? 0.5 + safeWindIntensity * 0.5 : 0.5;
      
      windSoundRef.current = new Howl({
        src: ["/sounds/space-ambience.mp3"],
        loop: true,
        volume: Math.max(0, Math.min(1, safeVolume)),
        rate: Math.max(0.1, Math.min(4, safeRate)), // Vary pitch with intensity
      });
      
      // Register with ResourceManager
      resourceManager.registerAudio(windSoundIdRef.current, windSoundRef.current, 
        ['atmospheric-sounds', `planet-${planetName}-sounds`, 'wind']);
      
      windSoundRef.current.play();
    }
    
    // Update wind volume based on intensity
    if (windSoundRef.current) {
      const updateVolume = isFinite(windVolume * soundVolume) ? windVolume * soundVolume : 0.3;
      windSoundRef.current.volume(Math.max(0, Math.min(1, updateVolume)));
    }
    
    return () => {
      if (windSoundRef.current) {
        console.log(`[AtmosphericSounds] Disposing wind sound for ${planetName}`);
        windSoundRef.current.stop();
        windSoundRef.current.unload();
        resourceManager.disposeResource(windSoundIdRef.current);
        windSoundRef.current = null;
      }
    };
  }, [planetName, windIntensity, soundVolume]);
  
  // Storm sounds
  useEffect(() => {
    if (soundVolume === 0) return;
    
    if (stormActive && !stormSoundRef.current) {
      // Use thruster sound as storm base
      const stormVolume = isFinite(0.6 * soundVolume) ? 0.6 * soundVolume : 0.3;
      stormSoundRef.current = new Howl({
        src: ["/sounds/thruster.mp3"],
        loop: true,
        volume: Math.max(0, Math.min(1, stormVolume)),
        rate: 0.3, // Slow it down for rumbling effect
      });
      
      // Register with ResourceManager
      resourceManager.registerAudio(stormSoundIdRef.current, stormSoundRef.current, 
        ['atmospheric-sounds', `planet-${planetName}-sounds`, 'storm']);
      console.log(`[AtmosphericSounds] Registered storm sound: ${stormSoundIdRef.current}`);
      
      stormSoundRef.current.play();
      console.log(`[ATMOSPHERE-SOUND] Storm sound started on ${planetName}`);
    } else if (!stormActive && stormSoundRef.current) {
      // Clear any existing timeout
      if (stormTimeoutRef.current) {
        clearTimeout(stormTimeoutRef.current);
      }
      
      stormSoundRef.current.fade(stormSoundRef.current.volume(), 0, 2000);
      stormTimeoutRef.current = setTimeout(() => {
        console.log(`[AtmosphericSounds] Disposing storm sound for ${planetName}`);
        stormSoundRef.current?.stop();
        stormSoundRef.current?.unload();
        resourceManager.disposeResource(stormSoundIdRef.current);
        stormSoundRef.current = null;
        stormTimeoutRef.current = null;
      }, 2000);
      
      console.log(`[ATMOSPHERE-SOUND] Storm sound stopped on ${planetName}`);
    }
    
    return () => {
      // Clear timeout on cleanup
      if (stormTimeoutRef.current) {
        clearTimeout(stormTimeoutRef.current);
        stormTimeoutRef.current = null;
      }
      if (stormSoundRef.current) {
        console.log(`[AtmosphericSounds] Cleanup disposing storm sound for ${planetName}`);
        stormSoundRef.current.stop();
        stormSoundRef.current.unload();
        resourceManager.disposeResource(stormSoundIdRef.current);
        stormSoundRef.current = null;
      }
    };
  }, [stormActive, planetName, soundVolume]);
  
  // Rain sounds for Earth
  const [rainDecision] = useState(() => Math.random() > 0.7); // Decide once on mount
  
  useEffect(() => {
    if (soundVolume === 0) return;
    
    const timeOfDay = (time * 10) % 24;
    const isRaining = planetName === "Earth" && rainDecision && timeOfDay > 10 && timeOfDay < 18;
    
    if (isRaining && !rainSoundRef.current) {
      // Use hit sound in loop as rain
      const rainVolume = isFinite(0.2 * soundVolume) ? 0.2 * soundVolume : 0.1;
      rainSoundRef.current = new Howl({
        src: ["/sounds/hit.mp3"],
        loop: true,
        volume: Math.max(0, Math.min(1, rainVolume)),
        rate: 1.0, // Speed up for rain patter
      });
      
      // Register with ResourceManager
      resourceManager.registerAudio(rainSoundIdRef.current, rainSoundRef.current, 
        ['atmospheric-sounds', `planet-${planetName}-sounds`, 'rain']);
      console.log(`[AtmosphericSounds] Registered rain sound: ${rainSoundIdRef.current}`);
      
      rainSoundRef.current.play();
      console.log("[ATMOSPHERE-SOUND] Rain sound started on Earth");
    } else if (!isRaining && rainSoundRef.current) {
      // Clear any existing timeout
      if (rainTimeoutRef.current) {
        clearTimeout(rainTimeoutRef.current);
      }
      
      rainSoundRef.current.fade(rainSoundRef.current.volume(), 0, 3000);
      rainTimeoutRef.current = setTimeout(() => {
        console.log(`[AtmosphericSounds] Disposing rain sound for ${planetName}`);
        rainSoundRef.current?.stop();
        rainSoundRef.current?.unload();
        resourceManager.disposeResource(rainSoundIdRef.current);
        rainSoundRef.current = null;
        rainTimeoutRef.current = null;
      }, 3000);
    }
    
    return () => {
      // Clear timeout on cleanup
      if (rainTimeoutRef.current) {
        clearTimeout(rainTimeoutRef.current);
        rainTimeoutRef.current = null;
      }
      if (rainSoundRef.current) {
        console.log(`[AtmosphericSounds] Cleanup disposing rain sound for ${planetName}`);
        rainSoundRef.current.stop();
        rainSoundRef.current.unload();
        resourceManager.disposeResource(rainSoundIdRef.current);
        rainSoundRef.current = null;
      }
    };
  }, [planetName, time, soundVolume]);
  
  // Cleanup all atmospheric sounds when component unmounts
  useEffect(() => {
    console.log(`[AtmosphericSounds] Initializing atmospheric sounds for planet: ${planetName}`);
    
    return () => {
      console.log(`[AtmosphericSounds] Cleaning up all atmospheric sounds for planet: ${planetName}`);
      // Dispose all resources tagged with atmospheric-sounds
      resourceManager.disposeByTag('atmospheric-sounds');
      resourceManager.disposeByTag(`planet-${planetName}-sounds`);
    };
  }, [planetName]);
  
  return null; // This component only handles sound, no visual output
}