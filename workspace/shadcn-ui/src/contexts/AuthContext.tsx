'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { apiBaseUrl } from '@/lib/api/client'
import { fetchSession, type SessionMembership, type SessionResponse } from '@/lib/api/session'

interface AuthContextValue {
  loading: boolean
  session: SessionResponse | null
  userId: string | null
  user: SessionResponse['user'] | null
  activeOrgId: string | null
  memberships: SessionMembership[]
  activeMembership: SessionMembership | null
  policies: SessionResponse['policies']
  isBroker: boolean
  refresh: () => Promise<void>
  setActiveOrg: (orgId: string | null) => Promise<void>
  signIn: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  setUser: (session: SessionResponse | null) => void
  isDemoSession: boolean
  enterDemoSession: (orgId?: string | null) => void
  status: 'loading' | 'authenticated' | 'unauthenticated'
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const DEV_TENANT_ID = import.meta.env.VITE_TENANT_ID || 'tenant-hatch'
const DEV_ORG_ID = import.meta.env.VITE_ORG_ID || 'org-hatch'
const DEV_AUTH_CACHE_KEY = 'hatch_dev_auth'
const DEMO_MODE_ENABLED = (import.meta.env.VITE_DEMO_MODE ?? 'false').toLowerCase() === 'true'
const DEMO_ORG_ID = import.meta.env.VITE_DEMO_ORG_ID || DEV_ORG_ID
const CAN_CACHE_AUTH = import.meta.env.DEV || DEMO_MODE_ENABLED

type DevAuthPayload = {
  timestamp: number
  session: SessionResponse
}

const buildDevSession = (email: string): SessionResponse => {
  const name = email.split('@')[0] || 'Dev'
  return {
    user: {
      id: `dev-${email}`,
      email,
      globalRole: 'SUPER_ADMIN',
    },
    profile: {
      first_name: name,
      last_name: 'User',
      fallback: true,
    },
    memberships: [
      {
        id: 'dev-membership',
        org_id: DEV_ORG_ID,
        role: 'BROKER_OWNER',
        status: 'active',
        can_manage_billing: true,
        metadata: null,
        org: {
          id: DEV_ORG_ID,
          name: 'Dev Brokerage',
          type: 'BROKERAGE',
          status: 'active',
          billing_email: email,
          stripe_customer_id: null,
          grace_period_ends_at: null,
          metadata: { slug: DEV_TENANT_ID },
        },
      },
    ],
    activeOrgId: DEV_ORG_ID,
    policies: [],
  }
}

const buildDemoSession = (orgId: string): SessionResponse => ({
  user: {
    id: 'demo-user',
    email: 'demo@hatchcrm.app',
    globalRole: 'BROKER_OWNER',
  },
  profile: {
    first_name: 'Demo',
    last_name: 'Broker',
    fallback: true,
  },
  memberships: [
    {
      id: 'demo-membership',
      org_id: orgId,
      role: 'BROKER_OWNER',
      status: 'active',
      can_manage_billing: false,
      metadata: null,
      org: {
        id: orgId,
        name: 'Hatch Demo Brokerage',
        type: 'BROKERAGE',
        status: 'active',
        billing_email: 'demo@hatchcrm.app',
        stripe_customer_id: null,
        grace_period_ends_at: null,
        metadata: { slug: DEV_TENANT_ID },
      },
    },
  ],
  activeOrgId: orgId,
  policies: [],
})

const readDevAuth = (): SessionResponse | null => {
  if (!CAN_CACHE_AUTH || typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(DEV_AUTH_CACHE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DevAuthPayload
    if (!parsed?.session) return null
    return parsed.session
  } catch (error) {
    console.warn('Failed to parse dev auth cache', error)
    window.localStorage.removeItem(DEV_AUTH_CACHE_KEY)
    return null
  }
}

const writeDevAuth = (session: SessionResponse | null) => {
  if (typeof window === 'undefined') return
  if (!CAN_CACHE_AUTH) {
    window.localStorage.removeItem(DEV_AUTH_CACHE_KEY)
    return
  }
  if (!session) {
    window.localStorage.removeItem(DEV_AUTH_CACHE_KEY)
    return
  }
  const payload: DevAuthPayload = { timestamp: Date.now(), session }
  window.localStorage.setItem(DEV_AUTH_CACHE_KEY, JSON.stringify(payload))
}

const normalizeRedirectTo = (value?: string | null) => {
  if (!value) return '/portal'
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/portal'
  return trimmed
}

const buildApiHref = (path: string) => {
  const base = apiBaseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

/* eslint-disable-next-line react-refresh/only-export-components */
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [apiSession, setApiSession] = useState<SessionResponse | null>(null)
  const [devSession, setDevSession] = useState<SessionResponse | null>(null)

  const effectiveSession = devSession ?? apiSession

  const memberships = useMemo(() => effectiveSession?.memberships ?? [], [effectiveSession])
  const activeOrgId = effectiveSession?.activeOrgId ?? null
  const policies = useMemo(() => effectiveSession?.policies ?? [], [effectiveSession])
  const user = effectiveSession?.user ?? null
  const userId = user?.id ?? null

  const activeMembership = useMemo(() => {
    if (!activeOrgId) return null
    return memberships.find((membership) => membership.org_id === activeOrgId && membership.status === 'active') ?? null
  }, [activeOrgId, memberships])

  const isBroker = useMemo(() => {
    const role = activeMembership?.role
    return role === 'BROKER_OWNER' || role === 'BROKER_MANAGER'
  }, [activeMembership?.role])

  const isDemoSession = useMemo(() => (devSession?.user?.id ?? '').startsWith('demo-'), [devSession?.user?.id])

  const refresh = useCallback(async () => {
    if (devSession) return
    try {
      const response = await fetchSession()
      setApiSession(response)
      setStatus('authenticated')
    } catch (error) {
      setApiSession(null)
      setStatus('unauthenticated')
      if (import.meta.env.DEV) {
        console.debug('[Auth] refresh failed', error)
      }
    }
  }, [devSession])

  const setActiveOrg = useCallback(
    async (orgId: string | null) => {
      if (!orgId || !effectiveSession) return
      if (devSession) {
        const next = { ...devSession, activeOrgId: orgId }
        setDevSession(next)
        writeDevAuth(next)
        return
      }
      setApiSession((prev) => (prev ? { ...prev, activeOrgId: orgId } : prev))
    },
    [devSession, effectiveSession]
  )

  const signIn = useCallback(async (redirectTo?: string) => {
    if (DEMO_MODE_ENABLED) {
      const session = buildDemoSession(DEMO_ORG_ID)
      setDevSession(session)
      writeDevAuth(session)
      setStatus('authenticated')
      return
    }

    const normalized = normalizeRedirectTo(redirectTo)
    const href = `${buildApiHref('/auth/cognito/login')}?redirect=${encodeURIComponent(normalized)}`
    window.location.assign(href)
  }, [])

  const signOut = useCallback(async () => {
    if (devSession) {
      setDevSession(null)
      writeDevAuth(null)
      setStatus('unauthenticated')
      return
    }

    try {
      await fetch(buildApiHref('/auth/logout'), { method: 'POST', credentials: 'include' })
    } catch {
      // Best effort; still clear local session.
    }
    setApiSession(null)
    setStatus('unauthenticated')
  }, [devSession])

  const setUser = useCallback((value: SessionResponse | null) => {
    if (value && import.meta.env.DEV && value.user.id.startsWith('dev-')) {
      setDevSession(value)
      writeDevAuth(value)
      setStatus('authenticated')
      return
    }

    setDevSession(null)
    writeDevAuth(null)
    setApiSession(value)
    setStatus(value ? 'authenticated' : 'unauthenticated')
  }, [])

  const enterDemoSession = useCallback(
    (orgId?: string | null) => {
      if (!DEMO_MODE_ENABLED) return
      const targetOrgId = orgId ?? DEMO_ORG_ID
      const session = buildDemoSession(targetOrgId)
      setDevSession(session)
      writeDevAuth(session)
      setStatus('authenticated')
    },
    []
  )

  useEffect(() => {
    if (devSession) return
    const cached = readDevAuth()
    if (cached) {
      setDevSession(cached)
      setStatus('authenticated')
      return
    }
    void refresh()
  }, [devSession, refresh])

  const contextValue: AuthContextValue = useMemo(
    () => ({
      loading: status === 'loading',
      status,
      session: effectiveSession ?? null,
      userId,
      user,
      activeOrgId,
      memberships,
      activeMembership,
      policies,
      isBroker,
      isDemoSession,
      refresh,
      setActiveOrg,
      signIn,
      signOut,
      setUser,
      enterDemoSession,
    }),
    [
      activeMembership,
      activeOrgId,
      effectiveSession,
      enterDemoSession,
      isBroker,
      isDemoSession,
      memberships,
      policies,
      refresh,
      setActiveOrg,
      signIn,
      signOut,
      setUser,
      status,
      user,
      userId,
    ]
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

