/**
 * 화면의 시간 표시·입력은 모두 KST로 한다 (R10). API는 UTC ISO 8601을 주고받는다.
 *
 * 날짜 라이브러리를 쓰지 않는 이유: 표시는 내장 Intl이 시간대를 지원하고,
 * KST는 일광절약시간이 없어 입력 변환도 고정 오프셋(+09:00)으로 충분하다.
 */
const KST_TIME_ZONE = 'Asia/Seoul';
const KST_OFFSET = '+09:00';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const kstFormatter = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parseIso(iso: string): Date {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`올바르지 않은 일시입니다: ${iso}`);
  }
  return date;
}

/** "2026. 11. 16. (월) 19:00" 형태의 KST 표시 */
export function formatKst(iso: string): string {
  return kstFormatter.format(parseIso(iso));
}

/** `<input type="datetime-local">` 값(KST, 분 단위) 형식 */
const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** UTC ISO → `datetime-local` 입력값(KST). 예: 2026-11-16T10:00:00Z → 2026-11-16T19:00 */
export function toKstInputValue(iso: string): string {
  const kst = new Date(parseIso(iso).getTime() + KST_OFFSET_MS);
  return kst.toISOString().slice(0, 16);
}

/**
 * `datetime-local` 입력값(KST) → 시간대가 명시된 ISO 문자열. 서버는 시간대 없는 일시를 거부한다.
 * 형식이 틀리면 null을 돌려준다 (사용자가 입력을 비웠거나 브라우저가 미지원인 경우).
 */
export function fromKstInputValue(value: string): string | null {
  if (!DATETIME_LOCAL.test(value)) {
    return null;
  }
  const iso = `${value}:00${KST_OFFSET}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}
