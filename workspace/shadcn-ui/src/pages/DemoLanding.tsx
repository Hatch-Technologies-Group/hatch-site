import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { DemoConfig } from '@/lib/demo'
import { useAuth } from '@/contexts/AuthContext'

export default function DemoLanding() {
  const navigate = useNavigate()
  const { enterDemoSession } = useAuth()

  useEffect(() => {
    if (!DemoConfig.enabled || !DemoConfig.orgId) {
      navigate('/')
      return
    }

    enterDemoSession(DemoConfig.orgId)
    navigate('/broker/mission-control', { replace: true })
  }, [enterDemoSession, navigate])

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
        Initialising demo environment…
      </div>
    </div>
  )
}
