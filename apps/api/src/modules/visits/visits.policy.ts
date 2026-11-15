import { ACTOR_ROLE, ERROR_CODE, type Actor } from '@study-room/shared';
import { POLICY_OK, violation, type PolicyResult } from '../../common/policy/policy-result';
import { isWithinPeriod, type RoomPeriod } from '../rooms/rooms.policy';
import { isPastVisit } from './visit-time';

/** 정책 판단에 필요한 신청 정보 (Prisma 모델에 의존하지 않음) */
export interface VisitSnapshot {
  studentId: number;
  status: 'ACTIVE' | 'CANCELED';
  visitAt: Date;
}

/**
 * R4: 신청·시간 수정 시 방문 시각은 지금 이후이고 운영 기간 안이어야 한다.
 * 지난 시각을 먼저 알린다. 운영이 끝난 자습실에 지난 시각을 보내면 "기간 밖"보다 "지난 시각"이 더 정확한 이유다.
 */
export function checkVisitTime(visitAt: Date, period: RoomPeriod, now: Date): PolicyResult {
  if (isPastVisit(visitAt, now)) {
    return violation(ERROR_CODE.VISIT_IN_PAST);
  }
  if (!isWithinPeriod(visitAt, period)) {
    return violation(ERROR_CODE.VISIT_OUT_OF_PERIOD);
  }
  return POLICY_OK;
}

/** R3: 같은 (자습실, 학생)에 활성 신청이 있으면 다시 신청할 수 없다 */
export function checkNotDuplicated(existing: VisitSnapshot | null): PolicyResult {
  return existing?.status === 'ACTIVE' ? violation(ERROR_CODE.DUPLICATE_VISIT) : POLICY_OK;
}

/**
 * 시간 수정·취소 전 검사 (R5, 요청자 식별 규칙).
 * 순서가 의미를 가진다: 남의 신청이면 상태(취소·지남)를 알려주기 전에 먼저 403으로 막는다.
 */
export function checkChangeable(visit: VisitSnapshot, actor: Actor, now: Date): PolicyResult {
  if (actor.role === ACTOR_ROLE.STUDENT && actor.studentId !== visit.studentId) {
    return violation(ERROR_CODE.FORBIDDEN_VISIT_OWNER);
  }
  if (visit.status === 'CANCELED') {
    return violation(ERROR_CODE.VISIT_ALREADY_CANCELED);
  }
  if (isPastVisit(visit.visitAt, now)) {
    return violation(ERROR_CODE.VISIT_ALREADY_PASSED);
  }
  return POLICY_OK;
}

/** R12: 같은 시각으로 수정하면 아무것도 바꾸지 않는다 */
export function isSameVisitTime(current: Date, next: Date): boolean {
  return current.getTime() === next.getTime();
}

/**
 * 취소 사유 정규화. 앞뒤 공백을 지우고, 비어 있으면 "사유 없음"(undefined)으로 본다.
 * `"   "` 같은 값이 사유로 저장되어 학생 화면에 빈 사유가 보이는 것을 막는다.
 */
export function normalizeCancelReason(reason: string | undefined): string | undefined {
  const trimmed = reason?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

/**
 * R11: 강사가 취소할 때는 사유가 필수다. 학생에게 "누가 왜 취소했는지"를 보여줘야 하기 때문이다.
 * 학생 본인 취소는 사유가 선택이다.
 *
 * @param reason normalizeCancelReason을 거친 값
 */
export function checkCancelReason(actor: Actor, reason: string | undefined): PolicyResult {
  if (actor.role === ACTOR_ROLE.TEACHER && reason === undefined) {
    return violation(ERROR_CODE.CANCEL_REASON_REQUIRED);
  }
  return POLICY_OK;
}
