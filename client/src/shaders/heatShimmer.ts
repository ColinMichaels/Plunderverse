// Heat Shimmer Vertex Shader
export const heatShimmerVertexShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uFrequency;
  uniform float uSpeed;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    
    // Apply heat distortion to vertex positions
    vec3 pos = position;
    float distortion = sin(position.x * uFrequency + uTime * uSpeed) * 
                      sin(position.z * uFrequency + uTime * uSpeed) * 
                      uIntensity;
    pos.y += distortion;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Heat Shimmer Fragment Shader
export const heatShimmerFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uDistortionScale;
  uniform float uRefractiveIndex;
  uniform vec3 uColor;
  uniform sampler2D uTexture;
  uniform float uOpacity;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  // Noise function for heat waves
  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  
  float noise(vec2 p) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2
    const float K2 = 0.211324865; // (3-sqrt(3))/6
    
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), 
                                   dot(b, hash(i + o)),
                                   dot(c, hash(i + 1.0)));
    
    return dot(n, vec3(70.0));
  }
  
  void main() {
    // Create heat wave distortion
    vec2 distortedUv = vUv;
    float time = uTime * 0.5;
    
    // Multi-layer noise for more realistic heat waves
    float noiseValue = noise(vUv * uDistortionScale + vec2(time * 0.3, 0.0)) * 0.5;
    noiseValue += noise(vUv * uDistortionScale * 2.0 + vec2(time * 0.2, time * 0.1)) * 0.25;
    noiseValue += noise(vUv * uDistortionScale * 4.0 + vec2(time * 0.1, -time * 0.15)) * 0.125;
    
    // Apply distortion based on height (heat rises)
    float heightFactor = smoothstep(0.0, 1.0, vUv.y);
    vec2 distortion = vec2(noiseValue, noiseValue * 0.5) * uIntensity * heightFactor;
    distortedUv += distortion * 0.1;
    
    // Sample texture with distortion
    vec4 texColor = texture2D(uTexture, distortedUv);
    
    // Apply refraction coloring
    vec3 refractionColor = mix(texColor.rgb, uColor, uRefractiveIndex * 0.1);
    
    // Add shimmer highlights
    float shimmer = sin(noiseValue * 10.0 + time * 2.0) * 0.5 + 0.5;
    shimmer = pow(shimmer, 3.0) * heightFactor;
    refractionColor += vec3(shimmer * 0.1);
    
    // Apply opacity with height gradient
    float finalOpacity = uOpacity * heightFactor;
    
    gl_FragColor = vec4(refractionColor, finalOpacity);
  }
`;

// Screen-space heat distortion shader for post-processing
export const screenSpaceHeatDistortionShader = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  uniform float uHeatHeight;
  
  varying vec2 vUv;
  
  float noise(vec2 p) {
    return sin(p.x * 10.0 + uTime) * sin(p.y * 10.0 + uTime * 0.8) * 0.5 + 0.5;
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Only apply distortion to lower part of screen (where heat would be)
    float heightMask = 1.0 - smoothstep(0.0, uHeatHeight, vUv.y);
    
    // Create heat wave pattern
    float distortionX = noise(uv * 20.0 + vec2(uTime * 0.5, 0.0)) * 2.0 - 1.0;
    float distortionY = noise(uv * 15.0 + vec2(0.0, uTime * 0.3)) * 2.0 - 1.0;
    
    vec2 distortion = vec2(distortionX, distortionY) * uIntensity * heightMask * 0.01;
    
    // Sample with chromatic aberration for heat effect
    vec3 color;
    color.r = texture2D(tDiffuse, uv + distortion * 1.2).r;
    color.g = texture2D(tDiffuse, uv + distortion).g;
    color.b = texture2D(tDiffuse, uv + distortion * 0.8).b;
    
    // Add subtle heat glow
    vec3 heatGlow = vec3(1.0, 0.8, 0.4) * heightMask * uIntensity * 0.05;
    color += heatGlow;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;