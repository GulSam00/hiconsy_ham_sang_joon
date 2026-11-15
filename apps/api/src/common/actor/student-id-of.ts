import { ACTOR_ROLE, ERROR_CODE, type Actor } from '@study-room/shared';
import { DomainException } from '../errors/domain.exception';

/**
 * 학생 요청자의 id. `@Roles(STUDENT)` 엔드포인트에서 Guard가 이미 보장하지만,
 * 타입으로는 강사일 수도 있으므로 좁혀 준다. 강사가 오면 Guard 선언이 잘못된 것이므로 403으로 막는다.
 */
export function studentIdOf(actor: Actor): number {
  if (actor.role !== ACTOR_ROLE.STUDENT) {
    throw new DomainException(ERROR_CODE.FORBIDDEN_ROLE);
  }
  return actor.studentId;
}
