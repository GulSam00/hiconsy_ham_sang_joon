import { ACTOR_ROLE, type Actor } from '@study-room/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/** 화면에 보여줄 학생 이름까지 담은 요청자. API 헤더에는 `toActor()`로 바꿔 보낸다. */
export type SelectedActor =
  | { role: typeof ACTOR_ROLE.TEACHER }
  | { role: typeof ACTOR_ROLE.STUDENT; studentId: number; studentName: string };

const STORAGE_KEY = 'study-room:actor';

function isSelectedActor(value: unknown): value is SelectedActor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.role === ACTOR_ROLE.TEACHER) {
    return true;
  }
  return (
    candidate.role === ACTOR_ROLE.STUDENT &&
    typeof candidate.studentId === 'number' &&
    Number.isSafeInteger(candidate.studentId) &&
    candidate.studentId > 0 &&
    typeof candidate.studentName === 'string'
  );
}

/**
 * 새로고침해도 역할을 유지하기 위한 저장. 시크릿 모드 등에서 저장소 접근이 실패해도
 * 앱은 "역할 미선택" 상태로 정상 동작해야 하므로 예외를 밖으로 던지지 않는다.
 * 저장된 값의 형식이 틀리면(이전 버전 데이터 등) 버린다.
 */
function loadActor(): SelectedActor | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isSelectedActor(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveActor(actor: SelectedActor | null): void {
  try {
    if (actor === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actor));
    }
  } catch {
    // 저장 실패는 이번 세션 동작에 영향이 없다 (메모리 상태는 유지됨). 새로고침 시 다시 선택하면 된다.
  }
}

/**
 * 현재 역할과 선택한 학생만 보관한다 (CLAUDE.md 3절). 서버 데이터는 여기에 두지 않는다.
 */
export const useActorStore = defineStore('actor', () => {
  const selected = ref<SelectedActor | null>(loadActor());

  /** API 헤더용 요청자 (학생 이름 제외) */
  const actor = computed<Actor | null>(() => {
    const current = selected.value;
    if (current === null) {
      return null;
    }
    return current.role === ACTOR_ROLE.STUDENT
      ? { role: ACTOR_ROLE.STUDENT, studentId: current.studentId }
      : { role: ACTOR_ROLE.TEACHER };
  });

  function set(next: SelectedActor | null): void {
    selected.value = next;
    saveActor(next);
  }

  return {
    selected,
    actor,
    selectTeacher: () => set({ role: ACTOR_ROLE.TEACHER }),
    selectStudent: (studentId: number, studentName: string) =>
      set({ role: ACTOR_ROLE.STUDENT, studentId, studentName }),
    clear: () => set(null),
  };
});
