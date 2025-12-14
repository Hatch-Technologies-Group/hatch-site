import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, LogIn } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, user, loading } = useAuth()
  const redirectState = location.state as { from?: string } | null
  const redirectTo = useMemo(() => {
    const from = redirectState?.from
    return from && typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/portal'
  }, [redirectState?.from])

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true })
    } else if (!loading) {
      setSubmitting(false)
    }
  }, [loading, navigate, redirectTo, user])

  const handleContinue = useCallback(() => {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    signIn(redirectTo).catch((authError) => {
      const message = authError instanceof Error ? authError.message : 'Unable to start sign-in. Please try again.'
      setError(message)
      setSubmitting(false)
    })
  }, [redirectTo, signIn, submitting])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Sign in to your Hatch portal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50 text-red-700">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="button" className="w-full" disabled={submitting} onClick={handleContinue}>
              {submitting ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in…</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Continue
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
