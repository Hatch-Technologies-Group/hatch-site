import React from 'react'
import { useNavigate } from 'react-router-dom'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HatchLogo } from '@/components/HatchLogo'

export default function Register() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="flex items-center text-blue-600 hover:text-blue-700">
            <HatchLogo className="h-12 md:h-16" />
          </Button>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Invite-only</CardTitle>
            <CardDescription>
              Accounts are created through broker invites. Ask your brokerage admin to send you an invite link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate('/login')}>
              Go to login
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

