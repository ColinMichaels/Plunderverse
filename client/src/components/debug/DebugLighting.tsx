import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
import { useSurfaceLighting, TIME_OF_DAY_PRESETS } from "../../lib/stores/surface/useSurfaceLighting";
import { useSolarSystem } from "../../lib/stores/space/useSolarSystem";
import { useLandedState } from "../../lib/stores/surface/useLandedState";
import { planets } from "../../lib/planetData";
import { Sun, Moon, Sunrise, Sunset } from "lucide-react";

export function DebugLighting() {
  const surfaceLighting = useSurfaceLighting();
  const { getUniverseTime } = useSolarSystem();
  const { landedPlanet } = useLandedState();
  const [currentSunAngle, setCurrentSunAngle] = useState(0);
  const [currentSunElevation, setCurrentSunElevation] = useState(0);
  const [estimatedTimeOfDay, setEstimatedTimeOfDay] = useState("Unknown");

  // Get current planet data
  const planet = planets.find((p) => p.name === landedPlanet);

  // Update sun position calculations
  useEffect(() => {
    if (!surfaceLighting.manualOverride && planet) {
      const updateSunPosition = () => {
        const universeTime = getUniverseTime();
        const sunAngle = (planet.rotationSpeed * universeTime) % (2 * Math.PI);
        const sunElevation = Math.sin(sunAngle);
        
        // Calculate time of day based on sun angle
        let timeOfDay = "Night";
        if (sunElevation >= 0.5) timeOfDay = "Noon";
        else if (sunElevation >= 0.1) timeOfDay = "Morning";
        else if (sunElevation >= -0.1) timeOfDay = "Dawn";
        else if (sunElevation >= -0.3) timeOfDay = "Dusk";

        setCurrentSunAngle(sunAngle);
        setCurrentSunElevation(sunElevation);
        setEstimatedTimeOfDay(timeOfDay);
      };

      updateSunPosition();
      const interval = setInterval(updateSunPosition, 100); // Update 10 times per second

      return () => clearInterval(interval);
    }
  }, [surfaceLighting.manualOverride, planet, getUniverseTime]);

  // Get time icon based on time of day
  const getTimeIcon = () => {
    switch (surfaceLighting.currentTimeOfDay) {
      case "Dawn":
        return <Sunrise className="h-4 w-4" />;
      case "Noon":
      case "Morning":
        return <Sun className="h-4 w-4" />;
      case "Dusk":
        return <Sunset className="h-4 w-4" />;
      case "Night":
        return <Moon className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  if (!landedPlanet) {
    return null;
  }

  return (
    <Card className="absolute top-4 right-4 w-96 bg-black/80 text-white border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getTimeIcon()}
          Lighting Debug
        </CardTitle>
        <CardDescription className="text-gray-400">
          Planet: {landedPlanet} | Time: {surfaceLighting.currentTimeOfDay}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual Override Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="manual-override">Manual Override</Label>
          <Switch
            id="manual-override"
            checked={surfaceLighting.manualOverride}
            onCheckedChange={surfaceLighting.setManualOverride}
          />
        </div>

        {!surfaceLighting.manualOverride ? (
          // Automatic Mode - Show calculated values
          <div className="space-y-3 p-3 bg-gray-900 rounded">
            <div className="text-sm">
              <p className="text-gray-400">Mode: <span className="text-green-400">Automatic</span></p>
              <p className="text-gray-400">Time of Day: <span className="text-white">{estimatedTimeOfDay}</span></p>
              {planet && (
                <>
                  <p className="text-gray-400">Day Length: <span className="text-white">{planet.dayLength}</span></p>
                  <p className="text-gray-400">Rotation Speed: <span className="text-white">{planet.rotationSpeed.toFixed(4)}</span></p>
                  {planet.rotationSpeed < 0 && (
                    <p className="text-yellow-400 text-xs">⚠️ Retrograde Rotation</p>
                  )}
                </>
              )}
              <p className="text-gray-400">
                Sun Angle: <span className="text-white">{((currentSunAngle * 180) / Math.PI).toFixed(1)}°</span>
              </p>
              <p className="text-gray-400">
                Sun Elevation: <span className="text-white">{((Math.asin(currentSunElevation) * 180) / Math.PI).toFixed(1)}°</span>
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Sun position is calculated based on universe time and planet rotation speed.
            </div>
          </div>
        ) : (
          // Manual Mode - Show controls
          <div className="space-y-4">
            <div className="text-sm text-yellow-400">
              ⚠️ Manual control active
            </div>

            {/* Sun Azimuth */}
            <div className="space-y-2">
              <Label className="text-xs">
                Sun Azimuth: {surfaceLighting.sunAzimuth}°
              </Label>
              <Slider
                value={[surfaceLighting.sunAzimuth]}
                onValueChange={([value]) => surfaceLighting.setSunAzimuth(value)}
                min={0}
                max={360}
                step={1}
                className="w-full"
              />
            </div>

            {/* Sun Elevation */}
            <div className="space-y-2">
              <Label className="text-xs">
                Sun Elevation: {surfaceLighting.sunElevation}°
              </Label>
              <Slider
                value={[surfaceLighting.sunElevation]}
                onValueChange={([value]) => surfaceLighting.setSunElevation(value)}
                min={-90}
                max={90}
                step={1}
                className="w-full"
              />
            </div>

            {/* Sun Intensity */}
            <div className="space-y-2">
              <Label className="text-xs">
                Sun Intensity: {surfaceLighting.sunIntensity.toFixed(1)}
              </Label>
              <Slider
                value={[surfaceLighting.sunIntensity]}
                onValueChange={([value]) => surfaceLighting.setSunIntensity(value)}
                min={0}
                max={5}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Ambient Intensity */}
            <div className="space-y-2">
              <Label className="text-xs">
                Ambient Intensity: {surfaceLighting.ambientIntensity.toFixed(2)}
              </Label>
              <Slider
                value={[surfaceLighting.ambientIntensity]}
                onValueChange={([value]) => surfaceLighting.setAmbientIntensity(value)}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Sun Color */}
            <div className="space-y-2">
              <Label className="text-xs">Sun Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={surfaceLighting.sunColor}
                  onChange={(e) => surfaceLighting.setSunColor(e.target.value)}
                  className="w-12 h-8 border border-gray-600 rounded"
                />
                <span className="text-xs text-gray-400">{surfaceLighting.sunColor}</span>
              </div>
            </div>

            {/* Time of Day Presets */}
            <div className="space-y-2">
              <Label className="text-xs">Time Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OF_DAY_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    onClick={() => surfaceLighting.applyPreset(preset)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
          <p>Sun rises in the east (positive X) and sets in the west (negative X).</p>
          {planet && planet.rotationSpeed < 0 && (
            <p className="text-yellow-400 mt-1">
              This planet has retrograde rotation - sun moves backwards!
            </p>
          )}
          {planet && Math.abs(planet.rotationSpeed) < 0.005 && (
            <p className="text-blue-400 mt-1">
              Very slow rotation - days are extremely long.
            </p>
          )}
          {planet && Math.abs(planet.rotationSpeed) > 0.015 && (
            <p className="text-green-400 mt-1">
              Fast rotation - short day/night cycles.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}