import { VISIT_ACTION, VISIT_STATUS } from '@study-room/shared';
import { describe, expect, it } from 'vitest';
import { replayVisitHistory } from './visit-history.replay';

const T1 = new Date('2026-11-16T10:00:00Z');
const T2 = new Date('2026-11-17T10:00:00Z');

describe('replayVisitHistory', () => {
  it('마지막 이력이 신청·수정이면 ACTIVE와 그 시각', () => {
    expect(
      replayVisitHistory([
        { action: VISIT_ACTION.APPLIED, nextVisitAt: T1 },
        { action: VISIT_ACTION.TIME_CHANGED, nextVisitAt: T2 },
      ]),
    ).toEqual({ status: VISIT_STATUS.ACTIVE, visitAt: T2 });
  });

  it.each([VISIT_ACTION.CANCELED, VISIT_ACTION.SYSTEM_CANCELED])(
    '마지막 이력이 %s이면 CANCELED',
    (action) => {
      expect(
        replayVisitHistory([
          { action: VISIT_ACTION.APPLIED, nextVisitAt: T1 },
          { action, nextVisitAt: null },
        ]),
      ).toEqual({ status: VISIT_STATUS.CANCELED, visitAt: null });
    },
  );

  it('취소 후 재신청이면 다시 ACTIVE', () => {
    expect(
      replayVisitHistory([
        { action: VISIT_ACTION.APPLIED, nextVisitAt: T1 },
        { action: VISIT_ACTION.CANCELED, nextVisitAt: null },
        { action: VISIT_ACTION.REAPPLIED, nextVisitAt: T2 },
      ]),
    ).toEqual({ status: VISIT_STATUS.ACTIVE, visitAt: T2 });
  });

  it('이력이 없거나 활성 이력의 시각이 비어 있으면 데이터 오류로 실패한다', () => {
    expect(() => replayVisitHistory([])).toThrow(/이력이 없는/);
    expect(() => replayVisitHistory([{ action: VISIT_ACTION.APPLIED, nextVisitAt: null }])).toThrow(
      /nextVisitAt/,
    );
  });
});
