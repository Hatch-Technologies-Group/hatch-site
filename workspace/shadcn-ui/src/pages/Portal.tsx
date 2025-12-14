import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { useUserRole } from '@/lib/auth/roles'
import { fetchAgentPortalConfig } from '@/lib/api/agent-portal'

const DEFAULT_AGENT_LANDING_PATH = '/broker/crm'

const normalizeBrokerPath = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed.startsWith('/broker/') || trimmed.startsWith('//') || trimmed.includes('..') || trimmed.includes('\\')) {
    return fallback
  }
  return trimmed
}

export default function Portal() {
  const { status, user, activeOrgId } = useAuth()
  const role = useUserRole()
  const location = useLocation()
  const redirectPath = `${location.pathname}${location.search}${location.hash}`

  const orgId = activeOrgId ?? (import.meta.env.VITE_ORG_ID || null)
  const agentPortalQuery = useQuery({
    queryKey: ['agent-portal-config', orgId],
    queryFn: () => fetchAgentPortalConfig(orgId as string),
    enabled: role === 'AGENT' && !!user && !!orgId,
    staleTime: 60_000
  })

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Loading your portal…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: redirectPath }} />
  }

  if (role === 'AGENT') {
    if (agentPortalQuery.isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
            Loading your agent portal…
          </div>
        </div>
      )
    }

    const fallback = DEFAULT_AGENT_LANDING_PATH
    const landingCandidate = agentPortalQuery.data?.landingPath ?? agentPortalQuery.data?.allowedPaths?.[0] ?? fallback
    const landingPath = normalizeBrokerPath(landingCandidate, fallback)
    return <Navigate to={landingPath} replace />
  }

  return <Navigate to="/broker/mission-control" replace />
}
