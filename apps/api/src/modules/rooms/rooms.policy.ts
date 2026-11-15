import {
  ERROR_CODE,
  type CapacityConflictDetails,
  type ConflictingVisit,
  type PeriodConflictDetails,
} from '@study-room/shared';
import { POLICY_OK, violation, type PolicyResult } from '../../common/policy/policy-result';
import { isPastVisit } from '../visits/visit-time';

export interface RoomPeriod {
  startDate: Date;
  endDate: Date;
}

/** 정책 판단에 필요한 활성 신청 정보 */
export interface ActiveVisitSnapshot {
  visitId: number;
  studentId: number;
  studentName: string;
  visitAt: Date;
}

/** FN-ROM-02: 시작 < 종료 (같은 시각도 불가) */
export function checkPeriod(period: RoomPeriod): PolicyResult {
  return period.startDate.getTime() < period.endDate.getTime()
    ? POLICY_OK
    : violation(ERROR_CODE.INVALID_PERIOD);
}

/** 운영 기간 포함 여부 (R4, 양 끝 포함) */
export function isWithinPeriod(visitAt: Date, period: RoomPeriod): boolean {
  const time = visitAt.getTime();
  return period.startDate.getTime() <= time && time <= period.endDate.getTime();
}

function toConflictingVisit(visit: ActiveVisitSnapshot, now: Date): ConflictingVisit {
  return {
    visitId: visit.visitId,
    studentId: visit.studentId,
    studentName: visit.studentName,
    visitAt: visit.visitAt.toISOString(),
    isPast: isPastVisit(visit.visitAt, now),
  };
}

/**
 * R6: 새 정원이 활성 신청 수(지난 방문 포함)보다 작으면 거부.
 * details에는 강사가 취소할 수 있는 **예정** 신청만 담는다 (지난 방문은 취소 불가, R5).
 */
export function checkCapacityReduction(
  requestedMaxPersonnel: number,
  activeVisits: readonly ActiveVisitSnapshot[],
  now: Date,
): PolicyResult {
  if (activeVisits.length <= requestedMaxPersonnel) {
    return POLICY_OK;
  }
  const details: CapacityConflictDetails = {
    activeCount: activeVisits.length,
    requestedMaxPersonnel,
    cancellableVisits: activeVisits
      .filter((visit) => !isPastVisit(visit.visitAt, now))
      .map((visit) => toConflictingVisit(visit, now)),
  };
  return violation(ERROR_CODE.CAPACITY_BELOW_ACTIVE, details);
}

/** R7: 새 기간 밖으로 밀려나는 활성 신청(지난 방문 포함)이 있으면 거부 */
export function checkPeriodChange(
  period: RoomPeriod,
  activeVisits: readonly ActiveVisitSnapshot[],
  now: Date,
): PolicyResult {
  const conflicts = activeVisits
    .filter((visit) => !isWithinPeriod(visit.visitAt, period))
    .map((visit) => toConflictingVisit(visit, now));
  if (conflicts.length === 0) {
    return POLICY_OK;
  }
  const details: PeriodConflictDetails = { conflicts };
  return violation(ERROR_CODE.PERIOD_EXCLUDES_VISITS, details);
}
