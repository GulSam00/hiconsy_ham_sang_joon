import { describe, expect, it } from 'vitest';
import { roomActionFor, validateVisitTime, visitTimeBounds } from './visit-form';

const NOW = new Date('2026-11-15T03:00:00.000Z').getTime(); // KST 12:00
const room = { startDate: '2026-11-15T00:00:00.000Z', endDate: '2026-11-20T13:00:00.000Z' };

describe('visitTimeBounds', () => {
  it('운영 중이면 지금부터, 운영 전이면 시작부터', () => {
    expect(visitTimeBounds(room, NOW)).toEqual({
      min: '2026-11-15T12:00',
      max: '2026-11-20T22:00',
    });
    const future = { ...room, startDate: '2026-11-17T00:00:00.000Z' };
    expect(visitTimeBounds(future, NOW).min).toBe('2026-11-17T09:00');
  });
});

describe('validateVisitTime', () => {
  it.each<[string, string, boolean]>([
    ['지금 정각', '2026-11-15T12:00', true],
    ['지금 1분 전', '2026-11-15T11:59', false],
    ['종료 정각', '2026-11-20T22:00', true],
    ['종료 1분 후', '2026-11-20T22:01', false],
    ['빈 값', '', false],
  ])('%s(%s) → %s', (_name, value, ok) => {
    expect(validateVisitTime(value, room, NOW).ok).toBe(ok);
  });

  it('통과하면 +09:00이 붙은 ISO', () => {
    expect(validateVisitTime('2026-11-16T19:00', room, NOW)).toEqual({
      ok: true,
      visitAt: '2026-11-16T19:00:00+09:00',
    });
  });
});

describe('roomActionFor', () => {
  const open = { endDate: room.endDate, activeCount: 1, maxPersonnel: 3 };

  it.each<
    [string, Parameters<typeof roomActionFor>[0], Parameters<typeof roomActionFor>[1], string]
  >([
    ['신청 없음', open, undefined, 'APPLY'],
    ['취소한 신청', open, { status: 'CANCELED', isPast: false }, 'REAPPLY'],
    ['예정 신청', open, { status: 'ACTIVE', isPast: false }, 'APPLIED'],
    ['지난 방문', open, { status: 'ACTIVE', isPast: true }, 'VISITED'],
    ['정원 마감', { ...open, activeCount: 3 }, undefined, 'FULL'],
    [
      '정원 마감이어도 내 신청이 있으면 그 상태',
      { ...open, activeCount: 3 },
      { status: 'ACTIVE', isPast: false },
      'APPLIED',
    ],
    ['운영 종료', { ...open, endDate: '2026-11-15T02:59:59.999Z' }, undefined, 'ENDED'],
  ])('%s → %s', (_name, r, myVisit, expected) => {
    expect(roomActionFor(r, myVisit, NOW)).toBe(expected);
  });
});
