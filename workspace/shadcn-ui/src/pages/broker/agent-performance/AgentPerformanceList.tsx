import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAgentPerformance, AgentPerformanceSnapshot, generateAgentPerformance } from '@/lib/api/agentPerformance'
import { useOrgId } from '@/lib/hooks/useOrgId'

function formatSeconds(sec: number) {
  if (!sec) return '—'
  const mins = Math.round(sec / 60)
  return `${mins}m`
}

export const AgentPerformanceList: React.FC = () => {
  const orgId = useOrgId()
  const [rows, setRows] = useState<AgentPerformanceSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    fetchAgentPerformance(orgId)
      .then((data) => setRows(data))
      .catch((err) => {
        console.error(err)
        setError('Failed to load performance data')
      })
      .finally(() => setLoading(false))
  }, [orgId])

  const topFive = useMemo(() => rows.slice(0, 5), [rows])

  async function handleGenerate() {
    if (!orgId) return
    setLoading(true)
    await generateAgentPerformance(orgId).catch((err) => {
      console.error(err)
      setError('Failed to refresh performance snapshots')
    })
    await fetchAgentPerformance(orgId)
      .then((data) => setRows(data))
      .catch((err) => setError('Failed to load performance data'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Agent Performance</h1>
          <p className="text-sm text-muted-foreground">Activity, responsiveness, conversions, and doc health.</p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            className="px-3 py-1 rounded border hover:bg-muted"
            onClick={handleGenerate}
            disabled={loading}
          >
            Refresh scores
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="text-sm text-muted-foreground">No performance snapshots yet.</div>
      )}

      {rows.length > 0 && (
        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-7 px-3 py-2 text-xs font-semibold border-b bg-muted/40">
            <div>Agent</div>
            <div className="text-right">Perf</div>
            <div className="text-right">Leads</div>
            <div className="text-right">Conv</div>
            <div className="text-right">Resp</div>
            <div className="text-right">Tasks</div>
            <div className="text-right">Docs</div>
          </div>
          {rows.map((row) => (
            <Link
              key={row.id}
              to={`/broker/agent-performance/${row.agentProfileId}`}
              className="grid grid-cols-7 px-3 py-2 text-xs border-b last:border-b-0 hover:bg-muted/50"
            >
              <div className="truncate">{row.agentProfileId}</div>
              <div className="text-right font-semibold">{row.performanceScore.toFixed(1)}</div>
              <div className="text-right">{row.leadsWorked}</div>
              <div className="text-right">{row.leadsConverted}</div>
              <div className="text-right">{formatSeconds(row.avgResponseTimeSec)}</div>
              <div className="text-right">
                {row.tasksCompleted}/{row.tasksOverdue > 0 ? `${row.tasksOverdue} overdue` : '0 overdue'}
              </div>
              <div className="text-right">
                {row.documentsIssues > 0 ? `${row.documentsIssues} issues` : `${row.compliantDocs} ok`}
              </div>
            </Link>
          ))}
        </div>
      )}

      {topFive.length > 0 && (
        <div className="border rounded-md p-3">
          <h2 className="text-sm font-semibold mb-2">Top performers</h2>
          <ol className="text-sm list-decimal list-inside space-y-1">
            {topFive.map((row) => (
              <li key={row.id}>
                {row.agentProfileId} · {row.performanceScore.toFixed(1)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
