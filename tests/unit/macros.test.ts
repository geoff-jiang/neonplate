// tests/unit/macros.test.ts
import { describe, it, expect } from 'vitest';
import { sumMacros, remainingMacros, percentConsumed } from '../../lib/utils/macros';

const target = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 };

describe('sumMacros', () => {
  it('sums an empty array to zeros', () => {
    expect(sumMacros([])).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it('sums multiple log rows', () => {
    const logs = [
      { calories: 300, protein_g: 30, carbs_g: 10, fat_g: 12 },
      { calories: 500, protein_g: 40, carbs_g: 50, fat_g: 20 },
    ];
    expect(sumMacros(logs)).toEqual({
      calories: 800,
      protein_g: 70,
      carbs_g: 60,
      fat_g: 32,
    });
  });
});

describe('remainingMacros', () => {
  it('subtracts consumed from target', () => {
    const consumed = { calories: 500, protein_g: 40, carbs_g: 60, fat_g: 15 };
    expect(remainingMacros(target, consumed)).toEqual({
      calories: 1500,
      protein_g: 110,
      carbs_g: 140,
      fat_g: 50,
    });
  });

  it('can go negative (over target)', () => {
    const consumed = { calories: 2500, protein_g: 200, carbs_g: 250, fat_g: 80 };
    expect(remainingMacros(target, consumed)).toEqual({
      calories: -500,
      protein_g: -50,
      carbs_g: -50,
      fat_g: -15,
    });
  });
});

describe('percentConsumed', () => {
  it('returns 0 when nothing consumed', () => {
    expect(percentConsumed(0, 2000)).toBe(0);
  });

  it('returns 50 at half consumption', () => {
    expect(percentConsumed(1000, 2000)).toBe(50);
  });

  it('can exceed 100', () => {
    expect(percentConsumed(2500, 2000)).toBe(125);
  });

  it('handles zero target without NaN', () => {
    expect(percentConsumed(500, 0)).toBe(0);
  });
});
