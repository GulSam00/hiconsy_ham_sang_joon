import { describe, expect, it } from 'vitest';
import { FixedClock } from './fixed-clock';

describe('FixedClock', () => {
  it('설정한 시각을 반환하고, 반환값을 바꿔도 내부 시각은 변하지 않는다', () => {
    const clock = new FixedClock('2026-11-15T00:00:00.000Z');

    const first = clock.now();
    first.setUTCFullYear(2000);

    expect(clock.now().toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  it('advance와 set으로 시각을 옮긴다', () => {
    const clock = new FixedClock('2026-11-15T00:00:00.000Z');

    clock.advance(1_000);
    expect(clock.now().toISOString()).toBe('2026-11-15T00:00:01.000Z');

    clock.set('2026-12-01T09:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-12-01T09:00:00.000Z');
  });

  it('잘못된 시각이면 즉시 실패한다', () => {
    expect(() => new FixedClock('not-a-date')).toThrow(/올바르지 않은 시각/);
  });
});
