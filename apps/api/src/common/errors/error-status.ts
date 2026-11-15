import { HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@study-room/shared';

/**
 * 에러 코드 → HTTP 상태.
 * `Record<ErrorCode, …>`이므로 shared에 코드를 추가하고 여기를 빠뜨리면 컴파일 에러가 난다.
 * 상태 선택 기준: CLAUDE.md 8절 (409 = 현재 상태와 충돌, 422 = 형식은 맞지만 규칙 위반)
 */
export const ERROR_STATUS: Readonly<Record<ErrorCode, HttpStatus>> = {
  VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
  CANCEL_REASON_REQUIRED: HttpStatus.BAD_REQUEST,
  ACTOR_REQUIRED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN_ROLE: HttpStatus.FORBIDDEN,
  FORBIDDEN_VISIT_OWNER: HttpStatus.FORBIDDEN,
  ROUTE_NOT_FOUND: HttpStatus.NOT_FOUND,
  ROOM_NOT_FOUND: HttpStatus.NOT_FOUND,
  STUDENT_NOT_FOUND: HttpStatus.NOT_FOUND,
  VISIT_NOT_FOUND: HttpStatus.NOT_FOUND,
  ROOM_FULL: HttpStatus.CONFLICT,
  DUPLICATE_VISIT: HttpStatus.CONFLICT,
  VISIT_ALREADY_CANCELED: HttpStatus.CONFLICT,
  VISIT_ALREADY_PASSED: HttpStatus.CONFLICT,
  CAPACITY_BELOW_ACTIVE: HttpStatus.CONFLICT,
  PERIOD_EXCLUDES_VISITS: HttpStatus.CONFLICT,
  VISIT_OUT_OF_PERIOD: HttpStatus.UNPROCESSABLE_ENTITY,
  VISIT_IN_PAST: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_PERIOD: HttpStatus.UNPROCESSABLE_ENTITY,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
  DATABASE_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
};
