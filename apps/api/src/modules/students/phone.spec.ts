import { describe, expect, it } from 'vitest';
import { normalizeMobilePhone } from './phone';

describe('normalizeMobilePhone', () => {
  it.each<[string, string]>([
    ['01012345678', '010-1234-5678'],
    ['010-1234-5678', '010-1234-5678'],
    ['0101234567', '010-123-4567'],
    ['011-123-4567', '011-123-4567'],
    ['019-1234-5678', '019-1234-5678'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeMobilePhone(raw)).toBe(expected);
  });

  it.each(['02-123-4567', '012-1234-5678', '010-12-5678', '010-1234-56789', '010 1234 5678', ''])(
    '%s → null',
    (raw) => {
      expect(normalizeMobilePhone(raw)).toBeNull();
    },
  );
});
