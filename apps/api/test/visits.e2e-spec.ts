import {
  ERROR_CODE,
  type CapacityConflictDetails,
  VISIT_ACTION,
  VISIT_STATUS,
  type ErrorResponse,
  type RoomVisitResponse,
  type VisitHistoryResponse,
  type VisitResponse,
} from '@study-room/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Student, StudyRoom } from '../src/generated/prisma/client';
import { replayVisitHistory } from '../src/modules/visits/visit-history.replay';
import {
  TEACHER,
  createRoom,
  createStudent,
  readActiveCounts,
  studentHeaders,
} from './support/fixtures';
import { TEST_NOW, createTestApp, resetDatabase, type TestApp } from './support/test-app';

// TEST_NOW = 2026-11-15T03:00:00Z, 기본 자습실 기간 = 11-15 00:00Z ~ 11-20 13:00Z
const T1 = '2026-11-16T10:00:00.000Z';
const T2 = '2026-11-17T10:00:00.000Z';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('방문 신청 API (e2e)', () => {
  let t: TestApp;
  let room: StudyRoom;
  let student: Student;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    t.clock.set(TEST_NOW);
    room = await createRoom(t.prisma, { maxPersonnel: 3 });
    student = await createStudent(t.prisma, '김민준');
  });

  const http = () => request(t.app.getHttpServer());

  const apply = (roomId: number, studentId: number, visitAt: string) =>
    http().post(`/api/rooms/${roomId}/visits`).set(studentHeaders(studentId)).send({ visitAt });

  const change = (visitId: number, studentId: number, visitAt: string) =>
    http().patch(`/api/visits/${visitId}`).set(studentHeaders(studentId)).send({ visitAt });

  const cancel = (visitId: number, studentId: number, body?: object) => {
    const req = http().post(`/api/visits/${visitId}/cancel`).set(studentHeaders(studentId));
    return body === undefined ? req : req.send(body);
  };

  const histories = async (roomId: number) =>
    (await http().get(`/api/rooms/${roomId}/histories`).set(TEACHER).expect(200))
      .body as VisitHistoryResponse[];

  const codeOf = (body: unknown) => (body as ErrorResponse).code;

  async function applyOk(studentId = student.id, visitAt = T1): Promise<VisitResponse> {
    return (await apply(room.id, studentId, visitAt).expect(201)).body as VisitResponse;
  }

  describe('신청 (FR-VST-01)', () => {
    it('신청하면 ACTIVE 신청, APPLIED 이력, 정원 +1', async () => {
      const visit = await applyOk();

      expect(visit).toMatchObject({
        roomId: room.id,
        studentId: student.id,
        visitAt: T1,
        status: VISIT_STATUS.ACTIVE,
        isPast: false,
      });
      expect(await histories(room.id)).toEqual([
        expect.objectContaining({
          visitId: visit.id,
          studentName: '김민준',
          action: VISIT_ACTION.APPLIED,
          actor: 'STUDENT',
          prevVisitAt: null,
          nextVisitAt: T1,
          createdAt: TEST_NOW,
        }),
      ]);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 1, actual: 1 });
    });

    it('시간대 표기(+09:00)로 보내도 같은 순간으로 저장한다', async () => {
      const res = await apply(room.id, student.id, '2026-11-16T19:00:00+09:00').expect(201);
      expect((res.body as VisitResponse).visitAt).toBe(T1);
    });

    it('강사는 신청할 수 없다 (403), 학생 id가 없으면 401', async () => {
      await http()
        .post(`/api/rooms/${room.id}/visits`)
        .set(TEACHER)
        .send({ visitAt: T1 })
        .expect(403);
      await http()
        .post(`/api/rooms/${room.id}/visits`)
        .set('X-Actor-Role', 'STUDENT')
        .send({ visitAt: T1 })
        .expect(401);
    });

    it('삭제된 학생 id로는 신청할 수 없다 (404)', async () => {
      await t.prisma.student.update({ where: { id: student.id }, data: { deletedAt: new Date() } });

      const res = await apply(room.id, student.id, T1).expect(404);
      expect(codeOf(res.body)).toBe(ERROR_CODE.STUDENT_NOT_FOUND);
    });

    it('삭제된 자습실에는 신청할 수 없다 (404)', async () => {
      await http().delete(`/api/rooms/${room.id}`).set(TEACHER).expect(204);

      const res = await apply(room.id, student.id, T1).expect(404);
      expect(codeOf(res.body)).toBe(ERROR_CODE.ROOM_NOT_FOUND);
    });

    it.each<[string, string, number, string]>([
      ['지난 시각', '2026-11-15T02:59:59.999Z', 422, ERROR_CODE.VISIT_IN_PAST],
      ['운영 종료 후', '2026-11-20T13:00:00.001Z', 422, ERROR_CODE.VISIT_OUT_OF_PERIOD],
    ])('%s → %s', async (_name, visitAt, status, code) => {
      const res = await apply(room.id, student.id, visitAt).expect(status);
      expect(codeOf(res.body)).toBe(code);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 0, actual: 0 });
    });

    it('같은 자습실에 활성 신청이 있으면 409 DUPLICATE_VISIT', async () => {
      await applyOk();

      const res = await apply(room.id, student.id, T2).expect(409);
      expect(codeOf(res.body)).toBe(ERROR_CODE.DUPLICATE_VISIT);
    });

    it('정원이 차면 409 ROOM_FULL, 취소하면 다시 신청할 수 있다 (정원 복원)', async () => {
      const others = await Promise.all([1, 2, 3].map((i) => createStudent(t.prisma, `학생${i}`)));
      const visits = [];
      for (const other of others) {
        visits.push(await applyOk(other.id));
      }

      const full = await apply(room.id, student.id, T1).expect(409);
      expect(codeOf(full.body)).toBe(ERROR_CODE.ROOM_FULL);

      const first = visits[0];
      const firstStudent = others[0];
      if (first === undefined || firstStudent === undefined) throw new Error('fixture 오류');
      await cancel(first.id, firstStudent.id).expect(200);

      await apply(room.id, student.id, T1).expect(201);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 3, actual: 3 });
    });
  });

  describe('시간 수정 (FR-VST-02)', () => {
    it('수정하면 TIME_CHANGED 이력에 이전·이후 시각을 남긴다', async () => {
      const visit = await applyOk();

      const res = await change(visit.id, student.id, T2).expect(200);

      expect((res.body as VisitResponse).visitAt).toBe(T2);
      expect((await histories(room.id)).at(-1)).toMatchObject({
        action: VISIT_ACTION.TIME_CHANGED,
        prevVisitAt: T1,
        nextVisitAt: T2,
      });
    });

    it('같은 시각으로 수정하면 200이고 이력을 남기지 않는다 (R12)', async () => {
      const visit = await applyOk();

      await change(visit.id, student.id, '2026-11-16T19:00:00+09:00').expect(200);

      expect(await histories(room.id)).toHaveLength(1);
    });

    it.each<[string, string, number, string]>([
      ['운영 기간 밖', '2026-11-21T00:00:00.000Z', 422, ERROR_CODE.VISIT_OUT_OF_PERIOD],
      ['지난 시각', '2026-11-15T00:00:00.000Z', 422, ERROR_CODE.VISIT_IN_PAST],
    ])('%s로 수정 → %s', async (_name, visitAt, status, code) => {
      const visit = await applyOk();

      const res = await change(visit.id, student.id, visitAt).expect(status);
      expect(codeOf(res.body)).toBe(code);
    });

    it('남의 신청은 403, 취소된 신청은 409, 지난 방문은 409', async () => {
      const other = await createStudent(t.prisma, '다른 학생');
      const visit = await applyOk();

      expect(codeOf((await change(visit.id, other.id, T2).expect(403)).body)).toBe(
        ERROR_CODE.FORBIDDEN_VISIT_OWNER,
      );

      t.clock.advance(2 * ONE_DAY_MS); // T1(11-16 10:00)이 지난 시점
      expect(codeOf((await change(visit.id, student.id, T2).expect(409)).body)).toBe(
        ERROR_CODE.VISIT_ALREADY_PASSED,
      );

      t.clock.set(TEST_NOW);
      await cancel(visit.id, student.id).expect(200);
      expect(codeOf((await change(visit.id, student.id, T2).expect(409)).body)).toBe(
        ERROR_CODE.VISIT_ALREADY_CANCELED,
      );
    });

    it('없는 신청은 404', async () => {
      const res = await change(999_999, student.id, T2).expect(404);
      expect(codeOf(res.body)).toBe(ERROR_CODE.VISIT_NOT_FOUND);
    });
  });

  describe('취소 (FR-VST-03)', () => {
    it('취소하면 CANCELED, 정원 -1, CANCELED 이력에 사유를 남긴다', async () => {
      const visit = await applyOk();

      const res = await cancel(visit.id, student.id, { reason: '일정이 생겼어요' }).expect(200);

      expect((res.body as VisitResponse).status).toBe(VISIT_STATUS.CANCELED);
      expect((await histories(room.id)).at(-1)).toMatchObject({
        action: VISIT_ACTION.CANCELED,
        actor: 'STUDENT',
        prevVisitAt: T1,
        nextVisitAt: null,
        reason: '일정이 생겼어요',
      });
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 0, actual: 0 });
    });

    it('body 없이도 취소된다 (사유는 선택)', async () => {
      const visit = await applyOk();
      await cancel(visit.id, student.id).expect(200);
    });

    it('이미 취소된 신청은 409, 남의 신청은 403, 지난 방문은 409', async () => {
      const other = await createStudent(t.prisma, '다른 학생');
      const visit = await applyOk();

      expect(codeOf((await cancel(visit.id, other.id).expect(403)).body)).toBe(
        ERROR_CODE.FORBIDDEN_VISIT_OWNER,
      );

      t.clock.advance(2 * ONE_DAY_MS);
      expect(codeOf((await cancel(visit.id, student.id).expect(409)).body)).toBe(
        ERROR_CODE.VISIT_ALREADY_PASSED,
      );

      t.clock.set(TEST_NOW);
      await cancel(visit.id, student.id).expect(200);
      expect(codeOf((await cancel(visit.id, student.id).expect(409)).body)).toBe(
        ERROR_CODE.VISIT_ALREADY_CANCELED,
      );
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 0, actual: 0 });
    });

    it('취소 후 재신청하면 같은 신청이 REAPPLIED로 다시 활성화된다 (R3)', async () => {
      const visit = await applyOk();
      await cancel(visit.id, student.id).expect(200);

      const again = (await apply(room.id, student.id, T2).expect(201)).body as VisitResponse;

      expect(again).toMatchObject({ id: visit.id, status: VISIT_STATUS.ACTIVE, visitAt: T2 });
      expect((await histories(room.id)).map((h) => h.action)).toEqual([
        VISIT_ACTION.APPLIED,
        VISIT_ACTION.CANCELED,
        VISIT_ACTION.REAPPLIED,
      ]);
    });
  });

  describe('강사 취소 (R11)', () => {
    const teacherCancel = (visitId: number, body?: object) => {
      const req = http().post(`/api/visits/${visitId}/cancel`).set(TEACHER);
      return body === undefined ? req : req.send(body);
    };

    it('강사는 사유와 함께 학생의 예정 신청을 취소할 수 있고, 이력에 TEACHER와 사유가 남는다', async () => {
      const visit = await applyOk();

      await teacherCancel(visit.id, { reason: '  자습실 정원 조정  ' }).expect(200);

      expect((await histories(room.id)).at(-1)).toMatchObject({
        action: VISIT_ACTION.CANCELED,
        actor: 'TEACHER',
        prevVisitAt: T1,
        nextVisitAt: null,
        reason: '자습실 정원 조정',
      });
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 0, actual: 0 });
    });

    it.each<[string, object | undefined]>([
      ['body 없음', undefined],
      ['사유 없음', {}],
      ['공백뿐인 사유', { reason: '   ' }],
    ])('%s → 400 CANCEL_REASON_REQUIRED, 아무것도 바뀌지 않는다', async (_name, body) => {
      const visit = await applyOk();

      const res = await teacherCancel(visit.id, body).expect(400);

      expect(codeOf(res.body)).toBe(ERROR_CODE.CANCEL_REASON_REQUIRED);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 1, actual: 1 });
      expect(await histories(room.id)).toHaveLength(1);
    });

    it('사유가 200자를 넘으면 400 VALIDATION_FAILED', async () => {
      const visit = await applyOk();
      const res = await teacherCancel(visit.id, { reason: '가'.repeat(201) }).expect(400);
      expect(codeOf(res.body)).toBe(ERROR_CODE.VALIDATION_FAILED);
    });

    it('강사도 지난 방문은 취소할 수 없다 (R5)', async () => {
      const visit = await applyOk();
      t.clock.advance(2 * ONE_DAY_MS);

      const res = await teacherCancel(visit.id, { reason: '정리' }).expect(409);
      expect(codeOf(res.body)).toBe(ERROR_CODE.VISIT_ALREADY_PASSED);
    });

    it('학생이 공백뿐인 사유로 취소하면 사유 없음으로 기록한다', async () => {
      const visit = await applyOk();

      await cancel(visit.id, student.id, { reason: '   ' }).expect(200);

      expect((await histories(room.id)).at(-1)?.reason).toBeNull();
    });

    it('정원 축소 충돌(R6)을 강사 취소로 풀 수 있다: 409 → 목록에서 골라 취소 → 재시도 200', async () => {
      const others = await Promise.all([1, 2].map((i) => createStudent(t.prisma, `학생${i}`)));
      await applyOk(student.id);
      for (const other of others) {
        await applyOk(other.id);
      }

      const conflict = await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ maxPersonnel: 2 })
        .expect(409);
      const details = (conflict.body as ErrorResponse<CapacityConflictDetails>).details;
      const target = details?.cancellableVisits.at(-1);
      if (target === undefined) throw new Error('취소 가능한 신청이 없습니다.');

      await teacherCancel(target.visitId, { reason: '정원을 2명으로 줄입니다.' }).expect(200);
      await http()
        .patch(`/api/rooms/${room.id}`)
        .set(TEACHER)
        .send({ maxPersonnel: 2 })
        .expect(200);

      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 2, actual: 2 });
    });

    it('학생과 강사가 동시에 같은 신청을 취소해도 한쪽만 성공하고 정원은 한 번만 돌아온다', async () => {
      const visit = await applyOk();

      const responses = await Promise.all([
        cancel(visit.id, student.id),
        teacherCancel(visit.id, { reason: '강사 취소' }),
      ]);

      expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 0, actual: 0 });
      expect(
        (await histories(room.id)).filter((h) => h.action === VISIT_ACTION.CANCELED),
      ).toHaveLength(1);
    });
  });

  describe('자습실 상세 (FR-ROM-03)', () => {
    it('이력은 강사만 볼 수 있다', async () => {
      await http()
        .get(`/api/rooms/${room.id}/histories`)
        .set(studentHeaders(student.id))
        .expect(403);
    });

    it('이력은 기록 시각순, 같은 시각이면 기록 순서대로', async () => {
      const other = await createStudent(t.prisma, '이서연');
      const a = await applyOk(student.id, T1);
      const b = await applyOk(other.id, T1); // 같은 시각에 두 건
      t.clock.advance(60_000);
      await change(a.id, student.id, T2).expect(200);
      t.clock.advance(60_000);
      await cancel(b.id, other.id).expect(200);

      const list = await histories(room.id);

      expect(list.map((h) => [h.visitId, h.action, h.studentName])).toEqual([
        [a.id, VISIT_ACTION.APPLIED, '김민준'],
        [b.id, VISIT_ACTION.APPLIED, '이서연'],
        [a.id, VISIT_ACTION.TIME_CHANGED, '김민준'],
        [b.id, VISIT_ACTION.CANCELED, '이서연'],
      ]);
      expect(list.map((h) => h.createdAt)).toEqual([
        TEST_NOW,
        TEST_NOW,
        '2026-11-15T03:01:00.000Z',
        '2026-11-15T03:02:00.000Z',
      ]);
    });

    it('신청자 목록은 학생 이름과 지난 방문 여부를 포함한다', async () => {
      await applyOk();
      t.clock.advance(2 * ONE_DAY_MS);

      const res = await http().get(`/api/rooms/${room.id}/visits`).set(TEACHER).expect(200);

      expect(res.body as RoomVisitResponse[]).toEqual([
        expect.objectContaining({ studentName: '김민준', isPast: true }),
      ]);
    });
  });

  describe('동시성', () => {
    it('정원 3명인 자습실에 10명이 동시에 신청해도 정확히 3명만 성공한다', async () => {
      const students = await Promise.all(
        Array.from({ length: 10 }, (_, i) => createStudent(t.prisma, `동시${i}`)),
      );

      const responses = await Promise.all(students.map((s) => apply(room.id, s.id, T1)));

      const statuses = responses.map((res) => res.status).sort();
      expect(statuses.filter((s) => s === 201)).toHaveLength(3);
      expect(statuses.filter((s) => s === 409)).toHaveLength(7);
      expect(
        responses
          .filter((res) => res.status === 409)
          .every((res) => codeOf(res.body) === ERROR_CODE.ROOM_FULL),
      ).toBe(true);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 3, actual: 3 });
      expect(await histories(room.id)).toHaveLength(3);
    });

    it('같은 학생이 신청 버튼을 5번 동시에 눌러도 신청은 1건이다', async () => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () => apply(room.id, student.id, T1)),
      );

      expect(responses.filter((res) => res.status === 201)).toHaveLength(1);
      expect(
        responses
          .filter((res) => res.status !== 201)
          .every((res) => res.status === 409 && codeOf(res.body) === ERROR_CODE.DUPLICATE_VISIT),
      ).toBe(true);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 1, actual: 1 });
    });

    it('같은 신청을 동시에 두 번 취소해도 정원은 한 번만 돌아온다', async () => {
      const visit = await applyOk();

      const responses = await Promise.all([
        cancel(visit.id, student.id),
        cancel(visit.id, student.id),
      ]);

      expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 0, actual: 0 });
      expect(await histories(room.id)).toHaveLength(2);
    });
  });

  describe('불변 조건: 이력을 재생하면 현재 상태와 같다', () => {
    it('신청·수정·본인 취소·강사 취소·재신청을 섞어도 모든 신청에서 성립한다', async () => {
      const other = await createStudent(t.prisma, '이서연');

      const a = await applyOk(student.id, T1);
      t.clock.advance(1_000);
      await change(a.id, student.id, T2).expect(200);
      t.clock.advance(1_000);
      await cancel(a.id, student.id).expect(200);
      t.clock.advance(1_000);
      await apply(room.id, student.id, T1).expect(201);
      t.clock.advance(1_000);
      const b = await applyOk(other.id, T2);
      t.clock.advance(1_000);
      await http()
        .post(`/api/visits/${b.id}/cancel`)
        .set(TEACHER)
        .send({ reason: '강사 취소' })
        .expect(200);

      const all = await histories(room.id);
      const visits = await t.prisma.visit.findMany({ where: { roomId: room.id } });
      for (const visit of visits) {
        const replayed = replayVisitHistory(
          all
            .filter((h) => h.visitId === visit.id)
            .map((h) => ({
              action: h.action,
              nextVisitAt: h.nextVisitAt === null ? null : new Date(h.nextVisitAt),
            })),
        );
        expect(replayed.status).toBe(visit.status);
        if (replayed.visitAt !== null) {
          expect(replayed.visitAt.toISOString()).toBe(visit.visitAt.toISOString());
        }
      }
      expect(await readActiveCounts(t.prisma, room.id)).toEqual({ activeCount: 1, actual: 1 });
    });
  });
});
