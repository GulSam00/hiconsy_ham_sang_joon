import {
  ERROR_CODE,
  VISIT_STATUS,
  type ErrorResponse,
  type MyVisitResponse,
} from '@study-room/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Student, StudyRoom } from '../src/generated/prisma/client';
import { SYSTEM_CANCEL_REASON } from '../src/modules/visits/visit-history.factory';
import { TEACHER, createRoom, createStudent, studentHeaders } from './support/fixtures';
import { TEST_NOW, createTestApp, resetDatabase, type TestApp } from './support/test-app';

// TEST_NOW = 2026-11-15T03:00:00Z
const T1 = '2026-11-16T10:00:00.000Z';
const T2 = '2026-11-17T10:00:00.000Z';
const T3 = '2026-11-18T10:00:00.000Z';
const ONE_MINUTE_MS = 60_000;

describe('내 신청 목록 API (e2e, FR-VST-04)', () => {
  let t: TestApp;
  let me: Student;
  let roomA: StudyRoom;
  let roomB: StudyRoom;
  let roomC: StudyRoom;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  beforeEach(async () => {
    await resetDatabase(t.prisma);
    t.clock.set(TEST_NOW);
    me = await createStudent(t.prisma, '김민준');
    [roomA, roomB, roomC] = await Promise.all([
      createRoom(t.prisma, { title: 'A' }),
      createRoom(t.prisma, { title: 'B' }),
      createRoom(t.prisma, { title: 'C' }),
    ]);
  });

  const http = () => request(t.app.getHttpServer());

  const apply = async (room: StudyRoom, student: Student, visitAt: string) =>
    (
      await http()
        .post(`/api/rooms/${room.id}/visits`)
        .set(studentHeaders(student.id))
        .send({ visitAt })
        .expect(201)
    ).body as { id: number };

  const mine = async (student: Student = me) =>
    (await http().get('/api/me/visits').set(studentHeaders(student.id)).expect(200))
      .body as MyVisitResponse[];

  it('내 신청만, 방문 시각순으로 자습실 정보와 함께 보여준다', async () => {
    const other = await createStudent(t.prisma, '다른 학생');
    await apply(roomB, me, T2);
    await apply(roomA, me, T1);
    await apply(roomA, other, T1);

    const list = await mine();

    expect(list.map((v) => [v.room.title, v.visitAt])).toEqual([
      ['A', T1],
      ['B', T2],
    ]);
    expect(list[0]).toMatchObject({
      status: VISIT_STATUS.ACTIVE,
      isPast: false,
      cancellation: null,
      room: { id: roomA.id, isDeleted: false },
    });
  });

  it('취소된 신청은 누가 왜 취소했는지 보여준다 (본인·강사·시스템)', async () => {
    const a = await apply(roomA, me, T1);
    const b = await apply(roomB, me, T2);
    await apply(roomC, me, T3);

    t.clock.advance(ONE_MINUTE_MS);
    await http()
      .post(`/api/visits/${a.id}/cancel`)
      .set(studentHeaders(me.id))
      .send({ reason: '일정 변경' })
      .expect(200);
    await http()
      .post(`/api/visits/${b.id}/cancel`)
      .set(TEACHER)
      .send({ reason: '정원 조정' })
      .expect(200);
    await http().delete(`/api/rooms/${roomC.id}`).set(TEACHER).expect(204);

    const list = await mine();

    expect(list.map((v) => [v.room.title, v.status, v.cancellation])).toEqual([
      [
        'A',
        'CANCELED',
        { by: 'STUDENT', reason: '일정 변경', canceledAt: '2026-11-15T03:01:00.000Z' },
      ],
      [
        'B',
        'CANCELED',
        { by: 'TEACHER', reason: '정원 조정', canceledAt: '2026-11-15T03:01:00.000Z' },
      ],
      [
        'C',
        'CANCELED',
        {
          by: 'SYSTEM',
          reason: SYSTEM_CANCEL_REASON.ROOM_DELETED,
          canceledAt: '2026-11-15T03:01:00.000Z',
        },
      ],
    ]);
    expect(list[2]?.room.isDeleted).toBe(true);
  });

  it('재신청하면 다시 활성 상태가 되고 취소 정보는 사라진다', async () => {
    const a = await apply(roomA, me, T1);
    await http().post(`/api/visits/${a.id}/cancel`).set(studentHeaders(me.id)).expect(200);
    await apply(roomA, me, T2);

    const [visit] = await mine();

    expect(visit).toMatchObject({
      id: a.id,
      status: VISIT_STATUS.ACTIVE,
      visitAt: T2,
      cancellation: null,
    });
  });

  it('지난 방문은 삭제된 자습실이어도 ACTIVE + isPast로 남는다', async () => {
    await apply(roomA, me, T1);
    t.clock.set('2026-11-16T12:00:00.000Z'); // T1이 지난 시점
    await http().delete(`/api/rooms/${roomA.id}`).set(TEACHER).expect(204);

    const [visit] = await mine();

    expect(visit).toMatchObject({
      status: VISIT_STATUS.ACTIVE,
      isPast: true,
      cancellation: null,
      room: { isDeleted: true },
    });
  });

  it('신청이 없으면 빈 목록', async () => {
    expect(await mine()).toEqual([]);
  });

  it('강사는 403, 삭제된 학생은 404', async () => {
    await http().get('/api/me/visits').set(TEACHER).expect(403);

    await t.prisma.student.update({ where: { id: me.id }, data: { deletedAt: new Date() } });
    const res = await http().get('/api/me/visits').set(studentHeaders(me.id)).expect(404);
    expect((res.body as ErrorResponse).code).toBe(ERROR_CODE.STUDENT_NOT_FOUND);
  });
});
