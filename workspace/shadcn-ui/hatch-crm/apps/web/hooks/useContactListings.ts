'use client';

import { useCallback, useState } from 'react';

export type ContactListingRow = {
  id: string;
  mlsId: string;
  address: string | null;
  price: number | null;
  status: string | null;
  photoUrl?: string | null;
  sent_at?: string | null;
  favorited_at?: string | null;
};

type Page<T> = {
  rows: T[];
  nextCursor?: string | null;
};

async function fetchPage<T>(endpoint: string, cursor?: string | null): Promise<Page<T>> {
  const params = new URLSearchParams();
  if (cursor) {
    params.set('cursor', cursor);
  }

  const url = params.size > 0 ? `${endpoint}?${params.toString()}` : endpoint;
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Failed to fetch contact listings (${response.status})`);
  }

  return response.json();
}

export function useContactListings(contactId: string) {
  const [sent, setSent] = useState<ContactListingRow[]>([]);
  const [sentCursor, setSentCursor] = useState<string | null>(null);
  const [fav, setFav] = useState<ContactListingRow[]>([]);
  const [favCursor, setFavCursor] = useState<string | null>(null);
  const [loadingSent, setLoadingSent] = useState(false);
  const [loadingFav, setLoadingFav] = useState(false);

  const loadSent = useCallback(async () => {
    if (loadingSent) return;
    setLoadingSent(true);

    try {
      const page = await fetchPage<ContactListingRow>(
        `/api/contacts/${contactId}/listings/sent`,
        sentCursor
      );
      setSent((prev) => [...prev, ...page.rows]);
      setSentCursor(page.nextCursor ?? null);
    } catch (error) {
      console.error('Failed to load sent listings', error);
    } finally {
      setLoadingSent(false);
    }
  }, [contactId, loadingSent, sentCursor]);

  const loadFavorites = useCallback(async () => {
    if (loadingFav) return;
    setLoadingFav(true);

    try {
      const page = await fetchPage<ContactListingRow>(
        `/api/contacts/${contactId}/listings/favorites`,
        favCursor
      );
      setFav((prev) => [...prev, ...page.rows]);
      setFavCursor(page.nextCursor ?? null);
    } catch (error) {
      console.error('Failed to load favorite listings', error);
    } finally {
      setLoadingFav(false);
    }
  }, [contactId, favCursor, loadingFav]);

  const reset = useCallback(() => {
    setSent([]);
    setFav([]);
    setSentCursor(null);
    setFavCursor(null);
    setLoadingSent(false);
    setLoadingFav(false);
  }, []);

  return {
    sent,
    favorites: fav,
    loadSent,
    loadFavorites,
    reset,
    loadingSent,
    loadingFav,
    canLoadMoreSent: Boolean(sentCursor),
    canLoadMoreFavorites: Boolean(favCursor)
  };
}
