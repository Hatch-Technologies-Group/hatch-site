import { createClient } from 'npm:@supabase/supabase-js'
import Stripe from 'npm:stripe'
import { corsHeaders } from '../_shared/cors.ts'
import type { Database } from '../../../../src/types/database.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !stripeSecretKey) {
  throw new Error('Missing configuration for billing edge function')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
})

const priceMap: Record<string, string | undefined> = {
  'agent_solo:1:monthly': Deno.env.get('STRIPE_PRICE_AGENT_SOLO_MONTHLY'),
  'agent_solo:1:yearly': Deno.env.get('STRIPE_PRICE_AGENT_SOLO_YEARLY'),
  'brokerage:25:monthly': Deno.env.get('STRIPE_PRICE_BROKERAGE_25_MONTHLY'),
  'brokerage:25:yearly': Deno.env.get('STRIPE_PRICE_BROKERAGE_25_YEARLY'),
  'brokerage:50:monthly': Deno.env.get('STRIPE_PRICE_BROKERAGE_50_MONTHLY'),
  'brokerage:50:yearly': Deno.env.get('STRIPE_PRICE_BROKERAGE_50_YEARLY'),
  'brokerage:100:monthly': Deno.env.get('STRIPE_PRICE_BROKERAGE_100_MONTHLY'),
  'brokerage:100:yearly': Deno.env.get('STRIPE_PRICE_BROKERAGE_100_YEARLY'),
}

const successUrl = Deno.env.get('STRIPE_CHECKOUT_SUCCESS_URL')
const cancelUrl = Deno.env.get('STRIPE_CHECKOUT_CANCEL_URL')

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

type GlobalRole = 'SUPER_ADMIN' | 'SUPPORT_ADMIN' | 'USER'

type MembershipRow = {
  org_id: string
  role: 'BROKER_OWNER' | 'BROKER_MANAGER' | 'AGENT' | 'PENDING'
  status: 'active' | 'invited' | 'inactive' | 'removed'
  can_manage_billing: boolean | null
}

type AuthContext = {
  userId: string
  email: string | undefined
  globalRole: GlobalRole
  memberships: MembershipRow[]
  isDemo?: boolean
}

const FALLBACK_DEMO_USER_ID = Deno.env.get('DEMO_USER_ID') ?? 'demo_broker_1'
const FALLBACK_DEMO_EMAIL = Deno.env.get('DEMO_USER_EMAIL') ?? 'demo@hatch.dev'

const buildAuthContext = async (req: Request): Promise<AuthContext | null> => {
  const authHeader = req.headers.get('Authorization') ?? ''
  const authClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: { Authorization: authHeader },
    },
  })

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()

  const fallbackUserId = req.headers.get('x-demo-user') ?? FALLBACK_DEMO_USER_ID
  const fallbackEmail = req.headers.get('x-demo-email') ?? FALLBACK_DEMO_EMAIL

  if (error || !user) {
    return {
      userId: fallbackUserId,
      email: fallbackEmail,
      globalRole: 'USER',
      memberships: [],
      isDemo: true,
    }
  }

  const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!)
  const { data: profile } = await serviceClient
    .from('Profile')
    .select('id, email, global_role')
    .eq('id', user.id)
    .maybeSingle()

  const { data: memberships } = await serviceClient
    .from('org_members')
    .select('org_id, role, status, can_manage_billing')
    .eq('user_id', user.id)

  return {
    userId: user.id,
    email: profile?.email ?? fallbackEmail,
    globalRole: (profile?.global_role ?? 'USER') as GlobalRole,
    memberships: memberships ?? [],
  }
}

const requireBillingAccess = (
  context: AuthContext,
  orgId: string | null,
  allowNewOrg = false
) => {
  if (!orgId) {
    return allowNewOrg || context.globalRole === 'SUPER_ADMIN'
  }

  const membership = context.memberships.find((member) => member.org_id === orgId)
  if (!membership) {
    return context.globalRole === 'SUPER_ADMIN'
  }

  if (membership.status !== 'active') return false

  if (membership.role === 'BROKER_OWNER') return true

  if (membership.can_manage_billing) return true

  return context.globalRole === 'SUPER_ADMIN'
}

const ensureSeatQuantity = (product: string, seats: number) => {
  if (product === 'agent_solo' && seats !== 1) {
    throw new Error('solo_seat_must_be_one')
  }

  if (product === 'brokerage' && ![25, 50, 100].includes(seats)) {
    throw new Error('brokerage_invalid_seat_tier')
  }
}

const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session,
  serviceClient: ReturnType<typeof createClient>
) => {
  const metadata = session.metadata ?? {}
  const orgId = metadata.orgId || crypto.randomUUID()
  const product = (metadata.product ?? 'brokerage') as 'brokerage' | 'agent_solo'
  const interval = (metadata.interval ?? 'monthly') as 'monthly' | 'yearly'
  const seats = Number(metadata.seats ?? 1)
  const ownerUserId = metadata.userId
  const orgName = metadata.orgName ?? `Brokerage ${orgId.slice(0, 6)}`

  const subscriptionId = session.subscription as string | undefined
  if (!subscriptionId) {
    console.error('Checkout completed without subscription id')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const baseOrg = {
    id: orgId,
    type: product === 'agent_solo' ? 'personal' : 'brokerage',
    name: orgName,
    status: 'active',
    owner_user_id: ownerUserId ?? null,
    stripe_customer_id: session.customer as string,
    billing_email: session.customer_details?.email ?? metadata.billingEmail ?? null,
  }

  const { data: existingOrg } = await serviceClient
    .from('orgs')
    .select('id')
    .eq('id', orgId)
    .maybeSingle()

  if (!existingOrg) {
    const { error: insertOrgError } = await serviceClient
      .from('orgs')
      .insert({
        ...baseOrg,
        slug: metadata.orgSlug ?? null,
      })

    if (insertOrgError) {
      console.error('Failed to insert org after checkout', insertOrgError)
      throw insertOrgError
    }
  } else {
    const { error: updateOrgError } = await serviceClient
      .from('orgs')
      .update({
        stripe_customer_id: baseOrg.stripe_customer_id,
        billing_email: baseOrg.billing_email,
        status: 'active',
      })
      .eq('id', orgId)

    if (updateOrgError) {
      console.error('Failed to update org billing data', updateOrgError)
    }
  }

  if (ownerUserId) {
    const { data: existingMembership } = await serviceClient
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', ownerUserId)
      .maybeSingle()

    if (!existingMembership) {
      const now = new Date().toISOString()
      const { error: insertMembershipError } = await serviceClient
        .from('org_members')
        .insert({
          org_id: orgId,
          user_id: ownerUserId,
          role: 'BROKER_OWNER',
          status: 'active',
          joined_at: now,
          invited_at: now,
          accepted_at: now,
        })

      if (insertMembershipError) {
        console.error('Failed to insert owner membership after checkout', insertMembershipError)
      }
    }
  }

  const seatsPurchased = seats

  const subscriptionPayload = {
    org_id: orgId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    product,
    plan_interval: interval,
    price_id: subscription.items.data[0]?.price?.id ?? null,
    seats_purchased: seatsPurchased,
    seats_used: seatsPurchased,
    status: subscription.status as Database['public']['Enums']['subscription_state'],
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  }

  const { error: upsertError } = await serviceClient
    .from('org_subscriptions')
    .upsert(subscriptionPayload, { onConflict: 'org_id' })

  if (upsertError) {
    console.error('Failed to upsert org subscription after checkout', upsertError)
  }
}

const handleSubscriptionUpdated = async (
  subscription: Stripe.Subscription,
  serviceClient: ReturnType<typeof createClient>
) => {
  const orgId = subscription.metadata?.orgId
  if (!orgId) {
    console.warn('Subscription update without org metadata', subscription.id)
    return
  }

  const seats = Number(subscription.metadata?.seats ?? subscription.items.data[0]?.quantity ?? 1)

  const payload = {
    status: subscription.status,
    seats_purchased: seats,
    seats_used: seats,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  }

  const { error } = await serviceClient
    .from('org_subscriptions')
    .update(payload)
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to update subscription', error)
  }
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true })

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)

  if (segments.length === 0 || segments[0] !== 'billing') {
    return json(404, { error: 'not_found' })
  }

  const action = segments[1]

  if (action === 'webhooks' && req.method === 'POST') {
    if (!stripeWebhookSecret) {
      console.error('Webhook secret missing')
      return json(500, { error: 'webhook_unconfigured' })
    }

    const body = await req.text()
    const signature = req.headers.get('stripe-signature') ?? ''

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
    } catch (error) {
      console.error('Invalid webhook signature', error)
      return json(400, { error: 'invalid_signature' })
    }

    const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!)

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, serviceClient)
          break
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, serviceClient)
          break
        case 'customer.subscription.deleted':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, serviceClient)
          break
        case 'invoice.payment_failed':
          // Mark subscription as past due
          const invoice = event.data.object as Stripe.Invoice
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
            await handleSubscriptionUpdated(subscription, serviceClient)
          }
          break
        default:
          console.log(`Unhandled Stripe event ${event.type}`)
      }
    } catch (error) {
      console.error('Webhook handling error', error)
      return json(500, { error: 'webhook_processing_failed' })
    }

    return json(200, { received: true })
  }

  const context = await buildAuthContext(req)

  if (!context) {
    return json(401, { error: 'unauthorized' })
  }

  const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!)

  try {
    if (action === 'checkout' && req.method === 'POST') {
      const body = await req.json().catch(() => null)
      if (!body || typeof body.product !== 'string' || typeof body.interval !== 'string') {
        return json(400, { error: 'invalid_payload' })
      }

      const product = body.product as 'brokerage' | 'agent_solo'
      const interval = body.interval as 'monthly' | 'yearly'
      const seats = Number(body.seats ?? (product === 'agent_solo' ? 1 : 25))
      const orgId = typeof body.orgId === 'string' ? body.orgId : null

      ensureSeatQuantity(product, seats)

      if (!requireBillingAccess(context, orgId, !orgId)) {
        return json(403, { error: 'forbidden' })
      }

      const priceKey = `${product}:${seats}:${interval}`
      const priceId = priceMap[priceKey]
      if (!priceId) {
        throw new Error('pricing_not_configured')
      }


      let customerId: string | undefined
      if (orgId) {
        const { data: org } = await serviceClient
          .from('orgs')
          .select('id, stripe_customer_id, name')
          .eq('id', orgId)
          .maybeSingle()
        customerId = org?.stripe_customer_id ?? undefined
      }

      const metadata: Record<string, string> = {
        product,
        interval,
        seats: seats.toString(),
        userId: context.userId,
      }

      if (orgId) metadata.orgId = orgId
      if (!orgId && body.orgName) metadata.orgName = String(body.orgName)
      if (!orgId && body.orgSlug) metadata.orgSlug = String(body.orgSlug)

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        success_url: successUrl ?? 'https://example.com/billing/success',
        cancel_url: cancelUrl ?? 'https://example.com/billing/cancel',
        customer: customerId,
        customer_email: customerId ? undefined : context.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata,
        },
        metadata,
      })

      return json(200, { url: session.url })
    }

    if (action === 'portal' && req.method === 'GET') {
      const orgId = url.searchParams.get('orgId')
      if (!orgId) return json(400, { error: 'org_required' })

      if (!requireBillingAccess(context, orgId)) {
        return json(403, { error: 'forbidden' })
      }

      const { data: org, error: orgError } = await serviceClient
        .from('orgs')
        .select('stripe_customer_id')
        .eq('id', orgId)
        .maybeSingle()

      if (orgError || !org?.stripe_customer_id) {
        return json(400, { error: 'customer_missing' })
      }

      const portalUrl = Deno.env.get('STRIPE_PORTAL_RETURN_URL') ?? successUrl ?? 'https://example.com/dashboard'

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: portalUrl,
      })

      return json(200, { url: portalSession.url })
    }

    return json(404, { error: 'not_found' })
  } catch (error) {
    console.error('Billing operation failed', error)
    const message = error instanceof Error ? error.message : 'unexpected_error'
    switch (message) {
      case 'brokerage_seat_minimum':
        return json(400, { error: 'brokerage_seat_minimum' })
      case 'solo_seat_must_be_one':
        return json(400, { error: 'solo_seat_must_be_one' })
      case 'seats_full':
        return json(409, { error: 'seats_full' })
      case 'subscription_inactive':
        return json(402, { error: 'subscription_inactive' })
      default:
        return json(500, { error: 'unexpected_error' })
    }
  }
})
