import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { Prisma, PrismaClient } from '@prisma/client';

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

function normalizeBool(value: unknown) {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function parseDatabaseTarget(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || '(missing-db-name)';
  const host = url.hostname || '(missing-host)';
  const port = url.port ? Number(url.port) : null;
  const schema = url.searchParams.get('schema');
  return { host, port, database, schema };
}

function uuidFromString(input: string) {
  const hex = crypto.createHash('sha256').update(input).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const fileEnv = loadEnvFiles();
applyEnv(fileEnv);

const dbEnv = (process.env.DB_ENV ?? '').trim().toLowerCase();
if (!['staging', 'prod', 'dev'].includes(dbEnv)) {
  console.error('[postcheck] Refusing to run: set DB_ENV to one of: staging | prod | dev.');
  process.exit(1);
}

const understandsProd = normalizeBool(process.env.I_UNDERSTAND_MIGRATING_PROD);
if (dbEnv !== 'staging' && !understandsProd) {
  console.error('[postcheck] Refusing to run: DB_ENV is not "staging" and I_UNDERSTAND_MIGRATING_PROD is not true.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[postcheck] Refusing to run: DATABASE_URL is missing.');
  process.exit(1);
}

let target: ReturnType<typeof parseDatabaseTarget>;
try {
  target = parseDatabaseTarget(databaseUrl);
} catch {
  console.error('[postcheck] Refusing to run: DATABASE_URL could not be parsed as a URL.');
  process.exit(1);
}

const portSuffix = target.port ? `:${target.port}` : '';
const schemaSuffix = target.schema ? ` (schema=${target.schema})` : '';

console.log(`[postcheck] DB_ENV=${dbEnv}`);
console.log(`[postcheck] Target database: ${target.host}${portSuffix}/${target.database}${schemaSuffix}`);

const prisma = new PrismaClient();

function readPreferredOrgId() {
  const candidate = (process.env.POSTCHECK_ORG_ID ?? process.env.QA_ORG_ID ?? '').trim();
  return candidate.length ? candidate : null;
}

async function resolveOrgId() {
  const preferred = readPreferredOrgId();
  if (preferred) return preferred;
  const org = await prisma.organization.findFirst({ select: { id: true, name: true } });
  if (!org) throw new Error('No organizations found in database.');
  console.log(`[postcheck] Using first organization: ${org.name} (${org.id})`);
  return org.id;
}

async function resolveActorUserId(orgId: string) {
  const preferredUserId = (process.env.POSTCHECK_USER_ID ?? '').trim();
  if (preferredUserId) return preferredUserId;

  const preferredEmail = (process.env.POSTCHECK_USER_EMAIL ?? '').trim().toLowerCase();
  if (preferredEmail) {
    const user = await prisma.user.findFirst({ where: { email: preferredEmail, organizationId: orgId }, select: { id: true } });
    if (user) return user.id;
    throw new Error(`POSTCHECK_USER_EMAIL=${preferredEmail} not found in org ${orgId}`);
  }

  const fallback = await prisma.user.findFirst({ where: { organizationId: orgId }, select: { id: true, email: true } });
  if (!fallback) throw new Error(`No users found for organizationId=${orgId}`);
  console.log(`[postcheck] Using first user as actor: ${fallback.email ?? fallback.id}`);
  return fallback.id;
}

let failures = 0;

async function checkOfferIntentStatuses() {
  console.log('\n[postcheck] 2.1 LOI status validation');

  const groups = await prisma.offerIntent.groupBy({
    by: ['status'],
    _count: { _all: true }
  });

  const sorted = groups.slice().sort((a, b) => String(a.status).localeCompare(String(b.status)));
  if (sorted.length === 0) {
    console.log('- No OfferIntent rows found (skipping status mapping verification).');
    return;
  }

  console.log('- OfferIntent status counts:');
  for (const row of sorted) {
    console.log(`  - ${row.status}: ${row._count._all}`);
  }

  const legacyStatuses = new Set(['SUBMITTED', 'UNDER_REVIEW', 'DECLINED', 'WITHDRAWN']);
  const legacy = sorted.filter((row) => legacyStatuses.has(String(row.status)));
  const legacyCount = legacy.reduce((sum, row) => sum + row._count._all, 0);

  if (legacyCount > 0) {
    failures += 1;
    console.error(`- ERROR: ${legacyCount} OfferIntent row(s) still use legacy statuses (${[...legacyStatuses].join(', ')}).`);
  } else {
    console.log('- OK: No OfferIntent rows in legacy statuses.');
  }
}

async function checkOrgEventTypeEnum(orgId: string, userId: string) {
  console.log('\n[postcheck] 2.2 OrgEventType enum validation');

  const testType = 'ORG_OFFER_INTENT_CREATED' as const;

  try {
    const created = await prisma.orgEvent.create({
      data: {
        organizationId: orgId,
        actorId: userId,
        type: testType,
        message: 'QA postcheck enum insert',
        payload: { source: 'staging-postcheck.ts', createdAt: new Date().toISOString() }
      }
    });

    const readBack = await prisma.orgEvent.findUnique({ where: { id: created.id }, select: { id: true, type: true } });
    if (!readBack) {
      failures += 1;
      console.error('- ERROR: Inserted OrgEvent could not be read back.');
    } else {
      console.log(`- OK: Insert/read succeeded for OrgEventType=${readBack.type}.`);
    }

    await prisma.orgEvent.delete({ where: { id: created.id } });
  } catch (error) {
    failures += 1;
    console.error(`- ERROR: Failed to insert OrgEvent with type=${testType}.`);
    console.error(error);
  }
}

async function checkChatSessionContext(orgId: string, userId: string) {
  console.log('\n[postcheck] 2.3 Chat session context validation');

  const duplicates = await prisma.$queryRaw<
    Array<{ organizationId: string; userId: string; contextKey: string; count: number }>
  >(Prisma.sql`
    SELECT "organizationId", "userId", "contextKey", COUNT(*)::int as count
    FROM "ChatSession"
    GROUP BY 1,2,3
    HAVING COUNT(*) > 1
  `);

  if (duplicates.length > 0) {
    failures += 1;
    console.error(`- ERROR: Found ${duplicates.length} duplicate (organizationId,userId,contextKey) rows.`);
    console.error(duplicates.slice(0, 5));
  } else {
    console.log('- OK: No duplicate (organizationId,userId,contextKey) rows found.');
  }

  const existingSessions = await prisma.chatSession.count({ where: { organizationId: orgId, userId } });
  console.log(`- Info: ChatSession rows for this user/org: ${existingSessions}`);

  const contextKey = `qa-postcheck-unique-${Date.now()}`;
  const created = await prisma.chatSession.create({
    data: {
      organizationId: orgId,
      userId,
      contextType: 'GENERAL',
      contextKey,
      contextSnapshot: { seededBy: 'staging-postcheck.ts', createdAt: new Date().toISOString() }
    },
    select: { id: true }
  });

  try {
    await prisma.chatSession.create({
      data: {
        organizationId: orgId,
        userId,
        contextType: 'GENERAL',
        contextKey,
        contextSnapshot: { seededBy: 'staging-postcheck.ts', duplicateAttempt: true }
      }
    });
    failures += 1;
    console.error('- ERROR: Duplicate ChatSession insert unexpectedly succeeded (unique index missing?).');
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.log('- OK: Unique index enforced (duplicate insert rejected).');
    } else {
      failures += 1;
      console.error('- ERROR: Duplicate ChatSession insert failed, but not with a unique constraint error.');
      console.error(error);
    }
  } finally {
    await prisma.chatMessage.deleteMany({ where: { sessionId: created.id } });
    await prisma.chatSession.delete({ where: { id: created.id } });
  }
}

async function checkSellerOpportunityAndLedger(orgId: string, userId: string) {
  console.log('\n[postcheck] 2.4 SellerOpportunity + OrgLedgerEntry validation');

  const seller = await prisma.sellerOpportunity.upsert({
    where: {
      organizationId_dedupeKey: {
        organizationId: orgId,
        dedupeKey: `qa-postcheck:${orgId}`
      }
    },
    update: {
      status: 'NEW',
      score: 87,
      signals: [
        { key: 'ownership_length_years', value: 11, weight: 0.3 },
        { key: 'equity_estimate', value: 'high', weight: 0.4 },
        { key: 'listing_absence_months', value: 18, weight: 0.3 }
      ],
      lastSeenAt: new Date()
    },
    create: {
      organizationId: orgId,
      dedupeKey: `qa-postcheck:${orgId}`,
      source: 'QA_POSTCHECK',
      status: 'NEW',
      score: 87,
      signals: [
        { key: 'ownership_length_years', value: 11, weight: 0.3 },
        { key: 'equity_estimate', value: 'high', weight: 0.4 },
        { key: 'listing_absence_months', value: 18, weight: 0.3 }
      ],
      addressLine1: '101 QA Seller Ln',
      city: 'Testville',
      state: 'CA',
      postalCode: '94105',
      county: 'San Francisco',
      lastSeenAt: new Date()
    },
    select: { id: true, score: true, addressLine1: true, city: true, state: true, postalCode: true }
  });

  console.log(`- OK: SellerOpportunity upserted (${seller.id}) score=${seller.score} address=${seller.addressLine1}, ${seller.city}`);

  const ledgerId = uuidFromString(`qa-postcheck-ledger:${orgId}`);
  const ledger = await prisma.orgLedgerEntry.upsert({
    where: { id: ledgerId },
    update: {
      type: 'INCOME',
      category: 'QA_POSTCHECK',
      amount: new Prisma.Decimal('1234.00'),
      occurredAt: new Date(),
      memo: 'QA postcheck ledger entry (safe to delete)',
      createdByUserId: userId
    },
    create: {
      id: ledgerId,
      orgId,
      type: 'INCOME',
      category: 'QA_POSTCHECK',
      amount: new Prisma.Decimal('1234.00'),
      occurredAt: new Date(),
      memo: 'QA postcheck ledger entry (safe to delete)',
      createdByUserId: userId
    },
    select: { id: true, type: true, category: true, amount: true, occurredAt: true }
  });

  console.log(`- OK: OrgLedgerEntry upserted (${ledger.id}) type=${ledger.type} amount=${ledger.amount.toFixed(2)}`);
  console.log('- Manual UI checks: /broker/opportunities (Seller tab) and /broker/financials should show these QA_POSTCHECK rows.');
}

async function run() {
  try {
    const orgId = await resolveOrgId();
    const userId = await resolveActorUserId(orgId);

    await checkOfferIntentStatuses();
    await checkOrgEventTypeEnum(orgId, userId);
    await checkChatSessionContext(orgId, userId);
    await checkSellerOpportunityAndLedger(orgId, userId);

    if (failures > 0) {
      console.error(`\n[postcheck] FAILED with ${failures} error(s).`);
      process.exitCode = 1;
    } else {
      console.log('\n[postcheck] All checks passed.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error('[postcheck] Unhandled error:', error);
  process.exit(1);
});

