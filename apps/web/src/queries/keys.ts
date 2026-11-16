/**
 * Query key는 이 파일 한 곳에서만 만든다 (CLAUDE.md 9절).
 * 계층 구조로 무효화 범위를 표현한다. 예) rooms.all 무효화 → 목록·상세·신청자·이력이 모두 갱신된다.
 */
export const queryKeys = {
  health: ['health'] as const,
  studentOptions: ['students', 'options'] as const,
  students: {
    all: ['students'] as const,
    list: () => [...queryKeys.students.all, 'list'] as const,
  },
  me: {
    all: ['me'] as const,
    visits: () => [...queryKeys.me.all, 'visits'] as const,
  },
  rooms: {
    all: ['rooms'] as const,
    list: () => [...queryKeys.rooms.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.rooms.all, id] as const,
    visits: (id: number) => [...queryKeys.rooms.all, id, 'visits'] as const,
    histories: (id: number) => [...queryKeys.rooms.all, id, 'histories'] as const,
  },
} as const;
