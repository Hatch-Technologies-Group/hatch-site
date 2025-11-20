import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 1 — Accept agent invite', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let tenantId: string;
  let orgId: string;
  let brokerAuth: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    orgId = tenant.organizationId;
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign({ sub: 'user-broker', tenantId, orgId, roles: ['broker'], role: 'BROKER' }, secret, { expiresIn: '2h' })}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const withOrg = (r: request.Test) => r.set('x-tenant-id', tenantId).set('x-org-id', orgId);

  it('accepts a valid invite and creates agent user + membership', async () => {
    // Create invite
    const email = `agent_accept_${Date.now()}@example.com`;
    const inviteRes = await withOrg(
      request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)
    )
      .set('Authorization', brokerAuth)
      .send({ email })
      .expect(201);
    const token = inviteRes.body.token as string;

    // Accept invite
    const accept = await withOrg(request(app.getHttpServer()).post('/agent-invites/accept'))
      .send({ token, password: 'Password!234', firstName: 'New', lastName: 'Agent' })
      .expect(201);
    expect(typeof accept.body.accessToken).toBe('string');
    expect(accept.body.user.role).toBe('AGENT');

    // Check membership and invite status
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(user?.role).toBe('AGENT');
    const membership = await prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId: user!.id, orgId } }
    });
    expect(membership).toBeTruthy();
    const updatedInvite = await prisma.agentInvite.findUnique({ where: { token } });
    expect(updatedInvite?.status).toBe('ACCEPTED');
    expect(updatedInvite?.acceptedByUserId).toBe(user?.id);
  });

  it('fails on duplicate email', async () => {
    // Use existing broker email to trigger conflict
    const email = 'broker@hatchcrm.test';
    const inviteRes = await withOrg(
      request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)
    )
      .set('Authorization', brokerAuth)
      .send({ email })
      .expect(201);
    const token = inviteRes.body.token as string;

    await withOrg(request(app.getHttpServer()).post('/agent-invites/accept'))
      .send({ token, password: 'Password!234', firstName: 'X', lastName: 'Y' })
      .expect(409);
  });
});
