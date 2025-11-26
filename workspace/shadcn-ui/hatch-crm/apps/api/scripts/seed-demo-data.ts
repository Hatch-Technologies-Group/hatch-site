import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = process.env.SEED_ORG_ID ?? 'org-hatch';
const TENANT_ID = process.env.SEED_TENANT_ID ?? 'tenant-hatch';
const USER_ID = process.env.SEED_USER_ID ?? 'user-broker';
const USER_EMAIL = process.env.SEED_USER_EMAIL ?? 'broker@demo.local';

async function upsertOrganization() {
  return prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {
      name: 'Hatch Demo Brokerage',
      updatedAt: new Date()
    },
    create: {
      id: ORG_ID,
      name: 'Hatch Demo Brokerage',
      slug: 'hatch-demo',
      isDemo: true
    }
  });
}

async function upsertTenant(orgId: string) {
  return prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {
      name: 'Hatch Demo Tenant',
      organizationId: orgId,
      updatedAt: new Date()
    },
    create: {
      id: TENANT_ID,
      name: 'Hatch Demo Tenant',
      slug: 'hatch-demo',
      organizationId: orgId
    }
  });
}

async function upsertUser(orgId: string, tenantId: string) {
  return prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {
      organizationId: orgId,
      tenantId,
      firstName: 'Demo',
      lastName: 'Broker',
      role: UserRole.BROKER,
      status: 'active'
    },
    create: {
      id: USER_ID,
      email: USER_EMAIL,
      organizationId: orgId,
      tenantId,
      firstName: 'Demo',
      lastName: 'Broker',
      role: UserRole.BROKER,
      status: 'active',
      passwordHash: null
    }
  });
}

async function upsertMembership(userId: string, orgId: string) {
  return prisma.userOrgMembership.upsert({
    where: {
      userId_orgId: {
        userId,
        orgId
      }
    },
    update: {
      isOrgAdmin: true
    },
    create: {
      userId,
      orgId,
      isOrgAdmin: true
    }
  });
}

async function main() {
  const org = await upsertOrganization();
  const tenant = await upsertTenant(org.id);
  const user = await upsertUser(org.id, tenant.id);
  await upsertMembership(user.id, org.id);

  // eslint-disable-next-line no-console
  console.log('Seeded demo entities:', {
    organizationId: org.id,
    tenantId: tenant.id,
    userId: user.id,
    email: user.email
  });
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
