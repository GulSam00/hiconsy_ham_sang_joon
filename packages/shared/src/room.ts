/** 자습실 응답. 날짜는 ISO 8601(UTC) 문자열이다 (R10). */
export interface RoomResponse {
  id: number;
  title: string;
  maxPersonnel: number;
  /** 활성 신청 수 (지난 방문 포함, R1·R5) */
  activeCount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export const ROOM_TITLE_MAX_LENGTH = 100;
export const ROOM_MAX_PERSONNEL_LIMIT = 1_000;

/** 충돌 응답(R6, R7)에 담기는 신청 요약 */
export interface ConflictingVisit {
  visitId: number;
  studentId: number;
  studentName: string;
  visitAt: string;
  /** 지난 방문이면 true. 지난 방문은 강사도 취소할 수 없다 (R5) */
  isPast: boolean;
}

/** 409 CAPACITY_BELOW_ACTIVE의 details (R6) */
export interface CapacityConflictDetails {
  activeCount: number;
  requestedMaxPersonnel: number;
  /** 강사가 사유와 함께 취소(R11)해 정원을 확보할 수 있는 예정 신청 */
  cancellableVisits: ConflictingVisit[];
}

/** 409 PERIOD_EXCLUDES_VISITS의 details (R7) */
export interface PeriodConflictDetails {
  conflicts: ConflictingVisit[];
}
