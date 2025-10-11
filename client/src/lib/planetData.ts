export interface ResourceData {
  type: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  value: number; // Credits per unit
  description: string;
  complexity: number; // Number of clicks needed to mine
}

export interface PlanetData {
  name: string;
  size: number; // Radius for rendering
  distance: number; // Distance from sun for orbit
  color: string;
  orbitalSpeed: number; // How fast it orbits
  rotationSpeed: number; // How fast it rotates
  realDistance: string; // Real distance in AU
  diameter: string; // Real diameter
  orbitalPeriod: string; // Real orbital period
  dayLength: string; // Real day length
  moons: number;
  description: string;
  atmosphere: string;
  surfaceTemperature: string;
  gravity: string;
  texture?: string; // Path to planet texture
  resources: ResourceData[];
}

export const distanceScale = 2.5;

export const planets: PlanetData[] = [
  {
    name: "Mercury",
    size: 0.8,
    distance: 15 * distanceScale,
    color: "#8C7853",
    orbitalSpeed: 0.087, // Realistic speed: Mercury orbit ~1.2 minutes real time
    rotationSpeed: 0.0008, // Slowed down 5x for better visual
    realDistance: "0.39",
    diameter: "4,879",
    orbitalPeriod: "88 Earth days",
    dayLength: "176 Earth days",
    moons: 0,
    description: "The smallest and innermost planet, with extreme temperature variations.",
    atmosphere: "None (Exosphere)",
    surfaceTemperature: "427°C (Day), -173°C (Night)",
    gravity: "0.38g",
    texture: "/textures/planets/2k_mercury.jpg",
    resources: [
      { type: "Iron Ore", rarity: "common", value: 15, description: "Abundant metallic ore from exposed core", complexity: 2 },
      { type: "Platinum", rarity: "uncommon", value: 85, description: "Precious metal deposits", complexity: 4 },
      { type: "Solar Crystals", rarity: "rare", value: 200, description: "Heat-forged crystalline formations", complexity: 6 }
    ]
  },
  {
    name: "Venus",
    size: 1.2,
    distance: 22 * distanceScale,
    color: "#FFC649",
    orbitalSpeed: 0.034, // Realistic speed: Venus orbit ~3 minutes real time
    rotationSpeed: -0.0004, // Retrograde rotation, slowed down 5x
    realDistance: "0.72",
    diameter: "12,104",
    orbitalPeriod: "225 Earth days",
    dayLength: "243 Earth days",
    moons: 0,
    description: "The hottest planet with a thick, toxic atmosphere of carbon dioxide.",
    atmosphere: "Dense CO2 (96%)",
    surfaceTemperature: "462°C",
    gravity: "0.91g",
    texture: "/textures/planets/2k_venus_surface.jpg",
    resources: [
      { type: "Sulfur Compounds", rarity: "common", value: 25, description: "Volcanic sulfur deposits", complexity: 2 },
      { type: "Carbon Fiber", rarity: "uncommon", value: 75, description: "High-pressure carbon formations", complexity: 4 },
      { type: "Atmospheric Gas", rarity: "rare", value: 150, description: "Rare atmospheric components", complexity: 7 }
    ]
  },
  {
    name: "Earth",
    size: 1.3,
    distance: 30 * distanceScale,
    color: "#6B93D6",
    orbitalSpeed: 0.021, // Realistic speed: Earth orbit ~5 minutes real time
    rotationSpeed: 0.004, // Slowed down 5x for better visual
    realDistance: "1.00",
    diameter: "12,756",
    orbitalPeriod: "365.25 days",
    dayLength: "24 hours",
    moons: 1,
    description: "Our home planet, the only known world with life and liquid water.",
    atmosphere: "Nitrogen (78%), Oxygen (21%)",
    surfaceTemperature: "15°C Average",
    gravity: "1.0g",
    texture: "/textures/planets/2k_earth_daymap.jpg",
    resources: [
      { type: "Water", rarity: "common", value: 10, description: "Essential for life support systems", complexity: 1 },
      { type: "Biomass", rarity: "uncommon", value: 45, description: "Organic compounds and materials", complexity: 3 },
      { type: "Rare Earth Elements", rarity: "rare", value: 180, description: "Advanced technology components", complexity: 5 }
    ]
  },
  {
    name: "Mars",
    size: 1.0,
    distance: 40 * distanceScale,
    color: "#CD5C5C",
    orbitalSpeed: 0.011, // Realistic speed: Mars orbit ~9.5 minutes real time
    rotationSpeed: 0.0036, // Slowed down 5x for better visual
    realDistance: "1.52",
    diameter: "6,792",
    orbitalPeriod: "687 Earth days",
    dayLength: "24.6 hours",
    moons: 2,
    description: "The red planet with polar ice caps and the largest volcano in the solar system.",
    atmosphere: "Thin CO2 (95%)",
    surfaceTemperature: "-65°C Average",
    gravity: "0.38g",
    texture: "/textures/planets/2k_mars.jpg",
    resources: [
      { type: "Iron Oxide", rarity: "common", value: 20, description: "The source of Mars' red color", complexity: 2 },
      { type: "Ice Water", rarity: "uncommon", value: 40, description: "Frozen water at polar caps", complexity: 4 },
      { type: "Methane Gas", rarity: "rare", value: 120, description: "Potential fuel source", complexity: 6 }
    ]
  },
  {
    name: "Jupiter",
    size: 4.0,
    distance: 65 * distanceScale,
    color: "#D8CA9D",
    orbitalSpeed: 0.00176, // Realistic speed: Jupiter orbit ~59 minutes real time
    rotationSpeed: 0.008, // Slowed down 5x for better visual
    realDistance: "5.20",
    diameter: "142,984",
    orbitalPeriod: "11.9 Earth years",
    dayLength: "9.9 hours",
    moons: 79,
    description: "The largest planet, a gas giant with a Great Red Spot storm and many moons.",
    atmosphere: "Hydrogen (89%), Helium (10%)",
    surfaceTemperature: "-110°C",
    gravity: "2.36g",
    texture: "/textures/planets/2k_jupiter.jpg",
    resources: [
      { type: "Helium-3", rarity: "uncommon", value: 95, description: "Fusion reactor fuel", complexity: 4 },
      { type: "Hydrogen", rarity: "common", value: 30, description: "Abundant atmospheric gas", complexity: 1 },
      { type: "Metallic Hydrogen", rarity: "legendary", value: 500, description: "Exotic high-pressure material", complexity: 10 }
    ]
  },
  {
    name: "Saturn",
    size: 3.5,
    distance: 90 * distanceScale,
    color: "#FAD5A5",
    orbitalSpeed: 0.00071, // Realistic speed: Saturn orbit ~147 minutes real time
    rotationSpeed: 0.0076, // Slowed down 5x for better visual
    realDistance: "9.58",
    diameter: "120,536",
    orbitalPeriod: "29.4 Earth years",
    dayLength: "10.7 hours",
    moons: 82,
    description: "Famous for its spectacular ring system and low density.",
    atmosphere: "Hydrogen (96%), Helium (3%)",
    surfaceTemperature: "-140°C",
    gravity: "0.92g",
    texture: "/textures/planets/2k_saturn.jpg",
    resources: [
      { type: "Ring Particles", rarity: "common", value: 35, description: "Ice and rock fragments from rings", complexity: 2 },
      { type: "Titan Methane", rarity: "rare", value: 160, description: "Liquid hydrocarbon from moon Titan", complexity: 7 },
      { type: "Exotic Ice", rarity: "legendary", value: 450, description: "Crystalline water ice formations", complexity: 9 }
    ]
  },
  {
    name: "Uranus",
    size: 2.5,
    distance: 120 * distanceScale,
    color: "#4FD0E7",
    orbitalSpeed: 0.00025, // Realistic speed: Uranus orbit ~420 minutes real time
    rotationSpeed: 0.006, // Slowed down 5x for better visual
    realDistance: "19.22",
    diameter: "51,118",
    orbitalPeriod: "84 Earth years",
    dayLength: "17.2 hours",
    moons: 27,
    description: "An ice giant that rotates on its side with a faint ring system.",
    atmosphere: "Hydrogen (83%), Helium (15%)",
    surfaceTemperature: "-195°C",
    gravity: "0.89g",
    texture: "/textures/planets/2k_uranus.jpg",
    resources: [
      { type: "Methane Ice", rarity: "uncommon", value: 65, description: "Frozen atmospheric methane", complexity: 4 },
      { type: "Ammonia Crystals", rarity: "rare", value: 140, description: "Crystallized ammonia compounds", complexity: 6 },
      { type: "Diamond Rain", rarity: "legendary", value: 600, description: "Pressure-formed diamond precipitation", complexity: 12 }
    ]
  },
  {
    name: "Neptune",
    size: 2.4,
    distance: 150 * distanceScale,
    color: "#4B70DD",
    orbitalSpeed: 0.00013, // Realistic speed: Neptune orbit ~825 minutes real time
    rotationSpeed: 0.0064, // Slowed down 5x for better visual
    realDistance: "30.05",
    diameter: "49,528",
    orbitalPeriod: "165 Earth years",
    dayLength: "16.1 hours",
    moons: 14,
    description: "The windiest planet with the strongest storms in the solar system.",
    atmosphere: "Hydrogen (80%), Helium (19%)",
    surfaceTemperature: "-200°C",
    gravity: "1.13g",
    texture: "/textures/planets/2k_neptune.jpg",
    resources: [
      { type: "Storm Energy", rarity: "rare", value: 175, description: "Harness powerful atmospheric storms", complexity: 7 },
      { type: "Tritium", rarity: "uncommon", value: 90, description: "Heavy hydrogen isotope", complexity: 4 },
      { type: "Dark Matter Traces", rarity: "legendary", value: 800, description: "Exotic particles from deep space", complexity: 15 }
    ]
  },
  {
    name: "Ceres",
    size: 0.6,
    distance: 55 * distanceScale,
    color: "#8C7853",
    orbitalSpeed: 0.0046, // Realistic speed: Ceres orbit ~23 minutes real time
    rotationSpeed: 0.005, // Slowed down 5x for better visual
    realDistance: "2.77",
    diameter: "939",
    orbitalPeriod: "4.6 Earth years",
    dayLength: "9.1 hours",
    moons: 0,
    description: "The largest object in the asteroid belt, classified as a dwarf planet.",
    atmosphere: "None (Tenuous water vapor)",
    surfaceTemperature: "-38°C Average",
    gravity: "0.03g",
    texture: "/textures/planets/2k_ceres_fictional.jpg",
    resources: [
      { type: "Asteroid Ore", rarity: "common", value: 22, description: "Rich metallic asteroid materials", complexity: 2 },
      { type: "Water Ice", rarity: "uncommon", value: 50, description: "Subsurface ice deposits", complexity: 3 },
      { type: "Bright Spots", rarity: "rare", value: 190, description: "Mysterious reflective mineral deposits", complexity: 6 }
    ]
  },
];

// Moon data (Earth's satellite)
export interface MoonData {
  name: string;
  size: number;
  distance: number; // Distance from Earth
  color: string;
  orbitalSpeed: number;
  rotationSpeed: number;
  realDistance: string;
  diameter: string;
  orbitalPeriod: string;
  dayLength: string;
  description: string;
  atmosphere: string;
  surfaceTemperature: string;
  gravity: string;
  texture?: string; // Path to moon texture
  resources: ResourceData[];
}

export const moonData: MoonData = {
  name: "Moon",
  size: 0.3,
  distance: 4, // Distance from Earth in game units
  color: "#C0C0C0",
  orbitalSpeed: 0.08,
  rotationSpeed: 0.001,
  realDistance: "384,400 km from Earth",
  diameter: "3,474",
  orbitalPeriod: "27.3 Earth days",
  dayLength: "27.3 Earth days (tidally locked)",
  description: "Earth's only natural satellite, tidally locked and crucial for Earth's tides.",
  atmosphere: "None (Exosphere)",
  surfaceTemperature: "127°C (Day), -173°C (Night)",
  gravity: "0.166g",
  texture: "/textures/planets/2k_moon.jpg",
  resources: [
    { type: "Lunar Rock", rarity: "common", value: 12, description: "Basic lunar regolith and rock samples", complexity: 1 },
    { type: "Helium-3", rarity: "rare", value: 300, description: "Rare isotope deposited by solar wind", complexity: 8 },
    { type: "Water Ice", rarity: "uncommon", value: 45, description: "Ice deposits in polar craters", complexity: 3 }
  ]
};
