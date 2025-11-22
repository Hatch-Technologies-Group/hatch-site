import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

const defaultApiBase =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000'
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || defaultApiBase).replace(/\/$/, '')

function getSocket(orgId: string, userId: string) {
  if (socket) return socket
  socket = io(`${API_BASE}/presence`, {
    transports: ['websocket'],
    query: { orgId, userId }
  })
  return socket
}

export function usePresence(orgId: string | null, userId: string | null, location?: string) {
  const [viewers, setViewers] = useState<Record<string, string[]>>({})
  const locationRef = useRef(location)

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
    if (location) {
      s.emit('presence:update', { location })
    }
    return () => {
      s.off('presence:entity', onEntity)
      clearInterval(heartbeat)
    }
  }, [orgId, userId, location])

  return {
    viewers,
    sendLocation
  }
}
