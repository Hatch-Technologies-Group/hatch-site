import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { describeIf, RUN_INTEGRATION } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { Prisma } from '@hatch/db';

const ORG_ID = 'org-hatch';
const TENANT_ID = 'tenant-hatch';
const ADMIN_ID = 'user-broker';

describeIf(RUN_INTEGRATION)('AI employee template admin editing', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let templateId: string;
  let originalSettings: Prisma.JsonObject;
  let originalAllowed: string[];

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup;
    prisma = setup.prisma;

    const template = await prisma.aiEmployeeTemplate.findFirstOrThrow({
      where: { key: 'lead_nurse' }
    });
    templateId = template.id;
    originalSettings = JSON.parse(JSON.stringify(template.defaultSettings ?? {})) as Prisma.JsonObject;
    originalAllowed = Array.isArray(template.allowedTools)
      ? [...(template.allowedTools as string[])]
      : [];
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    await prisma.aiEmployeeTemplate.update({
      where: { id: templateId },
      data: {
        defaultSettings: originalSettings,
        allowedTools: originalAllowed
      }
    });
  });

  const patchTemplate = (payload: Record<string, unknown>) =>
    request(app.getHttpServer())
      .patch(`/ai/employees/templates/${templateId}`)
      .set('x-org-id', ORG_ID)
      .set('x-tenant-id', TENANT_ID)
      .set('x-user-id', ADMIN_ID)
      .set('x-user-role', 'BROKER')
      .send(payload);

  it('updates avatar defaults and merges default settings', async () => {
    const response = await patchTemplate({
      defaultSettings: { tagline: 'Nurture every lead' },
      personaColor: '#123456',
      avatarShape: 'hexagon',
      avatarIcon: 'nurse',
      avatarInitial: 'LN',
      tone: 'energetic'
    }).expect(200);

    expect(response.body.id).toBe(templateId);
    expect(response.body.defaultSettings.personaColor).toBe('#123456');
    expect(response.body.defaultSettings.avatarShape).toBe('hexagon');
    expect(response.body.defaultSettings.avatarIcon).toBe('nurse');
    expect(response.body.defaultSettings.avatarInitial).toBe('LN');
    expect(response.body.defaultSettings.tone).toBe('energetic');
    expect(response.body.defaultSettings.tagline).toBe('Nurture every lead');
    expect(response.body.defaultSettings.name).toBe(originalSettings.name);
    expect(response.body.key).toBe('lead_nurse');
  });

  it('overrides allowed tools with the provided list', async () => {
    const updatedTools = ['lead_add_note', 'lead_create_follow_up_task'];
    const response = await patchTemplate({
      allowedTools: updatedTools
    }).expect(200);

    expect(response.body.allowedTools).toEqual(updatedTools);
    expect(response.body.allowedTools).not.toEqual(originalAllowed);
  });

  it('rejects template updates for non-admin roles', async () => {
    await request(app.getHttpServer())
      .patch(`/ai/employees/templates/${templateId}`)
      .set('x-org-id', ORG_ID)
      .set('x-tenant-id', TENANT_ID)
      .set('x-user-id', 'user-agent')
      .set('x-user-role', 'AGENT')
      .send({
        personaColor: '#654321'
      })
      .expect(403);
  });
});
