/**
 * 스키마가 CLAUDE.md 6·7절의 규칙을 DB 레벨에서 보장하는지 검증한다.
 * 이후 서비스 구현이 기대는 전제(유니크 제약, FK, 조건부 원자적 UPDATE)가 실제 SQLite에서 동작하는지 먼저 확인한다.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { applySqlitePragmas, createPrismaClient } from '../src/database/create-prisma-client';
import { Prisma, type PrismaClient } from '../src/generated/prisma/client';
import { TEST_DATABASE_URL } from './test-database.mjs';

const START = new Date('2026-12-01T00:00:00.000Z');
const END = new Date('2026-12-07T13:00:00.000Z');

describe('DB 스키마 (SQLite 통합)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createPrismaClient(TEST_DATABASE_URL);
    await prisma.$connect();
    await applySqlitePragmas(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // FK 순서대로 비운다 (자식 → 부모)
    await prisma.visitHistory.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.studyRoom.deleteMany();
    await prisma.student.deleteMany();
  });

  async function createRoom(maxPersonnel: number, deletedAt: Date | null = null) {
    return prisma.studyRoom.create({
      data: { title: '테스트 자습실', maxPersonnel, startDate: START, endDate: END, deletedAt },
    });
  }

  async function createStudent(name = '테스트 학생') {
    return prisma.student.create({ data: { name, phone: '010-0000-0000' } });
  }

  /** 정원 확보: CLAUDE.md 7절의 조건부 원자적 UPDATE와 같은 쿼리 */
  function reserveSeat(roomId: number) {
    return prisma.studyRoom.updateMany({
      where: {
        id: roomId,
        deletedAt: null,
        activeCount: { lt: prisma.studyRoom.fields.maxPersonnel },
      },
      data: { activeCount: { increment: 1 } },
    });
  }

  it('WAL 모드가 적용된다', async () => {
    const rows = await prisma.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode;');
    expect(rows[0]?.journal_mode).toBe('wal');
  });

  it('같은 (자습실, 학생)으로 두 번째 신청 레코드를 만들면 P2002로 거부된다', async () => {
    const room = await createRoom(5);
    const student = await createStudent();
    await prisma.visit.create({ data: { roomId: room.id, studentId: student.id, visitAt: START } });

    const duplicate = prisma.visit.create({
      data: { roomId: room.id, studentId: student.id, visitAt: END },
    });

    await expect(duplicate).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002',
    );
  });

  it('존재하지 않는 자습실로 신청 레코드를 만들면 FK 제약(P2003)으로 거부된다', async () => {
    const student = await createStudent();

    const orphan = prisma.visit.create({
      data: { roomId: 999_999, studentId: student.id, visitAt: START },
    });

    await expect(orphan).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003',
    );
  });

  it('신청 레코드가 있는 자습실은 물리 삭제할 수 없다 (onDelete: Restrict)', async () => {
    const room = await createRoom(5);
    const student = await createStudent();
    await prisma.visit.create({ data: { roomId: room.id, studentId: student.id, visitAt: START } });

    await expect(prisma.studyRoom.delete({ where: { id: room.id } })).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
  });

  it('조건부 원자적 UPDATE는 정원까지만 증가하고 그 이후에는 0건을 반환한다', async () => {
    const room = await createRoom(2);

    const results = [];
    for (let i = 0; i < 3; i += 1) {
      results.push((await reserveSeat(room.id)).count);
    }

    expect(results).toEqual([1, 1, 0]);
    const after = await prisma.studyRoom.findUniqueOrThrow({ where: { id: room.id } });
    expect(after.activeCount).toBe(2);
  });

  it('동시에 20건을 요청해도 정원(3)을 넘지 않는다', async () => {
    const room = await createRoom(3);

    const results = await Promise.all(Array.from({ length: 20 }, () => reserveSeat(room.id)));

    const succeeded = results.filter((result) => result.count === 1).length;
    expect(succeeded).toBe(3);
    const after = await prisma.studyRoom.findUniqueOrThrow({ where: { id: room.id } });
    expect(after.activeCount).toBe(3);
  });

  it('삭제된 자습실은 정원이 남아 있어도 확보되지 않는다', async () => {
    const room = await createRoom(5, new Date());

    const { count } = await reserveSeat(room.id);

    expect(count).toBe(0);
  });

  it('DateTime은 UTC 기준으로 그대로 저장·조회된다', async () => {
    const room = await createRoom(1);

    const found = await prisma.studyRoom.findUniqueOrThrow({ where: { id: room.id } });

    expect(found.startDate.toISOString()).toBe(START.toISOString());
    expect(found.endDate.toISOString()).toBe(END.toISOString());
  });
});
