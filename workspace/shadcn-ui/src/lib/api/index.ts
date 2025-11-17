const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export async function reindexEntity(entityType: 'client' | 'lead', entityId: string) {
  const res = await fetch(`${API_BASE}/index/entity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ entityType, entityId })
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json() as Promise<{ ok: boolean; queued: { entityType: string; entityId: string } }>;
}
