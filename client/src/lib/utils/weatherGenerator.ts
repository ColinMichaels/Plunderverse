import { PlanetData } from '../planetData';

// Weather condition types
export type WeatherCondition = 
  | 'clear'
  | 'stormy'
  | 'foggy'
  | 'toxic'
  | 'radiation'
  | 'sandstorm'
  | 'blizzard'
  | 'acidRain'
  | 'volcanic'
  | 'calm'
  | 'turbulent'
  | 'electromagnetic';

// Hazard types
export type HazardType =
  | 'extremeHeat'
  | 'extremeCold'
  | 'toxicAtmosphere'
  | 'highRadiation'
  | 'lowGravity'
  | 'highGravity'
  | 'corrosive'
  | 'electricStorms'
  | 'unstableTerrain';

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  temperatureString: string;
  atmosphere: string;
  windSpeed: number;
  windDescription: string;
  gravity: string;
  gravityMultiplier: number;
  hazards: HazardType[];
  visibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'zero';
  description: string;
}

// Weather patterns based on planet characteristics
const weatherPatterns: Record<string, WeatherCondition[]> = {
  Mercury: ['clear', 'radiation', 'calm'],
  Venus: ['toxic', 'acidRain', 'volcanic', 'stormy'],
  Earth: ['clear', 'stormy', 'foggy', 'calm'],
  Mars: ['clear', 'sandstorm', 'calm'],
  Jupiter: ['stormy', 'turbulent', 'electromagnetic'],
  Saturn: ['stormy', 'turbulent', 'electromagnetic'],
  Uranus: ['blizzard', 'turbulent', 'electromagnetic'],
  Neptune: ['stormy', 'blizzard', 'turbulent'],
  Ceres: ['clear', 'calm', 'radiation'],
  Moon: ['clear', 'calm', 'radiation']
};

// Parse temperature from string (e.g., "427°C (Day), -173°C (Night)" or "15°C Average")
function parseTemperature(tempString: string): number {
  // Extract the first number from the string
  const match = tempString.match(/-?\d+/);
  return match ? parseInt(match[0]) : 0;
}

// Parse gravity multiplier from string (e.g., "0.38g" or "1.0g")
function parseGravity(gravityString: string): number {
  const match = gravityString.match(/(\d+\.?\d*)g/);
  return match ? parseFloat(match[1]) : 1.0;
}

// Generate wind conditions based on planet and weather
function generateWind(planet: string, condition: WeatherCondition): { speed: number; description: string } {
  let baseSpeed = 0;
  
  // Base wind speeds by planet
  switch(planet) {
    case 'Mercury':
    case 'Moon':
    case 'Ceres':
      baseSpeed = 0; // No atmosphere
      break;
    case 'Venus':
      baseSpeed = 5; // Thick atmosphere, slow winds at surface
      break;
    case 'Earth':
      baseSpeed = 15;
      break;
    case 'Mars':
      baseSpeed = 20;
      break;
    case 'Jupiter':
    case 'Saturn':
      baseSpeed = 400; // Extremely high winds
      break;
    case 'Uranus':
      baseSpeed = 250;
      break;
    case 'Neptune':
      baseSpeed = 600; // Fastest winds in solar system
      break;
  }
  
  // Modify based on weather condition
  let multiplier = 1;
  switch(condition) {
    case 'stormy':
    case 'turbulent':
      multiplier = 2.5;
      break;
    case 'sandstorm':
    case 'blizzard':
      multiplier = 1.8;
      break;
    case 'calm':
    case 'clear':
      multiplier = 0.5;
      break;
    case 'electromagnetic':
      multiplier = 3;
      break;
  }
  
  const speed = Math.round(baseSpeed * multiplier);
  
  // Generate description
  let description = '';
  if (speed === 0) {
    description = 'No wind (vacuum)';
  } else if (speed < 5) {
    description = 'Light breeze';
  } else if (speed < 20) {
    description = 'Gentle winds';
  } else if (speed < 50) {
    description = 'Moderate winds';
  } else if (speed < 100) {
    description = 'Strong winds';
  } else if (speed < 300) {
    description = 'Severe windstorm';
  } else {
    description = 'Catastrophic hypersonic winds';
  }
  
  return { speed, description };
}

// Determine hazards based on planet conditions
function determineHazards(planet: PlanetData, temperature: number, gravityMultiplier: number): HazardType[] {
  const hazards: HazardType[] = [];
  
  // Temperature hazards
  if (temperature > 100) hazards.push('extremeHeat');
  if (temperature < -50) hazards.push('extremeCold');
  
  // Gravity hazards
  if (gravityMultiplier < 0.2) hazards.push('lowGravity');
  if (gravityMultiplier > 2) hazards.push('highGravity');
  
  // Atmosphere-based hazards
  if (planet.atmosphere.includes('CO2') && planet.name !== 'Earth') {
    hazards.push('toxicAtmosphere');
  }
  
  if (planet.atmosphere.includes('None') || planet.atmosphere.includes('Exosphere')) {
    hazards.push('highRadiation');
  }
  
  // Planet-specific hazards
  switch(planet.name) {
    case 'Venus':
      hazards.push('corrosive', 'extremeHeat');
      break;
    case 'Jupiter':
    case 'Saturn':
      hazards.push('highRadiation', 'electricStorms');
      break;
    case 'Mars':
      if (Math.random() < 0.3) hazards.push('unstableTerrain');
      break;
  }
  
  return hazards;
}

// Determine visibility based on weather condition
function determineVisibility(condition: WeatherCondition): WeatherData['visibility'] {
  switch(condition) {
    case 'clear':
    case 'calm':
      return 'excellent';
    case 'radiation':
    case 'electromagnetic':
      return 'good';
    case 'stormy':
    case 'turbulent':
      return 'moderate';
    case 'foggy':
    case 'sandstorm':
    case 'volcanic':
      return 'poor';
    case 'blizzard':
    case 'toxic':
    case 'acidRain':
      return 'zero';
    default:
      return 'moderate';
  }
}

// Generate weather description
function generateDescription(
  condition: WeatherCondition, 
  planet: string,
  hazards: HazardType[]
): string {
  const descriptions: Record<WeatherCondition, string> = {
    clear: `Clear skies above ${planet}. Optimal conditions for surface operations.`,
    stormy: `Violent storms rage across ${planet}'s surface. Seek shelter immediately!`,
    foggy: `Dense fog reduces visibility on ${planet}. Navigate carefully.`,
    toxic: `Toxic atmosphere detected on ${planet}. Life support systems critical!`,
    radiation: `High radiation levels on ${planet}. Suit shielding at maximum.`,
    sandstorm: `Massive sandstorm approaching on ${planet}. Visibility near zero!`,
    blizzard: `Extreme blizzard conditions on ${planet}. Temperature dropping rapidly!`,
    acidRain: `Corrosive acid rain on ${planet}. Hull integrity at risk!`,
    volcanic: `Active volcanic activity detected on ${planet}. Extreme caution advised!`,
    calm: `Unusually calm conditions on ${planet}. Perfect for exploration.`,
    turbulent: `Extreme atmospheric turbulence on ${planet}. Ship stability compromised!`,
    electromagnetic: `Electromagnetic storms on ${planet}. Communications disrupted!`
  };
  
  let desc = descriptions[condition];
  
  // Add hazard warnings
  if (hazards.length > 0) {
    desc += ` WARNING: ${hazards.length} hazard${hazards.length > 1 ? 's' : ''} detected!`;
  }
  
  return desc;
}

// Main function to generate weather data
export function generateWeatherData(planet: PlanetData): WeatherData {
  // Get possible weather conditions for this planet
  const possibleConditions = weatherPatterns[planet.name] || ['clear', 'calm'];
  
  // Randomly select a weather condition (with some bias towards calmer conditions)
  const weights = possibleConditions.map((_, index) => {
    // Give higher weight to first conditions (usually calmer)
    return Math.pow(2, possibleConditions.length - index);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  let condition: WeatherCondition = 'clear';
  for (let i = 0; i < possibleConditions.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      condition = possibleConditions[i];
      break;
    }
  }
  
  // Parse planet data
  const temperature = parseTemperature(planet.surfaceTemperature);
  const gravityMultiplier = parseGravity(planet.gravity);
  
  // Generate wind conditions
  const wind = generateWind(planet.name, condition);
  
  // Determine hazards
  const hazards = determineHazards(planet, temperature, gravityMultiplier);
  
  // Determine visibility
  const visibility = determineVisibility(condition);
  
  // Generate description
  const description = generateDescription(condition, planet.name, hazards);
  
  return {
    condition,
    temperature,
    temperatureString: planet.surfaceTemperature,
    atmosphere: planet.atmosphere,
    windSpeed: wind.speed,
    windDescription: wind.description,
    gravity: planet.gravity,
    gravityMultiplier,
    hazards,
    visibility,
    description
  };
}

// Function to format weather notification messages
export function formatWeatherNotifications(weather: WeatherData, planetName: string): {
  title: string;
  messages: string[];
  type: 'info' | 'warning' | 'error';
} {
  const messages: string[] = [];
  
  // Main weather condition
  messages.push(`Weather: ${weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}`);
  
  // Temperature
  messages.push(`Temperature: ${weather.temperatureString}`);
  
  // Atmosphere
  if (weather.atmosphere !== 'None') {
    messages.push(`Atmosphere: ${weather.atmosphere}`);
  } else {
    messages.push(`⚠️ No atmosphere - vacuum conditions`);
  }
  
  // Wind
  if (weather.windSpeed > 0) {
    messages.push(`Wind: ${weather.windSpeed} km/h - ${weather.windDescription}`);
  }
  
  // Gravity
  messages.push(`Gravity: ${weather.gravity}`);
  
  // Visibility
  messages.push(`Visibility: ${weather.visibility}`);
  
  // Hazards
  if (weather.hazards.length > 0) {
    const hazardNames = weather.hazards.map(h => {
      switch(h) {
        case 'extremeHeat': return '🔥 Extreme Heat';
        case 'extremeCold': return '❄️ Extreme Cold';
        case 'toxicAtmosphere': return '☣️ Toxic Atmosphere';
        case 'highRadiation': return '☢️ High Radiation';
        case 'lowGravity': return '🎈 Low Gravity';
        case 'highGravity': return '⚓ High Gravity';
        case 'corrosive': return '⚠️ Corrosive Environment';
        case 'electricStorms': return '⚡ Electrical Storms';
        case 'unstableTerrain': return '🏔️ Unstable Terrain';
        default: return h;
      }
    });
    messages.push(`Hazards: ${hazardNames.join(', ')}`);
  }
  
  // Determine notification type based on hazards and conditions
  let type: 'info' | 'warning' | 'error' = 'info';
  if (weather.hazards.length >= 3 || weather.condition === 'toxic' || weather.condition === 'volcanic') {
    type = 'error';
  } else if (weather.hazards.length > 0 || weather.visibility === 'poor' || weather.visibility === 'zero') {
    type = 'warning';
  }
  
  return {
    title: `Surface Conditions - ${planetName}`,
    messages,
    type
  };
}

// Function to generate periodic weather updates
export function generateWeatherUpdate(currentWeather: WeatherData, planetName: string): {
  hasChanged: boolean;
  message?: string;
  type?: 'info' | 'warning';
} {
  // Randomly determine if weather has changed (30% chance)
  if (Math.random() > 0.3) {
    return { hasChanged: false };
  }
  
  // Generate change message based on current conditions
  const changes = [
    { condition: () => currentWeather.windSpeed > 50, message: '🌪️ Wind speed increasing!', type: 'warning' as const },
    { condition: () => currentWeather.visibility === 'poor', message: '👁️ Visibility deteriorating', type: 'warning' as const },
    { condition: () => currentWeather.condition === 'stormy', message: '⛈️ Storm intensifying!', type: 'warning' as const },
    { condition: () => currentWeather.condition === 'clear', message: '☀️ Conditions improving', type: 'info' as const },
    { condition: () => currentWeather.temperature > 100, message: '🌡️ Temperature spike detected!', type: 'warning' as const },
    { condition: () => currentWeather.temperature < -50, message: '❄️ Temperature dropping rapidly!', type: 'warning' as const },
    { condition: () => currentWeather.hazards.includes('electricStorms'), message: '⚡ Electrical activity detected!', type: 'warning' as const },
    { condition: () => currentWeather.hazards.includes('unstableTerrain'), message: '🏔️ Seismic activity detected!', type: 'warning' as const }
  ];
  
  // Filter applicable changes
  const applicableChanges = changes.filter(c => c.condition());
  
  if (applicableChanges.length > 0) {
    const change = applicableChanges[Math.floor(Math.random() * applicableChanges.length)];
    return {
      hasChanged: true,
      message: `${planetName}: ${change.message}`,
      type: change.type
    };
  }
  
  // Default change message
  return {
    hasChanged: true,
    message: `${planetName}: Weather patterns shifting`,
    type: 'info'
  };
}