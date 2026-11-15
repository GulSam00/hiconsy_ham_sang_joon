import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DATABASE_STATUS, HEALTH_STATUS } from '@study-room/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const queryRaw = vi.fn<() => Promise<unknown>>();
  let controller: HealthController;

  beforeEach(async () => {
    queryRaw.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('DB 조회가 성공하면 ok와 ISO 8601 시각을 반환한다', async () => {
    queryRaw.mockResolvedValue([{ 1: 1 }]);

    const result = await controller.check();

    expect(result.status).toBe(HEALTH_STATUS.OK);
    expect(result.database).toBe(DATABASE_STATUS.UP);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('DB 조회가 실패하면 503 예외를 던지고 내부 오류 메시지를 노출하지 않는다', async () => {
    queryRaw.mockRejectedValue(new Error('SQLITE_CANTOPEN: /secret/path/dev.db'));

    const promise = controller.check();

    await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(promise).rejects.not.toThrow(/secret/);
  });
});
