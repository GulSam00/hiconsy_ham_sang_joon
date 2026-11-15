import type { ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { flattenValidationErrors } from './flatten-validation-errors';

describe('flattenValidationErrors', () => {
  it('중첩 오류를 점 경로로 평평하게 만든다', () => {
    const errors: ValidationError[] = [
      { property: 'maxPersonnel', constraints: { min: '1 이상', isInt: '정수' }, children: [] },
      {
        property: 'period',
        children: [{ property: 'startDate', constraints: { isDate: '날짜' }, children: [] }],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'maxPersonnel', messages: ['1 이상', '정수'] },
      { field: 'period.startDate', messages: ['날짜'] },
    ]);
  });
});
