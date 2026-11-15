import { ERROR_MESSAGE, isErrorCode, type ErrorCode, type ErrorResponse } from '@study-room/shared';
import { isAxiosError } from 'axios';

/** 서버 응답이 없을 때(네트워크 끊김, 서버 꺼짐)의 코드. 서버 ErrorCode와 겹치지 않는다. */
export const NETWORK_ERROR = 'NETWORK_ERROR';

export type ApiErrorCode = ErrorCode | typeof NETWORK_ERROR;

/**
 * 화면이 다루는 유일한 에러 타입. 화면은 message가 아니라 code로 분기한다 (CLAUDE.md 8절).
 * axios 에러를 그대로 퍼뜨리지 않고 API 경계에서 이 타입으로 바꾼다.
 */
export class ApiError<TDetails = unknown> extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number | null,
    readonly details?: TDetails,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.statusCode === 'number' &&
    isErrorCode(candidate.code) &&
    typeof candidate.message === 'string'
  );
}

/** 어떤 에러든 ApiError로 바꾼다. 이미 ApiError면 그대로 돌려준다. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (isErrorResponse(body)) {
      return new ApiError(body.code, body.message, body.statusCode, body.details);
    }
    if (error.response === undefined) {
      return new ApiError(
        NETWORK_ERROR,
        '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        null,
      );
    }
    // 프록시 오류 등 우리 형식이 아닌 응답: 상태 코드는 살리고 일반 메시지를 쓴다.
    return new ApiError('INTERNAL_ERROR', ERROR_MESSAGE.INTERNAL_ERROR, error.response.status);
  }
  return new ApiError(
    'INTERNAL_ERROR',
    error instanceof Error ? error.message : ERROR_MESSAGE.INTERNAL_ERROR,
    null,
  );
}

/** 4xx는 다시 보내도 같은 결과이므로 재시도하지 않는다 */
export function isRetryable(error: unknown): boolean {
  const apiError = toApiError(error);
  return apiError.status === null || apiError.status >= 500;
}
