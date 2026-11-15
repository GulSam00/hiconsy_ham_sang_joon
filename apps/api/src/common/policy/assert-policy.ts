import { DomainException } from '../errors/domain.exception';
import type { PolicyResult } from './policy-result';

/** 정책 위반이면 DomainException으로 바꿔 던진다. 정책 결과를 HTTP 응답으로 잇는 유일한 지점이다. */
export function assertPolicy(result: PolicyResult): void {
  if (!result.ok) {
    throw new DomainException(result.code, result.details);
  }
}
