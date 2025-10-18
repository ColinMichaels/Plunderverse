interface AtmosphericSoundsProps {
  planetName: string;
  stormActive?: boolean;
}

// NOTE: Sound management has been moved to AtmosphericEffects.tsx
// which uses the new audio system (playWind/playRain/etc from useAudio)
// This component is kept for compatibility but no longer plays sounds
export function AtmosphericSounds({
  planetName,
  stormActive = false,
}: AtmosphericSoundsProps) {
  return null;
}
