export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionLike {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface ColorLike {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface TransformData {
  position?: Vector3Like;
  rotation?: Vector3Like | QuaternionLike;
  scale?: Vector3Like;
}

export interface MeshOptions {
  id: string;
  type: 'box' | 'sphere' | 'plane' | 'cylinder' | 'custom';
  transform?: TransformData;
  color?: ColorLike;
  texture?: string;
  opacity?: number;
  emissive?: ColorLike;
  receiveShadows?: boolean;
  castShadows?: boolean;
  userData?: Record<string, unknown>;
}

export interface LightOptions {
  id: string;
  type: 'point' | 'directional' | 'spot' | 'ambient' | 'hemisphere';
  position?: Vector3Like;
  direction?: Vector3Like;
  color?: ColorLike;
  intensity?: number;
  castShadows?: boolean;
}

export interface CameraOptions {
  id: string;
  type: 'perspective' | 'orthographic';
  position?: Vector3Like;
  target?: Vector3Like;
  fov?: number;
  near?: number;
  far?: number;
}

export interface SceneNode {
  id: string;
  type: 'mesh' | 'light' | 'camera' | 'group' | 'empty';
  nativeObject: unknown;
  children: SceneNode[];
  parent: SceneNode | null;
}

export interface RenderingEngineCapabilities {
  name: string;
  version: string;
  supportsWebGL2: boolean;
  supportsWebGPU: boolean;
  maxTextureSize: number;
  supportsInstancing: boolean;
  supportsPostProcessing: boolean;
}

export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

export interface IRenderingEngine {
  readonly name: string;
  readonly capabilities: RenderingEngineCapabilities;

  initialize(canvas: HTMLCanvasElement): Promise<void>;
  dispose(): void;

  createScene(id: string): void;
  disposeScene(id: string): void;
  setActiveScene(id: string): void;
  getActiveSceneId(): string | null;

  createMesh(options: MeshOptions): SceneNode;
  createLight(options: LightOptions): SceneNode;
  createCamera(options: CameraOptions): SceneNode;
  createGroup(id: string): SceneNode;

  removeNode(id: string): void;
  getNode(id: string): SceneNode | null;

  setNodeTransform(id: string, transform: TransformData): void;
  getNodeTransform(id: string): TransformData | null;

  setActiveCamera(id: string): void;
  updateCamera(id: string, options: Partial<CameraOptions>): void;

  loadTexture(url: string): Promise<unknown>;
  loadModel(url: string): Promise<SceneNode>;

  setBackgroundColor(color: ColorLike): void;
  setFog(color: ColorLike, near: number, far: number): void;
  clearFog(): void;

  registerUpdateCallback(id: string, callback: UpdateCallback): void;
  unregisterUpdateCallback(id: string): void;

  startRenderLoop(): void;
  stopRenderLoop(): void;

  resize(): void;
  render(): void;

  getCanvas(): HTMLCanvasElement | null;
  getNativeEngine(): unknown;
  getNativeScene(): unknown;
}

export type RenderingEngineType = 'babylon' | 'three';
