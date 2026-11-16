import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { cancelVisit, fetchRoomHistories, fetchRoomVisits } from '@/api/visits';
import { queryKeys } from './keys';

export function useRoomVisits(roomId: MaybeRefOrGetter<number>) {
  return useQuery({
    queryKey: computed(() => queryKeys.rooms.visits(toValue(roomId))),
    queryFn: () => fetchRoomVisits(toValue(roomId)),
  });
}

export function useRoomHistories(roomId: MaybeRefOrGetter<number>) {
  return useQuery({
    queryKey: computed(() => queryKeys.rooms.histories(toValue(roomId))),
    queryFn: () => fetchRoomHistories(toValue(roomId)),
  });
}

/** 취소는 신청자 목록·이력·자습실 신청 수(목록·상세)를 바꾸므로 rooms 전체를 무효화한다. */
export function useCancelVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, reason }: { visitId: number; reason?: string }) =>
      cancelVisit(visitId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
  });
}
