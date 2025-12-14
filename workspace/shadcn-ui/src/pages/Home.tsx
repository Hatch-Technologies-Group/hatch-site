import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/layout/Navbar'
import { CheckCircle, Clock, Shield, TrendingUp, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const professionalProofPoints = [
  'Pipeline automation, smart routing, and compliance in one command center.',
  'Lead conversion up 38% across teams that deploy Hatch playbooks.',
  'Bulk MLS import, audit-ready documents, and secure messaging keep every deal moving.',
]

const professionalFeatures = [
  {
    icon: TrendingUp,
    title: 'Mission Control',
    description: 'A real-time command center for pipeline health, routing, and performance.',
  },
  {
    icon: Users,
    title: 'Team Operations',
    description: 'Roster, permissions, accountability, and collaboration for brokers and agents.',
  },
  {
    icon: Shield,
    title: 'Compliance Ready',
    description: 'Audit trails, document workflows, and secure messaging built in.',
  },
  {
    icon: Clock,
    title: 'Automation',
    description: 'Playbooks, reminders, and smart workflows that remove busywork.',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, status } = useAuth()

  const requireAuthForBroker = useCallback(
    (target: string) => {
      const destination = target || '/broker/dashboard'
      const isAuthed = status === 'authenticated' && !!user
      if (!isAuthed) {
        navigate('/login', { state: { from: destination } })
        return
      }
      navigate(destination)
    },
    [navigate, status, user]
  )

  useEffect(() => {
    if (!location.hash) return
    const element = document.getElementById(location.hash.replace('#', ''))
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash, location.pathname])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    )

    const elements = document.querySelectorAll('.fade-in')
    elements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [])

  const mountTimeRef = useRef<number>(0)

  useLayoutEffect(() => {
    if (typeof performance === 'undefined') return
    mountTimeRef.current = performance.now()
    performance.mark?.('home-component-mounted')
  }, [])

  useLayoutEffect(() => {
    if (typeof performance === 'undefined') return
    performance.mark?.('home-component-rendered')

    if (import.meta.env.DEV) {
      const totalLoadTime = performance.now()
      const renderTime = performance.now() - mountTimeRef.current
      // eslint-disable-next-line no-console
      console.log(`⏱️ Home component total load time: ${totalLoadTime.toFixed(2)}ms`)
      // eslint-disable-next-line no-console
      console.log(`⚡ Home component render time: ${renderTime.toFixed(2)}ms`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface-background">
      <Navbar />

      <main>
        <section
          id="hero"
          className="relative overflow-hidden bg-gradient-to-b from-ink-50 via-ink-50 to-brand-green-100/40 fade-in"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-brand-gradient blur-3xl opacity-25" />
            <div className="absolute bottom-[-14rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-brand-gradient-soft blur-3xl opacity-60" />
          </div>

          <div className="container relative mx-auto max-w-6xl px-4 py-6xl">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="space-y-7 lg:col-span-7">
                <div className="space-y-5 fade-in">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue-600">
                    For real estate professionals
                  </p>
                  <h1 className="max-w-2xl text-ink-900">
                    Run your brokerage on{' '}
                    <span className="bg-gradient-to-r from-brand-blue-600 via-brand-blue-500 to-brand-green-500 bg-clip-text text-transparent">
                      Hatch
                    </span>
                    .
                  </h1>
                  <p className="max-w-xl text-lg text-ink-500">
                    Modern tools for brokerages, teams, and top agents—mission control, CRM, listings, compliance, and
                    automation in one place.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center fade-in">
                  <Button
                    size="lg"
                    className="transition-all duration-200 hover:scale-105 active:scale-95 will-change-transform"
                    onClick={() => requireAuthForBroker('/broker/dashboard')}
                  >
                    <TrendingUp className="h-5 w-5" />
                    Open Broker Dashboard
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="shadow-none transition-all duration-200 hover:scale-105 active:scale-95 will-change-transform"
                    onClick={() => navigate('/demo')}
                  >
                    Book a demo
                  </Button>
                </div>
              </div>

              <aside className="rounded-[28px] border border-[var(--glass-border)] bg-white/85 p-6 shadow-brand-lg backdrop-blur-xl lg:col-span-5 fade-in">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-green-600">Highlights</p>
                <ul className="mt-5 space-y-3 text-sm text-ink-700">
                  {professionalProofPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 text-brand-green-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button variant="secondary" onClick={() => navigate('/register')} className="w-full sm:w-auto">
                    Create an account
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/login')} className="w-full sm:w-auto">
                    Sign in
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section id="for-pros" className="bg-white py-5xl fade-in">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-blue-600">Platform</p>
              <h2 className="mt-4 text-ink-900">Everything a brokerage needs to move faster</h2>
              <p className="mt-4 text-lg text-ink-600">
                Keep listings, leads, transactions, and team operations aligned—without switching tools.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {professionalFeatures.map((feature) => (
                <Card
                  key={feature.title}
                  className="h-full border border-[var(--border-subtle)] bg-white/95 shadow-brand-md"
                >
                  <CardHeader className="p-6 pb-3">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-600/12 text-brand-blue-600">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-base text-ink-900">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 text-sm text-ink-600">{feature.description}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-5xl fade-in">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="relative overflow-hidden rounded-[32px] bg-brand-gradient px-8 py-12 text-ink-50 shadow-brand-lg">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25)_0,_transparent_60%)]" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <h2 className="text-3xl font-semibold md:text-4xl">Ready to streamline your pipeline?</h2>
                <p className="mt-4 max-w-2xl text-lg text-ink-100">
                  Get your team on Hatch and bring listings, leads, and compliance into one workflow.
                </p>
                <div className="mt-8 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => navigate('/register')}
                    className="bg-ink-50 text-ink-900 hover:bg-white"
                  >
                    Create an account
                  </Button>
                  <Button size="lg" onClick={() => requireAuthForBroker('/broker/dashboard')}>
                    Open Broker Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink-900 py-12 text-ink-300 fade-in">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-ink-50">
                <span className="text-lg font-bold">Hatch</span>
              </div>
              <p className="mt-3 text-sm text-ink-400">
                Hatch is built for real estate professionals—brokerages, teams, and operators.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-ink-100">Product</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Button
                    variant="link"
                    className="p-0 text-ink-300 hover:text-ink-50"
                    onClick={() => requireAuthForBroker('/broker/dashboard')}
                  >
                    Broker dashboard
                  </Button>
                </li>
                <li>
                  <Button
                    variant="link"
                    className="p-0 text-ink-300 hover:text-ink-50"
                    onClick={() => requireAuthForBroker('/broker/pricing')}
                  >
                    Pricing
                  </Button>
                </li>
                <li>
                  <Button
                    variant="link"
                    className="p-0 text-ink-300 hover:text-ink-50"
                    onClick={() => navigate('/demo')}
                  >
                    Book a demo
                  </Button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink-100">Company</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Button
                    variant="link"
                    className="p-0 text-ink-300 hover:text-ink-50"
                    onClick={() => navigate('/terms')}
                  >
                    Terms of service
                  </Button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-ink-400">
            <p>&copy; {new Date().getFullYear()} Hatch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

