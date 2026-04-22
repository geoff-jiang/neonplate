// tests/unit/day-boundary.test.ts
import { describe, it, expect } from 'vitest';
import {
  startOfLocalDay,
  endOfLocalDay,
  belongsToDay,
} from '../../lib/utils/day-boundary';

describe('startOfLocalDay', () => {
  it('returns midnight of the same date', () => {
    const input = new Date(2026, 3, 20, 14, 30, 0); // Apr 20 2026, 2:30 PM local
    const result = startOfLocalDay(input);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getDate()).toBe(20);
  });
});

describe('endOfLocalDay', () => {
  it('returns 23:59:59.999 of the same date', () => {
    const input = new Date(2026, 3, 20, 14, 30, 0);
    const result = endOfLocalDay(input);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
  });
});

describe('belongsToDay', () => {
  it('returns true for a timestamp on the same local day', () => {
    const day = new Date(2026, 3, 20, 12, 0, 0);
    const ts = new Date(2026, 3, 20, 23, 58, 0);
    expect(belongsToDay(ts, day)).toBe(true);
  });

  it('returns false for a timestamp on the next local day', () => {
    const day = new Date(2026, 3, 20, 12, 0, 0);
    const ts = new Date(2026, 3, 21, 0, 1, 0);
    expect(belongsToDay(ts, day)).toBe(false);
  });

  it('returns false for a timestamp on the previous local day', () => {
    const day = new Date(2026, 3, 20, 12, 0, 0);
    const ts = new Date(2026, 3, 19, 23, 59, 59);
    expect(belongsToDay(ts, day)).toBe(false);
  });
});