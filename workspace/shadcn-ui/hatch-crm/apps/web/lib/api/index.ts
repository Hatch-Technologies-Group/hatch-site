export async function reindexEntity(entityType: 'client' | 'lead', entityId: string) {
  const res = await fetch('/api/v1/index/entity', {
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
