import { DATABASE_STATUS, HEALTH_STATUS, type HealthResponse } from '@study-room/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_NOW, createTestApp, type TestApp } from './support/test-app';

describe('GET /api/health (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('global prefix가 적용된 경로에서 200과 서버·DB 상태를 반환한다', async () => {
    const response = await request(t.app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body as HealthResponse).toEqual({
      status: HEALTH_STATUS.OK,
      database: DATABASE_STATUS.UP,
      timestamp: TEST_NOW,
    });
  });

  it('prefix 없는 경로는 404를 반환한다', async () => {
    await request(t.app.getHttpServer()).get('/health').expect(404);
  });
});
