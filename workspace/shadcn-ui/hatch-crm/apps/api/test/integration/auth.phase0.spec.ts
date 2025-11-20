import request from 'supertest';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 0 — Consumer auth', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers a consumer and can login', async () => {
    const email = `consumer_${Date.now()}@example.com`;
    const password = 'Password!234';

    const register = await request(app.getHttpServer())
      .post('/auth/register-consumer')
      .send({ email, password, firstName: 'Jane', lastName: 'Doe' })
      .expect(201);

    expect(register.body?.user?.email).toBe(email);
    expect(register.body?.user?.role).toBe('CONSUMER');
    expect(typeof register.body?.accessToken).toBe('string');

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    expect(login.body?.user?.email).toBe(email);
    expect(typeof login.body?.accessToken).toBe('string');
  });
});

