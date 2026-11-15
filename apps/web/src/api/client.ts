import { ACTOR_HEADER, ACTOR_ROLE, API_PREFIX, type Actor } from '@study-room/shared';
import axios, { type AxiosInstance } from 'axios';
import { toApiError } from './api-error';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * API 클라이언트를 만든다. 요청자 정보는 호출 시점에 `getActor`로 읽는다.
 * 저장소(Pinia)를 직접 import하지 않는 이유: 클라이언트가 상태 관리 방식에 묶이지 않고,
 * 테스트에서 요청자를 쉽게 바꿔 넣을 수 있다.
 *
 * 요청자 헤더는 여기서만 붙인다. 각 화면·API 함수는 헤더를 신경 쓰지 않는다 (docs/visit-policy.md 6절).
 */
export function createApiClient(getActor: () => Actor | null): AxiosInstance {
  const client = axios.create({ baseURL: `/${API_PREFIX}`, timeout: REQUEST_TIMEOUT_MS });

  client.interceptors.request.use((config) => {
    const actor = getActor();
    if (actor !== null) {
      config.headers.set(ACTOR_HEADER.ROLE, actor.role);
      if (actor.role === ACTOR_ROLE.STUDENT) {
        config.headers.set(ACTOR_HEADER.STUDENT_ID, String(actor.studentId));
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(toApiError(error)),
  );

  return client;
}

let apiClient: AxiosInstance | null = null;

/** 앱 시작 시 한 번 호출한다 (main.ts) */
export function installApiClient(client: AxiosInstance): void {
  apiClient = client;
}

export function http(): AxiosInstance {
  if (apiClient === null) {
    throw new Error(
      'API 클라이언트가 설치되지 않았습니다. main.ts에서 installApiClient()를 호출하세요.',
    );
  }
  return apiClient;
}
