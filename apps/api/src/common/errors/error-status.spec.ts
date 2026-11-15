import { HttpStatus } from '@nestjs/common';
import { ERROR_CODE, ERROR_MESSAGE, isErrorCode } from '@study-room/shared';
import { describe, expect, it } from 'vitest';
import { DomainException } from './domain.exception';
import { ERROR_STATUS } from './error-status';

describe('ErrorCode 매핑', () => {
  const codes = Object.values(ERROR_CODE);

  it.each(codes)('%s는 HTTP 상태와 메시지를 가진다', (code) => {
    expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    expect(ERROR_MESSAGE[code].length).toBeGreaterThan(0);
  });

  it('DomainException은 코드에 맞는 상태와 기본 메시지를 가진다', () => {
    const error = new DomainException(ERROR_CODE.ROOM_FULL, { roomId: 1 });

    expect(error.status).toBe(HttpStatus.CONFLICT);
    expect(error.message).toBe(ERROR_MESSAGE.ROOM_FULL);
    expect(error.details).toEqual({ roomId: 1 });
  });

  it('isErrorCode는 정의된 코드만 인정한다', () => {
    expect(isErrorCode('ROOM_FULL')).toBe(true);
    expect(isErrorCode('toString')).toBe(false);
    expect(isErrorCode(404)).toBe(false);
  });
});
