'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseScrollSectionsOptions {
  offset?: number;
}

export function useScrollSections(
  ids: string[],
  { offset = 96 }: UseScrollSectionsOptions = {}
) {
  const stableIds = useMemo(() => Array.from(new Set(ids)), [ids]);
  const [activeId, setActiveId] = useState<string | null>(stableIds[0] ?? null);

  useEffect(() => {
    if (typeof window === 'undefined' || !stableIds.length) {
      return;
    }

    const elements = stableIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);

        if (intersecting[0]) {
          setActiveId(intersecting[0].target.id);
          return;
        }

        const nearest = entries
          .map((entry) => ({
            id: entry.target.id,
            distance: Math.abs(entry.target.getBoundingClientRect().top - offset)
          }))
          .sort((a, b) => a.distance - b.distance)[0];

        if (nearest) {
          setActiveId(nearest.id);
        }
      },
      {
        threshold: [0.2, 0.4, 0.6],
        rootMargin: `-${offset}px 0px -40% 0px`
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [offset, stableIds]);

  const scrollTo = useCallback(
    (id: string) => {
      if (typeof window === 'undefined') return;
      const element = document.getElementById(id);
      if (!element) return;

      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    },
    [offset]
  );

  return { activeId, scrollTo };
}
