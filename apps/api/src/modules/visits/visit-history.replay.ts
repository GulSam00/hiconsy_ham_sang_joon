import { VISIT_ACTION, VISIT_STATUS, type VisitAction, type VisitStatus } from '@study-room/shared';

export interface ReplayableHistory {
  action: VisitAction;
  nextVisitAt: Date | null;
}

export interface ReplayedVisit {
  status: VisitStatus;
  visitAt: Date | null;
}

const CANCEL_ACTIONS: ReadonlySet<VisitAction> = new Set([
  VISIT_ACTION.CANCELED,
  VISIT_ACTION.SYSTEM_CANCELED,
]);

/**
 * 이력을 처음부터 다시 적용해 신청의 상태를 복원한다 (docs/visit-policy.md 4절).
 * "현재 신청 = 이력 재생 결과"라는 불변 조건을 테스트로 검증하는 데 쓴다.
 * 취소 상태의 visitAt은 이력만으로 알 수 없으므로(null) 비교하지 않는다.
 *
 * @param histories 시간순(createdAt, id)으로 정렬된 한 신청의 이력
 */
export function replayVisitHistory(histories: readonly ReplayableHistory[]): ReplayedVisit {
  const last = histories.at(-1);
  if (last === undefined) {
    throw new Error('이력이 없는 신청은 재생할 수 없습니다.');
  }
  if (CANCEL_ACTIONS.has(last.action)) {
    return { status: VISIT_STATUS.CANCELED, visitAt: null };
  }
  if (last.nextVisitAt === null) {
    throw new Error(`${last.action} 이력의 nextVisitAt이 비어 있습니다.`);
  }
  return { status: VISIT_STATUS.ACTIVE, visitAt: last.nextVisitAt };
}
