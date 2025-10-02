import { useEffect, useRef } from "react";
import { Howl } from "howler";
import { useWind } from "../../lib/stores/surface/useWind";
import { useSettings } from "../../lib/stores/ui/useSettings";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";

interface AtmosphericSoundsProps {
  planetName: string;
  stormActive?: boolean;
}

export function AtmosphericSounds({ planetName, stormActive = false }: AtmosphericSoundsProps) {
  const { soundVolume } = useSettings();
  const { intensity: windIntensity } = useWind();
  const { time } = useSolarSystem();
  
  const windSoundRef = useRef<Howl | null>(null);
  const stormSoundRef = useRef<Howl | null>(null);
  const rainSoundRef = useRef<Howl | null>(null);
  
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
      windSoundRef.current.play();
    }
    
    // Update wind volume based on intensity
    if (windSoundRef.current) {
      const updateVolume = isFinite(windVolume * soundVolume) ? windVolume * soundVolume : 0.3;
      windSoundRef.current.volume(Math.max(0, Math.min(1, updateVolume)));
    }
    
    return () => {
      if (windSoundRef.current) {
        windSoundRef.current.stop();
        windSoundRef.current.unload();
        windSoundRef.current = null;
      }
    };
  }, [planetName, windIntensity, soundVolume]);
  
  // Storm sounds
  useEffect(() => {
    if (soundVolume === 0) return;
    
    if (stormActive && !stormSoundRef.current) {
      // Use thruster sound as storm base
      stormSoundRef.current = new Howl({
        src: ["/sounds/thruster.mp3"],
        loop: true,
        volume: 0.6 * soundVolume,
        rate: 0.3, // Slow it down for rumbling effect
      });
      stormSoundRef.current.play();
      
      console.log(`[ATMOSPHERE-SOUND] Storm sound started on ${planetName}`);
    } else if (!stormActive && stormSoundRef.current) {
      stormSoundRef.current.fade(stormSoundRef.current.volume(), 0, 2000);
      setTimeout(() => {
        stormSoundRef.current?.stop();
        stormSoundRef.current?.unload();
        stormSoundRef.current = null;
      }, 2000);
      
      console.log(`[ATMOSPHERE-SOUND] Storm sound stopped on ${planetName}`);
    }
    
    return () => {
      if (stormSoundRef.current) {
        stormSoundRef.current.stop();
        stormSoundRef.current.unload();
        stormSoundRef.current = null;
      }
    };
  }, [stormActive, planetName, soundVolume]);
  
  // Rain sounds for Earth
  useEffect(() => {
    if (soundVolume === 0) return;
    
    const timeOfDay = (time * 10) % 24;
    const isRaining = planetName === "Earth" && Math.random() > 0.7 && timeOfDay > 10 && timeOfDay < 18;
    
    if (isRaining && !rainSoundRef.current) {
      // Use hit sound in loop as rain
      rainSoundRef.current = new Howl({
        src: ["/sounds/hit.mp3"],
        loop: true,
        volume: 0.2 * soundVolume,
        rate: 2.0, // Speed up for rain patter
      });
      rainSoundRef.current.play();
      
      console.log("[ATMOSPHERE-SOUND] Rain sound started on Earth");
    } else if (!isRaining && rainSoundRef.current) {
      rainSoundRef.current.fade(rainSoundRef.current.volume(), 0, 3000);
      setTimeout(() => {
        rainSoundRef.current?.stop();
        rainSoundRef.current?.unload();
        rainSoundRef.current = null;
      }, 3000);
    }
    
    return () => {
      if (rainSoundRef.current) {
        rainSoundRef.current.stop();
        rainSoundRef.current.unload();
        rainSoundRef.current = null;
      }
    };
  }, [planetName, time, soundVolume]);
  
  return null; // This component only handles sound, no visual output
}