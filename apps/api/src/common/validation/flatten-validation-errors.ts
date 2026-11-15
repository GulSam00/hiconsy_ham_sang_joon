import type { FieldError } from '@study-room/shared';
import type { ValidationError } from 'class-validator';

/**
 * class-validator의 중첩 오류 트리를 `field.path` 형태의 평평한 목록으로 바꾼다.
 * FE가 폼 필드에 오류를 바로 붙일 수 있게 하기 위함이다.
 */
export function flattenValidationErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath === '' ? error.property : `${parentPath}.${error.property}`;
    const own: FieldError[] =
      error.constraints === undefined
        ? []
        : [{ field, messages: Object.values(error.constraints) }];
    const nested = flattenValidationErrors(error.children ?? [], field);
    return [...own, ...nested];
  });
}
