import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { Clock } from '../../src/common/clock/clock';
import { FixedClock } from '../../src/common/clock/fixed-clock';
import { PrismaService } from '../../src/prisma/prisma.service';

/** e2e 기본 "현재 시각". 각 테스트는 clock.set()으로 바꿀 수 있다. */
export const TEST_NOW = '2026-11-15T03:00:00.000Z';

export interface TestApp {
  app: INestApplication<App>;
  prisma: PrismaService;
  clock: FixedClock;
}

/**
 * 실제 앱과 같은 설정(configureApp)으로 e2e용 앱을 띄운다. Clock만 고정 시각으로 바꾼다.
 * `controllers`는 공통 인프라 검증처럼 테스트에서만 필요한 컨트롤러를 추가할 때 쓴다.
 */
export async function createTestApp(options: { controllers?: Type[] } = {}): Promise<TestApp> {
  const clock = new FixedClock(TEST_NOW);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(Clock)
    .useValue(clock)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), clock };
}

/** FK 역순(이력 → 신청 → 자습실·학생)으로 비운다 (CLAUDE.md 10절) */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.visitHistory.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.studyRoom.deleteMany();
  await prisma.student.deleteMany();
}
