import type { RoomResponse } from '@study-room/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import {
  createRoom,
  deleteRoom,
  fetchRoom,
  fetchRooms,
  updateRoom,
  type RoomInput,
} from '@/api/rooms';
import { queryKeys } from './keys';

export function useRooms() {
  return useQuery({ queryKey: queryKeys.rooms.list(), queryFn: fetchRooms });
}

export function useRoom(id: MaybeRefOrGetter<number>) {
  return useQuery({
    queryKey: computed(() => queryKeys.rooms.detail(toValue(id))),
    queryFn: () => fetchRoom(toValue(id)),
  });
}

/**
 * 자습실 쓰기는 목록의 신청 수·상세·신청자·이력에 모두 영향을 줄 수 있다(삭제 시 시스템 취소 등).
 * 범위를 좁게 추측하다 화면이 어긋나는 것보다 rooms 전체를 무효화하는 편이 안전하다.
 */
function useInvalidateRooms() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
}

export function useCreateRoom() {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: (input: RoomInput) => createRoom(input),
    onSuccess: invalidate,
  });
}

export function useUpdateRoom(id: MaybeRefOrGetter<number>) {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: (input: Partial<RoomInput>) => updateRoom(toValue(id), input),
    onSuccess: invalidate,
  });
}

/**
 * 삭제 성공 시 캐시 처리:
 * - 삭제한 자습실의 상세·신청자·이력 캐시는 무효화가 아니라 제거한다. 무효화하면 화면을 떠나는 중에
 *   다시 가져오려다 404를 받는다.
 * - 목록 캐시에서는 즉시 뺀다. 상세 화면에 있는 동안 목록 query는 비활성이라, 무효화만 하면
 *   목록으로 돌아왔을 때 삭제한 자습실이 잠깐 보였다가 사라진다 (브라우저 확인에서 발견).
 * - 그 뒤 나머지를 무효화해 서버 값과 맞춘다.
 */
export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRoom(id),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.rooms.detail(id) });
      queryClient.setQueryData<RoomResponse[]>(queryKeys.rooms.list(), (rooms) =>
        rooms?.filter((room) => room.id !== id),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
  });
}
