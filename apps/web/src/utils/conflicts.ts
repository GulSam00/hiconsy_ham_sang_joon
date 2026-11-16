import {
  ERROR_CODE,
  type CapacityConflictDetails,
  type ConflictingVisit,
  type PeriodConflictDetails,
} from '@study-room/shared';
import { toApiError } from '@/api/api-error';

/** 자습실 수정 충돌(R6, R7)을 화면용으로 정리한 결과 */
export type RoomConflict =
  | { kind: 'CAPACITY'; message: string; details: CapacityConflictDetails }
  | { kind: 'PERIOD'; message: string; details: PeriodConflictDetails };

function isConflictingVisit(value: unknown): value is ConflictingVisit {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.visitId === 'number' &&
    typeof v.studentName === 'string' &&
    typeof v.visitAt === 'string' &&
    typeof v.isPast === 'boolean'
  );
}

/**
 * 수정 에러가 R6·R7 충돌이면 details를 검사해 돌려준다. 아니면 null.
 * details는 서버가 보낸 값이므로 형태를 믿지 않고 확인한다 (형식이 틀리면 일반 에러로 보여준다).
 */
export function toRoomConflict(error: unknown): RoomConflict | null {
  const apiError = toApiError(error);
  const details = apiError.details;
  if (typeof details !== 'object' || details === null) return null;
  const d = details as Record<string, unknown>;

  if (
    apiError.code === ERROR_CODE.CAPACITY_BELOW_ACTIVE &&
    typeof d.activeCount === 'number' &&
    typeof d.requestedMaxPersonnel === 'number' &&
    Array.isArray(d.cancellableVisits) &&
    d.cancellableVisits.every(isConflictingVisit)
  ) {
    return {
      kind: 'CAPACITY',
      message: apiError.message,
      details: {
        activeCount: d.activeCount,
        requestedMaxPersonnel: d.requestedMaxPersonnel,
        cancellableVisits: d.cancellableVisits,
      },
    };
  }
  if (
    apiError.code === ERROR_CODE.PERIOD_EXCLUDES_VISITS &&
    Array.isArray(d.conflicts) &&
    d.conflicts.every(isConflictingVisit)
  ) {
    return { kind: 'PERIOD', message: apiError.message, details: { conflicts: d.conflicts } };
  }
  return null;
}

/**
 * 충돌 안내에서 이미 취소한 신청을 뺀다. 서버 응답(에러 객체)은 그대로 두고 새 값을 만든다.
 * "다시 저장"하기 전까지는 서버에서 충돌 목록을 다시 받지 않으므로, 화면에서 처리한 항목을 걸러 보여준다.
 */
export function withoutVisits(
  conflict: RoomConflict,
  canceledIds: readonly number[],
): RoomConflict {
  const keep = (visit: ConflictingVisit) => !canceledIds.includes(visit.visitId);
  return conflict.kind === 'CAPACITY'
    ? {
        ...conflict,
        details: {
          ...conflict.details,
          cancellableVisits: conflict.details.cancellableVisits.filter(keep),
        },
      }
    : { ...conflict, details: { conflicts: conflict.details.conflicts.filter(keep) } };
}
