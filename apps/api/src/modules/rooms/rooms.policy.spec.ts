import {
  ERROR_CODE,
  type CapacityConflictDetails,
  type PeriodConflictDetails,
} from '@study-room/shared';
import { describe, expect, it } from 'vitest';
import type { PolicyResult } from '../../common/policy/policy-result';
import {
  checkCapacityReduction,
  checkPeriod,
  checkPeriodChange,
  isWithinPeriod,
  type ActiveVisitSnapshot,
} from './rooms.policy';

const NOW = new Date('2026-11-15T03:00:00.000Z');
const START = new Date('2026-11-15T00:00:00.000Z');
const END = new Date('2026-11-20T13:00:00.000Z');
const PERIOD = { startDate: START, endDate: END };

function visit(id: number, visitAt: string): ActiveVisitSnapshot {
  return { visitId: id, studentId: id, studentName: `학생${id}`, visitAt: new Date(visitAt) };
}

function details<T>(result: PolicyResult): T {
  if (result.ok) {
    throw new Error('위반 결과가 아닙니다.');
  }
  return result.details as T;
}

describe('checkPeriod', () => {
  it('시작 < 종료면 통과', () => {
    expect(checkPeriod(PERIOD)).toEqual({ ok: true });
  });

  it.each<[string, Date, Date]>([
    ['시작 = 종료', START, START],
    ['시작 > 종료', END, START],
  ])('%s → INVALID_PERIOD', (_name, startDate, endDate) => {
    expect(checkPeriod({ startDate, endDate })).toEqual({
      ok: false,
      code: ERROR_CODE.INVALID_PERIOD,
    });
  });
});

describe('isWithinPeriod (R4, 양 끝 포함)', () => {
  it.each<[string, string, boolean]>([
    ['시작 1ms 전', '2026-11-14T23:59:59.999Z', false],
    ['시작 정각', '2026-11-15T00:00:00.000Z', true],
    ['종료 정각', '2026-11-20T13:00:00.000Z', true],
    ['종료 1ms 후', '2026-11-20T13:00:00.001Z', false],
  ])('%s → %s', (_name, visitAt, expected) => {
    expect(isWithinPeriod(new Date(visitAt), PERIOD)).toBe(expected);
  });
});

describe('checkCapacityReduction (R6)', () => {
  const past = visit(1, '2026-11-15T01:00:00.000Z');
  const atNow = visit(2, '2026-11-15T03:00:00.000Z');
  const future = visit(3, '2026-11-16T10:00:00.000Z');
  const active = [past, atNow, future];

  it('새 정원 = 활성 신청 수면 통과', () => {
    expect(checkCapacityReduction(3, active, NOW).ok).toBe(true);
  });

  it('새 정원 = 활성 신청 수 - 1이면 거부', () => {
    const result = checkCapacityReduction(2, active, NOW);

    expect(result).toMatchObject({ ok: false, code: ERROR_CODE.CAPACITY_BELOW_ACTIVE });
    expect(details<CapacityConflictDetails>(result)).toMatchObject({
      activeCount: 3,
      requestedMaxPersonnel: 2,
    });
  });

  it('취소 가능 목록에는 예정 신청만 담는다 (지금 정각은 예정, 지난 방문은 제외)', () => {
    const result = checkCapacityReduction(1, active, NOW);

    const ids = details<CapacityConflictDetails>(result).cancellableVisits.map((v) => v.visitId);
    expect(ids).toEqual([2, 3]);
  });
});

describe('checkPeriodChange (R7)', () => {
  const past = visit(1, '2026-11-15T01:00:00.000Z');
  const future = visit(2, '2026-11-18T10:00:00.000Z');

  it('모든 활성 신청이 새 기간 안에 있으면 통과 (경계 포함)', () => {
    const period = { startDate: past.visitAt, endDate: future.visitAt };
    expect(checkPeriodChange(period, [past, future], NOW).ok).toBe(true);
  });

  it('밀려나는 신청을 지난 방문 여부와 함께 돌려준다', () => {
    const period = {
      startDate: new Date('2026-11-15T02:00:00.000Z'),
      endDate: new Date('2026-11-17T00:00:00.000Z'),
    };

    const result = checkPeriodChange(period, [past, future], NOW);

    expect(result).toMatchObject({ ok: false, code: ERROR_CODE.PERIOD_EXCLUDES_VISITS });
    expect(details<PeriodConflictDetails>(result).conflicts).toEqual([
      expect.objectContaining({ visitId: 1, isPast: true }),
      expect.objectContaining({ visitId: 2, isPast: false }),
    ]);
  });
});
