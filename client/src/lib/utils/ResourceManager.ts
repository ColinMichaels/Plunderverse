import * as THREE from 'three';
import { Howl } from 'howler';

// Type definitions for different resource types
type ResourceType = 'geometry' | 'material' | 'texture' | 'mesh' | 'audio';

interface ResourceEntry<T = any> {
  id: string;
  type: ResourceType;
  resource: T;
  tags: Set<string>;
  referenceCount: number;
  createdAt: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

interface ResourceStats {
  geometries: number;
  materials: number;
  textures: number;
  meshes: number;
  audio: number;
  totalMemoryEstimate: number;
  oldestResource: number;
  newestResource: number;
}

/**
 * ResourceManager - Singleton for managing Three.js and audio resources
 * Handles proper disposal patterns and memory management for the Plunderverse game
 */
class ResourceManager {
  private static instance: ResourceManager;
  private resources: Map<string, ResourceEntry> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private debugMode: boolean = true;
  private disposed: boolean = false;

  private constructor() {
    this.log('ResourceManager initialized');
    
    // Add cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disposeAll();
      });
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  /**
   * Enable or disable debug logging
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Register a Three.js BufferGeometry
   */
  public registerGeometry(id: string, geometry: THREE.BufferGeometry, tags: string[] = []): void {
    if (!geometry || this.disposed) return;

    this.registerResource(id, 'geometry', geometry, tags);
    this.log(`Registered geometry: ${id}`);
  }

  /**
   * Register a Three.js Material (handles single or array)
   */
  public registerMaterial(id: string, material: THREE.Material | THREE.Material[], tags: string[] = []): void {
    if (!material || this.disposed) return;

    // Handle material arrays
    if (Array.isArray(material)) {
      material.forEach((mat, index) => {
        this.registerResource(`${id}_${index}`, 'material', mat, tags);
      });
      this.log(`Registered material array: ${id} (${material.length} materials)`);
    } else {
      this.registerResource(id, 'material', material, tags);
      this.log(`Registered material: ${id}`);
    }
  }

  /**
   * Register a Three.js Texture
   */
  public registerTexture(id: string, texture: THREE.Texture, tags: string[] = []): void {
    if (!texture || this.disposed) return;

    this.registerResource(id, 'texture', texture, tags);
    this.log(`Registered texture: ${id}`);
  }

  /**
   * Register a Three.js Mesh (automatically registers its geometry and materials)
   */
  public registerMesh(id: string, mesh: THREE.Mesh, tags: string[] = []): void {
    if (!mesh || this.disposed) return;

    // Register the mesh itself
    this.registerResource(id, 'mesh', mesh, tags);

    // Auto-register geometry if it exists
    if (mesh.geometry) {
      this.registerGeometry(`${id}_geometry`, mesh.geometry, [...tags, `${id}_auto`]);
    }

    // Auto-register materials if they exist
    if (mesh.material) {
      this.registerMaterial(`${id}_material`, mesh.material, [...tags, `${id}_auto`]);
    }

    this.log(`Registered mesh: ${id} (with auto-registered geometry and materials)`);
  }

  /**
   * Register an audio resource (Howl or HTMLAudioElement)
   */
  public registerAudio(id: string, audio: Howl | HTMLAudioElement, tags: string[] = []): void {
    if (!audio || this.disposed) return;

    this.registerResource(id, 'audio', audio, tags);
    this.log(`Registered audio: ${id} (${audio instanceof Howl ? 'Howl' : 'HTMLAudioElement'})`);
  }

  /**
   * Core resource registration
   */
  private registerResource<T>(id: string, type: ResourceType, resource: T, tags: string[] = []): void {
    // Check if resource already exists
    const existing = this.resources.get(id);
    if (existing) {
      existing.referenceCount++;
      existing.lastAccessed = Date.now();
      this.log(`Increased reference count for ${type}: ${id} (count: ${existing.referenceCount})`);
      return;
    }

    // Create new resource entry
    const entry: ResourceEntry<T> = {
      id,
      type,
      resource,
      tags: new Set(tags),
      referenceCount: 1,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    };

    this.resources.set(id, entry);

    // Update tag index
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(id);
    });
  }

  /**
   * Dispose a specific resource by ID
   */
  public disposeResource(id: string): boolean {
    const entry = this.resources.get(id);
    if (!entry) {
      this.log(`Resource not found: ${id}`, 'warn');
      return false;
    }

    // Decrease reference count
    entry.referenceCount--;
    
    // Only dispose if reference count reaches 0
    if (entry.referenceCount > 0) {
      this.log(`Decreased reference count for ${entry.type}: ${id} (count: ${entry.referenceCount})`);
      return false;
    }

    // Perform disposal based on type
    this.disposeByType(entry);

    // Remove from resources map
    this.resources.delete(id);

    // Remove from tag index
    entry.tags.forEach(tag => {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(id);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });

    this.log(`Disposed ${entry.type}: ${id}`);
    return true;
  }

  /**
   * Dispose all resources with a specific tag
   */
  public disposeByTag(tag: string): number {
    const resourceIds = this.tagIndex.get(tag);
    if (!resourceIds || resourceIds.size === 0) {
      this.log(`No resources found with tag: ${tag}`, 'warn');
      return 0;
    }

    let disposedCount = 0;
    const idsToDispose = Array.from(resourceIds);
    
    idsToDispose.forEach(id => {
      if (this.disposeResource(id)) {
        disposedCount++;
      }
    });

    this.log(`Disposed ${disposedCount} resources with tag: ${tag}`);
    return disposedCount;
  }

  /**
   * Dispose all resources
   */
  public disposeAll(): void {
    if (this.disposed) return;

    const totalResources = this.resources.size;
    
    // Create a copy of resource IDs to avoid modification during iteration
    const resourceIds = Array.from(this.resources.keys());
    
    resourceIds.forEach(id => {
      const entry = this.resources.get(id);
      if (entry) {
        // Force disposal regardless of reference count
        entry.referenceCount = 1;
        this.disposeResource(id);
      }
    });

    this.resources.clear();
    this.tagIndex.clear();
    this.disposed = true;

    this.log(`Disposed all ${totalResources} resources`);
  }

  /**
   * Type-specific disposal logic
   */
  private disposeByType(entry: ResourceEntry): void {
    try {
      switch (entry.type) {
        case 'geometry':
          this.disposeGeometry(entry.resource as THREE.BufferGeometry);
          break;
        case 'material':
          this.disposeMaterial(entry.resource as THREE.Material);
          break;
        case 'texture':
          this.disposeTexture(entry.resource as THREE.Texture);
          break;
        case 'mesh':
          this.disposeMesh(entry.resource as THREE.Mesh);
          break;
        case 'audio':
          this.disposeAudio(entry.resource as Howl | HTMLAudioElement);
          break;
      }
    } catch (error) {
      this.log(`Error disposing ${entry.type} ${entry.id}: ${error}`, 'error');
    }
  }

  /**
   * Dispose Three.js BufferGeometry
   */
  private disposeGeometry(geometry: THREE.BufferGeometry): void {
    if (geometry && typeof geometry.dispose === 'function') {
      geometry.dispose();
    }
  }

  /**
   * Dispose Three.js Material
   */
  private disposeMaterial(material: THREE.Material): void {
    if (!material) return;

    // Dispose textures in material
    if ('map' in material && material.map) {
      this.disposeTexture(material.map as THREE.Texture);
    }
    if ('normalMap' in material && material.normalMap) {
      this.disposeTexture(material.normalMap as THREE.Texture);
    }
    if ('roughnessMap' in material && material.roughnessMap) {
      this.disposeTexture(material.roughnessMap as THREE.Texture);
    }
    if ('metalnessMap' in material && material.metalnessMap) {
      this.disposeTexture(material.metalnessMap as THREE.Texture);
    }
    if ('alphaMap' in material && material.alphaMap) {
      this.disposeTexture(material.alphaMap as THREE.Texture);
    }
    if ('emissiveMap' in material && material.emissiveMap) {
      this.disposeTexture(material.emissiveMap as THREE.Texture);
    }
    if ('envMap' in material && material.envMap) {
      this.disposeTexture(material.envMap as THREE.Texture);
    }

    // Dispose the material itself
    if (typeof material.dispose === 'function') {
      material.dispose();
    }
  }

  /**
   * Dispose Three.js Texture
   */
  private disposeTexture(texture: THREE.Texture): void {
    if (texture && typeof texture.dispose === 'function') {
      texture.dispose();
    }
  }

  /**
   * Dispose Three.js Mesh
   */
  private disposeMesh(mesh: THREE.Mesh): void {
    if (!mesh) return;

    // Remove from parent if needed
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }

    // Clear the mesh (removes geometry and material references)
    if (typeof mesh.clear === 'function') {
      mesh.clear();
    }
  }

  /**
   * Dispose audio resource
   */
  private disposeAudio(audio: Howl | HTMLAudioElement): void {
    if (!audio) return;

    if (audio instanceof Howl) {
      // Stop and unload Howl instance
      audio.stop();
      audio.unload();
    } else if (audio instanceof HTMLAudioElement) {
      // Stop and clean up HTMLAudioElement
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
      audio.load();
    }
  }

  /**
   * Get resource by ID
   */
  public getResource<T = any>(id: string): T | null {
    const entry = this.resources.get(id);
    if (entry) {
      entry.lastAccessed = Date.now();
      return entry.resource as T;
    }
    return null;
  }

  /**
   * Check if resource exists
   */
  public hasResource(id: string): boolean {
    return this.resources.has(id);
  }

  /**
   * Get all resources with a specific tag
   */
  public getResourcesByTag(tag: string): string[] {
    const resourceIds = this.tagIndex.get(tag);
    return resourceIds ? Array.from(resourceIds) : [];
  }

  /**
   * Get all tags currently in use
   */
  public getAllTags(): Set<string> {
    return new Set(this.tagIndex.keys());
  }

  /**
   * Add tag to existing resource
   */
  public addTag(id: string, tag: string): void {
    const entry = this.resources.get(id);
    if (entry) {
      entry.tags.add(tag);
      
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(id);
      
      this.log(`Added tag '${tag}' to resource: ${id}`);
    }
  }

  /**
   * Remove tag from existing resource
   */
  public removeTag(id: string, tag: string): void {
    const entry = this.resources.get(id);
    if (entry) {
      entry.tags.delete(tag);
      
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(id);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
      
      this.log(`Removed tag '${tag}' from resource: ${id}`);
    }
  }

  /**
   * Get memory statistics
   */
  public getStats(): ResourceStats {
    const stats: ResourceStats = {
      geometries: 0,
      materials: 0,
      textures: 0,
      meshes: 0,
      audio: 0,
      totalMemoryEstimate: 0,
      oldestResource: 0,
      newestResource: 0
    };

    let oldestTime = Infinity;
    let newestTime = 0;

    this.resources.forEach(entry => {
      // Count by type
      switch (entry.type) {
        case 'geometry':
          stats.geometries++;
          stats.totalMemoryEstimate += this.estimateGeometryMemory(entry.resource as THREE.BufferGeometry);
          break;
        case 'material':
          stats.materials++;
          stats.totalMemoryEstimate += 1024; // Rough estimate for material
          break;
        case 'texture':
          stats.textures++;
          stats.totalMemoryEstimate += this.estimateTextureMemory(entry.resource as THREE.Texture);
          break;
        case 'mesh':
          stats.meshes++;
          break;
        case 'audio':
          stats.audio++;
          stats.totalMemoryEstimate += 1024 * 1024; // Rough estimate for audio
          break;
      }

      // Track oldest and newest
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        stats.oldestResource = entry.createdAt;
      }
      if (entry.createdAt > newestTime) {
        newestTime = entry.createdAt;
        stats.newestResource = entry.createdAt;
      }
    });

    return stats;
  }

  /**
   * Estimate memory usage of a geometry
   */
  private estimateGeometryMemory(geometry: THREE.BufferGeometry): number {
    let memory = 0;
    
    if (geometry.attributes) {
      for (const name in geometry.attributes) {
        const attribute = geometry.attributes[name];
        if (attribute && attribute.array) {
          memory += attribute.array.byteLength;
        }
      }
    }
    
    if (geometry.index && geometry.index.array) {
      memory += geometry.index.array.byteLength;
    }
    
    return memory;
  }

  /**
   * Estimate memory usage of a texture
   */
  private estimateTextureMemory(texture: THREE.Texture): number {
    if (!texture.image) return 0;
    
    const image = texture.image;
    let width = 0, height = 0;
    
    if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement) {
      width = image.width;
      height = image.height;
    } else if (image.width && image.height) {
      width = image.width;
      height = image.height;
    }
    
    // Assume 4 bytes per pixel (RGBA)
    return width * height * 4;
  }

  /**
   * Log current memory status with enhanced GPU and WebGL information
   */
  public logMemoryStatus(): void {
    const stats = this.getStats();
    
    // Enhanced memory status with color coding
    console.group('%c[ResourceManager] Enhanced Memory Status', 'color: #4a90e2; font-weight: bold');
    
    // Resource counts with trends
    const prevResourceCount = (this as any).prevResourceCount || 0;
    const resourceCountDelta = this.resources.size - prevResourceCount;
    const trendColor = resourceCountDelta > 0 ? '#ff0000' : resourceCountDelta < 0 ? '#00ff00' : '#888888';
    const trendArrow = resourceCountDelta > 0 ? '↑' : resourceCountDelta < 0 ? '↓' : '→';
    
    console.log('%cResource Counts:', 'font-weight: bold');
    console.log(`  Geometries: ${stats.geometries}`);
    console.log(`  Materials: ${stats.materials}`);
    console.log(`  Textures: ${stats.textures}`);
    console.log(`  Meshes: ${stats.meshes}`);
    console.log(`  Audio: ${stats.audio}`);
    console.log(`  %cTotal Resources: ${this.resources.size} ${trendArrow} (${resourceCountDelta >= 0 ? '+' : ''}${resourceCountDelta})`, `color: ${trendColor}`);
    console.log(`  Tags in use: ${this.tagIndex.size}`);
    
    // Memory estimates including GPU
    console.log('\n%cMemory Estimates:', 'font-weight: bold');
    const cpuMemory = stats.totalMemoryEstimate / 1024 / 1024;
    const gpuMemoryEstimate = this.estimateGPUMemory();
    const totalMemory = cpuMemory + gpuMemoryEstimate;
    
    console.log(`  CPU Memory: ${cpuMemory.toFixed(2)} MB`);
    console.log(`  GPU Memory (est): ${gpuMemoryEstimate.toFixed(2)} MB`);
    console.log(`  %cTotal Estimated: ${totalMemory.toFixed(2)} MB`, 'color: #ffa500; font-weight: bold');
    
    // WebGL context information
    console.log('\n%cWebGL Context Information:', 'font-weight: bold');
    const webglInfo = this.getWebGLInfo();
    console.log(`  Active WebGL Contexts: ${webglInfo.contextCount}`);
    console.log(`  Max Texture Size: ${webglInfo.maxTextureSize}px`);
    console.log(`  Max Render Buffer Size: ${webglInfo.maxRenderBufferSize}px`);
    console.log(`  Available Extensions: ${webglInfo.extensions}`);
    
    if (webglInfo.memoryInfo) {
      console.log(`  GPU Memory Total: ${(webglInfo.memoryInfo.totalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  GPU Memory Available: ${(webglInfo.memoryInfo.availableMemory / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // Resource age information
    if (stats.oldestResource > 0) {
      const ageMs = Date.now() - stats.oldestResource;
      console.log(`\n%cResource Age:`, 'font-weight: bold');
      console.log(`  Oldest: ${(ageMs / 1000).toFixed(1)} seconds`);
      console.log(`  Newest: ${((Date.now() - stats.newestResource) / 1000).toFixed(1)} seconds`);
    }
    
    // Resource trends (keep track of previous values)
    (this as any).prevResourceCount = this.resources.size;
    
    // Log resources by tag
    if (this.tagIndex.size > 0) {
      console.log('\n%cResources by Tag:', 'font-weight: bold');
      const sortedTags = Array.from(this.tagIndex.entries())
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 10); // Top 10 tags
        
      sortedTags.forEach(([tag, ids]) => {
        const percentage = ((ids.size / this.resources.size) * 100).toFixed(1);
        console.log(`  ${tag}: ${ids.size} resources (${percentage}%)`);
      });
    }
    
    // Long-lived resources (potential memory leaks)
    const longLivedThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const longLived: string[] = [];
    
    this.resources.forEach((entry, id) => {
      if (now - entry.createdAt > longLivedThreshold) {
        longLived.push(`${id} (${entry.type}, refs: ${entry.referenceCount})`);
      }
    });
    
    if (longLived.length > 0) {
      console.log(`\n%cPotential Memory Leaks (>5 min):`, 'color: #ff0000; font-weight: bold');
      longLived.slice(0, 5).forEach(resource => console.log(`  ${resource}`));
      if (longLived.length > 5) {
        console.log(`  ... and ${longLived.length - 5} more`);
      }
    }
    
    // Performance memory API if available
    if (performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      console.log('\n%cBrowser Memory (performance.memory):', 'font-weight: bold');
      console.log(`  JS Heap Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  JS Heap Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  JS Heap Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
      const heapUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      const heapColor = heapUsage > 90 ? '#ff0000' : heapUsage > 70 ? '#ffa500' : '#00ff00';
      console.log(`  %cHeap Usage: ${heapUsage.toFixed(1)}%`, `color: ${heapColor}`);
    }
    
    console.groupEnd();
  }

  /**
   * Estimate GPU memory usage
   */
  private estimateGPUMemory(): number {
    let gpuMemory = 0;
    
    // Estimate based on textures (main GPU memory consumer)
    this.resources.forEach(entry => {
      if (entry.type === 'texture') {
        // Textures typically use more memory on GPU than CPU estimate
        gpuMemory += this.estimateTextureMemory(entry.resource as THREE.Texture) * 1.5;
      } else if (entry.type === 'geometry') {
        // Vertex buffers also consume GPU memory
        gpuMemory += this.estimateGeometryMemory(entry.resource as THREE.BufferGeometry) * 0.5;
      }
    });
    
    return gpuMemory / 1024 / 1024; // Convert to MB
  }

  /**
   * Get WebGL context information
   */
  private getWebGLInfo(): {
    contextCount: number;
    maxTextureSize: number;
    maxRenderBufferSize: number;
    extensions: number;
    memoryInfo?: { totalMemory: number; availableMemory: number };
  } {
    const canvases = document.querySelectorAll('canvas');
    let contextCount = 0;
    let maxTextureSize = 0;
    let maxRenderBufferSize = 0;
    let extensions = 0;
    let memoryInfo: { totalMemory: number; availableMemory: number } | undefined;
    
    canvases.forEach(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) {
        contextCount++;
        
        // Get WebGL capabilities
        if (maxTextureSize === 0) {
          maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
          
          // Count available extensions
          const availableExtensions = gl.getSupportedExtensions();
          if (availableExtensions) {
            extensions = availableExtensions.length;
          }
          
          // Try to get memory info from WEBGL_debug_renderer_info
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            // Some browsers expose memory info in the renderer string
            const memMatch = renderer.match(/(\d+)\s*MB/);
            if (memMatch) {
              const totalMem = parseInt(memMatch[1]) * 1024 * 1024;
              memoryInfo = {
                totalMemory: totalMem,
                availableMemory: totalMem * 0.7 // Rough estimate
              };
            }
          }
        }
      }
    });
    
    return {
      contextCount,
      maxTextureSize,
      maxRenderBufferSize,
      extensions,
      memoryInfo
    };
  }

  /**
   * Clean up resources older than specified age
   */
  public cleanupOldResources(maxAgeMs: number = 10 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    const toClean = Array.from(this.resources.entries())
      .filter(([_, entry]) => {
        const age = now - entry.lastAccessed;
        return age > maxAgeMs && entry.referenceCount === 1;
      })
      .map(([id]) => id);
    
    toClean.forEach(id => {
      if (this.disposeResource(id)) {
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      this.log(`Cleaned up ${cleanedCount} old resources (age > ${maxAgeMs / 1000}s)`);
    }
    
    return cleanedCount;
  }

  /**
   * Internal logging
   */
  private log(message: string, level: 'log' | 'warn' | 'error' = 'log'): void {
    if (!this.debugMode) return;
    
    const timestamp = new Date().toISOString();
    const prefix = '[ResourceManager]';
    
    switch (level) {
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Reset the ResourceManager (mainly for testing)
   */
  public reset(): void {
    this.disposeAll();
    this.resources.clear();
    this.tagIndex.clear();
    this.disposed = false;
    this.log('ResourceManager reset');
  }
}

// Export singleton instance
export const resourceManager = ResourceManager.getInstance();

// Export types for use in other files
export type { ResourceEntry, ResourceStats, ResourceType };
export { ResourceManager };