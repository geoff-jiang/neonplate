import { describe, expect, it } from 'vitest';
import {
  MAX_DATABASE_INTEGER,
  mealToDraft,
  parseMealDraft,
  parseTargetDraft,
  targetsToDraft,
} from '../../lib/utils/meal-validation';

const meal = { name: 'Lunch', calories: 400, protein_g: 30, carbs_g: 40, fat_g: 12 };
const targets = { daily_calories: 2000, daily_protein_g: 150, daily_carbs_g: 200, daily_fat_g: 65 };

describe('meal validation', () => {
  it('normalizes meal names and accepts explicit zero nutrients', () => {
    expect(
      parseMealDraft({
        ...mealToDraft(meal),
        name: '  Green\n tea  ',
        calories: '0',
        protein_g: '0',
        carbs_g: '0',
        fat_g: '0',
      }),
    ).toEqual({ name: 'Green tea', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
  it('rejects unnamed meals', () => {
    expect(() => parseMealDraft({ ...mealToDraft(meal), name: '  \n' })).toThrow('meal name');
  });
  it.each([
    '',
    ' ',
    '-1',
    '12.5',
    '12g',
    'Infinity',
    'NaN',
    '1e3',
    '0xff',
    String(MAX_DATABASE_INTEGER + 1),
  ])('rejects invalid macro value %j instead of truncating/coercing it', (value) => {
    expect(() => parseMealDraft({ ...mealToDraft(meal), calories: value })).toThrow();
  });
  it('accepts the storage limit and leaves blank manual fields distinct from explicit zeros', () => {
    expect(
      parseMealDraft({ ...mealToDraft(meal), calories: String(MAX_DATABASE_INTEGER) }).calories,
    ).toBe(MAX_DATABASE_INTEGER);
    expect(mealToDraft({ ...meal, fat_g: 0 }, true).fat_g).toBe('');
    expect(mealToDraft({ ...meal, fat_g: 0 }).fat_g).toBe('0');
  });
});
describe('daily target validation', () => {
  it('requires positive calories but permits zero macros', () => {
    expect(() => parseTargetDraft({ ...targetsToDraft(targets), daily_calories: '0' })).toThrow(
      'Daily calories',
    );
    expect(
      parseTargetDraft({
        ...targetsToDraft(targets),
        daily_protein_g: '0',
        daily_carbs_g: '0',
        daily_fat_g: '0',
      }),
    ).toEqual({ ...targets, daily_protein_g: 0, daily_carbs_g: 0, daily_fat_g: 0 });
  });
  it.each(['', '-1', 'Infinity', '1.5', String(MAX_DATABASE_INTEGER + 1)])(
    'rejects invalid target %j',
    (value) => {
      expect(() =>
        parseTargetDraft({ ...targetsToDraft(targets), daily_protein_g: value }),
      ).toThrow();
    },
  );
});
