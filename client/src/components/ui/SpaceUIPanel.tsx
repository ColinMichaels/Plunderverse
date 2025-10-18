import React, { useEffect, useRef, ReactNode } from 'react';
import { useUILayout, UIZone } from './UILayoutManager';

export interface SpaceUIPanelProps {
  id: string;
  title: string;
  icon?: string;
  zone: UIZone;
  priority?: number;
  defaultExpanded?: boolean;
  canCollapse?: boolean;
  children: ReactNode;
}

export function SpaceUIPanel({
  id,
  title,
  icon,
  zone,
  priority = 10,
  defaultExpanded = true,
  canCollapse = true,
  children
}: SpaceUIPanelProps) {
  const { registerPanel, unregisterPanel } = useUILayout();
  const childrenRef = useRef(children);
  childrenRef.current = children;

  useEffect(() => {
    registerPanel({
      id,
      title,
      icon,
      zone,
      priority,
      isExpanded: defaultExpanded,
      canCollapse,
      get children() {
        return childrenRef.current;
      }
    });

    return () => unregisterPanel(id);
  }, [id, title, icon, zone, priority, defaultExpanded, canCollapse, registerPanel, unregisterPanel]);

  return null;
}
