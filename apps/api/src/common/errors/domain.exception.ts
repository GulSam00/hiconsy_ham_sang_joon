import { HttpStatus } from '@nestjs/common';
import { ERROR_MESSAGE, type ErrorCode } from '@study-room/shared';
import { ERROR_STATUS } from './error-status';

/**
 * 서비스·Guard·Pipe가 던지는 유일한 예외 타입.
 * HttpException을 상속하지 않는다. HTTP 상태는 코드에서 결정되므로, 호출하는 쪽이 상태를 고를 수 없게 한다.
 */
export class DomainException<TDetails = unknown> extends Error {
  readonly status: HttpStatus;

  constructor(
    readonly code: ErrorCode,
    readonly details?: TDetails,
    message: string = ERROR_MESSAGE[code],
  ) {
    super(message);
    this.name = 'DomainException';
    this.status = ERROR_STATUS[code];
  }
}
