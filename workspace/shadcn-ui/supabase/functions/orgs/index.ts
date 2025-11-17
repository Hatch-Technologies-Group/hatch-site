import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration for /orgs edge function')
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

type MembershipRole = 'BROKER_OWNER' | 'BROKER_MANAGER' | 'AGENT' | 'PENDING'

type MembershipRow = {
  id: string
  org_id: string
  role: MembershipRole
  status: 'active' | 'invited' | 'inactive' | 'removed'
  can_manage_billing: boolean | null
}

type PolicyPayload = {
  key: string
  value: Record<string, unknown>
}

type AuthContext = {
  userId: string
  email: string | undefined
  globalRole: 'SUPER_ADMIN' | 'SUPPORT_ADMIN' | 'USER'
  memberships: MembershipRow[]
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

  const { data: profile, error: profileError } = await serviceClient
    .from('Profile')
    .select('id, email, global_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Failed to load profile for orgs edge function', profileError)
    return null
  }

  const { data: memberships, error: membershipError } = await serviceClient
    .from('org_members')
    .select('id, org_id, role, status, can_manage_billing')
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('Failed to load memberships for orgs edge function', membershipError)
    return null
  }

  return {
    userId: user.id,
    email: profile?.email,
    globalRole: (profile?.global_role ?? 'USER') as AuthContext['globalRole'],
    memberships: memberships ?? [],
  }
}

const requireOrgAccess = (
  context: AuthContext,
  orgId: string,
  options?: { requireManager?: boolean; allowBillingManager?: boolean }
) => {
  const membership = context.memberships.find((member) => member.org_id === orgId)
  if (!membership || membership.status !== 'active') {
    if (context.globalRole === 'SUPER_ADMIN' || context.globalRole === 'SUPPORT_ADMIN') {
      return { membership: null, isSuperUser: true }
    }
    return null
  }

  if (options?.requireManager) {
    const allowedRoles: MembershipRole[] = ['BROKER_OWNER', 'BROKER_MANAGER']
    if (options.allowBillingManager) {
      if (!allowedRoles.includes(membership.role) && !membership.can_manage_billing) {
        return null
      }
    } else if (!allowedRoles.includes(membership.role)) {
      return null
    }
  }

  return { membership, isSuperUser: false }
}

const syncSeatUsage = async (serviceClient: ReturnType<typeof createClient>, orgId: string) => {
  const { count, error } = await serviceClient
    .from('org_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'active')

  if (error) {
    console.error('Failed to count seat usage', error)
    return
  }

  const { error: updateError } = await serviceClient
    .from('org_subscriptions')
    .update({ seats_used: count ?? 0 })
    .eq('org_id', orgId)

  if (updateError) {
    console.error('Failed to update seat usage', updateError)
  }
}

const ensureSeatAvailability = async (
  serviceClient: ReturnType<typeof createClient>,
  orgId: string
) => {
  const { data: subscription, error } = await serviceClient
    .from('org_subscriptions')
    .select('id, seats_purchased, seats_used, status')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    console.error('Seat check failed', error)
    throw new Error('seat_check_failed')
  }

  if (!subscription) {
    return
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    throw new Error('subscription_inactive')
  }

  if (subscription.seats_used >= subscription.seats_purchased) {
    throw new Error('seats_full')
  }
}

const createInvitation = async (
  serviceClient: ReturnType<typeof createClient>,
  orgId: string,
  invitedBy: string,
  email: string,
  role: MembershipRole,
  expiresInDays = 7
) => {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const token = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await serviceClient
    .from('org_invitations')
    .insert({
      org_id: orgId,
      invited_by: invitedBy,
      email: email.toLowerCase(),
      role,
      token,
      status: 'sent',
      expires_at: expiresAt,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Failed to create invitation', error)
    throw new Error('invitation_create_failed')
  }

  return data
}

const listMembers = async (serviceClient: ReturnType<typeof createClient>, orgId: string) => {
  const { data, error } = await serviceClient
    .from('org_members')
    .select(`
      id,
      org_id,
      user_id,
      role,
      status,
      can_manage_billing,
      metadata,
      created_at,
      profiles:profiles!inner (
        id,
        email,
        first_name,
        last_name,
        display_name,
        avatar_url,
        global_role
      )
    `)
    .eq('org_id', orgId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to list members', error)
    throw new Error('member_list_failed')
  }

  return data
}

const removeMember = async (
  serviceClient: ReturnType<typeof createClient>,
  orgId: string,
  memberId: string
) => {
  const { data: member, error: fetchError } = await serviceClient
    .from('org_members')
    .select('id, org_id, user_id, role, status')
    .eq('id', memberId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to load member before removal', fetchError)
    throw new Error('member_fetch_failed')
  }

  if (!member) {
    return { removed: false }
  }

  if (member.role === 'BROKER_OWNER') {
    const { count, error: ownerCountError } = await serviceClient
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'BROKER_OWNER')
      .eq('status', 'active')
      .neq('id', member.id)

    if (ownerCountError) {
      console.error('Failed to verify owner count during removal', ownerCountError)
      throw new Error('owner_check_failed')
    }

    if (!count || count < 1) {
      throw new Error('owner_required')
    }
  }

  const { error: deleteError } = await serviceClient
    .from('org_members')
    .delete()
    .eq('id', member.id)

  if (deleteError) {
    console.error('Failed to remove member', deleteError)
    throw new Error('member_remove_failed')
  }

  await syncSeatUsage(serviceClient, orgId)

  return { removed: true }
}

const transferOwnership = async (
  serviceClient: ReturnType<typeof createClient>,
  orgId: string,
  fromUserId: string,
  targetMemberId: string
) => {
  const { data: targetMember, error: targetError } = await serviceClient
    .from('org_members')
    .select('id, org_id, user_id, role, status')
    .eq('id', targetMemberId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (targetError || !targetMember) {
    throw new Error('target_member_not_found')
  }

  if (targetMember.status !== 'active') {
    throw new Error('target_member_inactive')
  }

  const updates = serviceClient.from('org_members')

  const { error: demoteError } = await updates
    .update({ role: 'BROKER_MANAGER' })
    .eq('org_id', orgId)
    .eq('user_id', fromUserId)
    .eq('role', 'BROKER_OWNER')

  if (demoteError) {
    console.error('Failed to demote current owner', demoteError)
    throw new Error('owner_transfer_failed')
  }

  const { error: promoteError } = await updates
    .update({ role: 'BROKER_OWNER' })
    .eq('id', targetMemberId)

  if (promoteError) {
    console.error('Failed to promote new owner', promoteError)
    throw new Error('owner_transfer_failed')
  }

  const { error: orgUpdateError } = await serviceClient
    .from('orgs')
    .update({ owner_user_id: targetMember.user_id })
    .eq('id', orgId)

  if (orgUpdateError) {
    console.error('Failed to update org owner', orgUpdateError)
    throw new Error('owner_transfer_failed')
  }
}

const getPolicies = async (
  serviceClient: ReturnType<typeof createClient>,
  orgId: string
) => {
  const { data, error } = await serviceClient
    .from('permission_policies')
    .select('key, value')
    .eq('org_id', orgId)

  if (error) {
    console.error('Failed to fetch policies', error)
    throw new Error('policy_fetch_failed')
  }

  return data ?? []
}

const upsertPolicies = async (
  serviceClient: ReturnType<typeof createClient>,
  orgId: string,
  payload: PolicyPayload[],
  actorUserId: string
) => {
  const mutations = payload.map((policy) => ({
    org_id: orgId,
    key: policy.key,
    value: policy.value,
    updated_by: actorUserId,
  }))

  const { data, error } = await serviceClient
    .from('permission_policies')
    .upsert(mutations, {
      onConflict: 'org_id,key',
    })
    .select('key, value')

  if (error) {
    console.error('Failed to update policies', error)
    throw new Error('policy_update_failed')
  }

  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true })

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return json(404, { error: 'not_found' })
  }

  const root = segments[0]

  const authHeader = req.headers.get('Authorization') ?? ''
  const context = await buildAuthContext(authHeader)

  if (!context) {
    return json(401, { error: 'unauthorized' })
  }

  const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!)

  try {
    if (root === 'orgs') {
      const orgId = segments[1]
      if (!orgId) {
        return json(400, { error: 'org_required' })
      }

      const actionSegment = segments[2]
      const actionSubsegment = segments[3]

      if (req.method === 'GET' && actionSegment === 'members') {
        const access = requireOrgAccess(context, orgId)
        if (!access) return json(403, { error: 'forbidden' })

        const members = await listMembers(serviceClient, orgId)
        return json(200, { data: members })
      }

      if (req.method === 'POST' && actionSegment === 'invitations') {
        const access = requireOrgAccess(context, orgId, { requireManager: true, allowBillingManager: true })
        if (!access) return json(403, { error: 'forbidden' })

        const body = await req.json().catch(() => null)
        if (!body || typeof body.email !== 'string') {
          return json(400, { error: 'invalid_payload' })
        }

        const role = (body.role as MembershipRole | undefined) ?? 'AGENT'
        if (!['BROKER_OWNER', 'BROKER_MANAGER', 'AGENT'].includes(role)) {
          return json(400, { error: 'invalid_role' })
        }

        await ensureSeatAvailability(serviceClient, orgId)
        const invitation = await createInvitation(
          serviceClient,
          orgId,
          access.membership?.user_id ?? context.userId,
          body.email,
          role
        )

        return json(201, { data: invitation })
      }

      if (req.method === 'DELETE' && actionSegment === 'members' && actionSubsegment) {
        const access = requireOrgAccess(context, orgId, { requireManager: true })
        if (!access) return json(403, { error: 'forbidden' })

        if (access.membership?.user_id === context.userId && access.membership.id === actionSubsegment) {
          return json(400, { error: 'cannot_remove_self' })
        }

        const result = await removeMember(serviceClient, orgId, actionSubsegment)
        return json(200, { data: result })
      }

      if (req.method === 'POST' && actionSegment === 'transfer-ownership') {
        const access = requireOrgAccess(context, orgId, { requireManager: true })
        if (!access) return json(403, { error: 'forbidden' })

        if (access.membership && access.membership.role !== 'BROKER_OWNER' && !access.isSuperUser) {
          return json(403, { error: 'owner_only' })
        }

        const body = await req.json().catch(() => null)
        if (!body || typeof body.targetMemberId !== 'string') {
          return json(400, { error: 'invalid_payload' })
        }

        await transferOwnership(
          serviceClient,
          orgId,
          access.isSuperUser ? context.userId : access.membership!.user_id,
          body.targetMemberId
        )
        return json(200, { data: { success: true } })
      }

      if (req.method === 'GET' && actionSegment === 'policies') {
        const access = requireOrgAccess(context, orgId, { requireManager: true })
        if (!access) return json(403, { error: 'forbidden' })

        const policies = await getPolicies(serviceClient, orgId)
        return json(200, { data: policies })
      }

      if (req.method === 'PUT' && actionSegment === 'policies') {
        const access = requireOrgAccess(context, orgId, { requireManager: true })
        if (!access) return json(403, { error: 'forbidden' })

        const body = await req.json().catch(() => null)
        if (!Array.isArray(body)) {
          return json(400, { error: 'invalid_payload' })
        }

        const payload: PolicyPayload[] = body.filter((item) =>
          item && typeof item.key === 'string' && typeof item.value === 'object'
        )

        const policies = await upsertPolicies(serviceClient, orgId, payload, context.userId)
        return json(200, { data: policies })
      }

      return json(404, { error: 'not_found' })
    }

    return json(404, { error: 'not_found' })
  } catch (error) {
    console.error('Unexpected /orgs error', error)

    const errorMessage = error instanceof Error ? error.message : 'unexpected_error'
    switch (errorMessage) {
      case 'seats_full':
        return json(409, { error: 'seats_full' })
      case 'subscription_inactive':
        return json(402, { error: 'subscription_inactive' })
      case 'owner_required':
        return json(409, { error: 'owner_required' })
      case 'policy_fetch_failed':
      case 'policy_update_failed':
      case 'member_fetch_failed':
      case 'member_remove_failed':
      case 'invitation_create_failed':
      case 'seat_check_failed':
        return json(500, { error: errorMessage })
      default:
        return json(500, { error: 'unexpected_error' })
    }
  }
})
