import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let socketIdentity: { baseUrl: string; orgId: string; userId: string } | null = null

const DEFAULT_API_ORIGIN =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000'

const resolveApiOrigin = () => {
  const raw = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim()
  if (!raw) return DEFAULT_API_ORIGIN

  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return DEFAULT_API_ORIGIN
  }

  try {
    return new URL(raw).origin
  } catch {
    return DEFAULT_API_ORIGIN
  }
}

const API_ORIGIN = resolveApiOrigin().replace(/\/$/, '')

function getSocket(orgId: string, userId: string) {
  if (socket && socketIdentity?.orgId === orgId && socketIdentity?.userId === userId && socketIdentity?.baseUrl === API_ORIGIN) {
    return socket
  }

  if (socket) {
    socket.disconnect()
  }

  socketIdentity = { baseUrl: API_ORIGIN, orgId, userId }
  socket = io(`${API_ORIGIN}/presence`, {
    transports: ['websocket'],
    query: { orgId, userId }
  })
  return socket
}

export function usePresence(orgId: string | null, userId: string | null, location?: string) {
  const [viewers, setViewers] = useState<Record<string, string[]>>({})
  const locationRef = useRef(location)

  useEffect(() => {
    locationRef.current = location
  }, [location])

  const sendLocation = useCallback(
    (loc: string) => {
      locationRef.current = loc
      if (!orgId || !userId || !socket) return
      socket.emit('presence:update', { location: loc })
    },
    [orgId, userId]
  )

  useEffect(() => {
    if (!orgId || !userId) return
    const s = getSocket(orgId, userId)
    const onEntity = (payload: { location: string; viewers: Array<{ userId: string }> }) => {
      setViewers((prev) => ({ ...prev, [payload.location]: payload.viewers.map((v) => v.userId) }))
    }
    s.on('presence:entity', onEntity)
    const heartbeat = setInterval(() => {
      s.emit('presence:heartbeat')
      if (locationRef.current) {
        s.emit('presence:update', { location: locationRef.current })
      }
    }, 10_000)
    if (locationRef.current) {
      s.emit('presence:update', { location: locationRef.current })
    }
    return () => {
      s.off('presence:entity', onEntity)
      clearInterval(heartbeat)
      if (socket === s) {
        s.disconnect()
        socket = null
        socketIdentity = null
      }
    }
  }, [orgId, userId])

  return {
    viewers,
    sendLocation
  }
}
