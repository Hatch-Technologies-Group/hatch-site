import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useCustomerExperience } from '@/contexts/CustomerExperienceContext'
import { supabase } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

interface ProfileFormState {
  firstName: string
  lastName: string
  displayName: string
  phone: string
  bio: string
  avatarUrl: string | null
}

const DEFAULT_FORM: ProfileFormState = {
  firstName: '',
  lastName: '',
  displayName: '',
  phone: '',
  bio: '',
  avatarUrl: null,
}

const CustomerProfile: React.FC = () => {
  const { userId, user, refresh } = useAuth()
  const {
    favorites,
    savedSearches,
    recentlyViewed,
    leadRequests,
    notificationSettings,
    updateNotificationSettings,
  } = useCustomerExperience()

  const [form, setForm] = useState<ProfileFormState>(DEFAULT_FORM)
  const [initialForm, setInitialForm] = useState<ProfileFormState>(DEFAULT_FORM)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      const { data, error } = await supabase
        .from('Profile')
        .select('first_name,last_name,display_name,phone,bio,avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Failed to load profile', error)
        toast.error('Unable to load profile settings')
        setIsLoading(false)
        return
      }

      if (data) {
        const hydrated: ProfileFormState = {
          firstName: (data.first_name as string | null) ?? '',
          lastName: (data.last_name as string | null) ?? '',
          displayName: (data.display_name as string | null) ?? '',
          phone: (data.phone as string | null) ?? '',
          bio: (data.bio as string | null) ?? '',
          avatarUrl: (data.avatar_url as string | null) ?? null,
        }
        setForm(hydrated)
        setInitialForm(hydrated)
      }
      setIsLoading(false)
    }

    void loadProfile()
  }, [userId])

  const handleChange = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!userId) {
      toast.error('Please sign in to update your profile')
      return
    }

    setIsSaving(true)
    try {
      const updates = {
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        display_name: form.displayName || null,
        phone: form.phone || null,
        bio: form.bio || null,
        avatar_url: form.avatarUrl,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('Profile').update(updates).eq('id', userId)
      if (error) throw error
      toast.success('Profile updated')
      await refresh()
    } catch (error) {
      console.error('Profile update failed', error)
      toast.error('Unable to save profile changes')
    } finally {
      setIsSaving(false)
    }
  }

  const initials = (form.displayName || user?.email || 'User')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  const metrics = [
    { label: 'Favorites', value: favorites.length },
    { label: 'Saved searches', value: savedSearches.length },
    { label: 'Recently viewed', value: recentlyViewed.length },
    { label: 'Tour inquiries', value: leadRequests.length },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profile settings</h1>
          <p className="text-slate-600">Manage your account details, alerts, and saved activity.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profile photo</CardTitle>
              <CardDescription>Add a friendly face to your account</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                {form.avatarUrl ? <AvatarImage src={form.avatarUrl} /> : <AvatarFallback>{initials}</AvatarFallback>}
              </Avatar>
              <Button variant="outline" size="sm" disabled>
                Upload (coming soon)
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Personal information</CardTitle>
              <CardDescription>Keep your contact details current for quick follow-up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input value={form.firstName} onChange={(event) => handleChange('firstName', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input value={form.lastName} onChange={(event) => handleChange('lastName', event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preferred display name</Label>
                <Input value={form.displayName} onChange={(event) => handleChange('displayName', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label>About you</Label>
                <Input value={form.bio} onChange={(event) => handleChange('bio', event.target.value)} placeholder="Tell agents how to best support you" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setForm(initialForm)} disabled={isSaving}>
                  Reset
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alert preferences</CardTitle>
            <CardDescription>Control how we notify you about new listings.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Email alerts</p>
                <p className="text-xs text-slate-500">Stay informed when saved searches match new properties.</p>
              </div>
              <Switch
                checked={notificationSettings.emailAlerts}
                onCheckedChange={(checked) => updateNotificationSettings({ emailAlerts: Boolean(checked) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">SMS alerts</p>
                <p className="text-xs text-slate-500">Instant texts when high-priority homes go live.</p>
              </div>
              <Switch
                checked={notificationSettings.smsAlerts}
                onCheckedChange={(checked) => updateNotificationSettings({ smsAlerts: Boolean(checked) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity summary</CardTitle>
            <CardDescription>Your engagement at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/60">
          <p className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            Loading profile…
          </p>
        </div>
      )}
    </div>
  )
}

export default CustomerProfile
