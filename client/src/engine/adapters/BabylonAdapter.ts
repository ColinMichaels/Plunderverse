import {
  Engine,
  Scene,
  ArcRotateCamera,
  FreeCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  PointLight,
  DirectionalLight,
  SpotLight,
  MeshBuilder,
  StandardMaterial,
  Texture,
  CubeTexture,
  TransformNode,
  AbstractMesh,
  SceneLoader,
  Quaternion,
  ParticleSystem,
  GPUParticleSystem,
  GlowLayer,
  DefaultRenderingPipeline
} from '@babylonjs/core';
import '@babylonjs/loaders';

import type {
  IRenderingEngine,
  RenderingEngineCapabilities,
  SceneNode,
  MeshOptions,
  LightOptions,
  CameraOptions,
  TransformData,
  UpdateCallback,
  ColorLike,
  Vector3Like,
  PostProcessingOptions,
  ParticleSystemOptions
} from '../interfaces/RenderingEngine';

interface SceneData {
  scene: Scene;
  nodes: Map<string, SceneNode>;
  particleSystems: Map<string, ParticleSystem | GPUParticleSystem>;
  glowLayer: GlowLayer | null;
  renderingPipeline: DefaultRenderingPipeline | null;
  skybox: AbstractMesh | null;
}

export class BabylonAdapter implements IRenderingEngine {
  readonly name = 'babylon';
  private engine: Engine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private scenes: Map<string, SceneData> = new Map();
  private activeSceneId: string | null = null;
  private updateCallbacks: Map<string, UpdateCallback> = new Map();
  private isRunning = false;
  private lastTime = 0;

  get capabilities(): RenderingEngineCapabilities {
    return {
      name: 'Babylon.js',
      version: '8.x',
      supportsWebGL2: true,
      supportsWebGPU: this.engine?.isWebGPU ?? false,
      maxTextureSize: this.engine?.getCaps().maxTextureSize ?? 4096,
      supportsInstancing: true,
      supportsPostProcessing: true
    };
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    console.log('[BabylonAdapter] Starting initialization with canvas:', canvas);
    this.canvas = canvas;
    
    // Dispose any existing engine first
    if (this.engine) {
      console.log('[BabylonAdapter] Disposing existing engine before reinitializing');
      this.stopRenderLoop();
      this.scenes.forEach((data) => data.scene.dispose());
      this.scenes.clear();
      this.engine.dispose();
      this.engine = null;
    }
    
    try {
      console.log('[BabylonAdapter] Creating new Babylon Engine...');
      this.engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
      });
      console.log('[BabylonAdapter] Engine created:', this.engine);
      
      if (!this.engine) {
        throw new Error('Engine creation returned null');
      }
      
      console.log('[BabylonAdapter] Engine initialized successfully');
    } catch (error) {
      console.error('[BabylonAdapter] Failed to create engine:', error);
      throw error;
    }
  }

  dispose(): void {
    this.stopRenderLoop();
    this.scenes.forEach((data) => data.scene.dispose());
    this.scenes.clear();
    this.engine?.dispose();
    this.engine = null;
    this.canvas = null;
    console.log('[BabylonAdapter] Disposed');
  }

  createScene(id: string): void {
    if (!this.engine) {
      console.error('[BabylonAdapter] Cannot create scene - engine not initialized');
      throw new Error('Engine not initialized');
    }
    
    const scene = new Scene(this.engine);
    scene.clearColor = new Color4(0, 0, 0, 1);
    
    this.scenes.set(id, {
      scene,
      nodes: new Map(),
      particleSystems: new Map(),
      glowLayer: null,
      renderingPipeline: null,
      skybox: null
    });

    if (!this.activeSceneId) {
      this.activeSceneId = id;
    }

    console.log(`[BabylonAdapter] Scene created: ${id}`);
  }

  disposeScene(id: string): void {
    const data = this.scenes.get(id);
    if (data) {
      data.particleSystems.forEach((ps) => ps.dispose());
      data.particleSystems.clear();
      if (data.glowLayer) {
        data.glowLayer.dispose();
        data.glowLayer = null;
      }
      if (data.renderingPipeline) {
        data.renderingPipeline.dispose();
        data.renderingPipeline = null;
      }
      if (data.skybox) {
        data.skybox.dispose();
        data.skybox = null;
      }
      data.scene.dispose();
      this.scenes.delete(id);
      if (this.activeSceneId === id) {
        this.activeSceneId = this.scenes.keys().next().value ?? null;
      }
    }
  }

  setActiveScene(id: string): void {
    if (this.scenes.has(id)) {
      this.activeSceneId = id;
    }
  }

  getActiveSceneId(): string | null {
    return this.activeSceneId;
  }

  private getActiveSceneData(): SceneData | null {
    if (!this.activeSceneId) return null;
    return this.scenes.get(this.activeSceneId) ?? null;
  }

  private getActiveScene(): Scene | null {
    return this.getActiveSceneData()?.scene ?? null;
  }

  createMesh(options: MeshOptions): SceneNode {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    let mesh: AbstractMesh;

    switch (options.type) {
      case 'box':
        mesh = MeshBuilder.CreateBox(options.id, { size: 1 }, scene);
        break;
      case 'sphere':
        mesh = MeshBuilder.CreateSphere(options.id, { diameter: 1, segments: 32 }, scene);
        break;
      case 'plane':
        mesh = MeshBuilder.CreatePlane(options.id, { size: 1 }, scene);
        break;
      case 'cylinder':
        mesh = MeshBuilder.CreateCylinder(options.id, { height: 1, diameter: 1 }, scene);
        break;
      default:
        mesh = MeshBuilder.CreateBox(options.id, { size: 1 }, scene);
    }

    const material = new StandardMaterial(`${options.id}_mat`, scene);
    
    if (options.color) {
      material.diffuseColor = new Color3(options.color.r, options.color.g, options.color.b);
    }
    
    if (options.emissive) {
      material.emissiveColor = new Color3(options.emissive.r, options.emissive.g, options.emissive.b);
    }

    if (options.opacity !== undefined) {
      material.alpha = options.opacity;
    }

    if (options.texture) {
      material.diffuseTexture = new Texture(options.texture, scene);
    }

    mesh.material = material;
    mesh.receiveShadows = options.receiveShadows ?? false;

    if (options.transform) {
      this.applyTransformToMesh(mesh, options.transform);
    }

    const node: SceneNode = {
      id: options.id,
      type: 'mesh',
      nativeObject: mesh,
      children: [],
      parent: null
    };

    this.getActiveSceneData()?.nodes.set(options.id, node);
    return node;
  }

  createLight(options: LightOptions): SceneNode {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    let light: HemisphericLight | PointLight | DirectionalLight | SpotLight;
    const pos = options.position ?? { x: 0, y: 10, z: 0 };
    const dir = options.direction ?? { x: 0, y: -1, z: 0 };

    switch (options.type) {
      case 'hemisphere':
      case 'ambient':
        light = new HemisphericLight(
          options.id,
          new Vector3(dir.x, dir.y, dir.z),
          scene
        );
        break;
      case 'point':
        light = new PointLight(
          options.id,
          new Vector3(pos.x, pos.y, pos.z),
          scene
        );
        break;
      case 'directional':
        light = new DirectionalLight(
          options.id,
          new Vector3(dir.x, dir.y, dir.z),
          scene
        );
        if (options.position) {
          (light as DirectionalLight).position = new Vector3(pos.x, pos.y, pos.z);
        }
        break;
      case 'spot':
        light = new SpotLight(
          options.id,
          new Vector3(pos.x, pos.y, pos.z),
          new Vector3(dir.x, dir.y, dir.z),
          Math.PI / 4,
          2,
          scene
        );
        break;
      default:
        light = new HemisphericLight(options.id, new Vector3(0, 1, 0), scene);
    }

    if (options.color) {
      light.diffuse = new Color3(options.color.r, options.color.g, options.color.b);
    }

    if (options.intensity !== undefined) {
      light.intensity = options.intensity;
    }

    const node: SceneNode = {
      id: options.id,
      type: 'light',
      nativeObject: light,
      children: [],
      parent: null
    };

    this.getActiveSceneData()?.nodes.set(options.id, node);
    return node;
  }

  createCamera(options: CameraOptions): SceneNode {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const pos = options.position ?? { x: 0, y: 5, z: -10 };
    const target = options.target ?? { x: 0, y: 0, z: 0 };

    let camera: ArcRotateCamera | FreeCamera;

    if (options.type === 'perspective') {
      camera = new FreeCamera(
        options.id,
        new Vector3(pos.x, pos.y, pos.z),
        scene
      );
      camera.setTarget(new Vector3(target.x, target.y, target.z));
      
      if (options.fov) {
        camera.fov = options.fov;
      }
      if (options.near) {
        camera.minZ = options.near;
      }
      if (options.far) {
        camera.maxZ = options.far;
      }
    } else {
      camera = new ArcRotateCamera(
        options.id,
        0,
        Math.PI / 4,
        10,
        new Vector3(target.x, target.y, target.z),
        scene
      );
      camera.position = new Vector3(pos.x, pos.y, pos.z);
    }

    const node: SceneNode = {
      id: options.id,
      type: 'camera',
      nativeObject: camera,
      children: [],
      parent: null
    };

    this.getActiveSceneData()?.nodes.set(options.id, node);
    return node;
  }

  createGroup(id: string): SceneNode {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const group = new TransformNode(id, scene);

    const node: SceneNode = {
      id,
      type: 'group',
      nativeObject: group,
      children: [],
      parent: null
    };

    this.getActiveSceneData()?.nodes.set(id, node);
    return node;
  }

  removeNode(id: string): void {
    const data = this.getActiveSceneData();
    if (!data) return;

    const node = data.nodes.get(id);
    if (node) {
      (node.nativeObject as { dispose?: () => void })?.dispose?.();
      data.nodes.delete(id);
    }
  }

  getNode(id: string): SceneNode | null {
    return this.getActiveSceneData()?.nodes.get(id) ?? null;
  }

  setNodeTransform(id: string, transform: TransformData): void {
    const node = this.getNode(id);
    if (!node) return;

    const obj = node.nativeObject as AbstractMesh | TransformNode;
    this.applyTransformToMesh(obj, transform);
  }

  getNodeTransform(id: string): TransformData | null {
    const node = this.getNode(id);
    if (!node) return null;

    const obj = node.nativeObject as AbstractMesh | TransformNode;
    
    return {
      position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
      rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
      scale: { x: obj.scaling.x, y: obj.scaling.y, z: obj.scaling.z }
    };
  }

  private applyTransformToMesh(mesh: AbstractMesh | TransformNode, transform: TransformData): void {
    if (transform.position) {
      mesh.position = new Vector3(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
    }

    if (transform.rotation) {
      if ('w' in transform.rotation) {
        mesh.rotationQuaternion = new Quaternion(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z,
          transform.rotation.w
        );
      } else {
        mesh.rotation = new Vector3(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z
        );
      }
    }

    if (transform.scale) {
      mesh.scaling = new Vector3(
        transform.scale.x,
        transform.scale.y,
        transform.scale.z
      );
    }
  }

  setActiveCamera(id: string): void {
    const scene = this.getActiveScene();
    const node = this.getNode(id);
    
    if (scene && node && node.type === 'camera') {
      scene.activeCamera = node.nativeObject as ArcRotateCamera | FreeCamera;
    }
  }

  updateCamera(id: string, options: Partial<CameraOptions>): void {
    const node = this.getNode(id);
    if (!node || node.type !== 'camera') return;

    const camera = node.nativeObject as FreeCamera;

    if (options.position) {
      camera.position = new Vector3(
        options.position.x,
        options.position.y,
        options.position.z
      );
    }

    if (options.target) {
      camera.setTarget(new Vector3(
        options.target.x,
        options.target.y,
        options.target.z
      ));
    }

    if (options.fov !== undefined) {
      camera.fov = options.fov;
    }
  }

  setCameraTransform(id: string, transform: { position?: { x: number; y: number; z: number }; target?: { x: number; y: number; z: number } }): void {
    const node = this.getNode(id);
    if (!node || node.type !== 'camera') return;

    const camera = node.nativeObject as FreeCamera;

    if (transform.position) {
      camera.position = new Vector3(
        transform.position.x,
        transform.position.y,
        transform.position.z
      );
    }

    if (transform.target) {
      camera.setTarget(new Vector3(
        transform.target.x,
        transform.target.y,
        transform.target.z
      ));
    }
  }

  async loadTexture(url: string): Promise<unknown> {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    return new Texture(url, scene);
  }

  async loadModel(url: string): Promise<SceneNode> {
    const scene = this.getActiveScene();
    if (!scene) throw new Error('No active scene');

    const result = await SceneLoader.ImportMeshAsync('', url, '', scene);
    const rootMesh = result.meshes[0];
    const id = rootMesh.name || `model_${Date.now()}`;

    const node: SceneNode = {
      id,
      type: 'mesh',
      nativeObject: rootMesh,
      children: [],
      parent: null
    };

    this.getActiveSceneData()?.nodes.set(id, node);
    return node;
  }

  setBackgroundColor(color: ColorLike): void {
    const scene = this.getActiveScene();
    if (scene) {
      scene.clearColor = new Color4(color.r, color.g, color.b, color.a ?? 1);
    }
  }

  setFog(color: ColorLike, near: number, far: number): void {
    const scene = this.getActiveScene();
    if (scene) {
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogColor = new Color3(color.r, color.g, color.b);
      scene.fogStart = near;
      scene.fogEnd = far;
    }
  }

  clearFog(): void {
    const scene = this.getActiveScene();
    if (scene) {
      scene.fogMode = Scene.FOGMODE_NONE;
    }
  }

  registerUpdateCallback(id: string, callback: UpdateCallback): void {
    this.updateCallbacks.set(id, callback);
  }

  unregisterUpdateCallback(id: string): void {
    this.updateCallbacks.delete(id);
  }

  startRenderLoop(): void {
    if (this.isRunning || !this.engine) return;

    this.isRunning = true;
    this.lastTime = performance.now();

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const deltaTime = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.updateCallbacks.forEach((callback) => {
        callback(deltaTime, now / 1000);
      });

      const scene = this.getActiveScene();
      if (scene && scene.activeCamera) {
        scene.render();
      }
    });

    console.log('[BabylonAdapter] Render loop started');
  }

  stopRenderLoop(): void {
    if (!this.isRunning || !this.engine) return;

    this.engine.stopRenderLoop();
    this.isRunning = false;
    console.log('[BabylonAdapter] Render loop stopped');
  }

  resize(): void {
    this.engine?.resize();
  }

  render(): void {
    this.getActiveScene()?.render();
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  getNativeEngine(): unknown {
    return this.engine;
  }

  getNativeScene(): unknown {
    return this.getActiveScene();
  }

  setSkybox(textureUrl: string): void {
    const data = this.getActiveSceneData();
    if (!data) return;

    if (data.skybox) {
      data.skybox.dispose();
    }

    const skybox = MeshBuilder.CreateBox('skybox', { size: 1000 }, data.scene);
    const skyboxMaterial = new StandardMaterial('skyboxMat', data.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture(textureUrl, data.scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;
    
    data.skybox = skybox;
    console.log('[BabylonAdapter] Skybox created');
  }

  clearSkybox(): void {
    const data = this.getActiveSceneData();
    if (data?.skybox) {
      data.skybox.dispose();
      data.skybox = null;
    }
  }

  setPostProcessing(options: PostProcessingOptions): void {
    const data = this.getActiveSceneData();
    if (!data || !this.engine) return;

    if (options.glow?.enabled) {
      if (!data.glowLayer) {
        data.glowLayer = new GlowLayer('glow', data.scene);
      }
      data.glowLayer.intensity = options.glow.intensity ?? 1.0;
    } else if (data.glowLayer) {
      data.glowLayer.dispose();
      data.glowLayer = null;
    }

    if (options.bloom?.enabled || options.vignette?.enabled || options.chromaticAberration?.enabled) {
      if (!data.scene.activeCamera) {
        console.warn('[BabylonAdapter] Cannot set post-processing: no active camera');
        return;
      }
      if (!data.renderingPipeline) {
        data.renderingPipeline = new DefaultRenderingPipeline(
          'defaultPipeline',
          true,
          data.scene,
          [data.scene.activeCamera]
        );
      }

      const pipeline = data.renderingPipeline;

      if (options.bloom?.enabled) {
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = options.bloom.threshold ?? 0.8;
        pipeline.bloomWeight = options.bloom.intensity ?? 0.3;
        pipeline.bloomKernel = 64;
        pipeline.bloomScale = 0.5;
      } else {
        pipeline.bloomEnabled = false;
      }

      if (options.vignette?.enabled) {
        pipeline.imageProcessingEnabled = true;
        pipeline.imageProcessing.vignetteEnabled = true;
        pipeline.imageProcessing.vignetteWeight = options.vignette.weight ?? 1.5;
        pipeline.imageProcessing.vignetteStretch = 0.5;
      }

      if (options.chromaticAberration?.enabled) {
        pipeline.chromaticAberrationEnabled = true;
        pipeline.chromaticAberration.aberrationAmount = options.chromaticAberration.amount ?? 30;
      } else {
        pipeline.chromaticAberrationEnabled = false;
      }
    }

    console.log('[BabylonAdapter] Post-processing configured');
  }

  clearPostProcessing(): void {
    const data = this.getActiveSceneData();
    if (!data) return;

    if (data.glowLayer) {
      data.glowLayer.dispose();
      data.glowLayer = null;
    }
    if (data.renderingPipeline) {
      data.renderingPipeline.dispose();
      data.renderingPipeline = null;
    }
  }

  createParticleSystem(options: ParticleSystemOptions): string {
    const scene = this.getActiveScene();
    const data = this.getActiveSceneData();
    if (!scene || !data) throw new Error('No active scene');

    let particleSystem: ParticleSystem | GPUParticleSystem;

    if (GPUParticleSystem.IsSupported) {
      particleSystem = new GPUParticleSystem(
        options.id,
        { capacity: options.capacity },
        scene
      );
    } else {
      particleSystem = new ParticleSystem(options.id, options.capacity, scene);
    }

    if (options.textureUrl) {
      particleSystem.particleTexture = new Texture(options.textureUrl, scene);
    }

    particleSystem.emitter = new Vector3(
      options.emitterPosition.x,
      options.emitterPosition.y,
      options.emitterPosition.z
    );

    particleSystem.emitRate = options.emitRate;
    particleSystem.minLifeTime = options.minLifeTime;
    particleSystem.maxLifeTime = options.maxLifeTime;
    particleSystem.minSize = options.minSize;
    particleSystem.maxSize = options.maxSize;

    if (options.color1) {
      particleSystem.color1 = new Color4(
        options.color1.r,
        options.color1.g,
        options.color1.b,
        options.color1.a ?? 1
      );
    }
    if (options.color2) {
      particleSystem.color2 = new Color4(
        options.color2.r,
        options.color2.g,
        options.color2.b,
        options.color2.a ?? 1
      );
    }

    if (options.direction1) {
      particleSystem.direction1 = new Vector3(
        options.direction1.x,
        options.direction1.y,
        options.direction1.z
      );
    }
    if (options.direction2) {
      particleSystem.direction2 = new Vector3(
        options.direction2.x,
        options.direction2.y,
        options.direction2.z
      );
    }

    particleSystem.minEmitPower = options.minEmitPower ?? 1;
    particleSystem.maxEmitPower = options.maxEmitPower ?? 3;

    if (options.gravity) {
      particleSystem.gravity = new Vector3(
        options.gravity.x,
        options.gravity.y,
        options.gravity.z
      );
    }

    data.particleSystems.set(options.id, particleSystem);
    console.log(`[BabylonAdapter] Particle system created: ${options.id}`);
    return options.id;
  }

  startParticleSystem(id: string): void {
    const data = this.getActiveSceneData();
    const ps = data?.particleSystems.get(id);
    if (ps) {
      ps.start();
    }
  }

  stopParticleSystem(id: string): void {
    const data = this.getActiveSceneData();
    const ps = data?.particleSystems.get(id);
    if (ps) {
      ps.stop();
    }
  }

  disposeParticleSystem(id: string): void {
    const data = this.getActiveSceneData();
    const ps = data?.particleSystems.get(id);
    if (ps) {
      ps.dispose();
      data?.particleSystems.delete(id);
    }
  }
}
