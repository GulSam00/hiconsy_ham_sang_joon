import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import {
  applyVisit,
  cancelVisit,
  changeVisitTime,
  fetchMyVisits,
  fetchRoomHistories,
  fetchRoomVisits,
} from '@/api/visits';
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

/**
 * 신청을 바꾸는 쓰기는 자습실 신청 수(목록·상세), 신청자, 이력, 내 신청을 모두 바꾼다.
 * 강사·학생이 같은 훅을 쓰므로 두 범위를 함께 무효화한다 (현재 화면에 없는 query는 다음에 볼 때 갱신된다).
 */
function useInvalidateVisits() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.me.all }),
    ]);
}

export function useMyVisits() {
  return useQuery({ queryKey: queryKeys.me.visits(), queryFn: fetchMyVisits });
}

export function useApplyVisit() {
  const invalidate = useInvalidateVisits();
  return useMutation({
    mutationFn: ({ roomId, visitAt }: { roomId: number; visitAt: string }) =>
      applyVisit(roomId, visitAt),
    onSuccess: invalidate,
  });
}

export function useChangeVisitTime() {
  const invalidate = useInvalidateVisits();
  return useMutation({
    mutationFn: ({ visitId, visitAt }: { visitId: number; visitAt: string }) =>
      changeVisitTime(visitId, visitAt),
    onSuccess: invalidate,
  });
}

export function useCancelVisit() {
  const invalidate = useInvalidateVisits();
  return useMutation({
    mutationFn: ({ visitId, reason }: { visitId: number; reason?: string }) =>
      cancelVisit(visitId, reason),
    onSuccess: invalidate,
  });
}
