import { ACTOR_ROLE, type Actor, type ActorRole } from '@study-room/shared';

export const ROUTE_NAME = {
  ROLE_SELECT: 'role-select',
  TEACHER_ROOMS: 'teacher-rooms',
  STUDENT_ROOMS: 'student-rooms',
  NOT_FOUND: 'not-found',
} as const;

export type RouteName = (typeof ROUTE_NAME)[keyof typeof ROUTE_NAME];

/** 역할별 첫 화면 */
export function homeOf(role: ActorRole): RouteName {
  return role === ACTOR_ROLE.TEACHER ? ROUTE_NAME.TEACHER_ROOMS : ROUTE_NAME.STUDENT_ROOMS;
}

/**
 * 화면 접근 검사 (순수 함수, router 가드에서 호출).
 * - 역할 제한이 없는 화면: 통과
 * - 역할 미선택: 역할 선택으로
 * - 다른 역할의 화면: 내 역할의 첫 화면으로
 *
 * 화면 접근 제한은 편의 기능이다. 실제 권한은 서버가 헤더로 검사한다.
 */
export function redirectFor(
  required: ActorRole | undefined,
  actor: Actor | null,
): RouteName | null {
  if (required === undefined) {
    return null;
  }
  if (actor === null) {
    return ROUTE_NAME.ROLE_SELECT;
  }
  return actor.role === required ? null : homeOf(actor.role);
}
