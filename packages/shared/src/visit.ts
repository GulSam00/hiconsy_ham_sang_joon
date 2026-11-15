/**
 * 방문 신청·이력 타입. 정책: docs/visit-policy.md
 * 값은 api의 Prisma enum과 같아야 한다. api의 `enum-sync.ts`가 컴파일 시점에 일치를 확인한다.
 */
export const VISIT_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELED: 'CANCELED',
} as const;

export type VisitStatus = (typeof VISIT_STATUS)[keyof typeof VISIT_STATUS];

export const VISIT_ACTION = {
  APPLIED: 'APPLIED',
  REAPPLIED: 'REAPPLIED',
  TIME_CHANGED: 'TIME_CHANGED',
  CANCELED: 'CANCELED',
  SYSTEM_CANCELED: 'SYSTEM_CANCELED',
} as const;

export type VisitAction = (typeof VISIT_ACTION)[keyof typeof VISIT_ACTION];

/** 이력의 행위 주체. 요청자 역할(ActorRole)에 시스템이 더해진다. */
export const HISTORY_ACTOR = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  SYSTEM: 'SYSTEM',
} as const;

export type HistoryActor = (typeof HISTORY_ACTOR)[keyof typeof HISTORY_ACTOR];

export const VISIT_CANCEL_REASON_MAX_LENGTH = 200;

/** 방문 신청. `isPast`는 저장하지 않고 응답할 때 서버 시각 기준으로 계산한다 (R5). */
export interface VisitResponse {
  id: number;
  roomId: number;
  studentId: number;
  visitAt: string;
  status: VisitStatus;
  isPast: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 자습실 상세의 신청자 목록 (강사) */
export interface RoomVisitResponse extends VisitResponse {
  studentName: string;
}

/** 신청 변경 이력 1건 (FR-ROM-03) */
export interface VisitHistoryResponse {
  id: number;
  visitId: number;
  roomId: number;
  studentId: number;
  studentName: string;
  action: VisitAction;
  actor: HistoryActor;
  /** 행위 직전의 유효한 방문 시각. 신청·재신청이면 null */
  prevVisitAt: string | null;
  /** 행위 직후의 유효한 방문 시각. 취소면 null */
  nextVisitAt: string | null;
  reason: string | null;
  createdAt: string;
}
