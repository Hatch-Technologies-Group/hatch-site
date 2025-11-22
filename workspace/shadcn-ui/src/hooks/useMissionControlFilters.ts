import { useSearchParams } from 'react-router-dom'

/**
 * Lightweight helper to surface mission-control scoping (office/team) from URL params.
 * Falls back to nulls when no scope is selected.
 */
export function useMissionControlFilters(): { officeId: string | null; teamId: string | null } {
  const [params] = useSearchParams()
  const officeId = params.get('officeId')
  const teamId = params.get('teamId')
  return { officeId, teamId }
}
