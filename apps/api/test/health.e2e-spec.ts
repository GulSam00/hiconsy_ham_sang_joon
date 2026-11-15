import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HEALTH_STATUS, type HealthResponse } from '@study-room/shared';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('GET /api/health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('global prefix가 적용된 경로에서 200과 상태 ok를 반환한다', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    const body = response.body as HealthResponse;

    expect(body.status).toBe(HEALTH_STATUS.OK);
  });

  it('prefix 없는 경로는 404를 반환한다', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
