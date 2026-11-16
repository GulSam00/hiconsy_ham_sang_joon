import { onScopeDispose, ref, type Ref } from 'vue';

const ONE_MINUTE_MS = 60_000;

/**
 * 화면 표시용 현재 시각(ms). 분 단위로 갱신된다.
 * 컴포넌트가 Date를 직접 다루지 않도록 이곳에만 둔다. 규칙 판단(신청 가능 여부 등)은 서버 시각 기준이다.
 */
export function useNow(intervalMs = ONE_MINUTE_MS): Ref<number> {
  const now = ref(Date.now());
  const timer = setInterval(() => {
    now.value = Date.now();
  }, intervalMs);
  onScopeDispose(() => clearInterval(timer));
  return now;
}
