import { useEffect, useRef } from 'react';
import { useFocusState } from '@/lib/stores/ui/useFocusState';

/**
 * Hook to track UI interaction and disable game controls when hovering over UI elements
 * @param elementId - Unique identifier for the UI element
 * @param isEnabled - Whether the tracking is enabled (default: true)
 */
export function useUIInteraction(elementId: string, isEnabled: boolean = true) {
  const elementRef = useRef<HTMLDivElement>(null);
  const { setUIInteraction } = useFocusState();
  
  useEffect(() => {
    if (!isEnabled) return;
    
    const element = elementRef.current;
    if (!element) return;
    
    const handleMouseEnter = () => {
      setUIInteraction(elementId, true);
    };
    
    const handleMouseLeave = () => {
      setUIInteraction(elementId, false);
    };
    
    // Add event listeners
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    
    // Cleanup
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      // Ensure we clear the interaction state on unmount
      setUIInteraction(elementId, false);
    };
  }, [elementId, isEnabled, setUIInteraction]);
  
  return elementRef;
}

/**
 * Alternative hook that works with class names instead of refs
 * Useful for elements that are dynamically created or use portal rendering
 */
export function useUIInteractionByClass(className: string, elementId: string, isEnabled: boolean = true) {
  const { setUIInteraction } = useFocusState();
  
  useEffect(() => {
    if (!isEnabled) return;
    
    const handleMouseEnter = () => {
      setUIInteraction(elementId, true);
    };
    
    const handleMouseLeave = () => {
      setUIInteraction(elementId, false);
    };
    
    // Find all elements with the given class
    const elements = document.querySelectorAll(`.${className}`);
    
    // Add event listeners to all matching elements
    elements.forEach(element => {
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
    });
    
    // Cleanup
    return () => {
      elements.forEach(element => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      });
      // Ensure we clear the interaction state on unmount
      setUIInteraction(elementId, false);
    };
  }, [className, elementId, isEnabled, setUIInteraction]);
}