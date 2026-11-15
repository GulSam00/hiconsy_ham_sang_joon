import { ACTOR_HEADER, ACTOR_ROLE, ERROR_CODE, type Actor } from '@study-room/shared';
import type { IncomingHttpHeaders } from 'node:http';
import { DomainException } from '../errors/domain.exception';

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/**
 * 헤더에서 요청자를 읽는 유일한 함수.
 * 로그인을 도입하면 이 함수만 `Authorization` 헤더(JWT) 해석으로 바꾸면 된다 (docs/visit-policy.md 6절).
 *
 * - 같은 헤더가 여러 번 오면(배열) 어느 값을 믿을지 알 수 없으므로 거부한다.
 * - 강사 요청에 `X-Student-Id`가 함께 오면 무시한다. 역할을 바꾼 직후 FE가 이전 값을 보내는 경우가 있고,
 *   강사 요청의 의미에는 영향이 없기 때문이다.
 */
export function parseActor(headers: IncomingHttpHeaders): Actor {
  const role = headers[ACTOR_HEADER.ROLE];

  if (role === ACTOR_ROLE.TEACHER) {
    return { role: ACTOR_ROLE.TEACHER };
  }

  if (role === ACTOR_ROLE.STUDENT) {
    const rawStudentId = headers[ACTOR_HEADER.STUDENT_ID];
    if (typeof rawStudentId !== 'string' || !POSITIVE_INTEGER.test(rawStudentId)) {
      throw new DomainException(ERROR_CODE.ACTOR_REQUIRED);
    }
    const studentId = Number(rawStudentId);
    if (!Number.isSafeInteger(studentId)) {
      throw new DomainException(ERROR_CODE.ACTOR_REQUIRED);
    }
    return { role: ACTOR_ROLE.STUDENT, studentId };
  }

  throw new DomainException(ERROR_CODE.ACTOR_REQUIRED);
}
