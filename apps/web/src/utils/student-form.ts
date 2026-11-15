import { STUDENT_NAME_MAX_LENGTH } from '@study-room/shared';
import type { StudentInput } from '@/api/students';

/** 서버(`apps/api/src/modules/students/phone.ts`)와 같은 규칙: 010·011·016~019, 하이픈 선택 */
const MOBILE_PHONE_PATTERN = /^01[016-9]-?\d{3,4}-?\d{4}$/;

export type StudentFormErrors = Partial<Record<keyof StudentInput, string>>;

export type StudentFormResult =
  { ok: true; input: StudentInput } | { ok: false; errors: StudentFormErrors };

/** 제출 전 검사. 전화번호 정규화(하이픈 형식)는 서버가 한다. */
export function validateStudentForm(values: StudentInput): StudentFormResult {
  const errors: StudentFormErrors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  if (name === '') {
    errors.name = '이름을 입력해 주세요.';
  } else if (name.length > STUDENT_NAME_MAX_LENGTH) {
    errors.name = `이름은 ${STUDENT_NAME_MAX_LENGTH}자 이하여야 합니다.`;
  }
  if (!MOBILE_PHONE_PATTERN.test(phone)) {
    errors.phone = '휴대전화 번호(예: 010-1234-5678)를 입력해 주세요.';
  }
  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, input: { name, phone } };
}
