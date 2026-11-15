import { describe, expect, it } from 'vitest';
import { formatKst, fromKstInputValue, toKstInputValue } from './datetime';

describe('formatKst', () => {
  it('UTC를 KST로 바꿔 요일과 함께 표시한다', () => {
    expect(formatKst('2026-11-16T10:00:00.000Z')).toBe('2026. 11. 16. (월) 19:00');
  });

  it('UTC 15시는 KST로 다음 날 0시다 (날짜 경계)', () => {
    expect(formatKst('2026-11-16T15:00:00.000Z')).toBe('2026. 11. 17. (화) 00:00');
  });

  it('잘못된 일시는 조용히 넘기지 않고 실패한다', () => {
    expect(() => formatKst('not-a-date')).toThrow(/올바르지 않은 일시/);
  });
});

describe('toKstInputValue / fromKstInputValue', () => {
  it('UTC → KST 입력값', () => {
    expect(toKstInputValue('2026-11-16T10:00:00.000Z')).toBe('2026-11-16T19:00');
    expect(toKstInputValue('2026-11-16T15:30:00.000Z')).toBe('2026-11-17T00:30');
  });

  it('KST 입력값 → +09:00이 붙은 ISO, 같은 순간을 가리킨다', () => {
    const iso = fromKstInputValue('2026-11-16T19:00');
    expect(iso).toBe('2026-11-16T19:00:00+09:00');
    expect(new Date(iso ?? '').toISOString()).toBe('2026-11-16T10:00:00.000Z');
  });

  it('왕복 변환하면 원래 순간으로 돌아온다', () => {
    const original = '2026-12-31T16:45:00.000Z';
    const roundTrip = fromKstInputValue(toKstInputValue(original));
    expect(new Date(roundTrip ?? '').toISOString()).toBe(original);
  });

  it.each(['', '2026-11-16', '2026-11-16T19:00:00', '2026-13-01T00:00', 'abc'])(
    '"%s"는 null',
    (value) => {
      expect(fromKstInputValue(value)).toBeNull();
    },
  );
});
