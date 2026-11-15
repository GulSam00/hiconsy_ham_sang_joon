import { Test } from '@nestjs/testing';
import { HEALTH_STATUS } from '@study-room/shared';
import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('상태 ok와 ISO 8601 시각을 반환한다', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    const controller = moduleRef.get(HealthController);

    const result = controller.check();

    expect(result.status).toBe(HEALTH_STATUS.OK);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
