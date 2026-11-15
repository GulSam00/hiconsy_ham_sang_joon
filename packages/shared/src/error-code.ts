/**
 * API 에러 코드. FE는 메시지가 아니라 이 코드로 분기한다.
 * HTTP 상태 매핑은 서버 관심사라 api(`error-status.ts`)에 두고, 여기에는 코드와 기본 메시지만 둔다.
 * 정책 근거: docs/visit-policy.md, CLAUDE.md 8절
 */
export const ERROR_CODE = {
  // 400
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  CANCEL_REASON_REQUIRED: 'CANCEL_REASON_REQUIRED',
  // 401
  ACTOR_REQUIRED: 'ACTOR_REQUIRED',
  // 403
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  FORBIDDEN_VISIT_OWNER: 'FORBIDDEN_VISIT_OWNER',
  // 404
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
  VISIT_NOT_FOUND: 'VISIT_NOT_FOUND',
  // 409
  ROOM_FULL: 'ROOM_FULL',
  DUPLICATE_VISIT: 'DUPLICATE_VISIT',
  VISIT_ALREADY_CANCELED: 'VISIT_ALREADY_CANCELED',
  VISIT_ALREADY_PASSED: 'VISIT_ALREADY_PASSED',
  CAPACITY_BELOW_ACTIVE: 'CAPACITY_BELOW_ACTIVE',
  PERIOD_EXCLUDES_VISITS: 'PERIOD_EXCLUDES_VISITS',
  // 422
  VISIT_OUT_OF_PERIOD: 'VISIT_OUT_OF_PERIOD',
  VISIT_IN_PAST: 'VISIT_IN_PAST',
  INVALID_PERIOD: 'INVALID_PERIOD',
  // 500, 503
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/**
 * 코드별 기본 메시지.
 * `Record<ErrorCode, string>`이라 코드를 추가하고 메시지를 빠뜨리면 컴파일 에러가 난다.
 */
export const ERROR_MESSAGE: Readonly<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: '요청 값이 올바르지 않습니다.',
  CANCEL_REASON_REQUIRED: '강사가 신청을 취소할 때는 사유가 필요합니다.',
  ACTOR_REQUIRED: '요청자 정보(역할, 학생 id)가 없거나 올바르지 않습니다.',
  FORBIDDEN_ROLE: '이 기능을 사용할 권한이 없습니다.',
  FORBIDDEN_VISIT_OWNER: '본인의 신청만 변경할 수 있습니다.',
  ROUTE_NOT_FOUND: '요청한 경로를 찾을 수 없습니다.',
  ROOM_NOT_FOUND: '자습실을 찾을 수 없습니다.',
  STUDENT_NOT_FOUND: '학생을 찾을 수 없습니다.',
  VISIT_NOT_FOUND: '방문 신청을 찾을 수 없습니다.',
  ROOM_FULL: '자습실 정원이 가득 찼습니다.',
  DUPLICATE_VISIT: '이미 이 자습실에 신청했습니다.',
  VISIT_ALREADY_CANCELED: '이미 취소된 신청입니다.',
  VISIT_ALREADY_PASSED: '이미 지난 방문은 변경할 수 없습니다.',
  CAPACITY_BELOW_ACTIVE: '현재 신청 인원보다 작은 정원으로 줄일 수 없습니다.',
  PERIOD_EXCLUDES_VISITS: '변경된 운영 기간을 벗어나는 신청이 있습니다.',
  VISIT_OUT_OF_PERIOD: '방문 시간이 자습실 운영 기간을 벗어났습니다.',
  VISIT_IN_PAST: '지나간 시간으로는 신청할 수 없습니다.',
  INVALID_PERIOD: '운영 시작 일시는 종료 일시보다 빨라야 합니다.',
  INTERNAL_ERROR: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  DATABASE_UNAVAILABLE: '데이터베이스에 연결할 수 없습니다.',
};

/** DTO 검증 실패 시 `details`에 담기는 필드별 오류 */
export interface FieldError {
  field: string;
  messages: string[];
}

/**
 * 모든 API 에러 응답의 형식.
 * `details`는 코드마다 형태가 다르다 (예: VALIDATION_FAILED → FieldError[]).
 */
export interface ErrorResponse<TDetails = unknown> {
  statusCode: number;
  code: ErrorCode;
  message: string;
  /** 서버 기준 발생 시각 (ISO 8601, UTC) */
  timestamp: string;
  details?: TDetails;
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_MESSAGE, value);
}
