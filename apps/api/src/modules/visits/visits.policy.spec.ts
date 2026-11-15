import { ACTOR_ROLE, ERROR_CODE, type Actor } from '@study-room/shared';
import { describe, expect, it } from 'vitest';
import {
  checkChangeable,
  checkNotDuplicated,
  checkVisitTime,
  isSameVisitTime,
  type VisitSnapshot,
} from './visits.policy';

const NOW = new Date('2026-11-15T03:00:00.000Z');
const PERIOD = {
  startDate: new Date('2026-11-15T00:00:00.000Z'),
  endDate: new Date('2026-11-20T13:00:00.000Z'),
};
const OWNER: Actor = { role: ACTOR_ROLE.STUDENT, studentId: 1 };
const OTHER: Actor = { role: ACTOR_ROLE.STUDENT, studentId: 2 };
const TEACHER: Actor = { role: ACTOR_ROLE.TEACHER };

function codeOf(result: ReturnType<typeof checkVisitTime>) {
  return result.ok ? 'OK' : result.code;
}

describe('checkVisitTime (R4)', () => {
  it.each<[string, string, string]>([
    ['지금 1ms 전', '2026-11-15T02:59:59.999Z', ERROR_CODE.VISIT_IN_PAST],
    ['정확히 지금', '2026-11-15T03:00:00.000Z', 'OK'],
    ['종료 정각', '2026-11-20T13:00:00.000Z', 'OK'],
    ['종료 1ms 후', '2026-11-20T13:00:00.001Z', ERROR_CODE.VISIT_OUT_OF_PERIOD],
  ])('%s → %s', (_name, visitAt, expected) => {
    expect(codeOf(checkVisitTime(new Date(visitAt), PERIOD, NOW))).toBe(expected);
  });

  it('지난 시각이면서 기간 밖이면 지난 시각을 먼저 알린다', () => {
    const ended = {
      startDate: new Date('2026-11-01T00:00:00Z'),
      endDate: new Date('2026-11-02T00:00:00Z'),
    };
    expect(codeOf(checkVisitTime(new Date('2026-11-10T00:00:00Z'), ended, NOW))).toBe(
      ERROR_CODE.VISIT_IN_PAST,
    );
  });
});

describe('checkNotDuplicated (R3)', () => {
  const visit = (status: VisitSnapshot['status']): VisitSnapshot => ({
    studentId: 1,
    status,
    visitAt: NOW,
  });

  it('신청 이력이 없거나 취소 상태면 통과 (재신청 허용)', () => {
    expect(checkNotDuplicated(null).ok).toBe(true);
    expect(checkNotDuplicated(visit('CANCELED')).ok).toBe(true);
  });

  it('활성 신청이 있으면 DUPLICATE_VISIT', () => {
    expect(codeOf(checkNotDuplicated(visit('ACTIVE')))).toBe(ERROR_CODE.DUPLICATE_VISIT);
  });
});

describe('checkChangeable (R5, 소유자 검사)', () => {
  const upcoming: VisitSnapshot = {
    studentId: 1,
    status: 'ACTIVE',
    visitAt: new Date('2026-11-16T00:00:00Z'),
  };

  it('본인의 예정 신청이면 통과', () => {
    expect(checkChangeable(upcoming, OWNER, NOW).ok).toBe(true);
  });

  it('강사는 소유자 검사를 받지 않는다', () => {
    expect(checkChangeable(upcoming, TEACHER, NOW).ok).toBe(true);
  });

  it('남의 신청이면 상태와 관계없이 403을 먼저 알린다', () => {
    const canceledOfOwner: VisitSnapshot = { ...upcoming, status: 'CANCELED' };
    expect(codeOf(checkChangeable(canceledOfOwner, OTHER, NOW))).toBe(
      ERROR_CODE.FORBIDDEN_VISIT_OWNER,
    );
  });

  it('취소된 신청은 VISIT_ALREADY_CANCELED', () => {
    expect(codeOf(checkChangeable({ ...upcoming, status: 'CANCELED' }, OWNER, NOW))).toBe(
      ERROR_CODE.VISIT_ALREADY_CANCELED,
    );
  });

  it.each<[string, string, string]>([
    ['1ms 전 방문', '2026-11-15T02:59:59.999Z', ERROR_CODE.VISIT_ALREADY_PASSED],
    ['정확히 지금 방문', '2026-11-15T03:00:00.000Z', 'OK'],
  ])('%s → %s', (_name, visitAt, expected) => {
    expect(codeOf(checkChangeable({ ...upcoming, visitAt: new Date(visitAt) }, OWNER, NOW))).toBe(
      expected,
    );
  });
});

describe('isSameVisitTime (R12)', () => {
  it('시간대 표기가 달라도 같은 순간이면 같다', () => {
    expect(
      isSameVisitTime(new Date('2026-11-16T10:00:00Z'), new Date('2026-11-16T19:00:00+09:00')),
    ).toBe(true);
  });

  it('1ms라도 다르면 다르다', () => {
    expect(
      isSameVisitTime(new Date('2026-11-16T10:00:00.000Z'), new Date('2026-11-16T10:00:00.001Z')),
    ).toBe(false);
  });
});
