import { useEffect, useRef } from 'react';
import { useLandedState } from '../lib/stores/surface/useLandedState';
import { planets } from '../lib/planetData';
import { toast } from 'sonner';
import { generateWeatherData, generateWeatherUpdate, type WeatherData } from '../lib/utils/weatherGenerator';

// Interval for weather updates (30-60 seconds)
const MIN_UPDATE_INTERVAL = 30000;
const MAX_UPDATE_INTERVAL = 60000;

export function useWeatherUpdates() {
  const { isLanded, landedPlanet } = useLandedState();
  const weatherDataRef = useRef<WeatherData | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!isLanded || !landedPlanet) {
      // Clear interval when not landed
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      weatherDataRef.current = null;
      return;
    }
    
    // Generate initial weather data for the planet
    const planetData = planets.find(p => p.name === landedPlanet);
    if (!planetData) return;
    
    // Initialize weather data if not already set
    if (!weatherDataRef.current) {
      weatherDataRef.current = generateWeatherData(planetData);
    }
    
    // Function to show weather update
    const showWeatherUpdate = () => {
      if (!weatherDataRef.current || !landedPlanet) return;
      
      const update = generateWeatherUpdate(weatherDataRef.current, landedPlanet);
      
      if (update.hasChanged && update.message) {
        // Show weather update notification with custom styling
        toast.custom((t) => (
          <div className={`
            ${update.type === 'warning' 
              ? 'bg-gradient-to-r from-yellow-900/95 via-orange-900/95 to-yellow-900/95 border-yellow-500/50' 
              : 'bg-gradient-to-r from-blue-900/95 via-indigo-900/95 to-blue-900/95 border-blue-500/50'
            } 
            backdrop-blur-sm p-3 rounded-lg border shadow-xl max-w-sm
          `}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${update.type === 'warning' 
                    ? 'bg-yellow-500/20' 
                    : 'bg-blue-500/20'
                  }
                `}>
                  <span className="text-lg">
                    {update.type === 'warning' ? '⚡' : '🌤️'}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <p className={`
                  text-sm font-medium
                  ${update.type === 'warning' 
                    ? 'text-yellow-200' 
                    : 'text-blue-200'
                  }
                `}>
                  {update.message}
                </p>
              </div>
            </div>
          </div>
        ), {
          duration: 4000,
          position: 'bottom-right'
        });
        
        // Occasionally regenerate weather data to simulate changing conditions
        if (Math.random() < 0.2) { // 20% chance to completely change weather
          weatherDataRef.current = generateWeatherData(planetData);
        }
      }
    };
    
    // Set up periodic weather updates
    const startWeatherUpdates = () => {
      // Calculate random interval
      const interval = MIN_UPDATE_INTERVAL + Math.random() * (MAX_UPDATE_INTERVAL - MIN_UPDATE_INTERVAL);
      
      updateIntervalRef.current = setTimeout(() => {
        showWeatherUpdate();
        // Schedule next update
        startWeatherUpdates();
      }, interval);
    };
    
    // Start the update cycle after initial delay (don't overwhelm with notifications)
    const initialDelay = setTimeout(() => {
      startWeatherUpdates();
    }, 15000); // Start updates 15 seconds after landing
    
    return () => {
      clearTimeout(initialDelay);
      if (updateIntervalRef.current) {
        clearTimeout(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [isLanded, landedPlanet]);
  
  return null; // Hook doesn't return anything, just manages side effects
}