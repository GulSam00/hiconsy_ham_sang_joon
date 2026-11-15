import { ACTOR_ROLE, type Actor } from '@study-room/shared';
import { ActorType, VisitAction, type Prisma } from '../../generated/prisma/client';

/** 시스템 취소 사유 (R8, R9). 학생 화면에 그대로 보인다. */
export const SYSTEM_CANCEL_REASON = {
  ROOM_DELETED: '자습실이 삭제되어 신청이 취소되었습니다.',
  STUDENT_DELETED: '학생 정보가 삭제되어 신청이 취소되었습니다.',
} as const;

export type SystemCancelReason = (typeof SYSTEM_CANCEL_REASON)[keyof typeof SYSTEM_CANCEL_REASON];

interface HistoryTarget {
  id: number;
  roomId: number;
  studentId: number;
}

/**
 * 이력의 행위 주체는 서버가 요청자 정보에서 정한다. 클라이언트가 보낸 값을 쓰지 않는다 (CLAUDE.md 7절).
 */
export function actorTypeOf(actor: Actor): ActorType {
  return actor.role === ACTOR_ROLE.TEACHER ? ActorType.TEACHER : ActorType.STUDENT;
}

/**
 * 이력 1건. prev/next는 "행위 직전·직후의 유효한 방문 시각"이다 (docs/visit-policy.md 2절).
 * createdAt은 DB 기본값이 아니라 Clock 시각을 쓴다 (CLAUDE.md 7절).
 */
export function visitHistory(
  visit: HistoryTarget,
  entry: {
    action: VisitAction;
    actorType: ActorType;
    prevVisitAt: Date | null;
    nextVisitAt: Date | null;
    reason?: string | null;
  },
  at: Date,
): Prisma.VisitHistoryCreateManyInput {
  return {
    visitId: visit.id,
    roomId: visit.roomId,
    studentId: visit.studentId,
    action: entry.action,
    actorType: entry.actorType,
    prevVisitAt: entry.prevVisitAt,
    nextVisitAt: entry.nextVisitAt,
    reason: entry.reason ?? null,
    createdAt: at,
  };
}

/** 시스템 취소 이력 (R8, R9) */
export function systemCanceledHistory(
  visit: HistoryTarget & { visitAt: Date },
  reason: SystemCancelReason,
  at: Date,
): Prisma.VisitHistoryCreateManyInput {
  return visitHistory(
    visit,
    {
      action: VisitAction.SYSTEM_CANCELED,
      actorType: ActorType.SYSTEM,
      prevVisitAt: visit.visitAt,
      nextVisitAt: null,
      reason,
    },
    at,
  );
}
