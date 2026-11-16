import type { RoomResponse, RoomVisitResponse } from '@study-room/shared';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ApiError } from '@/api/api-error';
import { deleteRoom, fetchRoom, updateRoom } from '@/api/rooms';
import { cancelVisit, fetchRoomHistories, fetchRoomVisits } from '@/api/visits';
import { ROUTE_NAME } from '@/router/route-access';
import TeacherRoomDetailPage from './TeacherRoomDetailPage.vue';

vi.mock('@/api/rooms', () => ({
  fetchRoom: vi.fn(),
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}));
vi.mock('@/api/visits', () => ({
  fetchRoomVisits: vi.fn(),
  fetchRoomHistories: vi.fn(),
  cancelVisit: vi.fn(),
}));

const room: RoomResponse = {
  id: 1,
  title: '수학 자습실',
  maxPersonnel: 3,
  activeCount: 3,
  startDate: '2026-11-15T00:00:00.000Z',
  endDate: '2026-11-20T13:00:00.000Z',
  createdAt: '2026-11-15T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
};

const visit = (id: number, name: string, isPast = false): RoomVisitResponse => ({
  id,
  roomId: 1,
  studentId: id,
  studentName: name,
  visitAt: '2026-11-16T10:00:00.000Z',
  status: 'ACTIVE',
  isPast,
  createdAt: '2026-11-15T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
});

const conflictVisit = (id: number, name: string) => ({
  visitId: id,
  studentId: id,
  studentName: name,
  visitAt: '2026-11-16T10:00:00.000Z',
  isPast: false,
});

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/rooms', name: ROUTE_NAME.TEACHER_ROOMS, component: { template: '<div />' } },
      {
        path: '/rooms/:id',
        name: ROUTE_NAME.TEACHER_ROOM_DETAIL,
        component: TeacherRoomDetailPage,
      },
    ],
  });
  await router.push('/rooms/1');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(TeacherRoomDetailPage, {
    props: { id: 1 },
    attachTo: document.body,
    global: { plugins: [createPinia(), router, [VueQueryPlugin, { queryClient }]] },
  });
  await flushPromises();
  return { wrapper, router };
}

/** root가 'dialog'면 열린 대화상자 안에서만 찾는다 (페이지와 대화상자에 같은 이름의 버튼이 있을 수 있음) */
function button(wrapper: VueWrapper, label: string, root: 'page' | 'dialog' = 'page') {
  const buttons =
    root === 'page'
      ? wrapper.findAll<HTMLButtonElement>('button').map((b) => b.element)
      : [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')];
  const found = buttons.find((b) => b.textContent?.trim() === label);
  if (found === undefined) throw new Error(`"${label}" 버튼이 없습니다.`);
  return found;
}

describe('TeacherRoomDetailPage', () => {
  beforeEach(() => {
    vi.mocked(fetchRoom).mockReset().mockResolvedValue(room);
    vi.mocked(fetchRoomVisits)
      .mockReset()
      .mockResolvedValue([visit(1, '김민준'), visit(2, '이서연'), visit(3, '박도윤', true)]);
    vi.mocked(fetchRoomHistories).mockReset().mockResolvedValue([]);
    vi.mocked(updateRoom).mockReset();
    vi.mocked(cancelVisit).mockReset();
    vi.mocked(deleteRoom).mockReset();
    document.body.innerHTML = '';
  });

  it('신청자 목록에서 예정 신청에만 취소 버튼이 있다', async () => {
    const { wrapper } = await mountPage();

    const rows = wrapper.findAll('[data-testid="visit-table"] tbody tr');
    expect(rows.map((row) => [row.text().includes('예정'), row.find('button').exists()])).toEqual([
      [true, true],
      [true, true],
      [false, false],
    ]);
  });

  it('정원 축소 충돌(R6): 409 → 안내에서 사유와 함께 취소 → 목록에서 사라짐 → 다시 저장 성공', async () => {
    vi.mocked(updateRoom)
      .mockRejectedValueOnce(
        new ApiError(
          'CAPACITY_BELOW_ACTIVE',
          '현재 신청 인원보다 작은 정원으로 줄일 수 없습니다.',
          409,
          {
            activeCount: 3,
            requestedMaxPersonnel: 2,
            cancellableVisits: [conflictVisit(1, '김민준'), conflictVisit(2, '이서연')],
          },
        ),
      )
      .mockResolvedValueOnce({ ...room, maxPersonnel: 2, activeCount: 2 });
    vi.mocked(cancelVisit).mockResolvedValue({ ...visit(1, '김민준'), status: 'CANCELED' });
    const { wrapper } = await mountPage();

    // 1. 수정 → 정원 2로 저장 → 409
    button(wrapper, '수정').click();
    await flushPromises();
    await wrapper.find('[data-testid="room-max"]').setValue(2);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateRoom).toHaveBeenLastCalledWith(1, { maxPersonnel: 2 });
    const panel = () => wrapper.find('[data-testid="room-conflict"]');
    expect(panel().text()).toContain('김민준');
    expect(panel().text()).toContain('이서연');

    // 2. 김민준 신청 취소 (사유 필수: 비어 있으면 버튼 비활성)
    await panel()
      .findAll('button')
      .find((b) => b.text() === '취소')
      ?.trigger('click');
    await flushPromises();
    const submitCancel = () => button(wrapper, '신청 취소', 'dialog');
    expect(submitCancel().hasAttribute('disabled')).toBe(true);

    const textarea = document.body.querySelector<HTMLTextAreaElement>(
      '[data-testid="cancel-reason"]',
    );
    if (textarea === null) throw new Error('사유 입력이 없습니다.');
    textarea.value = '  정원을 줄입니다  ';
    textarea.dispatchEvent(new Event('input'));
    await flushPromises();
    submitCancel().click();
    await flushPromises();

    expect(cancelVisit).toHaveBeenCalledWith(1, '정원을 줄입니다');
    expect(panel().text()).not.toContain('김민준');
    expect(panel().text()).toContain('이서연');

    // 3. 다시 저장 → 같은 변경을 다시 보내 성공, 수정 화면이 닫힌다
    button(wrapper, '다시 저장').click();
    await flushPromises();

    expect(updateRoom).toHaveBeenLastCalledWith(1, { maxPersonnel: 2 });
    expect(updateRoom).toHaveBeenCalledTimes(2);
    expect(panel().exists()).toBe(false);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('바뀐 값이 없으면 저장 요청을 보내지 않는다', async () => {
    const { wrapper } = await mountPage();

    button(wrapper, '수정').click();
    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(updateRoom).not.toHaveBeenCalled();
  });

  it('삭제 확인에 자동 취소될 예정 신청 수를 알려주고, 삭제하면 목록으로 간다', async () => {
    vi.mocked(deleteRoom).mockResolvedValue();
    const { wrapper, router } = await mountPage();

    button(wrapper, '삭제').click();
    await flushPromises();
    expect(document.body.textContent).toContain('예정 신청 2건이 자동 취소');

    button(wrapper, '삭제', 'dialog').click();
    await flushPromises();

    expect(deleteRoom).toHaveBeenCalledWith(1);
    expect(router.currentRoute.value.name).toBe(ROUTE_NAME.TEACHER_ROOMS);
  });
});
