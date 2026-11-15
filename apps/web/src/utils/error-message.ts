import { toApiError } from '@/api/api-error';

/** 화면에 보여줄 에러 문구. 서버 메시지를 그대로 쓰되, 알 수 없는 에러도 한국어 문구로 바꾼다. */
export function errorMessageOf(error: unknown): string {
  return toApiError(error).message;
}
