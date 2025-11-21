import React, { useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import BrokerSidebar from './BrokerSidebar'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { resolveUserIdentity } from '@/lib/utils'
import { HatchLogo } from '@/components/HatchLogo'

interface BrokerLayoutProps {
  showBackButton?: boolean
}

export default function BrokerLayout({ showBackButton = false }: BrokerLayoutProps) {
  const navigate = useNavigate()
  const { session, user } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const { displayName, initials } = useMemo(
    () => resolveUserIdentity(session?.profile, user?.email ?? null, 'Broker'),
    [session?.profile, user?.email]
  )

  return (
    <div className="flex h-screen bg-gray-100">
      <BrokerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.header 
          className="bg-white shadow-sm border-b px-6 py-4"
          {...(shouldReduceMotion ? {} : {
            initial: { y: -20, opacity: 0 },
            animate: { y: 0, opacity: 1 },
            transition: { duration: 0.4 }
          })}
        >
          <div className="flex justify-between items-center">
            <motion.div 
              className="flex items-center"
              {...(shouldReduceMotion ? {} : {
                initial: { x: -20, opacity: 0 },
                animate: { x: 0, opacity: 1 },
                transition: { delay: 0.1, duration: 0.4 }
              })}
            >
              <HatchLogo className="h-7" />
              <span className="ml-3 text-xl font-semibold text-gray-900">Broker Portal</span>
            </motion.div>
            
            {/* Public Site Navigation */}
            <motion.div 
              className="flex items-center space-x-4"
              {...(shouldReduceMotion ? {} : {
                initial: { x: 20, opacity: 0 },
                animate: { x: 0, opacity: 1 },
                transition: { delay: 0.2, duration: 0.4 }
              })}
            >
              <motion.div {...(shouldReduceMotion ? {} : { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } })}>
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 border-gray-300 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>View Public Site</span>
                </Button>
              </motion.div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium">{initials}</span>
                </div>
                <span className="text-gray-700 font-medium">{displayName}</span>
              </div>
            </motion.div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
