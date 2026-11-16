import type { RoomResponse } from '@study-room/shared';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { deleteRoom, fetchRooms } from '@/api/rooms';
import { queryKeys } from './keys';
import { useDeleteRoom } from './useRooms';

vi.mock('@/api/rooms', () => ({ deleteRoom: vi.fn(), fetchRooms: vi.fn() }));

const room = (id: number): RoomResponse => ({
  id,
  title: `자습실 ${id}`,
  maxPersonnel: 3,
  activeCount: 0,
  startDate: '2026-11-15T00:00:00.000Z',
  endDate: '2026-11-20T00:00:00.000Z',
  createdAt: '2026-11-15T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
});

describe('useDeleteRoom', () => {
  beforeEach(() => {
    vi.mocked(deleteRoom).mockReset().mockResolvedValue();
    // 무효화 후 다시 가져오는 목록에도 삭제한 자습실이 없다 (서버와 같은 상태)
    vi.mocked(fetchRooms)
      .mockReset()
      .mockResolvedValue([room(2)]);
  });

  it('삭제하면 목록 캐시에서 즉시 빼고, 그 자습실의 상세·하위 캐시는 제거한다', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(queryKeys.rooms.list(), [room(1), room(2)]);
    queryClient.setQueryData(queryKeys.rooms.detail(1), room(1));
    queryClient.setQueryData(queryKeys.rooms.visits(1), []);
    queryClient.setQueryData(queryKeys.rooms.detail(2), room(2));

    let mutation: ReturnType<typeof useDeleteRoom> | undefined;
    mount(
      defineComponent({
        setup() {
          mutation = useDeleteRoom();
          return () => null;
        },
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient }]] } },
    );

    await mutation?.mutateAsync(1);
    await flushPromises();

    expect(
      queryClient.getQueryData<RoomResponse[]>(queryKeys.rooms.list())?.map((r) => r.id),
    ).toEqual([2]);
    expect(queryClient.getQueryData(queryKeys.rooms.detail(1))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.rooms.visits(1))).toBeUndefined();
    expect(queryClient.getQueryData(queryKeys.rooms.detail(2))).toEqual(room(2));
  });
});
