import { ERROR_CODE, type Actor } from '@study-room/shared';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, NETWORK_ERROR, isRetryable, toApiError } from './api-error';
import { createApiClient } from './client';

/** 네트워크 없이 요청 설정을 받아 보는 어댑터 */
function captureHeaders(actor: Actor | null) {
  let captured: InternalAxiosRequestConfig | undefined;
  const client = createApiClient(() => actor);
  client.defaults.adapter = (config) => {
    captured = config;
    return Promise.resolve({ data: null, status: 200, statusText: 'OK', headers: {}, config });
  };
  return {
    send: async () => {
      await client.get('/anything');
      return captured?.headers;
    },
  };
}

function axiosErrorWith(status: number | undefined, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    'request failed',
    'ERR',
    config,
    {},
    status === undefined ? undefined : { status, statusText: '', headers: {}, config, data },
  );
}

describe('createApiClient', () => {
  it('강사면 역할 헤더만 붙인다', async () => {
    const headers = await captureHeaders({ role: 'TEACHER' }).send();
    expect(headers?.get('x-actor-role')).toBe('TEACHER');
    expect(headers?.has('x-student-id')).toBe(false);
  });

  it('학생이면 학생 id 헤더도 붙인다', async () => {
    const headers = await captureHeaders({ role: 'STUDENT', studentId: 7 }).send();
    expect(headers?.get('x-actor-role')).toBe('STUDENT');
    expect(headers?.get('x-student-id')).toBe('7');
  });

  it('역할이 없으면 헤더를 붙이지 않는다', async () => {
    const headers = await captureHeaders(null).send();
    expect(headers?.has('x-actor-role')).toBe(false);
  });

  it('응답 에러는 ApiError로 바뀌어 나온다', async () => {
    const client = createApiClient(() => null);
    client.defaults.adapter = () =>
      Promise.reject(
        axiosErrorWith(409, {
          statusCode: 409,
          code: 'ROOM_FULL',
          message: '자습실 정원이 가득 찼습니다.',
          timestamp: '2026-11-15T03:00:00.000Z',
        }),
      );

    await expect(client.get('/x')).rejects.toMatchObject({
      code: ERROR_CODE.ROOM_FULL,
      status: 409,
    });
  });
});

describe('toApiError', () => {
  it('서버의 ErrorResponse를 그대로 옮긴다 (details 포함)', () => {
    const error = toApiError(
      axiosErrorWith(409, {
        statusCode: 409,
        code: 'CAPACITY_BELOW_ACTIVE',
        message: 'm',
        timestamp: 't',
        details: { activeCount: 3 },
      }),
    );
    expect(error).toMatchObject({
      code: 'CAPACITY_BELOW_ACTIVE',
      status: 409,
      details: { activeCount: 3 },
    });
  });

  it('응답이 없으면 NETWORK_ERROR', () => {
    expect(toApiError(axiosErrorWith(undefined))).toMatchObject({
      code: NETWORK_ERROR,
      status: null,
    });
  });

  it('우리 형식이 아닌 응답(프록시 오류 등)은 상태를 살리고 INTERNAL_ERROR', () => {
    expect(toApiError(axiosErrorWith(502, '<html>Bad Gateway</html>'))).toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 502,
    });
  });

  it('알 수 없는 코드가 오면 우리 형식으로 보지 않는다', () => {
    expect(
      toApiError(axiosErrorWith(400, { statusCode: 400, code: 'UNKNOWN', message: 'm' })).code,
    ).toBe('INTERNAL_ERROR');
  });

  it('이미 ApiError면 그대로', () => {
    const original = new ApiError('ROOM_FULL', 'm', 409);
    expect(toApiError(original)).toBe(original);
  });
});

describe('isRetryable', () => {
  it.each<[string, ApiError, boolean]>([
    ['4xx', new ApiError('ROOM_FULL', 'm', 409), false],
    ['5xx', new ApiError('INTERNAL_ERROR', 'm', 500), true],
    ['네트워크', new ApiError(NETWORK_ERROR, 'm', null), true],
  ])('%s → %s', (_name, error, expected) => {
    expect(isRetryable(error)).toBe(expected);
  });
});
