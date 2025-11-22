import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAuditLogs, type AuditLogEntry } from '@/lib/api/audit'

const ACTION_TYPES = [
  'LOGIN',
  'LOGOUT',
  'ROLE_CHANGED',
  'MLS_SYNC_TRIGGERED',
  'ACCOUNTING_SYNC_TRIGGERED',
  'NOTIFICATION_PREFS_UPDATED',
  'AI_PERSONA_RUN',
  'AI_PERSONA_CONFIG_CHANGED',
  'ONBOARDING_STATE_CHANGED',
  'OFFBOARDING_STATE_CHANGED',
  'COMPLIANCE_STATUS_CHANGED',
  'OTHER'
]

export default function BrokerAuditLogPage() {
  const { activeOrgId, isBroker, user } = useAuth()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const canView = useMemo(() => {
    if (isBroker) return true
    return user?.globalRole === 'SUPER_ADMIN'
  }, [isBroker, user?.globalRole])

  useEffect(() => {
    let mounted = true
    if (!activeOrgId || !canView) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    fetchAuditLogs(activeOrgId, {
      limit: 100,
      userId: userFilter.trim() || undefined,
      actionType: actionFilter || undefined
    })
      .then((data) => {
        if (!mounted) return
        setLogs(data)
      })
      .catch((err) => {
        if (!mounted) return
        console.error(err)
        setError('Failed to load audit logs.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [activeOrgId, canView, userFilter, actionFilter])

  if (!activeOrgId) {
    return <ErrorState message="Select an organization to view audit history." />
  }

  if (!canView) {
    return <ErrorState message="You are not authorized to view the audit log." />
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Security</p>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Review sensitive actions across your brokerage, including MLS syncs, accounting events, AI runs, and preference changes.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
          <div className="flex w-full flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">User ID</label>
              <Input
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                placeholder="Filter by user id"
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action type</label>
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">All actions</option>
                {ACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setUserFilter('')
                setActionFilter('')
              }}
            >
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading audit events..." />
          ) : error ? (
            <ErrorState message={error} />
          ) : logs.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No audit events recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 text-left">Timestamp</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-slate-600">{log.userId ?? 'System'}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{log.actionType}</td>
                      <td className="px-3 py-2 text-slate-700">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Need to investigate further? Visit the{' '}
        <Link to="/broker/mission-control" className="text-blue-600 underline">
          Mission Control dashboard
        </Link>{' '}
        for additional insights.
      </div>
    </div>
  )
}
