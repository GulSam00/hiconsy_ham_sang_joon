import type { HistoryActor, VisitAction } from '@study-room/shared';

/** `Record`라서 shared에 값이 추가되면 라벨을 빠뜨렸을 때 컴파일 에러가 난다. */
export const VISIT_ACTION_LABEL: Readonly<Record<VisitAction, string>> = {
  APPLIED: '신청',
  REAPPLIED: '재신청',
  TIME_CHANGED: '시간 변경',
  CANCELED: '취소',
  SYSTEM_CANCELED: '자동 취소',
};

export const HISTORY_ACTOR_LABEL: Readonly<Record<HistoryActor, string>> = {
  STUDENT: '학생',
  TEACHER: '강사',
  SYSTEM: '시스템',
};

/** 신청의 화면 표시 상태 (docs/visit-policy.md 1절) */
export type VisitDisplayState = 'UPCOMING' | 'PAST' | 'CANCELED';

export function visitDisplayState(visit: { status: string; isPast: boolean }): VisitDisplayState {
  if (visit.status === 'CANCELED') {
    return 'CANCELED';
  }
  return visit.isPast ? 'PAST' : 'UPCOMING';
}

export const VISIT_STATE_LABEL: Readonly<Record<VisitDisplayState, string>> = {
  UPCOMING: '예정',
  PAST: '지난 방문',
  CANCELED: '취소됨',
};
