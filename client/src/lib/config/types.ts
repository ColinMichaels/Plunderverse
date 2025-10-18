export interface MineralVisualConfig {
  color: string;
  emissiveColor: string;
  geometry: 'box' | 'sphere' | 'cylinder' | 'dodecahedron' | 'octahedron';
  rimColor: string;
  rimIntensity: number;
  pulseSpeed: number;
  pulseIntensity: number;
  floatAmount?: number;
}

export interface MineralParticleConfig {
  enabled: boolean;
  preset: string;
  color?: string;
  count?: number;
  size?: number;
  opacity?: number;
  speed?: number;
}

export interface MineralMiningConfig {
  yieldMultiplier: number;
  degradationRate: number;
  soundProfile: 'metal' | 'crystal' | 'rock' | 'gas' | 'liquid' | 'ice' | 'organic' | 'energy' | 'exotic';
}

export interface MineralConfig {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  baseValue: number;
  description: string;
  baseComplexity: number;
  visual: MineralVisualConfig;
  particles: MineralParticleConfig;
  mining: MineralMiningConfig;
}

export interface RarityDefaults {
  emissiveIntensity: number;
  rimIntensity: number;
  pulseSpeed: number;
  pulseIntensity: number;
  lightIntensity: number;
  lightDistance: number;
  floatAmount: number;
}

export interface MineralsConfig {
  version: string;
  minerals: Record<string, MineralConfig>;
  rarityDefaults: Record<string, RarityDefaults>;
}

export interface ParticleTextureConfig {
  type: 'procedural' | 'image';
  quality: {
    low: { size: number; alpha: number };
    medium: { size: number; alpha: number };
    high: { size: number; alpha: number };
  };
  gradient: {
    center: { r: number; g: number; b: number; a: number };
    edge: { r: number; g: number; b: number; a: number };
  };
}

export interface ParticlePresetConfig {
  enabled: boolean;
  count: number;
  size: number;
  opacity: number;
  speed: number;
  spread: number;
  lifetime: number;
  updateFrequency: number;
  blending: 'normal' | 'additive';
  swirlIntensity?: number;
  lodDistances: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface ParticlesConfig {
  version: string;
  particleTexture: ParticleTextureConfig;
  presets: Record<string, ParticlePresetConfig>;
  performanceSettings: {
    maxParticlesPerResource: number;
    cullingDistance: {
      low: number;
      medium: number;
      high: number;
    };
    updateThrottling: {
      low: number;
      medium: number;
      high: number;
    };
  };
}

export type GraphicsQuality = 'low' | 'medium' | 'high';
