import { describe, expect, it } from 'vitest';
import { ROUTE_NAME, parseRouteId, redirectFor } from './route-access';

describe('redirectFor', () => {
  const teacher = { role: 'TEACHER' } as const;
  const student = { role: 'STUDENT', studentId: 1 } as const;

  it('역할 제한이 없으면 통과', () => {
    expect(redirectFor(undefined, null)).toBeNull();
  });

  it('역할을 고르지 않았으면 역할 선택으로', () => {
    expect(redirectFor('TEACHER', null)).toBe(ROUTE_NAME.ROLE_SELECT);
  });

  it('맞는 역할이면 통과', () => {
    expect(redirectFor('TEACHER', teacher)).toBeNull();
    expect(redirectFor('STUDENT', student)).toBeNull();
  });

  it('다른 역할의 화면이면 내 첫 화면으로', () => {
    expect(redirectFor('TEACHER', student)).toBe(ROUTE_NAME.STUDENT_ROOMS);
    expect(redirectFor('STUDENT', teacher)).toBe(ROUTE_NAME.TEACHER_ROOMS);
  });
});

describe('parseRouteId', () => {
  it.each<[string | string[] | undefined, number | null]>([
    ['7', 7],
    ['0', null],
    ['-1', null],
    ['01', null],
    ['abc', null],
    [['1', '2'], null],
    [undefined, null],
    ['9007199254740993', null],
  ])('%j → %j', (raw, expected) => {
    expect(parseRouteId(raw)).toBe(expected);
  });
});
