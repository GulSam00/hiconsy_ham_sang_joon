import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

/** 끝에 `Z` 또는 `+09:00` 같은 오프셋이 있어야 한다 */
const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * 시간대가 명시된 ISO 8601 일시 문자열 (R10).
 * `2026-11-20T19:00:00`처럼 시간대가 없으면 서버 시간대로 해석되어 클라이언트 의도와 달라질 수 있으므로 거부한다.
 */
export function IsIsoDateTime(): PropertyDecorator {
  return applyDecorators(
    IsISO8601(
      { strict: true, strictSeparator: true },
      { message: '$property는 ISO 8601 일시여야 합니다.' },
    ),
    Matches(HAS_TIMEZONE, {
      message: '$property는 시간대(Z 또는 +09:00 등)를 포함해야 합니다.',
    }),
  );
}
