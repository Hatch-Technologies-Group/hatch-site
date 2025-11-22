import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AgentPerformanceSnapshot, fetchAgentPerformanceDetail } from '@/lib/api/agentPerformance'
import { useOrgId } from '@/lib/hooks/useOrgId'

export const AgentPerformanceDetail: React.FC = () => {
  const orgId = useOrgId()
  const { agentProfileId } = useParams<{ agentProfileId: string }>()
  const [rows, setRows] = useState<AgentPerformanceSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId || !agentProfileId) return
    setLoading(true)
    fetchAgentPerformanceDetail(orgId, agentProfileId)
      .then((data) => setRows(data))
      .catch((err) => {
        console.error(err)
        setError('Failed to load performance history')
      })
      .finally(() => setLoading(false))
  }, [orgId, agentProfileId])

  const latest = rows[0]
  const trend = useMemo(() => rows.slice(0, 20), [rows])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Agent Performance Detail</h1>
          <p className="text-sm text-muted-foreground">Agent: {agentProfileId}</p>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {latest && (
        <div className="grid grid-cols-2 gap-3 border rounded-md p-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Performance score</div>
            <div className="text-xl font-semibold">{latest.performanceScore.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Responsiveness</div>
            <div className="text-lg">{latest.responsivenessScore.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Leads</div>
            <div>{latest.leadsWorked} worked · {latest.leadsConverted} converted</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tasks</div>
            <div>{latest.tasksCompleted} completed · {latest.tasksOverdue} overdue</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Docs</div>
            <div>{latest.documentsIssues} issues · {latest.compliantDocs} approved</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Period</div>
            <div>{new Date(latest.periodStart).toLocaleDateString()} → {new Date(latest.periodEnd).toLocaleDateString()}</div>
          </div>
        </div>
      )}

      {trend.length > 0 && (
        <div className="border rounded-md p-3 text-xs">
          <div className="font-semibold mb-2">Recent snapshots</div>
          <div className="space-y-1">
            {trend.map((row) => (
              <div key={row.id} className="flex justify-between border-b last:border-b-0 py-1">
                <div>{new Date(row.createdAt).toLocaleString()}</div>
                <div className="font-semibold">{row.performanceScore.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
