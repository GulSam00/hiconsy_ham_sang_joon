import {
  API_PREFIX,
  DATABASE_STATUS,
  HEALTH_STATUS,
  type HealthResponse,
} from '@study-room/shared';

/**
 * 프로젝트 셋업 확인용 API 호출.
 * ISSUE-009에서 axios 클라이언트와 TanStack Query로 교체한다.
 */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`/${API_PREFIX}/health`, { signal });
  if (!response.ok) {
    throw new Error(`API 응답 오류: ${response.status} ${response.statusText}`);
  }
  const body: unknown = await response.json();
  if (!isHealthResponse(body)) {
    throw new Error('API 응답 형식이 올바르지 않습니다.');
  }
  return body;
}

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate.status === HEALTH_STATUS.OK &&
    candidate.database === DATABASE_STATUS.UP &&
    typeof candidate.timestamp === 'string'
  );
}
