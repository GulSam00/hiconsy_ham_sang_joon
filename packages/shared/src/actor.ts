/**
 * 요청자 식별. 로그인 대신 헤더로 역할을 전달한다.
 * 근거와 한계: docs/visit-policy.md 6절
 */
export const ACTOR_ROLE = {
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;

export type ActorRole = (typeof ACTOR_ROLE)[keyof typeof ACTOR_ROLE];

/** HTTP 헤더 이름은 대소문자를 구분하지 않으며, Node는 소문자로 정규화한다. */
export const ACTOR_HEADER = {
  ROLE: 'x-actor-role',
  STUDENT_ID: 'x-student-id',
} as const;

export type Actor =
  | { readonly role: typeof ACTOR_ROLE.TEACHER }
  | { readonly role: typeof ACTOR_ROLE.STUDENT; readonly studentId: number };
