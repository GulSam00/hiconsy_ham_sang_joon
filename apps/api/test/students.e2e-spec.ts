import {
  ERROR_CODE,
  type ErrorResponse,
  type FieldError,
  type StudentOption,
  type StudentResponse,
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
const FUTURE = '2026-11-16T10:00:00.000Z';

describe('학생 API (e2e)', () => {
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

  describe('조회', () => {
    it('강사는 삭제되지 않은 학생 전체 정보를 이름순으로 본다 (FR-STD-01)', async () => {
      const b = await createStudent(t.prisma, '나학생');
      const a = await createStudent(t.prisma, '가학생');
      await t.prisma.student.create({
        data: { name: '삭제됨', phone: '010-0000-0000', deletedAt: new Date() },
      });

      const res = await http().get('/api/students').set(TEACHER).expect(200);

      const students = res.body as StudentResponse[];
      expect(students.map((s) => s.id)).toEqual([a.id, b.id]);
      expect(students[0]).toHaveProperty('phone');
    });

    it('학생은 전체 학생 목록을 볼 수 없다 (403)', async () => {
      await http().get('/api/students').set(studentHeaders(1)).expect(403);
    });

    it('역할 선택용 목록은 헤더 없이 볼 수 있고, id·이름만 담는다', async () => {
      const student = await createStudent(t.prisma, '김민준');

      const res = await http().get('/api/students/options').expect(200);

      expect(res.body as StudentOption[]).toEqual([{ id: student.id, name: '김민준' }]);
    });
  });

  describe('등록·수정 (FR-STD-02)', () => {
    it('전화번호를 010-1234-5678 형식으로 정규화해 저장한다', async () => {
      const res = await http()
        .post('/api/students')
        .set(TEACHER)
        .send({ name: '새학생', phone: '01012345678' })
        .expect(201);

      expect(res.body).toMatchObject({ name: '새학생', phone: '010-1234-5678' });
    });

    it.each<[string, Record<string, unknown>, string]>([
      ['유선 번호', { name: '학생', phone: '02-123-4567' }, 'phone'],
      ['빈 이름', { name: '', phone: '010-1234-5678' }, 'name'],
      ['알 수 없는 필드', { name: '학생', phone: '010-1234-5678', deletedAt: null }, 'deletedAt'],
    ])('%s → 400', async (_name, body, field) => {
      const res = await http().post('/api/students').set(TEACHER).send(body).expect(400);
      const error = res.body as ErrorResponse<FieldError[]>;
      expect(error.details?.map((detail) => detail.field)).toContain(field);
    });

    it('학생은 학생을 등록할 수 없다 (403)', async () => {
      await http()
        .post('/api/students')
        .set(studentHeaders(1))
        .send({ name: '학생', phone: '010-1234-5678' })
        .expect(403);
    });

    it('보낸 필드만 바꾸고 전화번호는 정규화한다', async () => {
      const student = await createStudent(t.prisma, '이전');

      const res = await http()
        .patch(`/api/students/${student.id}`)
        .set(TEACHER)
        .send({ phone: '010-9876-5432' })
        .expect(200);

      expect(res.body).toMatchObject({ name: '이전', phone: '010-9876-5432' });
    });

    it('빈 body는 400, 삭제된 학생은 404', async () => {
      const student = await createStudent(t.prisma);
      await http().patch(`/api/students/${student.id}`).set(TEACHER).send({}).expect(400);

      await t.prisma.student.update({ where: { id: student.id }, data: { deletedAt: new Date() } });
      const res = await http()
        .patch(`/api/students/${student.id}`)
        .set(TEACHER)
        .send({ name: 'x' })
        .expect(404);
      expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.STUDENT_NOT_FOUND);
    });
  });

  describe('삭제 (FR-STD-02, R9)', () => {
    it('여러 자습실의 예정 신청만 시스템 취소하고, 자습실별 카운터를 정확히 줄인다', async () => {
      const [roomA, roomB] = await Promise.all([createRoom(t.prisma), createRoom(t.prisma)]);
      const target = await createStudent(t.prisma, '삭제 대상');
      const other = await createStudent(t.prisma, '다른 학생');

      const pastInA = await createVisit(t.prisma, roomA, target, PAST);
      const futureInB = await createVisit(t.prisma, roomB, target, FUTURE);
      const otherInB = await createVisit(t.prisma, roomB, other, FUTURE);

      await http().delete(`/api/students/${target.id}`).set(TEACHER).expect(204);

      const status = async (id: number) =>
        (await t.prisma.visit.findUniqueOrThrow({ where: { id } })).status;
      expect(await status(pastInA.id)).toBe(VisitStatus.ACTIVE);
      expect(await status(futureInB.id)).toBe(VisitStatus.CANCELED);
      expect(await status(otherInB.id)).toBe(VisitStatus.ACTIVE);

      expect(await t.prisma.visitHistory.findMany()).toEqual([
        expect.objectContaining({
          visitId: futureInB.id,
          roomId: roomB.id,
          action: VisitAction.SYSTEM_CANCELED,
          actorType: ActorType.SYSTEM,
          reason: SYSTEM_CANCEL_REASON.STUDENT_DELETED,
          createdAt: new Date(TEST_NOW),
        }),
      ]);

      expect(await readActiveCounts(t.prisma, roomA.id)).toEqual({ activeCount: 1, actual: 1 });
      expect(await readActiveCounts(t.prisma, roomB.id)).toEqual({ activeCount: 1, actual: 1 });

      const options = await http().get('/api/students/options').expect(200);
      expect((options.body as StudentOption[]).map((s) => s.id)).toEqual([other.id]);
    });

    it('이미 삭제된 학생은 404', async () => {
      const student = await createStudent(t.prisma);
      await http().delete(`/api/students/${student.id}`).set(TEACHER).expect(204);

      const res = await http().delete(`/api/students/${student.id}`).set(TEACHER).expect(404);
      expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.STUDENT_NOT_FOUND);
    });
  });
});
