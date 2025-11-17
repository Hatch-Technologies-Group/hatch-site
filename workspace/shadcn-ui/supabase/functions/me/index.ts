import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration for /me edge function')
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

type MembershipResponse = {
  id: string
  org_id: string
  role: string
  status: string
  can_manage_billing: boolean | null
  metadata: Record<string, unknown> | null
  org: {
    id: string
    name: string
    type: string
    status: string
    billing_email: string | null
    stripe_customer_id: string | null
    grace_period_ends_at: string | null
    metadata: Record<string, unknown> | null
    created_at: string
    updated_at: string
  } | null
  subscription: {
    id: string
    product: string
    plan_interval: string
    seats_purchased: number
    seats_used: number
    status: string
    grace_period_ends_at: string | null
  } | null
}

type PolicyResponse = {
  key: string
  value: Record<string, unknown>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true })

  const authHeader = req.headers.get('Authorization') ?? ''
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser()

  if (userError || !user) {
    return json(401, { error: 'unauthorized' })
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: profile, error: profileError } = await serviceClient
    .from('Profile')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Failed to load profile', profileError)
    return json(500, { error: 'profile_fetch_failed' })
  }

  const { data: memberships, error: membershipError } = await serviceClient
    .from('org_members')
    .select<MembershipResponse>(`
      id,
      org_id,
      role,
      status,
      can_manage_billing,
      metadata,
      org:orgs (
        id,
        name,
        type,
        status,
        billing_email,
        stripe_customer_id,
        grace_period_ends_at,
        metadata,
        created_at,
        updated_at
      ),
      subscription:org_subscriptions (
        id,
        product,
        plan_interval,
        seats_purchased,
        seats_used,
        status,
        grace_period_ends_at
      )
    `)
    .eq('user_id', user.id)
    .neq('status', 'removed')

  if (membershipError) {
    console.error('Failed to load memberships', membershipError)
  }

  const safeMemberships = memberships ?? []

  const activeOrgId = profile?.active_org_id
    ?? safeMemberships.find((member) => member.status === 'active')?.org_id
    ?? null

  let policies: PolicyResponse[] = []
  if (activeOrgId) {
    const { data: policyRows, error: policyError } = await serviceClient
      .from('permission_policies')
      .select('key, value')
      .eq('org_id', activeOrgId)

    if (policyError) {
      console.error('Failed to load permission policies', policyError)
    } else if (policyRows) {
      policies = policyRows.map((row) => ({ key: row.key, value: row.value as Record<string, unknown> }))
    }
  }

  const response = {
    user: {
      id: user.id,
      email: user.email,
      globalRole: profile?.global_role ?? 'USER',
    },
    profile,
    memberships: safeMemberships,
    activeOrgId,
    policies,
    metadata: membershipError
      ? { membershipsError: membershipError.message ?? 'membership_fetch_failed' }
      : undefined,
  }

  return json(200, response)
})
