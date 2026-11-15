import { useQuery } from '@tanstack/vue-query';
import { fetchHealth } from '@/api/health';
import { queryKeys } from './keys';

const HEALTH_CHECK_INTERVAL_MS = 30_000;

/** 하단 상태 표시용. 실패해도 재시도·전역 처리를 하지 않고 "연결 끊김"만 보여준다. */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: fetchHealth,
    refetchInterval: HEALTH_CHECK_INTERVAL_MS,
    retry: false,
  });
}
