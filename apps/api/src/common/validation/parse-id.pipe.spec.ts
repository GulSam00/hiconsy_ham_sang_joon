import { ERROR_CODE } from '@study-room/shared';
import { describe, expect, it } from 'vitest';
import { DomainException } from '../errors/domain.exception';
import { ParseIdPipe } from './parse-id.pipe';

const pipe = new ParseIdPipe();
const metadata = { type: 'param', data: 'id' } as const;

describe('ParseIdPipe', () => {
  it('양의 정수 문자열을 숫자로 바꾼다', () => {
    expect(pipe.transform('15', metadata)).toBe(15);
  });

  it.each(['0', '-1', '1.5', 'abc', '', '01', '9007199254740993'])(
    '"%s"는 VALIDATION_FAILED',
    (value) => {
      expect(() => pipe.transform(value, metadata)).toThrow(DomainException);
      try {
        pipe.transform(value, metadata);
      } catch (error: unknown) {
        expect((error as DomainException).code).toBe(ERROR_CODE.VALIDATION_FAILED);
        expect((error as DomainException).details).toEqual([
          { field: 'id', messages: ['양의 정수여야 합니다.'] },
        ]);
      }
    },
  );
});
