import { Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import { ERROR_CODE, type FieldError } from '@study-room/shared';
import { DomainException } from '../errors/domain.exception';

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/**
 * 경로 파라미터 id를 양의 정수로 바꾼다.
 * Nest 기본 ParseIntPipe는 HttpException을 던지고 `-1`, `0`도 통과시키므로 별도로 둔다.
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const id = Number(value);
    if (!POSITIVE_INTEGER.test(value) || !Number.isSafeInteger(id)) {
      const details: FieldError[] = [
        { field: metadata.data ?? 'id', messages: ['양의 정수여야 합니다.'] },
      ];
      throw new DomainException(ERROR_CODE.VALIDATION_FAILED, details);
    }
    return id;
  }
}
