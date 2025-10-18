// Rim Light Vertex Shader
export const rimLightVertexShader = `
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uPulseIntensity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vPosition = position;
    
    // Add subtle floating animation for rare/legendary
    vec3 pos = position;
    float floatOffset = sin(uTime * uPulseSpeed) * uPulseIntensity * 0.05;
    pos.y += floatOffset;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Rim Light Fragment Shader
export const rimLightFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uRimColor;
  uniform float uRimPower;
  uniform float uRimIntensity;
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uPulseIntensity;
  uniform float uEmissiveIntensity;
  uniform float uProximityIntensity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewPosition;
  
  void main() {
    // Calculate rim lighting
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    rim = pow(rim, uRimPower);
    
    // Pulsing effect
    float pulse = 0.5 + 0.5 * sin(uTime * uPulseSpeed);
    float glowIntensity = uRimIntensity * (1.0 + pulse * uPulseIntensity);
    
    // Apply proximity boost
    glowIntensity *= (1.0 + uProximityIntensity * 0.5);
    
    // Combine base color with rim glow
    vec3 baseColor = uColor;
    vec3 rimGlow = uRimColor * rim * glowIntensity;
    vec3 emissive = uColor * uEmissiveIntensity * (1.0 + pulse * 0.3);
    
    vec3 finalColor = baseColor + rimGlow + emissive;
    
    // Add extra glow for legendary items
    if (uEmissiveIntensity > 0.8) {
      float extraGlow = rim * rim * glowIntensity * 0.5;
      finalColor += uRimColor * extraGlow;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;