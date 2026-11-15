import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ApiError, NETWORK_ERROR } from '@/api/api-error';
import { fetchStudentOptions } from '@/api/students';
import { ROUTE_NAME } from '@/router/route-access';
import { useActorStore } from '@/stores/actor';
import RoleSelectPage from './RoleSelectPage.vue';

vi.mock('@/api/students', () => ({ fetchStudentOptions: vi.fn() }));
const fetchOptions = vi.mocked(fetchStudentOptions);

const Empty = { template: '<div />' };

async function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: ROUTE_NAME.ROLE_SELECT, component: RoleSelectPage },
      { path: '/t', name: ROUTE_NAME.TEACHER_ROOMS, component: Empty },
      { path: '/s', name: ROUTE_NAME.STUDENT_ROOMS, component: Empty },
    ],
  });
  await router.push('/');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(RoleSelectPage, {
    global: { plugins: [pinia, router, [VueQueryPlugin, { queryClient }]] },
  });
  await flushPromises();
  return { wrapper, router, store: useActorStore(pinia) };
}

const startStudentButton = (wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper']) => {
  const button = wrapper.findAll('button').find((b) => b.text() === '학생으로 시작');
  if (button === undefined) throw new Error('학생으로 시작 버튼이 없습니다.');
  return button;
};

describe('RoleSelectPage', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchOptions.mockReset();
  });

  it('강사로 시작하면 강사 역할을 저장하고 강사 화면으로 간다', async () => {
    fetchOptions.mockResolvedValue([]);
    const { wrapper, router, store } = await mountPage();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '강사로 시작')
      ?.trigger('click');
    await flushPromises();

    expect(store.actor).toEqual({ role: 'TEACHER' });
    expect(router.currentRoute.value.name).toBe(ROUTE_NAME.TEACHER_ROOMS);
  });

  it('학생을 고르기 전에는 시작 버튼이 비활성, 고르면 학생 화면으로 간다', async () => {
    fetchOptions.mockResolvedValue([
      { id: 1, name: '김민준' },
      { id: 2, name: '이서연' },
    ]);
    const { wrapper, router, store } = await mountPage();

    expect(startStudentButton(wrapper).attributes('disabled')).toBeDefined();

    // DOM의 select 값은 문자열이다. v-model이 옵션의 원래 값(숫자 2)으로 되돌린다.
    await wrapper.find('[data-testid="student-select"]').setValue('2');
    await startStudentButton(wrapper).trigger('click');
    await flushPromises();

    expect(store.selected).toEqual({ role: 'STUDENT', studentId: 2, studentName: '이서연' });
    expect(router.currentRoute.value.name).toBe(ROUTE_NAME.STUDENT_ROOMS);
  });

  it('목록에 없는 값이 선택되면 시작 버튼은 비활성이다 (눌러도 반응 없는 버튼 방지)', async () => {
    fetchOptions.mockResolvedValue([{ id: 1, name: '김민준' }]);
    const { wrapper } = await mountPage();

    await wrapper.find('[data-testid="student-select"]').setValue('999');

    expect(startStudentButton(wrapper).attributes('disabled')).toBeDefined();
  });

  it('학생이 없으면 안내 문구를 보여준다', async () => {
    fetchOptions.mockResolvedValue([]);
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain('등록된 학생이 없습니다');
  });

  it('목록을 못 불러오면 에러와 다시 시도 버튼을 보여주고, 다시 시도하면 목록이 나온다', async () => {
    fetchOptions.mockRejectedValueOnce(
      new ApiError(NETWORK_ERROR, '서버에 연결할 수 없습니다.', null),
    );
    fetchOptions.mockResolvedValueOnce([{ id: 1, name: '김민준' }]);
    const { wrapper } = await mountPage();

    expect(wrapper.find('[role="alert"]').text()).toContain('서버에 연결할 수 없습니다');

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '다시 시도')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="student-select"]').text()).toContain('김민준');
  });
});
