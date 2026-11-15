import { Test } from '@nestjs/testing';
import { DATABASE_STATUS, ERROR_CODE, HEALTH_STATUS } from '@study-room/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Clock } from '../common/clock/clock';
import { FixedClock } from '../common/clock/fixed-clock';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

const NOW = '2026-11-15T03:00:00.000Z';

describe('HealthController', () => {
  const queryRaw = vi.fn<() => Promise<unknown>>();
  let controller: HealthController;

  beforeEach(async () => {
    queryRaw.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
        { provide: Clock, useValue: new FixedClock(NOW) },
      ],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('DB 조회가 성공하면 ok와 Clock 기준 시각을 반환한다', async () => {
    queryRaw.mockResolvedValue([{ 1: 1 }]);

    const result = await controller.check();

    expect(result).toEqual({
      status: HEALTH_STATUS.OK,
      database: DATABASE_STATUS.UP,
      timestamp: NOW,
    });
  });

  it('DB 조회가 실패하면 DATABASE_UNAVAILABLE을 던지고 내부 오류 메시지를 노출하지 않는다', async () => {
    queryRaw.mockRejectedValue(new Error('SQLITE_CANTOPEN: /secret/path/dev.db'));

    const error: unknown = await controller.check().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(DomainException);
    expect((error as DomainException).code).toBe(ERROR_CODE.DATABASE_UNAVAILABLE);
    expect((error as DomainException).message).not.toMatch(/secret/);
  });
});
