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
}

export const distanceScale = 2.5;

export const planets: PlanetData[] = [
  {
    name: "Mercury",
    size: 0.8,
    distance: 15 * distanceScale,
    color: "#8C7853",
    orbitalSpeed: 0.15,
    rotationSpeed: 0.004,
    realDistance: "0.39",
    diameter: "4,879",
    orbitalPeriod: "88 Earth days",
    dayLength: "176 Earth days",
    moons: 0,
    description:
      "The smallest and innermost planet, with extreme temperature variations.",
  },
  {
    name: "Venus",
    size: 1.2,
    distance: 22 * distanceScale,
    color: "#FFC649",
    orbitalSpeed: 0.12,
    rotationSpeed: -0.002, // Retrograde rotation
    realDistance: "0.72",
    diameter: "12,104",
    orbitalPeriod: "225 Earth days",
    dayLength: "243 Earth days",
    moons: 0,
    description:
      "The hottest planet with a thick, toxic atmosphere of carbon dioxide.",
  },
  {
    name: "Earth",
    size: 1.3,
    distance: 30 * distanceScale,
    color: "#6B93D6",
    orbitalSpeed: 0.1,
    rotationSpeed: 0.02,
    realDistance: "1.00",
    diameter: "12,756",
    orbitalPeriod: "365.25 days",
    dayLength: "24 hours",
    moons: 1,
    description:
      "Our home planet, the only known world with life and liquid water.",
  },
  {
    name: "Mars",
    size: 1.0,
    distance: 40 * distanceScale,
    color: "#CD5C5C",
    orbitalSpeed: 0.08,
    rotationSpeed: 0.018,
    realDistance: "1.52",
    diameter: "6,792",
    orbitalPeriod: "687 Earth days",
    dayLength: "24.6 hours",
    moons: 2,
    description:
      "The red planet with polar ice caps and the largest volcano in the solar system.",
  },
  {
    name: "Jupiter",
    size: 4.0,
    distance: 65 * distanceScale,
    color: "#D8CA9D",
    orbitalSpeed: 0.04,
    rotationSpeed: 0.04,
    realDistance: "5.20",
    diameter: "142,984",
    orbitalPeriod: "11.9 Earth years",
    dayLength: "9.9 hours",
    moons: 79,
    description:
      "The largest planet, a gas giant with a Great Red Spot storm and many moons.",
  },
  {
    name: "Saturn",
    size: 3.5,
    distance: 90 * distanceScale,
    color: "#FAD5A5",
    orbitalSpeed: 0.03,
    rotationSpeed: 0.038,
    realDistance: "9.58",
    diameter: "120,536",
    orbitalPeriod: "29.4 Earth years",
    dayLength: "10.7 hours",
    moons: 82,
    description: "Famous for its spectacular ring system and low density.",
  },
  {
    name: "Uranus",
    size: 2.5,
    distance: 120 * distanceScale,
    color: "#4FD0E7",
    orbitalSpeed: 0.025,
    rotationSpeed: 0.03,
    realDistance: "19.22",
    diameter: "51,118",
    orbitalPeriod: "84 Earth years",
    dayLength: "17.2 hours",
    moons: 27,
    description:
      "An ice giant that rotates on its side with a faint ring system.",
  },
  {
    name: "Neptune",
    size: 2.4,
    distance: 150 * distanceScale,
    color: "#4B70DD",
    orbitalSpeed: 0.02,
    rotationSpeed: 0.032,
    realDistance: "30.05",
    diameter: "49,528",
    orbitalPeriod: "165 Earth years",
    dayLength: "16.1 hours",
    moons: 14,
    description:
      "The windiest planet with the strongest storms in the solar system.",
  },
  {
    name: "Ceres",
    size: 22.4,
    distance: 250 * distanceScale,
    color: "#4B70DD",
    orbitalSpeed: 0.02,
    rotationSpeed: 0.032,
    realDistance: "30.05",
    diameter: "49,528",
    orbitalPeriod: "265 Earth years",
    dayLength: "36.1 hours",
    moons: 1,
    description: "No Data Provided.",
  },
];
