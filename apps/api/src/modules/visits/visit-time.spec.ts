import { describe, expect, it } from 'vitest';
import { isPastVisit } from './visit-time';

const NOW = new Date('2026-11-15T03:00:00.000Z');

describe('isPastVisit (R5)', () => {
  it.each<[string, string, boolean]>([
    ['1ms 전', '2026-11-15T02:59:59.999Z', true],
    ['정확히 지금', '2026-11-15T03:00:00.000Z', false],
    ['1ms 후', '2026-11-15T03:00:00.001Z', false],
  ])('%s → %s', (_name, visitAt, expected) => {
    expect(isPastVisit(new Date(visitAt), NOW)).toBe(expected);
  });
});
