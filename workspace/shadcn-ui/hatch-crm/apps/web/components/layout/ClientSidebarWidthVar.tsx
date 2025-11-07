"use client";

import { useEffect, useRef, useState } from 'react';

const COLLAPSED = 72;
const EXPANDED = 248;

export function ClientSidebarWidthVar() {
  const [width, setWidth] = useState(COLLAPSED);
  const pinnedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applyWidth = (hovering: boolean) => {
      const nextWidth = hovering || pinnedRef.current ? EXPANDED : COLLAPSED;
      setWidth(nextWidth);
    };

    const syncPinnedFromStorage = () => {
      const saved = window.localStorage.getItem('sidebar:pinned') === '1';
      pinnedRef.current = saved;
      applyWidth(false);
    };

    syncPinnedFromStorage();

    const handlePinned = (event: Event) => {
      const detail = Boolean((event as CustomEvent<boolean>).detail);
      pinnedRef.current = detail;
      applyWidth(false);
    };

    const handleHover = (event: Event) => {
      const hovering = Boolean((event as CustomEvent<boolean>).detail);
      applyWidth(hovering);
    };

    const handleStorage = () => {
      syncPinnedFromStorage();
    };

    window.addEventListener('sidebar:pinned', handlePinned as EventListener);
    window.addEventListener('sidebar:hover', handleHover as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('sidebar:pinned', handlePinned as EventListener);
      window.removeEventListener('sidebar:hover', handleHover as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--sb-w', `${width}px`);
  }, [width]);

  return null;
}
