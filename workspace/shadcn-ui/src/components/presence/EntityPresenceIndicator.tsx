import React, { useEffect } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePresence } from '@/lib/realtime/presenceSocket'

interface Props {
  entityType: string
  entityId: string
}

export const EntityPresenceIndicator: React.FC<Props> = ({ entityType, entityId }) => {
  const { userId, activeOrgId } = useAuth()
  const location = `${entityType}:${entityId}`
  const { viewers, sendLocation } = usePresence(activeOrgId, userId, location)

  useEffect(() => {
    sendLocation(location)
  }, [location, sendLocation])

  const count = viewers[location]?.length || 0
  if (count <= 1) return null

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
      <Users className="h-3 w-3" />
      <span>{count} viewers</span>
    </div>
  )
}

export default EntityPresenceIndicator
