import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMissionControlOverview } from '@/lib/api/mission-control'
import { useAuth } from '@/contexts/AuthContext'

const LiveActivityPage: React.FC = () => {
  const { activeOrgId } = useAuth()
  const { data } = useQuery({
    queryKey: ['mission-control', 'overview', activeOrgId],
    queryFn: () => fetchMissionControlOverview(activeOrgId!),
    enabled: Boolean(activeOrgId),
    staleTime: 10_000
  })

  if (!activeOrgId) return <p className="p-6 text-sm text-muted-foreground">Select an organization.</p>

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Live Activity</h1>
      <p className="text-sm text-muted-foreground">Who is active right now across listings, transactions, and documents.</p>
      {data ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Active users</p>
            <p className="text-2xl font-semibold">{data.liveActivity.activeUsers}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Listings being viewed</p>
            <p className="text-2xl font-semibold">{data.liveActivity.listingViews}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">Transactions being viewed</p>
            <p className="text-2xl font-semibold">{data.liveActivity.transactionViews}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Loading live data…</p>
      )}
    </div>
  )
}

export default LiveActivityPage
