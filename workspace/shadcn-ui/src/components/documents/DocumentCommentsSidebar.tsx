import React, { useEffect, useState } from 'react'
import {
  fetchFileComments,
  createFileComment,
  deleteFileComment,
  type FileComment
} from '@/lib/api/documents-collab'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'

type Props = {
  fileId: string
}

export const DocumentCommentsSidebar: React.FC<Props> = ({ fileId }) => {
  const { activeOrgId } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<FileComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    if (!activeOrgId) return
    setLoading(true)
    fetchFileComments(activeOrgId, fileId)
      .then(setComments)
      .catch(() => setError('Failed to load comments'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [activeOrgId, fileId])

  const handleAdd = async () => {
    if (!draft.trim() || !activeOrgId) return
    setSubmitting(true)
    try {
      await createFileComment(activeOrgId, fileId, { content: draft.trim() })
      setDraft('')
      load()
    } catch (err) {
      toast({ title: 'Unable to add comment', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!activeOrgId) return
    try {
      await deleteFileComment(activeOrgId, fileId, commentId)
      load()
    } catch (err) {
      toast({ title: 'Unable to delete comment', variant: 'destructive' })
    }
  }

  return (
    <div className="w-80 border-l bg-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h4 className="text-sm font-semibold">Comments</h4>
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading comments…</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="rounded-md border px-2 py-1 text-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(c.createdAt).toLocaleString()}</span>
              <button
                className="text-red-500 hover:underline"
                onClick={() => handleDelete(c.id)}
              >
                Delete
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
      </div>
      <div className="border-t px-3 py-2 space-y-2">
        <textarea
          rows={2}
          className="w-full resize-none text-sm bg-background border rounded px-2 py-1 focus:outline-none focus:ring"
          placeholder="Add a comment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={submitting || !draft.trim()}
          className="w-full rounded bg-blue-600 text-white text-sm py-1 disabled:opacity-50"
        >
          Add Comment
        </button>
      </div>
    </div>
  )
}
