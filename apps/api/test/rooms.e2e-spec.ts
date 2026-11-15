import {
  ERROR_CODE,
  type CapacityConflictDetails,
  type ErrorResponse,
  type FieldError,
  type PeriodConflictDetails,
  type RoomResponse,
} from '@study-room/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ActorType, VisitAction, VisitStatus } from '../src/generated/prisma/client';
import { SYSTEM_CANCEL_REASON } from '../src/modules/visits/visit-history.factory';
import {
  TEACHER,
  createRoom,
  createStudent,
  createVisit,
  readActiveCounts,
  studentHeaders,
} from './support/fixtures';
import { TEST_NOW, createTestApp, resetDatabase, type TestApp } from './support/test-app';

// TEST_NOW = 2026-11-15T03:00:00Z
const PAST = '2026-11-15T01:00:00.000Z';
const FUTURE_1 = '2026-11-16T10:00:00.000Z';
const FUTURE_2 = '2026-11-18T10:00:00.000Z';

describe('자습실 API (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    t.clock.set(TEST_NOW);
  });

  const http = () => request(t.app.getHttpServer());

  const validBody = {
    title: '수학 자습실',
    maxPersonnel: 5,
    startDate: '2026-11-20T09:00:00+09:00',
    endDate: '2026-11-27T22:00:00+09:00',
  };

  describe('권한', () => {
    it('학생은 목록을 볼 수 있다', async () => {
      await http().get('/api/rooms').set(studentHeaders(1)).expect(200);
    });

    it.each([
      ['등록', (h: ReturnType<typeof http>) => h.post('/api/rooms').send(validBody)],
      ['수정', (h: ReturnType<typeof http>) => h.patch('/api/rooms/1').send({ title: 'x' })],
      ['삭제', (h: ReturnType<typeof http>) => h.delete('/api/rooms/1')],
    ])('학생은 %s할 수 없다 (403)', async (_name, send) => {
      const res = await send(http()).set(studentHeaders(1)).expect(403);
      expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.FORBIDDEN_ROLE);
    });
  });

  describe('등록 (FR-ROM-02)', () => {
    it('등록하면 UTC로 정규화된 일시와 신청 수 0을 돌려준다', async () => {
      const res = await http().post('/api/rooms').set(TEACHER).send(validBody).expect(201);

      expect(res.body).toMatchObject({
        title: '수학 자습실',
        maxPersonnel: 5,
        activeCount: 0,
        startDate: '2026-11-20T00:00:00.000Z',
        endDate: '2026-11-27T13:00:00.000Z',
      });
      expect(res.body).not.toHaveProperty('deletedAt');
    });

    it('시작 = 종료면 422 INVALID_PERIOD', async () => {
      const res = await http()
        .post('/api/rooms')
        .set(TEACHER)
        .send({ ...validBody, endDate: validBody.startDate })
        .expect(422);
      expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.INVALID_PERIOD);
    });

    it.each<[string, Record<string, unknown>, string]>([
      ['시간대 없는 일시', { startDate: '2026-11-20T09:00:00' }, 'startDate'],
      ['정원 0', { maxPersonnel: 0 }, 'maxPersonnel'],
      ['정원 소수', { maxPersonnel: 1.5 }, 'maxPersonnel'],
      ['빈 이름', { title: '' }, 'title'],
      ['서버 관리 필드', { activeCount: 3 }, 'activeCount'],
    ])('%s → 400', async (_name, override, field) => {
      const res = await http()
        .post('/api/rooms')
        .set(TEACHER)
        .send({ ...validBody, ...override })
        .expect(400);
      const body = res.body as ErrorResponse<FieldError[]>;
      expect(body.code).toBe(ERROR_CODE.VALIDATION_FAILED);
      expect(body.details?.map((detail) => detail.field)).toContain(field);
    });
  });

  describe('조회 (FR-ROM-01)', () => {
    it('삭제된 자습실을 빼고 운영 시작 순으로 돌려준다', async () => {
      const later = await createRoom(t.prisma, {
        title: '나중',
        startDate: new Date('2026-11-18T00:00:00Z'),
      });
      const earlier = await createRoom(t.prisma, {
        title: '먼저',
        startDate: new Date('2026-11-16T00:00:00Z'),
      });
      await createRoom(t.prisma, { title: '삭제됨', deletedAt: new Date() });

      const res = await http().get('/api/rooms').set(TEACHER).expect(200);

      expect((res.body as RoomResponse[]).map((room) => room.id)).toEqual([earlier.id, later.id]);
    });

    it('삭제된 자습실 단건 조회는 404', async () => {
      const room = await createRoom(t.prisma, { deletedAt: new Date() });

      const res = await http().get(`/api/rooms/${room.id}`).set(TEACHER).expect(404);
      expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.ROOM_NOT_FOUND);
    });
  });

  describe('수정 (FR-ROM-04)', () => {
    it('보낸 필드만 바꾼다', async () => {
      const room = await createRoom(t.prisma, { title: '이전', maxPersonnel: 7 });

      const res = await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ title: '이후' })
        .expect(200);

      expect(res.body).toMatchObject({ title: '이후', maxPersonnel: 7 });
    });

    it('빈 body는 400', async () => {
      const room = await createRoom(t.prisma);
      await http().patch(`/api/rooms/${room.id}`).set(TEACHER).send({}).expect(400);
    });

    it('기존 시작보다 이른 종료로 바꾸면 422 INVALID_PERIOD', async () => {
      const room = await createRoom(t.prisma);

      const res = await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ endDate: '2026-11-14T00:00:00Z' })
        .expect(422);
      expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.INVALID_PERIOD);
    });

    it('삭제된 자습실은 404', async () => {
      const room = await createRoom(t.prisma, { deletedAt: new Date() });
      await http().patch(`/api/rooms/${room.id}`).set(TEACHER).send({ title: 'x' }).expect(404);
    });
  });

  describe('R6: 정원 축소', () => {
    async function roomWithThreeActive() {
      const room = await createRoom(t.prisma, { maxPersonnel: 5 });
      const [a, b, c] = await Promise.all([
        createStudent(t.prisma, '지난'),
        createStudent(t.prisma, '예정1'),
        createStudent(t.prisma, '예정2'),
      ]);
      const past = await createVisit(t.prisma, room, a, PAST);
      const f1 = await createVisit(t.prisma, room, b, FUTURE_1);
      const f2 = await createVisit(t.prisma, room, c, FUTURE_2);
      return { room, past, f1, f2 };
    }

    it('활성 신청 수까지는 줄일 수 있다', async () => {
      const { room } = await roomWithThreeActive();

      await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ maxPersonnel: 3 })
        .expect(200);
    });

    it('활성 신청 수보다 작으면 409와 취소 가능한 예정 신청 목록을 돌려주고, 아무것도 바꾸지 않는다', async () => {
      const { room, f1, f2 } = await roomWithThreeActive();

      const res = await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ maxPersonnel: 2, title: '바뀌면 안 됨' })
        .expect(409);

      const body = res.body as ErrorResponse<CapacityConflictDetails>;
      expect(body.code).toBe(ERROR_CODE.CAPACITY_BELOW_ACTIVE);
      expect(body.details).toMatchObject({ activeCount: 3, requestedMaxPersonnel: 2 });
      expect(body.details?.cancellableVisits.map((v) => v.visitId)).toEqual([f1.id, f2.id]);

      const after = await t.prisma.studyRoom.findUniqueOrThrow({ where: { id: room.id } });
      expect(after).toMatchObject({ maxPersonnel: 5, title: room.title });
    });
  });

  describe('R7: 기간 변경', () => {
    it('예정 신청이 밀려나면 409와 충돌 목록', async () => {
      const room = await createRoom(t.prisma);
      const student = await createStudent(t.prisma);
      const visit = await createVisit(t.prisma, room, student, FUTURE_2);

      const res = await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ endDate: '2026-11-17T00:00:00Z' })
        .expect(409);

      const body = res.body as ErrorResponse<PeriodConflictDetails>;
      expect(body.code).toBe(ERROR_CODE.PERIOD_EXCLUDES_VISITS);
      expect(body.details?.conflicts).toEqual([
        expect.objectContaining({ visitId: visit.id, isPast: false, studentName: student.name }),
      ]);
    });

    it('지난 방문이 밀려나도 409이며 isPast로 표시한다 (강사도 해소 불가)', async () => {
      const room = await createRoom(t.prisma);
      const student = await createStudent(t.prisma);
      await createVisit(t.prisma, room, student, PAST);

      const res = await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ startDate: '2026-11-15T02:00:00Z' })
        .expect(409);

      const body = res.body as ErrorResponse<PeriodConflictDetails>;
      expect(body.details?.conflicts[0]?.isPast).toBe(true);
    });

    it('취소된 신청은 검사하지 않는다', async () => {
      const room = await createRoom(t.prisma);
      const student = await createStudent(t.prisma);
      await createVisit(t.prisma, room, student, FUTURE_2, VisitStatus.CANCELED);

      await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ endDate: '2026-11-17T00:00:00Z' })
        .expect(200);
    });
  });

  describe('삭제 (FR-ROM-05, R8)', () => {
    it('예정 신청만 시스템 취소하고 이력을 남기며, 지난 방문은 그대로 둔다', async () => {
      const room = await createRoom(t.prisma);
      const [a, b, c] = await Promise.all([
        createStudent(t.prisma, '지난'),
        createStudent(t.prisma, '예정'),
        createStudent(t.prisma, '취소됨'),
      ]);
      const past = await createVisit(t.prisma, room, a, PAST);
      const upcoming = await createVisit(t.prisma, room, b, FUTURE_1);
      const canceled = await createVisit(t.prisma, room, c, FUTURE_2, VisitStatus.CANCELED);

      await http().delete(`/api/rooms/${room.id}`).set(TEACHER).expect(204);

      const visits = await t.prisma.visit.findMany({ orderBy: { id: 'asc' } });
      expect(visits.map((v) => [v.id, v.status])).toEqual([
        [past.id, VisitStatus.ACTIVE],
        [upcoming.id, VisitStatus.CANCELED],
        [canceled.id, VisitStatus.CANCELED],
      ]);

      const histories = await t.prisma.visitHistory.findMany();
      expect(histories).toEqual([
        expect.objectContaining({
          visitId: upcoming.id,
          action: VisitAction.SYSTEM_CANCELED,
          actorType: ActorType.SYSTEM,
          prevVisitAt: new Date(FUTURE_1),
          nextVisitAt: null,
          reason: SYSTEM_CANCEL_REASON.ROOM_DELETED,
          createdAt: new Date(TEST_NOW),
        }),
      ]);

      const counts = await readActiveCounts(t.prisma, room.id);
      expect(counts).toEqual({ activeCount: 1, actual: 1 });

      await http().get(`/api/rooms/${room.id}`).set(TEACHER).expect(404);
      const list = await http().get('/api/rooms').set(TEACHER).expect(200);
      expect(list.body).toEqual([]);
    });

    it('이미 삭제된 자습실은 404', async () => {
      const room = await createRoom(t.prisma, { deletedAt: new Date() });

      const res = await http().delete(`/api/rooms/${room.id}`).set(TEACHER).expect(404);
      expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.ROOM_NOT_FOUND);
    });
  });
});
