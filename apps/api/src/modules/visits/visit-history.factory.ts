import { ActorType, VisitAction, type Prisma } from '../../generated/prisma/client';

/** 시스템 취소 사유 (R8, R9). 학생 화면에 그대로 보인다. */
export const SYSTEM_CANCEL_REASON = {
  ROOM_DELETED: '자습실이 삭제되어 신청이 취소되었습니다.',
  STUDENT_DELETED: '학생 정보가 삭제되어 신청이 취소되었습니다.',
} as const;

export type SystemCancelReason = (typeof SYSTEM_CANCEL_REASON)[keyof typeof SYSTEM_CANCEL_REASON];

interface CanceledVisit {
  id: number;
  roomId: number;
  studentId: number;
  visitAt: Date;
}

/**
 * 시스템 취소 이력 1건 (docs/visit-policy.md 2절).
 * prev = 취소 직전의 유효한 방문 시각, next = null(취소 상태에는 유효한 시각이 없음).
 * createdAt은 DB 기본값이 아니라 Clock 시각을 쓴다 (CLAUDE.md 7절).
 */
export function systemCanceledHistory(
  visit: CanceledVisit,
  reason: SystemCancelReason,
  at: Date,
): Prisma.VisitHistoryCreateManyInput {
  return {
    visitId: visit.id,
    roomId: visit.roomId,
    studentId: visit.studentId,
    action: VisitAction.SYSTEM_CANCELED,
    actorType: ActorType.SYSTEM,
    prevVisitAt: visit.visitAt,
    nextVisitAt: null,
    reason,
    createdAt: at,
  };
}
