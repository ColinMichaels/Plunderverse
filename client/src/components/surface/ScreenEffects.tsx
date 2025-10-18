import React, { useEffect, useRef, useState } from 'react';
import { useMining } from '../../lib/stores/economy/useMining';
import { useSettings } from '../../lib/stores/ui/useSettings';

export const ScreenEffects: React.FC = () => {
  const { miningEffectsIntensity, enableVisualEffects } = useSettings();
  const intensity = miningEffectsIntensity;
  const enabled = enableVisualEffects;
  const flashRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const tintRef = useRef<HTMLDivElement>(null);
  const distortionRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  
  const { isActive, targetResource, clicksCompleted, clicksRequired } = useMining();
  const [lastClickCount, setLastClickCount] = useState(0);

  // Get resource-specific colors and effects
  const getResourceEffects = () => {
    if (!targetResource) return { color: '#ffffff', type: 'default' };
    
    const resourceType = targetResource.type.toLowerCase();
    
    // Metal resources
    if (resourceType.includes('metal') || resourceType.includes('iron') || resourceType.includes('steel')) {
      return { color: '#4488ff', type: 'metal', flash: '#88ccff' };
    }
    // Crystal resources
    if (resourceType.includes('crystal') || resourceType.includes('gem')) {
      return { color: '#ff44ff', type: 'crystal', flash: '#ffaaff' };
    }
    // Mineral/Rock resources
    if (resourceType.includes('mineral') || resourceType.includes('rock') || resourceType.includes('stone')) {
      return { color: '#aa6633', type: 'mineral', flash: '#ccaa88' };
    }
    // Liquid/Gas resources
    if (resourceType.includes('liquid') || resourceType.includes('water') || resourceType.includes('gas')) {
      return { color: '#44ffff', type: 'liquid', flash: '#aaffff' };
    }
    // Gold/Precious
    if (resourceType.includes('gold') || resourceType.includes('precious')) {
      return { color: '#ffcc44', type: 'precious', flash: '#ffff88' };
    }
    
    // Default
    return { color: '#ffffff', type: 'default', flash: '#ffffff' };
  };

  // Trigger flash effect on mining click
  useEffect(() => {
    if (clicksCompleted > lastClickCount && isActive) {
      const effects = getResourceEffects();
      const progress = clicksCompleted / clicksRequired;
      
      // Flash effect
      if (flashRef.current && enabled) {
        const flashIntensity = 0.3 + (progress * 0.4);
        flashRef.current.style.backgroundColor = effects.flash || '#ffffff';
        flashRef.current.style.opacity = (flashIntensity * intensity).toString();
        
        setTimeout(() => {
          if (flashRef.current) {
            flashRef.current.style.opacity = '0';
          }
        }, 100);
      }
      
      // Vignette pulse
      if (vignetteRef.current && enabled) {
        const vignetteIntensity = 0.2 + (progress * 0.3);
        vignetteRef.current.style.opacity = (vignetteIntensity * intensity).toString();
        
        setTimeout(() => {
          if (vignetteRef.current) {
            vignetteRef.current.style.opacity = (0.1 * intensity).toString();
          }
        }, 150);
      }
      
      // Color tint
      if (tintRef.current && enabled) {
        const tintIntensity = 0.05 + (progress * 0.1);
        tintRef.current.style.backgroundColor = effects.color;
        tintRef.current.style.opacity = (tintIntensity * intensity).toString();
      }
      
      // Distortion for legendary resources
      if (distortionRef.current && targetResource?.rarity === 'legendary' && enabled) {
        distortionRef.current.style.opacity = (0.5 * intensity).toString();
        
        setTimeout(() => {
          if (distortionRef.current) {
            distortionRef.current.style.opacity = '0';
          }
        }, 200);
      }
      
      // Dust overlay for minerals
      if (dustRef.current && effects.type === 'mineral' && enabled) {
        dustRef.current.style.opacity = (0.3 * intensity).toString();
        
        setTimeout(() => {
          if (dustRef.current) {
            dustRef.current.style.opacity = '0';
          }
        }, 300);
      }
      
      // Ripple effect for liquids
      if (rippleRef.current && effects.type === 'liquid' && enabled) {
        rippleRef.current.style.opacity = (0.4 * intensity).toString();
        rippleRef.current.style.animation = 'ripple 0.6s ease-out';
        
        setTimeout(() => {
          if (rippleRef.current) {
            rippleRef.current.style.opacity = '0';
            rippleRef.current.style.animation = 'none';
          }
        }, 600);
      }
      
      setLastClickCount(clicksCompleted);
    }
  }, [clicksCompleted, lastClickCount, isActive, targetResource, enabled, intensity, clicksRequired]);

  if (!enabled) return null;

  return (
    <>
      {/* Flash overlay */}
      <div
        ref={flashRef}
        className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-100"
        style={{
          opacity: 0,
          mixBlendMode: 'screen',
        }}
      />
      
      {/* Vignette effect */}
      <div
        ref={vignetteRef}
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          opacity: 0.1 * intensity,
          background: 'radial-gradient(ellipse at center, transparent 30%, black 100%)',
          transition: 'opacity 0.15s ease-out',
        }}
      />
      
      {/* Color tint */}
      <div
        ref={tintRef}
        className="pointer-events-none fixed inset-0 z-30"
        style={{
          opacity: 0,
          mixBlendMode: 'multiply',
          transition: 'opacity 0.3s ease-out',
        }}
      />
      
      {/* Distortion effect for legendary */}
      <div
        ref={distortionRef}
        className="pointer-events-none fixed inset-0 z-45"
        style={{
          opacity: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          animation: 'distortion 0.2s linear',
          transition: 'opacity 0.2s ease-out',
        }}
      />
      
      {/* Dust overlay for minerals */}
      <div
        ref={dustRef}
        className="pointer-events-none fixed inset-0 z-35"
        style={{
          opacity: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(170,102,51,0.3), transparent 70%)',
          transition: 'opacity 0.3s ease-out',
        }}
      />
      
      {/* Ripple effect for liquids */}
      <div
        ref={rippleRef}
        className="pointer-events-none fixed inset-0 z-35"
        style={{
          opacity: 0,
          background: 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(68,255,255,0.2) 40%, transparent 60%)',
        }}
      />
      
      <style>{`
        @keyframes distortion {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          50% { transform: translateX(2px); }
          75% { transform: translateX(-1px); }
          100% { transform: translateX(0); }
        }
        
        @keyframes ripple {
          0% { transform: scale(0.8); }
          100% { transform: scale(1.3); }
        }
      `}</style>
    </>
  );
};