import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchTimeline, summarizeTimeline } from '@/lib/api/timeline'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  entityType: string
  entityId: string
}

export const EntityTimeline: React.FC<Props> = ({ entityType, entityId }) => {
  const { activeOrgId } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeOrgId) return
    fetchTimeline(activeOrgId, entityType, entityId).then((res) => setEvents(res.timeline || []))
  }, [activeOrgId, entityType, entityId])

  const handleSummarize = async () => {
    if (!activeOrgId) return
    setLoading(true)
    try {
      const res = await summarizeTimeline(activeOrgId, entityType, entityId)
      setSummary(res.summary)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-base">Timeline</CardTitle>
        <Button size="sm" variant="outline" onClick={handleSummarize} disabled={loading}>
          {loading ? 'Summarizing…' : 'Summarize with AI'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            events.map((item, idx) => (
              <div key={`${item.ts}-${idx}`} className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{new Date(item.ts).toLocaleString()} · {item.source} · {item.eventType}</p>
                <p className="text-sm font-medium">{item.summary}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default EntityTimeline
