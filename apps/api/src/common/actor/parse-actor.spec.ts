import { ACTOR_ROLE, ERROR_CODE } from '@study-room/shared';
import type { IncomingHttpHeaders } from 'node:http';
import { describe, expect, it } from 'vitest';
import { DomainException } from '../errors/domain.exception';
import { parseActor } from './parse-actor';

function expectActorRequired(headers: IncomingHttpHeaders): void {
  const error: unknown = (() => {
    try {
      parseActor(headers);
      return undefined;
    } catch (caught: unknown) {
      return caught;
    }
  })();
  expect(error).toBeInstanceOf(DomainException);
  expect((error as DomainException).code).toBe(ERROR_CODE.ACTOR_REQUIRED);
}

describe('parseActor', () => {
  it('강사 헤더를 해석한다', () => {
    expect(parseActor({ 'x-actor-role': 'TEACHER' })).toEqual({ role: ACTOR_ROLE.TEACHER });
  });

  it('강사 요청에 함께 온 학생 id는 무시한다', () => {
    expect(parseActor({ 'x-actor-role': 'TEACHER', 'x-student-id': '3' })).toEqual({
      role: ACTOR_ROLE.TEACHER,
    });
  });

  it('학생 헤더와 학생 id를 해석한다', () => {
    expect(parseActor({ 'x-actor-role': 'STUDENT', 'x-student-id': '42' })).toEqual({
      role: ACTOR_ROLE.STUDENT,
      studentId: 42,
    });
  });

  it.each<[string, IncomingHttpHeaders]>([
    ['헤더 없음', {}],
    ['알 수 없는 역할', { 'x-actor-role': 'ADMIN' }],
    ['소문자 역할', { 'x-actor-role': 'teacher' }],
    ['역할 헤더 중복', { 'x-actor-role': ['TEACHER', 'STUDENT'] }],
    ['학생인데 id 없음', { 'x-actor-role': 'STUDENT' }],
    ['학생 id 0', { 'x-actor-role': 'STUDENT', 'x-student-id': '0' }],
    ['학생 id 음수', { 'x-actor-role': 'STUDENT', 'x-student-id': '-1' }],
    ['학생 id 소수', { 'x-actor-role': 'STUDENT', 'x-student-id': '1.5' }],
    ['학생 id 문자', { 'x-actor-role': 'STUDENT', 'x-student-id': 'abc' }],
    ['학생 id 앞자리 0', { 'x-actor-role': 'STUDENT', 'x-student-id': '007' }],
    ['학생 id 안전 정수 초과', { 'x-actor-role': 'STUDENT', 'x-student-id': '9007199254740993' }],
  ])('%s → ACTOR_REQUIRED', (_name, headers) => {
    expectActorRequired(headers);
  });
});
