import { useEffect, useRef, useCallback } from 'react';

interface AutoScrollOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
  offset?: number;
}

/**
 * Hook for auto-scrolling to elements within a scrollable container
 * Useful for mobile panels with long lists
 */
export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
  options: AutoScrollOptions = {}
) {
  const containerRef = useRef<T>(null);
  const selectedItemRef = useRef<HTMLElement | null>(null);

  const {
    behavior = 'smooth',
    block = 'nearest',
    inline = 'nearest',
    offset = 0
  } = options;

  /**
   * Scroll to a specific element by ref
   */
  const scrollToElement = useCallback((element: HTMLElement | null) => {
    if (!element || !containerRef.current) return;

    // Check if element is already visible
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const isVisible =
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom &&
      elementRect.left >= containerRect.left &&
      elementRect.right <= containerRect.right;

    if (!isVisible) {
      element.scrollIntoView({
        behavior,
        block,
        inline
      });

      // Apply offset if specified
      if (offset !== 0 && container.scrollTop !== undefined) {
        container.scrollTop += offset;
      }
    }
  }, [behavior, block, inline, offset]);

  /**
   * Scroll to the selected item
   */
  const scrollToSelected = useCallback(() => {
    scrollToElement(selectedItemRef.current);
  }, [scrollToElement]);

  /**
   * Scroll to the bottom of the container (for new items)
   */
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
  }, [behavior]);

  /**
   * Scroll to the top of the container
   */
  const scrollToTop = useCallback(() => {
    if (!containerRef.current) return;

    containerRef.current.scrollTo({
      top: 0,
      behavior
    });
  }, [behavior]);

  /**
   * Set the currently selected item for auto-scroll
   */
  const setSelectedItem = useCallback((element: HTMLElement | null) => {
    selectedItemRef.current = element;
    scrollToElement(element);
  }, [scrollToElement]);

  return {
    containerRef,
    scrollToElement,
    scrollToSelected,
    scrollToBottom,
    scrollToTop,
    setSelectedItem
  };
}
