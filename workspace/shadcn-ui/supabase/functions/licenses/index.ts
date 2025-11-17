import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration for licenses edge function')
}

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

type GlobalRole = 'SUPER_ADMIN' | 'SUPPORT_ADMIN' | 'USER'

type AuthContext = {
  userId: string
  globalRole: GlobalRole
  memberships: {
    org_id: string
    role: 'BROKER_OWNER' | 'BROKER_MANAGER' | 'AGENT' | 'PENDING'
    status: 'active' | 'invited' | 'inactive' | 'removed'
  }[]
}

const buildAuthContext = async (authHeader: string): Promise<AuthContext | null> => {
  const authClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: { Authorization: authHeader },
    },
  })

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()

  if (error || !user) {
    return null
  }

  const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!)

  const { data: profile } = await serviceClient
    .from('Profile')
    .select('id, global_role')
    .eq('id', user.id)
    .maybeSingle()

  const { data: memberships } = await serviceClient
    .from('org_members')
    .select('org_id, role, status')
    .eq('user_id', user.id)

  return {
    userId: user.id,
    globalRole: (profile?.global_role ?? 'USER') as GlobalRole,
    memberships: memberships ?? [],
  }
}

const requireOrgManager = (context: AuthContext, orgId: string) => {
  if (context.globalRole === 'SUPER_ADMIN') return true
  const membership = context.memberships.find((member) => member.org_id === orgId)
  if (!membership || membership.status !== 'active') return false
  return membership.role === 'BROKER_OWNER' || membership.role === 'BROKER_MANAGER'
}

const storeLicense = async (
  serviceClient: ReturnType<typeof createClient>,
  payload: {
    orgId: string | null
    userId: string | null
    type: 'agent' | 'brokerage'
    state: string
    number: string
    docsUrl?: string
    metadata?: Record<string, unknown>
  }
) => {
  const base = {
    org_id: payload.orgId,
    user_id: payload.userId,
    type: payload.type,
    state: payload.state,
    license_number_encrypted: 'pending',
    metadata: {
      ...(payload.metadata ?? {}),
      license_number_plain: payload.number,
    },
    docs_url: payload.docsUrl ?? null,
  }

  const selector = payload.type === 'agent'
    ? { user_id: payload.userId, type: 'agent' }
    : { org_id: payload.orgId, type: 'brokerage' }

  const { data: existing } = await serviceClient
    .from('licenses')
    .select('id')
    .match(selector)
    .maybeSingle()

  if (existing) {
    const { error } = await serviceClient
      .from('licenses')
      .update(base)
      .eq('id', existing.id)

    if (error) {
      console.error('Failed to update license', error)
      throw new Error('license_update_failed')
    }

    return existing.id
  }

  const { data, error } = await serviceClient
    .from('licenses')
    .insert(base)
    .select('id')
    .single()

  if (error) {
    console.error('Failed to insert license', error)
    throw new Error('license_insert_failed')
  }

  return data.id as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true })

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)

  if (segments[0] !== 'licenses') {
    return json(404, { error: 'not_found' })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const context = await buildAuthContext(authHeader)

  if (!context) {
    return json(401, { error: 'unauthorized' })
  }

  const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!)

  try {
    if (req.method === 'POST' && segments.length === 1) {
      const body = await req.json().catch(() => null)
      if (!body || typeof body.state !== 'string' || typeof body.number !== 'string') {
        return json(400, { error: 'invalid_payload' })
      }

      const type = (body.type ?? 'agent') as 'agent' | 'brokerage'

      if (type === 'agent') {
        await storeLicense(serviceClient, {
          orgId: null,
          userId: context.userId,
          type,
          state: body.state,
          number: body.number,
          docsUrl: body.docsUrl,
          metadata: body.metadata,
        })
        return json(200, { data: { status: 'saved' } })
      }

      const orgId = typeof body.orgId === 'string' ? body.orgId : null
      if (!orgId) {
        return json(400, { error: 'org_required' })
      }

      if (!requireOrgManager(context, orgId)) {
        return json(403, { error: 'forbidden' })
      }

      await storeLicense(serviceClient, {
        orgId,
        userId: null,
        type: 'brokerage',
        state: body.state,
        number: body.number,
        docsUrl: body.docsUrl,
        metadata: body.metadata,
      })

      return json(200, { data: { status: 'saved' } })
    }

    if (req.method === 'POST' && segments[1] === 'verify' && segments[2]) {
      const licenseId = segments[2]
      const body = await req.json().catch(() => null)
      if (!body || typeof body.status !== 'string') {
        return json(400, { error: 'invalid_payload' })
      }

      const allowedStatuses = ['unverified', 'pending', 'verified', 'rejected']
      if (!allowedStatuses.includes(body.status)) {
        return json(400, { error: 'invalid_status' })
      }

      const { data: license, error: licenseError } = await serviceClient
        .from('licenses')
        .select('id, org_id, user_id')
        .eq('id', licenseId)
        .maybeSingle()

      if (licenseError || !license) {
        return json(404, { error: 'license_not_found' })
      }

      let allowed = context.globalRole === 'SUPER_ADMIN'

      if (!allowed && license.org_id) {
        allowed = requireOrgManager(context, license.org_id)
      }

      if (!allowed) {
        return json(403, { error: 'forbidden' })
      }

      const { error: updateError } = await serviceClient
        .from('licenses')
        .update({
          status: body.status,
          verification_notes: body.notes ?? null,
          verification_status_changed_by: context.userId,
          verification_status_changed_at: new Date().toISOString(),
        })
        .eq('id', licenseId)

      if (updateError) {
        console.error('Failed to update license status', updateError)
        return json(500, { error: 'license_verify_failed' })
      }

      return json(200, { data: { status: body.status } })
    }

    return json(404, { error: 'not_found' })
  } catch (error) {
    console.error('License handler error', error)
    const message = error instanceof Error ? error.message : 'unexpected_error'
    switch (message) {
      case 'license_insert_failed':
      case 'license_update_failed':
        return json(500, { error: message })
      default:
        return json(500, { error: 'unexpected_error' })
    }
  }
})
