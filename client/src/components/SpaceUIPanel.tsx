import React, { useEffect, ReactNode } from 'react';
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
  const { registerPanel, unregisterPanel, updatePanel } = useUILayout();

  useEffect(() => {
    registerPanel({
      id,
      title,
      icon,
      zone,
      priority,
      isExpanded: defaultExpanded,
      canCollapse,
      children
    });

    return () => unregisterPanel(id);
  }, [id, title, icon, zone, priority, defaultExpanded, canCollapse, registerPanel, unregisterPanel]);

  // The actual rendering is handled by UILayoutManager
  return null;
}