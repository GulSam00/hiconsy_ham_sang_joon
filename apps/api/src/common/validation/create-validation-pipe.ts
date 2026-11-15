import { ValidationPipe } from '@nestjs/common';
import { ERROR_CODE } from '@study-room/shared';
import { DomainException } from '../errors/domain.exception';
import { flattenValidationErrors } from './flatten-validation-errors';

/**
 * 전역 DTO 검증.
 * - whitelist + forbidNonWhitelisted: DTO에 없는 필드가 오면 거부한다. 클라이언트가 `activeCount` 같은
 *   서버 관리 필드를 몰래 보내는 것을 막는다.
 * - transform: 요청 body를 DTO 클래스 인스턴스로 바꾼다. 문자열을 숫자로 바꾸는 암묵 변환은 켜지 않는다
 *   (`"abc"`가 NaN이 되어 검증을 통과하는 등 예측하기 어려운 동작을 피하기 위함).
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new DomainException(ERROR_CODE.VALIDATION_FAILED, flattenValidationErrors(errors)),
  });
}
