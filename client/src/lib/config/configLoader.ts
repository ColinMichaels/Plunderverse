import { MineralsConfig, ParticlesConfig, MineralConfig, ParticlePresetConfig, GraphicsQuality } from './types';

class ConfigLoader {
  private mineralsConfig: MineralsConfig | null = null;
  private particlesConfig: ParticlesConfig | null = null;
  private loading: Map<string, Promise<any>> = new Map();

  async loadMineralsConfig(): Promise<MineralsConfig> {
    if (this.mineralsConfig) {
      return this.mineralsConfig;
    }

    if (this.loading.has('minerals')) {
      return this.loading.get('minerals')!;
    }

    const promise = fetch('/config/minerals.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load minerals config: ${res.statusText}`);
        }
        return res.json();
      })
      .then((config: MineralsConfig) => {
        this.mineralsConfig = config;
        this.loading.delete('minerals');
        console.log(`[ConfigLoader] Loaded minerals config v${config.version} with ${Object.keys(config.minerals).length} minerals`);
        return config;
      })
      .catch(error => {
        this.loading.delete('minerals');
        console.error('[ConfigLoader] Error loading minerals config:', error);
        throw error;
      });

    this.loading.set('minerals', promise);
    return promise;
  }

  async loadParticlesConfig(): Promise<ParticlesConfig> {
    if (this.particlesConfig) {
      return this.particlesConfig;
    }

    if (this.loading.has('particles')) {
      return this.loading.get('particles')!;
    }

    const promise = fetch('/config/particles.json')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load particles config: ${res.statusText}`);
        }
        return res.json();
      })
      .then((config: ParticlesConfig) => {
        this.particlesConfig = config;
        this.loading.delete('particles');
        console.log(`[ConfigLoader] Loaded particles config v${config.version} with ${Object.keys(config.presets).length} presets`);
        return config;
      })
      .catch(error => {
        this.loading.delete('particles');
        console.error('[ConfigLoader] Error loading particles config:', error);
        throw error;
      });

    this.loading.set('particles', promise);
    return promise;
  }

  async getMineralConfig(mineralName: string): Promise<MineralConfig | null> {
    const config = await this.loadMineralsConfig();
    return config.minerals[mineralName] || null;
  }

  async getParticlePreset(presetName: string): Promise<ParticlePresetConfig | null> {
    const config = await this.loadParticlesConfig();
    return config.presets[presetName] || null;
  }

  async getRarityDefaults(rarity: 'common' | 'uncommon' | 'rare' | 'legendary') {
    const config = await this.loadMineralsConfig();
    return config.rarityDefaults[rarity];
  }

  async getParticleTextureConfig(quality: GraphicsQuality) {
    const config = await this.loadParticlesConfig();
    return {
      ...config.particleTexture,
      currentQuality: config.particleTexture.quality[quality]
    };
  }

  async getPerformanceSettings(quality: GraphicsQuality) {
    const config = await this.loadParticlesConfig();
    return {
      maxParticles: config.performanceSettings.maxParticlesPerResource,
      cullingDistance: config.performanceSettings.cullingDistance[quality],
      updateThrottling: config.performanceSettings.updateThrottling[quality]
    };
  }

  clearCache() {
    this.mineralsConfig = null;
    this.particlesConfig = null;
    this.loading.clear();
    console.log('[ConfigLoader] Cache cleared');
  }

  async preloadAll(): Promise<void> {
    await Promise.all([
      this.loadMineralsConfig(),
      this.loadParticlesConfig()
    ]);
    console.log('[ConfigLoader] All configs preloaded');
  }
}

export const configLoader = new ConfigLoader();
