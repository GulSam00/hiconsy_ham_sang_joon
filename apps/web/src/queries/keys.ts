/**
 * Query key는 이 파일 한 곳에서만 만든다 (CLAUDE.md 9절).
 * mutation 후 무효화할 범위를 key 구조로 표현한다: 예) queryKeys.rooms.all 무효화 → 목록·상세 모두 갱신.
 */
export const queryKeys = {
  health: ['health'] as const,
  studentOptions: ['students', 'options'] as const,
} as const;
