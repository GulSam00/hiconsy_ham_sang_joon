import { QueryCache, QueryClient, MutationCache } from '@tanstack/vue-query';
import { isRetryable, toApiError, type ApiError } from '@/api/api-error';

const MAX_RETRIES = 2;
/**
 * 0 = 화면을 열 때마다 서버에서 다시 가져온다 (TanStack 기본값).
 * 처음에는 30초로 두었는데, 브라우저 확인에서 강사가 취소한 신청이 학생의 "내 신청"에 바로 반영되지 않는 것을
 * 발견했다. 여러 사람이 같은 데이터를 바꾸는 서비스라 요청 수보다 최신성이 중요하다 (ISSUE-011 결정 기록).
 */
const STALE_TIME_MS = 0;

/**
 * - 재시도: 4xx는 다시 보내도 결과가 같으므로 하지 않는다. 네트워크·5xx만 최대 2번.
 * - onApiError: 모든 query·mutation 에러를 한 곳에서 본다. 요청자 정보가 무효해진 경우(401, 삭제된 학생)
 *   역할 선택으로 돌려보내는 처리를 main.ts에서 주입한다 (query-client가 router를 직접 알지 않게).
 */
export function createQueryClient(onApiError: (error: ApiError) => void): QueryClient {
  const report = (error: unknown) => onApiError(toApiError(error));
  return new QueryClient({
    queryCache: new QueryCache({ onError: report }),
    mutationCache: new MutationCache({ onError: report }),
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryable(error),
        refetchOnWindowFocus: true,
      },
      mutations: {
        // 신청 같은 쓰기는 자동 재시도하면 중복 요청이 될 수 있다. 서버가 막아 주지만 굳이 보내지 않는다.
        retry: false,
      },
    },
  });
}
