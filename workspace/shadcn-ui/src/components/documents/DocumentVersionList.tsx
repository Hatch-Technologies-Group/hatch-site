import React, { useEffect, useState } from 'react'
import { fetchFileVersions, type FileVersion } from '@/lib/api/documents-collab'
import { useAuth } from '@/contexts/AuthContext'

type Props = {
  fileId: string
}

export const DocumentVersionList: React.FC<Props> = ({ fileId }) => {
  const { activeOrgId } = useAuth()
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeOrgId) return
    setLoading(true)
    fetchFileVersions(activeOrgId, fileId)
      .then(setVersions)
      .catch(() => setError('Failed to load versions'))
      .finally(() => setLoading(false))
  }, [activeOrgId, fileId])

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Versions</h4>
      </div>
      {loading && <p className="text-xs text-muted-foreground">Loading versions…</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!loading && versions.length === 0 && <p className="text-xs text-muted-foreground">No versions yet.</p>}
      <ul className="space-y-1 text-sm">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between border rounded px-2 py-1">
            <div>
              <div className="font-semibold text-sm">v{v.versionNumber}</div>
              <div className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</div>
            </div>
            {v.storageKey ? (
              <a
                className="text-xs text-blue-600 hover:underline"
                href={v.storageKey}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
