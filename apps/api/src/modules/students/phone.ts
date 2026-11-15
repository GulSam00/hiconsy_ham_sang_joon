/** 하이픈 유무와 관계없이 받는 휴대전화 번호 (010, 011, 016~019) */
export const MOBILE_PHONE_PATTERN = /^01[016-9]-?\d{3,4}-?\d{4}$/;

/**
 * 저장 형식으로 정규화한다: `01012345678` → `010-1234-5678`, `0101234567` → `010-123-4567`.
 * 같은 번호가 표기만 달라 서로 다른 값으로 저장되는 것을 막기 위함이다.
 * 형식이 맞지 않으면 null (DTO 검증을 통과한 값만 들어오므로 정상 흐름에서는 생기지 않는다).
 */
export function normalizeMobilePhone(raw: string): string | null {
  if (!MOBILE_PHONE_PATTERN.test(raw)) {
    return null;
  }
  const digits = raw.replaceAll('-', '');
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  const middle = digits.slice(3, -4);
  return `${head}-${middle}-${tail}`;
}
