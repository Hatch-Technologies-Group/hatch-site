import fs from 'node:fs';
import path from 'node:path';

import {
  AgentLifecycleStage,
  AgentRiskLevel,
  LeadType,
  OfferIntentStatus,
  OrgListingStatus,
  OrgTransactionStatus,
  PersonStage,
  PipelineStatus,
  Prisma,
  PrismaClient,
  UserRole
} from '@prisma/client';

const ROOT_DIR = process.cwd();
const ENV_FILES = ['.env', '.env.local'].map((name) => path.join(ROOT_DIR, name));

function parseEnvFile(contents: string) {
  const result: Record<string, string> = {};
  const lines = contents.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    if (!key) continue;
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function loadEnvFiles() {
  const merged: Record<string, string> = {};
  for (const filePath of ENV_FILES) {
    if (!fs.existsSync(filePath)) continue;
    const contents = fs.readFileSync(filePath, 'utf8');
    Object.assign(merged, parseEnvFile(contents));
  }
  return merged;
}

function applyEnv(fileEnv: Record<string, string>) {
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

function requireEnabledFlag(name: string) {
  const value = (process.env[name] ?? '').trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

const fileEnv = loadEnvFiles();
applyEnv(fileEnv);

const dbEnv = (process.env.DB_ENV ?? '').trim().toLowerCase();
if (!['staging', 'dev'].includes(dbEnv)) {
  console.error('[qa-seed] Refusing to run: DB_ENV must be staging or dev.');
  process.exit(1);
}

if (!requireEnabledFlag('QA_SEED_ENABLED')) {
  console.error('[qa-seed] Refusing to run: QA_SEED_ENABLED=true is required.');
  process.exit(1);
}

const prisma = new PrismaClient();

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

async function resolveOrganization() {
  const id = (process.env.QA_ORG_ID ?? '').trim();
  if (id) {
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new Error(`QA_ORG_ID not found: ${id}`);
    return org;
  }

  const slug = (process.env.QA_ORG_SLUG ?? '').trim();
  if (slug) {
    const org = await prisma.organization.findFirst({ where: { slug: normalizeSlug(slug) } });
    if (!org) throw new Error(`QA_ORG_SLUG not found: ${slug}`);
    return org;
  }

  const demo =
    (await prisma.organization.findFirst({ where: { id: 'org-demo' } })) ??
    (await prisma.organization.findFirst({ where: { slug: 'demo' } })) ??
    (await prisma.organization.findFirst({ where: { isDemo: true }, orderBy: { createdAt: 'asc' } }));
  if (demo) {
    console.log(`[qa-seed] Using demo organization: ${demo.name} (${demo.id})`);
    return demo;
  }

  const orgCount = await prisma.organization.count();
  if (orgCount === 1) {
    const only = await prisma.organization.findFirst();
    if (!only) throw new Error('No organizations found.');
    console.log(`[qa-seed] Using only organization in DB: ${only.name} (${only.id})`);
    return only;
  }

  throw new Error('Multiple orgs found. Set QA_ORG_ID or QA_ORG_SLUG to choose where to seed.');
}

async function resolveTenant(orgId: string) {
  const id = (process.env.QA_TENANT_ID ?? '').trim();
  if (id) {
    const tenant = await prisma.tenant.findFirst({ where: { id, organizationId: orgId } });
    if (!tenant) throw new Error(`QA_TENANT_ID not found in org ${orgId}: ${id}`);
    return tenant;
  }

  const slug = (process.env.QA_TENANT_SLUG ?? '').trim();
  if (slug) {
    const tenant = await prisma.tenant.findFirst({ where: { slug: normalizeSlug(slug), organizationId: orgId } });
    if (!tenant) throw new Error(`QA_TENANT_SLUG not found in org ${orgId}: ${slug}`);
    return tenant;
  }

  const demo =
    (await prisma.tenant.findFirst({ where: { id: 'tenant-demo', organizationId: orgId } })) ??
    (await prisma.tenant.findFirst({ where: { slug: 'demo', organizationId: orgId } }));
  if (demo) {
    console.log(`[qa-seed] Using demo tenant: ${demo.name} (${demo.id})`);
    return demo;
  }

  const tenant = await prisma.tenant.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: 'asc' } });
  if (!tenant) throw new Error(`No tenants found for orgId=${orgId}`);
  console.log(`[qa-seed] Using first tenant in org: ${tenant.name} (${tenant.id})`);
  return tenant;
}

async function resolveActorUser(orgId: string, tenantId: string) {
  const email = (process.env.QA_ACTOR_EMAIL ?? '').trim().toLowerCase();
  if (email) {
    const user = await prisma.user.findFirst({ where: { email, organizationId: orgId } });
    if (!user) throw new Error(`QA_ACTOR_EMAIL not found in org ${orgId}: ${email}`);
    return user;
  }

  const broker =
    (await prisma.user.findFirst({
      where: { organizationId: orgId, role: UserRole.BROKER },
      orderBy: { createdAt: 'asc' }
    })) ??
    (await prisma.user.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: 'asc' } }));

  if (!broker) throw new Error(`No users found for orgId=${orgId}`);
  if (broker.tenantId !== tenantId) {
    console.log('[qa-seed] Warning: actor user tenantId differs from selected tenantId; continuing anyway.');
  }
  console.log(`[qa-seed] Using actor user: ${broker.email} (${broker.id})`);
  return broker;
}

async function ensureBuyerPipeline(tenantId: string) {
  const existing = await prisma.pipeline.findFirst({
    where: { tenantId, type: 'buyer' },
    include: { stages: { orderBy: { order: 'asc' } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
  });

  if (existing) return existing;

  const created = await prisma.pipeline.create({
    data: {
      tenantId,
      brokerageId: tenantId,
      name: 'Buyer Pipeline (QA Seed)',
      type: 'buyer',
      useCase: 'buyer',
      status: PipelineStatus.ACTIVE,
      isDefault: true,
      order: 0
    },
    include: { stages: true }
  });

  console.log(`[qa-seed] Created buyer pipeline: ${created.name} (${created.id})`);
  return created;
}

async function ensureStage(tenantId: string, pipelineId: string, name: string, order: number) {
  const existing = await prisma.stage.findFirst({
    where: { tenantId, pipelineId, name: { equals: name, mode: 'insensitive' } }
  });
  if (existing) return existing;
  return prisma.stage.create({ data: { tenantId, pipelineId, name, order } });
}

function qaEmail(orgId: string, localPart: string) {
  const suffix = orgId.slice(0, 8);
  return `${localPart}+${suffix}@qa.hatch.test`;
}

async function upsertQaLead(input: {
  tenantId: string;
  orgId: string;
  ownerId: string | null;
  pipelineId: string;
  stageId: string | null;
  stage: PersonStage;
  leadType: LeadType;
  firstName: string;
  lastName: string;
  email: string;
}) {
  const now = new Date();
  return prisma.person.upsert({
    where: { tenantId_primaryEmail: { tenantId: input.tenantId, primaryEmail: input.email } },
    update: {
      organizationId: input.orgId,
      ownerId: input.ownerId,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      stage: input.stage,
      stageEnteredAt: now,
      leadType: input.leadType,
      firstName: input.firstName,
      lastName: input.lastName,
      tags: { set: ['QA_SEED'] },
      source: 'qa-seed'
    },
    create: {
      tenantId: input.tenantId,
      organizationId: input.orgId,
      ownerId: input.ownerId,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      stage: input.stage,
      stageEnteredAt: now,
      leadType: input.leadType,
      firstName: input.firstName,
      lastName: input.lastName,
      primaryEmail: input.email,
      tags: ['QA_SEED'],
      source: 'qa-seed'
    },
    select: { id: true, firstName: true, lastName: true, stage: true, stageId: true, leadType: true }
  });
}

async function seedLeads(input: {
  tenantId: string;
  orgId: string;
  actorUserId: string;
  pipelineId: string;
  newStageId: string;
  qualifiedStageId: string;
}) {
  const leads = await Promise.all([
    upsertQaLead({
      tenantId: input.tenantId,
      orgId: input.orgId,
      ownerId: input.actorUserId,
      pipelineId: input.pipelineId,
      stageId: input.newStageId,
      stage: PersonStage.NEW,
      leadType: LeadType.BUYER,
      firstName: 'QA',
      lastName: 'New Lead 1',
      email: qaEmail(input.orgId, 'qa.lead.new.1')
    }),
    upsertQaLead({
      tenantId: input.tenantId,
      orgId: input.orgId,
      ownerId: input.actorUserId,
      pipelineId: input.pipelineId,
      stageId: input.newStageId,
      stage: PersonStage.NEW,
      leadType: LeadType.SELLER,
      firstName: 'QA',
      lastName: 'New Lead 2',
      email: qaEmail(input.orgId, 'qa.lead.new.2')
    }),
    upsertQaLead({
      tenantId: input.tenantId,
      orgId: input.orgId,
      ownerId: input.actorUserId,
      pipelineId: input.pipelineId,
      stageId: input.newStageId,
      stage: PersonStage.NEW,
      leadType: LeadType.UNKNOWN,
      firstName: 'QA',
      lastName: 'New Lead 3',
      email: qaEmail(input.orgId, 'qa.lead.new.3')
    }),
    upsertQaLead({
      tenantId: input.tenantId,
      orgId: input.orgId,
      ownerId: input.actorUserId,
      pipelineId: input.pipelineId,
      stageId: input.newStageId,
      stage: PersonStage.NEW,
      leadType: LeadType.BUYER,
      firstName: 'QA',
      lastName: 'New Lead 4',
      email: qaEmail(input.orgId, 'qa.lead.new.4')
    }),
    upsertQaLead({
      tenantId: input.tenantId,
      orgId: input.orgId,
      ownerId: input.actorUserId,
      pipelineId: input.pipelineId,
      stageId: input.qualifiedStageId,
      stage: PersonStage.ACTIVE,
      leadType: LeadType.BUYER,
      firstName: 'QA',
      lastName: 'Qualified Lead',
      email: qaEmail(input.orgId, 'qa.lead.qualified.1')
    })
  ]);

  console.log(`[qa-seed] Leads upserted: ${leads.length} (expected: 4 NEW + 1 ACTIVE).`);
  return leads;
}

async function ensureAgent(input: {
  orgId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  riskLevel: AgentRiskLevel;
  riskScore: number;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      organizationId: input.orgId,
      tenantId: input.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      role: UserRole.AGENT
    },
    create: {
      organizationId: input.orgId,
      tenantId: input.tenantId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: UserRole.AGENT
    },
    select: { id: true, email: true }
  });

  await prisma.userOrgMembership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: input.orgId } },
    update: {},
    create: { userId: user.id, orgId: input.orgId, isOrgAdmin: false }
  });

  const profile = await prisma.agentProfile.upsert({
    where: { organizationId_userId: { organizationId: input.orgId, userId: user.id } },
    update: {
      riskLevel: input.riskLevel,
      riskScore: input.riskScore,
      isCompliant: input.riskLevel !== AgentRiskLevel.HIGH,
      requiresAction: true,
      lifecycleStage: AgentLifecycleStage.ACTIVE
    },
    create: {
      organizationId: input.orgId,
      userId: user.id,
      riskLevel: input.riskLevel,
      riskScore: input.riskScore,
      isCompliant: input.riskLevel !== AgentRiskLevel.HIGH,
      requiresAction: true,
      lifecycleStage: AgentLifecycleStage.ACTIVE
    },
    select: { id: true, userId: true, riskLevel: true }
  });

  return { user, profile };
}

async function seedAgents(orgId: string, tenantId: string) {
  const prefix = orgId.slice(0, 8);
  const agents = await Promise.all([
    ensureAgent({
      orgId,
      tenantId,
      email: `qa.agent.high+${prefix}@qa.hatch.test`,
      firstName: 'QA',
      lastName: 'High Risk',
      riskLevel: AgentRiskLevel.HIGH,
      riskScore: 92
    }),
    ensureAgent({
      orgId,
      tenantId,
      email: `qa.agent.medium1+${prefix}@qa.hatch.test`,
      firstName: 'QA',
      lastName: 'Medium Risk 1',
      riskLevel: AgentRiskLevel.MEDIUM,
      riskScore: 64
    }),
    ensureAgent({
      orgId,
      tenantId,
      email: `qa.agent.medium2+${prefix}@qa.hatch.test`,
      firstName: 'QA',
      lastName: 'Medium Risk 2',
      riskLevel: AgentRiskLevel.MEDIUM,
      riskScore: 61
    })
  ]);

  console.log('[qa-seed] Agent compliance/risk seeded: 1 HIGH, 2 MEDIUM (plus any existing agents).');
  return agents.map((entry) => entry.profile);
}

async function upsertOrgListing(params: {
  orgId: string;
  createdByUserId: string;
  agentProfileId: string | null;
  mlsNumber: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  listPrice: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  status: OrgListingStatus;
  brokerApproved: boolean;
}) {
  return prisma.orgListing.upsert({
    where: { mlsNumber: params.mlsNumber },
    update: {
      organizationId: params.orgId,
      agentProfileId: params.agentProfileId,
      addressLine1: params.addressLine1,
      city: params.city,
      state: params.state,
      postalCode: params.postalCode,
      listPrice: params.listPrice,
      propertyType: params.propertyType,
      bedrooms: params.bedrooms,
      bathrooms: params.bathrooms,
      squareFeet: params.squareFeet,
      status: params.status,
      brokerApproved: params.brokerApproved,
      createdByUserId: params.createdByUserId
    },
    create: {
      organizationId: params.orgId,
      agentProfileId: params.agentProfileId,
      mlsNumber: params.mlsNumber,
      addressLine1: params.addressLine1,
      city: params.city,
      state: params.state,
      postalCode: params.postalCode,
      listPrice: params.listPrice,
      propertyType: params.propertyType,
      bedrooms: params.bedrooms,
      bathrooms: params.bathrooms,
      squareFeet: params.squareFeet,
      status: params.status,
      brokerApproved: params.brokerApproved,
      createdByUserId: params.createdByUserId
    },
    select: { id: true, status: true, mlsNumber: true, brokerApproved: true }
  });
}

async function seedListings(orgId: string, actorUserId: string, agentProfileId: string | null) {
  const prefix = orgId.slice(0, 8).toUpperCase();
  const base = {
    orgId,
    createdByUserId: actorUserId,
    agentProfileId,
    city: 'Testville',
    state: 'CA',
    postalCode: '94105'
  };

  const active = await Promise.all(
    Array.from({ length: 5 }).map((_, idx) =>
      upsertOrgListing({
        ...base,
        mlsNumber: `QA-${prefix}-ACTIVE-${idx + 1}`,
        addressLine1: `20${idx + 1} QA Active St`,
        status: OrgListingStatus.ACTIVE,
        brokerApproved: idx === 0 ? false : true,
        listPrice: idx === 0 ? null : 750_000 + idx * 25_000,
        propertyType: idx === 0 ? null : 'Single Family',
        bedrooms: idx === 0 ? null : 3,
        bathrooms: idx === 0 ? null : 2,
        squareFeet: idx === 0 ? null : 1800
      })
    )
  );

  const pending = await upsertOrgListing({
    ...base,
    mlsNumber: `QA-${prefix}-PENDING-1`,
    addressLine1: '301 QA Pending Ave',
    status: OrgListingStatus.PENDING,
    brokerApproved: true,
    listPrice: 825_000,
    propertyType: 'Townhouse',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1650
  });

  const pendingApproval = await upsertOrgListing({
    ...base,
    mlsNumber: `QA-${prefix}-PENDING_BROKER-1`,
    addressLine1: '401 QA Approval Blvd',
    status: OrgListingStatus.PENDING_BROKER_APPROVAL,
    brokerApproved: false,
    listPrice: 910_000,
    propertyType: 'Condo',
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1400
  });

  console.log('[qa-seed] Listings upserted: 5 ACTIVE + 1 PENDING + 1 PENDING_BROKER_APPROVAL.');
  return { active, pending, pendingApproval };
}

async function seedTransaction(orgId: string, actorUserId: string, listingId: string, agentProfileId: string | null) {
  const id = `qa-transaction-${orgId.slice(0, 8)}`;
  const transaction = await prisma.orgTransaction.upsert({
    where: { id },
    update: {
      organizationId: orgId,
      listingId,
      agentProfileId,
      status: OrgTransactionStatus.PRE_CONTRACT,
      buyerName: 'QA Buyer',
      sellerName: 'QA Seller',
      closingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      createdByUserId: actorUserId
    },
    create: {
      id,
      organizationId: orgId,
      listingId,
      agentProfileId,
      status: OrgTransactionStatus.PRE_CONTRACT,
      buyerName: 'QA Buyer',
      sellerName: 'QA Seller',
      closingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      createdByUserId: actorUserId
    },
    select: { id: true, status: true }
  });

  console.log(`[qa-seed] Transaction upserted: ${transaction.id} (editable stage/status).`);
  return transaction;
}

async function seedOfferIntent(orgId: string, listingId: string, transactionId: string) {
  const id = `qa-loi-${orgId.slice(0, 8)}`;
  const loi = await prisma.offerIntent.upsert({
    where: { id },
    update: {
      organizationId: orgId,
      listingId,
      transactionId,
      status: OfferIntentStatus.DRAFT,
      buyerName: 'QA Buyer',
      sellerName: 'QA Seller',
      offeredPrice: 800_000,
      comments: 'QA seeded LOI (manual create + status update validation).'
    },
    create: {
      id,
      organizationId: orgId,
      listingId,
      transactionId,
      status: OfferIntentStatus.DRAFT,
      buyerName: 'QA Buyer',
      sellerName: 'QA Seller',
      offeredPrice: 800_000,
      comments: 'QA seeded LOI (manual create + status update validation).'
    },
    select: { id: true, status: true }
  });

  console.log(`[qa-seed] LOI upserted: ${loi.id} status=${loi.status}.`);
  return loi;
}

async function seedApprovalPoolQueue(input: {
  tenantId: string;
  orgId: string;
  pipelineId: string;
  newStageId: string;
  recommendedAgentUserId?: string | null;
}) {
  const prefix = input.orgId.slice(0, 8);
  const approvalTeamId = `qa-approval-team-${prefix}`;

  await prisma.team.upsert({
    where: { id: approvalTeamId },
    update: {
      tenantId: input.tenantId,
      orgId: input.orgId,
      name: 'Broker Approval Pool',
      description: 'QA seeded approval pool team'
    },
    create: {
      id: approvalTeamId,
      tenantId: input.tenantId,
      orgId: input.orgId,
      name: 'Broker Approval Pool',
      description: 'QA seeded approval pool team'
    },
    select: { id: true }
  });

  await prisma.organizationAddon.upsert({
    where: { organizationId_key: { organizationId: input.orgId, key: 'lead_routing' } },
    update: {
      enabled: true,
      metadata: { version: 1, mode: 'APPROVAL_POOL', approvalTeamId } as unknown as Prisma.JsonObject
    },
    create: {
      organizationId: input.orgId,
      key: 'lead_routing',
      enabled: true,
      metadata: { version: 1, mode: 'APPROVAL_POOL', approvalTeamId } as unknown as Prisma.JsonObject
    }
  });

  const lead = await upsertQaLead({
    tenantId: input.tenantId,
    orgId: input.orgId,
    ownerId: null,
    pipelineId: input.pipelineId,
    stageId: input.newStageId,
    stage: PersonStage.NEW,
    leadType: LeadType.BUYER,
    firstName: 'QA',
    lastName: 'Approval Pool Lead',
    email: qaEmail(input.orgId, 'qa.lead.approval.pool')
  });

  const assignmentId = `qa-approval-assignment-${prefix}`;
  await prisma.assignment.upsert({
    where: { id: assignmentId },
    update: {
      tenantId: input.tenantId,
      personId: lead.id,
      agentId: null,
      teamId: approvalTeamId,
      score: 0,
      expiresAt: null
    },
    create: {
      id: assignmentId,
      tenantId: input.tenantId,
      personId: lead.id,
      agentId: null,
      teamId: approvalTeamId,
      score: 0
    }
  });

  const routeEventId = `qa-approval-route-event-${prefix}`;
  await prisma.leadRouteEvent.upsert({
    where: { id: routeEventId },
    update: {
      tenantId: input.tenantId,
      leadId: lead.id,
      mode: 'SCORE_AND_ASSIGN',
      payload: { seededBy: 'qa-seed', approvalPool: true } as unknown as Prisma.JsonObject,
      candidates: [
        {
          agentId: input.recommendedAgentUserId ?? null,
          fullName: input.recommendedAgentUserId ? 'QA Suggested Agent' : null,
          status: input.recommendedAgentUserId ? 'SELECTED' : 'CANDIDATE',
          score: 0.72,
          reasons: ['QA seeded candidate list']
        }
      ] as unknown as Prisma.JsonArray,
      assignedAgentId: null,
      fallbackUsed: true
    },
    create: {
      id: routeEventId,
      tenantId: input.tenantId,
      leadId: lead.id,
      mode: 'SCORE_AND_ASSIGN',
      payload: { seededBy: 'qa-seed', approvalPool: true } as unknown as Prisma.JsonObject,
      candidates: [
        {
          agentId: input.recommendedAgentUserId ?? null,
          fullName: input.recommendedAgentUserId ? 'QA Suggested Agent' : null,
          status: input.recommendedAgentUserId ? 'SELECTED' : 'CANDIDATE',
          score: 0.72,
          reasons: ['QA seeded candidate list']
        }
      ] as unknown as Prisma.JsonArray,
      assignedAgentId: null,
      fallbackUsed: true
    }
  });

  console.log('[qa-seed] Routing approval pool seeded: settings enabled + 1 queued lead.');
}

async function run() {
  try {
    const org = await resolveOrganization();
    const tenant = await resolveTenant(org.id);
    const actor = await resolveActorUser(org.id, tenant.id);

    const pipeline = await ensureBuyerPipeline(tenant.id);
    const stageNew = await ensureStage(tenant.id, pipeline.id, 'New', 0);
    const stageQualified = await ensureStage(tenant.id, pipeline.id, 'Qualified', 1);

    const agentProfiles = await seedAgents(org.id, tenant.id);
    const primaryAgentProfileId = agentProfiles[0]?.id ?? null;
    const recommendedAgentUserId = agentProfiles[0]?.userId ?? null;

    const leads = await seedLeads({
      tenantId: tenant.id,
      orgId: org.id,
      actorUserId: actor.id,
      pipelineId: pipeline.id,
      newStageId: stageNew.id,
      qualifiedStageId: stageQualified.id
    });

    const listings = await seedListings(org.id, actor.id, primaryAgentProfileId);
    const transaction = await seedTransaction(org.id, actor.id, listings.active[1]?.id ?? listings.pending.id, primaryAgentProfileId);
    await seedOfferIntent(org.id, listings.active[1]?.id ?? listings.pending.id, transaction.id);

    await seedApprovalPoolQueue({
      tenantId: tenant.id,
      orgId: org.id,
      pipelineId: pipeline.id,
      newStageId: stageNew.id,
      recommendedAgentUserId
    });

    console.log('\n[qa-seed] Done.');
    console.log(`[qa-seed] Org: ${org.name} (${org.id})`);
    console.log(`[qa-seed] Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`[qa-seed] Pipeline: ${pipeline.name} (${pipeline.id})`);
    console.log(`[qa-seed] New stage: ${stageNew.name} (${stageNew.id})`);
    console.log(`[qa-seed] Qualified stage: ${stageQualified.name} (${stageQualified.id})`);
    console.log(`[qa-seed] Seeded leads: ${leads.map((l) => `${l.firstName} ${l.lastName} (${l.stage})`).join(' | ')}`);
    console.log('[qa-seed] Expected (on a clean org): 4 New leads, 5 Active listings, 1 Pending listing, 1 Pending broker approval listing.');
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error('[qa-seed] Unhandled error:', error);
  process.exit(1);
});
