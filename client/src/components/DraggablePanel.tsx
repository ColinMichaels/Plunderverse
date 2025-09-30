import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DraggablePanelProps {
  children: ReactNode;
  defaultPosition?: Position;
  className?: string;
  handle?: string;
  bounds?: 'parent' | 'window';
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  children,
  defaultPosition = { x: 0, y: 0 },
  className = '',
  handle,
  bounds = 'window',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>(defaultPosition);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const initialPanelPos = useRef<Position>({ x: 0, y: 0 });

  const constrainPosition = (x: number, y: number): Position => {
    if (!panelRef.current) return { x, y };

    const panel = panelRef.current;
    const rect = panel.getBoundingClientRect();

    let maxX: number, maxY: number, minX: number, minY: number;

    if (bounds === 'parent' && panel.parentElement) {
      const parentRect = panel.parentElement.getBoundingClientRect();
      maxX = parentRect.width - rect.width;
      maxY = parentRect.height - rect.height;
      minX = 0;
      minY = 0;
    } else {
      maxX = window.innerWidth - rect.width;
      maxY = window.innerHeight - rect.height;
      minX = 0;
      minY = 0;
    }

    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (!panelRef.current) return;

    const target = e.target as HTMLElement;
    let shouldStartDrag = false;

    if (handle) {
      const handleElement = panelRef.current.querySelector(handle);
      if (handleElement && (handleElement === target || handleElement.contains(target))) {
        shouldStartDrag = true;
      }
    } else {
      shouldStartDrag = true;
    }

    if (shouldStartDrag) {
      e.preventDefault();
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      initialPanelPos.current = { ...position };
      
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    const newX = initialPanelPos.current.x + deltaX;
    const newY = initialPanelPos.current.y + deltaY;

    const constrainedPos = constrainPosition(newX, newY);
    setPosition(constrainedPos);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
  };

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    panel.addEventListener('mousedown', handleMouseDown as any);

    return () => {
      panel.removeEventListener('mousedown', handleMouseDown as any);
    };
  }, [handle, position]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging, position]);

  useEffect(() => {
    const constrainedPos = constrainPosition(position.x, position.y);
    if (constrainedPos.x !== position.x || constrainedPos.y !== position.y) {
      setPosition(constrainedPos);
    }
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  const getCursorStyle = (): string => {
    if (isDragging) return 'grabbing';
    if (handle) return 'default';
    return 'grab';
  };

  return (
    <div
      ref={panelRef}
      className={className}
      data-dragging={isDragging}
      style={{
        position: bounds === 'parent' ? 'absolute' : 'fixed',
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: getCursorStyle(),
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
};

export default DraggablePanel;
