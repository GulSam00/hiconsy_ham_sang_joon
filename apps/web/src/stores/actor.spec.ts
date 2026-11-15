import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useActorStore } from './actor';

const KEY = 'study-room:actor';

describe('useActorStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('처음에는 역할이 없다', () => {
    expect(useActorStore().actor).toBeNull();
  });

  it('학생을 고르면 헤더용 요청자에는 이름이 빠지고, 저장소에 남는다', () => {
    const store = useActorStore();

    store.selectStudent(3, '김민준');

    expect(store.actor).toEqual({ role: 'STUDENT', studentId: 3 });
    expect(store.selected).toEqual({ role: 'STUDENT', studentId: 3, studentName: '김민준' });
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null')).toEqual(store.selected);
  });

  it('저장된 역할을 새로고침 후에도 복원한다', () => {
    useActorStore().selectTeacher();

    setActivePinia(createPinia());

    expect(useActorStore().actor).toEqual({ role: 'TEACHER' });
  });

  it.each([
    ['깨진 JSON', '{not json'],
    ['알 수 없는 역할', JSON.stringify({ role: 'ADMIN' })],
    ['학생 id 없음', JSON.stringify({ role: 'STUDENT', studentName: 'x' })],
    ['학생 id 0', JSON.stringify({ role: 'STUDENT', studentId: 0, studentName: 'x' })],
  ])('저장된 값이 %s이면 버린다', (_name, raw) => {
    localStorage.setItem(KEY, raw);

    expect(useActorStore().actor).toBeNull();
  });

  it('clear하면 저장소에서도 지운다', () => {
    const store = useActorStore();
    store.selectTeacher();

    store.clear();

    expect(store.actor).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
