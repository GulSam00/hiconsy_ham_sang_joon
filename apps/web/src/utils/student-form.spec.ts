import { describe, expect, it } from 'vitest';
import { validateStudentForm } from './student-form';

describe('validateStudentForm', () => {
  it('앞뒤 공백을 지우고 통과시킨다', () => {
    expect(validateStudentForm({ name: ' 김민준 ', phone: ' 01012345678 ' })).toEqual({
      ok: true,
      input: { name: '김민준', phone: '01012345678' },
    });
  });

  it.each<[string, string, string, string]>([
    ['빈 이름', '  ', '010-1234-5678', 'name'],
    ['유선 번호', '김민준', '02-123-4567', 'phone'],
    ['자릿수 부족', '김민준', '010-12-5678', 'phone'],
  ])('%s → %s 오류', (_name, name, phone, field) => {
    const result = validateStudentForm({ name, phone });
    expect(result.ok ? {} : result.errors).toHaveProperty(field);
  });
});
