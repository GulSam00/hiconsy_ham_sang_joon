import type { MyVisitResponse, RoomResponse } from '@study-room/shared';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { ApiError } from '@/api/api-error';
import { fetchRooms } from '@/api/rooms';
import { applyVisit, cancelVisit, changeVisitTime, fetchMyVisits } from '@/api/visits';
import { ROUTE_NAME } from '@/router/route-access';
import StudentRoomsPage from './StudentRoomsPage.vue';
import StudentVisitsPage from './StudentVisitsPage.vue';

vi.mock('@/api/rooms', () => ({ fetchRooms: vi.fn() }));
vi.mock('@/api/visits', () => ({
  fetchMyVisits: vi.fn(),
  applyVisit: vi.fn(),
  changeVisitTime: vi.fn(),
  cancelVisit: vi.fn(),
}));

// 화면 시각을 고정한다 (useNow가 Date.now를 쓴다). 2026-11-15 12:00 KST
const NOW = new Date('2026-11-15T03:00:00.000Z');

const room = (id: number, overrides: Partial<RoomResponse> = {}): RoomResponse => ({
  id,
  title: `자습실 ${id}`,
  maxPersonnel: 3,
  activeCount: 1,
  startDate: '2026-11-15T00:00:00.000Z',
  endDate: '2026-11-20T13:00:00.000Z',
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const myVisit = (id: number, overrides: Partial<MyVisitResponse> = {}): MyVisitResponse => ({
  id,
  roomId: id,
  studentId: 1,
  visitAt: '2026-11-16T10:00:00.000Z',
  status: 'ACTIVE',
  isPast: false,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  room: {
    id,
    title: `자습실 ${id}`,
    startDate: '2026-11-15T00:00:00.000Z',
    endDate: '2026-11-20T13:00:00.000Z',
    isDeleted: false,
  },
  cancellation: null,
  ...overrides,
});

async function mountPage(component: Component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/rooms', name: ROUTE_NAME.STUDENT_ROOMS, component: { template: '<div />' } },
      { path: '/visits', name: ROUTE_NAME.STUDENT_VISITS, component: { template: '<div />' } },
    ],
  });
  await router.push('/rooms');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(component, {
    attachTo: document.body,
    global: { plugins: [createPinia(), router, [VueQueryPlugin, { queryClient }]] },
  });
  await flushPromises();
  return wrapper;
}

function dialogButton(label: string): HTMLButtonElement {
  const found = [
    ...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
  ].find((b) => b.textContent?.trim() === label);
  if (found === undefined) throw new Error(`대화상자에 "${label}" 버튼이 없습니다.`);
  return found;
}

async function setDialogInput(selector: string, value: string): Promise<void> {
  const input = document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (input === null) throw new Error(`${selector} 입력이 없습니다.`);
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  for (const fn of [fetchRooms, fetchMyVisits, applyVisit, changeVisitTime, cancelVisit]) {
    vi.mocked(fn).mockReset();
  }
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('StudentRoomsPage', () => {
  it('자습실마다 내 상태에 맞는 행동을 보여준다', async () => {
    vi.mocked(fetchRooms).mockResolvedValue([
      room(1),
      room(2),
      room(3, { activeCount: 3 }),
      room(4, { endDate: '2026-11-15T02:00:00.000Z' }),
      room(5),
    ]);
    vi.mocked(fetchMyVisits).mockResolvedValue([
      myVisit(2),
      myVisit(5, {
        status: 'CANCELED',
        cancellation: { by: 'STUDENT', reason: null, canceledAt: NOW.toISOString() },
      }),
    ]);
    const wrapper = await mountPage(StudentRoomsPage);

    const labels = wrapper
      .findAll('[data-testid="student-room-list"] li')
      .map((li) => li.find('button, span.rounded-full').text());
    expect(labels).toEqual(['신청', '신청함', '정원 마감', '운영 종료', '다시 신청']);
  });

  it('신청: 시각을 고르면 +09:00 ISO로 보내고 완료 안내를 보여준다', async () => {
    vi.mocked(fetchRooms).mockResolvedValue([room(1)]);
    vi.mocked(fetchMyVisits).mockResolvedValue([]);
    vi.mocked(applyVisit).mockResolvedValue(myVisit(1));
    const wrapper = await mountPage(StudentRoomsPage);

    await wrapper.find('button').trigger('click');
    await setDialogInput('[data-testid="visit-at"]', '2026-11-16T19:00');
    dialogButton('신청').click();
    await flushPromises();

    expect(applyVisit).toHaveBeenCalledWith(1, '2026-11-16T19:00:00+09:00');
    expect(wrapper.find('[role="status"]').text()).toContain('방문을 신청했습니다');
  });

  it('지나간 시각은 화면에서 막고 요청하지 않는다', async () => {
    vi.mocked(fetchRooms).mockResolvedValue([room(1)]);
    vi.mocked(fetchMyVisits).mockResolvedValue([]);
    const wrapper = await mountPage(StudentRoomsPage);

    await wrapper.find('button').trigger('click');
    await setDialogInput('[data-testid="visit-at"]', '2026-11-15T11:00');
    dialogButton('신청').click();
    await flushPromises();

    expect(applyVisit).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('지나간 시간으로는 신청할 수 없습니다');
  });

  it('정원이 그 사이 찼으면 서버 메시지를 대화상자에 보여준다', async () => {
    vi.mocked(fetchRooms).mockResolvedValue([room(1)]);
    vi.mocked(fetchMyVisits).mockResolvedValue([]);
    vi.mocked(applyVisit).mockRejectedValue(
      new ApiError('ROOM_FULL', '자습실 정원이 가득 찼습니다.', 409),
    );
    const wrapper = await mountPage(StudentRoomsPage);

    await wrapper.find('button').trigger('click');
    await setDialogInput('[data-testid="visit-at"]', '2026-11-16T19:00');
    dialogButton('신청').click();
    await flushPromises();

    expect(document.body.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain(
      '자습실 정원이 가득 찼습니다',
    );
  });
});

describe('StudentVisitsPage', () => {
  it('예정·지난 방문·취소됨으로 묶고, 취소된 신청에는 누가 왜 취소했는지 보여준다', async () => {
    vi.mocked(fetchMyVisits).mockResolvedValue([
      myVisit(1),
      myVisit(2, { isPast: true }),
      myVisit(3, {
        status: 'CANCELED',
        cancellation: { by: 'TEACHER', reason: '정원 조정', canceledAt: NOW.toISOString() },
      }),
    ]);
    const wrapper = await mountPage(StudentVisitsPage);

    expect(wrapper.find('[data-testid="section-UPCOMING"]').text()).toContain('자습실 1');
    expect(wrapper.find('[data-testid="section-PAST"]').text()).toContain('자습실 2');
    const canceled = wrapper.find('[data-testid="section-CANCELED"]').text();
    expect(canceled).toContain('강사가 취소했습니다');
    expect(canceled).toContain('사유: 정원 조정');
    // 예정 신청에만 변경·취소 버튼
    expect(wrapper.find('[data-testid="section-PAST"] button').exists()).toBe(false);
  });

  it('시간 변경: 기존 시각이 채워져 있고, 새 시각을 보낸다', async () => {
    vi.mocked(fetchMyVisits).mockResolvedValue([myVisit(1)]);
    vi.mocked(changeVisitTime).mockResolvedValue(myVisit(1));
    const wrapper = await mountPage(StudentVisitsPage);

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '시간 변경')
      ?.trigger('click');
    const input = document.body.querySelector<HTMLInputElement>('[data-testid="visit-at"]');
    expect(input?.value).toBe('2026-11-16T19:00');

    await setDialogInput('[data-testid="visit-at"]', '2026-11-17T20:30');
    dialogButton('변경').click();
    await flushPromises();

    expect(changeVisitTime).toHaveBeenCalledWith(1, '2026-11-17T20:30:00+09:00');
  });

  it('학생 취소는 사유 없이도 된다', async () => {
    vi.mocked(fetchMyVisits).mockResolvedValue([myVisit(1)]);
    vi.mocked(cancelVisit).mockResolvedValue({ ...myVisit(1), status: 'CANCELED' });
    const wrapper = await mountPage(StudentVisitsPage);

    await wrapper
      .findAll('button')
      .find((b) => b.text() === '취소')
      ?.trigger('click');
    expect(dialogButton('신청 취소').disabled).toBe(false);
    dialogButton('신청 취소').click();
    await flushPromises();

    expect(cancelVisit).toHaveBeenCalledWith(1, undefined);
  });
});
