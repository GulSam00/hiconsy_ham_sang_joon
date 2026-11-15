import type { ErrorCode } from '@study-room/shared';

/**
 * 정책 함수의 반환 형식.
 * 정책은 Nest·Prisma에 의존하지 않는 순수 함수라서(CLAUDE.md 7절) 예외를 던지지 않고 결과를 돌려준다.
 * 서비스가 `unwrap`으로 DomainException으로 바꾼다.
 */
export type PolicyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: ErrorCode; readonly details?: unknown };

export const POLICY_OK: PolicyResult = { ok: true };

export function violation(code: ErrorCode, details?: unknown): PolicyResult {
  return details === undefined ? { ok: false, code } : { ok: false, code, details };
}
