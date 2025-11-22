import { useAuth } from '@/contexts/AuthContext'

const DEV_ORG_ID = import.meta.env.VITE_ORG_ID || 'org-hatch'

export function useOrgId() {
  const { activeOrgId } = useAuth()
  return activeOrgId || DEV_ORG_ID
}
