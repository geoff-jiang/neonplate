// tests/unit/ai-schemas.test.ts
import { describe, it, expect } from 'vitest';
import { MealExtractionSchema, SuggestionsSchema } from '../../lib/ai/schemas';

describe('MealExtractionSchema', () => {
  it('accepts a valid meal extraction', () => {
    const valid = {
      name: 'Grilled Chicken Salad',
      calories: 380,
      protein_g: 42,
      carbs_g: 8,
      fat_g: 20,
      confidence: 'medium',
      notes: 'Assumed 1 tbsp olive oil',
    };
    expect(MealExtractionSchema.parse(valid)).toEqual(valid);
  });

  it('coerces floats to integers', () => {
    const input = {
      name: 'X',
      calories: 380.7,
      protein_g: 42.2,
      carbs_g: 8,
      fat_g: 20,
      confidence: 'low',
      notes: '',
    };
    const result = MealExtractionSchema.parse(input);
    expect(result.calories).toBe(381);
    expect(result.protein_g).toBe(42);
  });

  it('rejects blank names, negative fractions, nonfinite values, and amounts the database cannot store', () => {
    const meal = {
      name: 'Lunch',
      calories: 400,
      protein_g: 30,
      carbs_g: 40,
      fat_g: 12,
      confidence: 'medium',
    };
    expect(MealExtractionSchema.safeParse({ ...meal, name: ' \t\n' }).success).toBe(false);
    for (const calories of [-0.1, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648]) {
      expect(MealExtractionSchema.safeParse({ ...meal, calories }).success).toBe(false);
    }
    expect(MealExtractionSchema.parse({ ...meal, name: ' Lunch ' }).name).toBe('Lunch');
  });

  it('rejects invalid confidence values', () => {
    const invalid = {
      name: 'X',
      calories: 100,
      protein_g: 5,
      carbs_g: 10,
      fat_g: 2,
      confidence: 'certain',
      notes: '',
    };
    expect(() => MealExtractionSchema.parse(invalid)).toThrow();
  });

  it('rejects negative calories', () => {
    const invalid = {
      name: 'X',
      calories: -10,
      protein_g: 5,
      carbs_g: 10,
      fat_g: 2,
      confidence: 'low',
      notes: '',
    };
    expect(() => MealExtractionSchema.parse(invalid)).toThrow();
  });
});

describe('SuggestionsSchema', () => {
  it('accepts exactly 3 suggestions', () => {
    const valid = {
      suggestions: [
        {
          name: 'Banana',
          meal_type: 'snack',
          prep_time_minutes: 0,
          difficulty: 'easy',
          ingredients: [{ name: 'banana', quantity: '1', in_stock: true }],
          missing_ingredients: [],
          instructions: '',
          estimated_calories: 105,
          estimated_protein_g: 1,
          estimated_carbs_g: 27,
          estimated_fat_g: 0,
        },
        {
          name: 'Chicken Wrap',
          meal_type: 'lunch',
          prep_time_minutes: 10,
          difficulty: 'easy',
          ingredients: [
            { name: 'chicken', quantity: '150g', in_stock: true },
            { name: 'tortilla', quantity: '1', in_stock: true },
          ],
          missing_ingredients: [],
          instructions: 'Wrap it.',
          estimated_calories: 420,
          estimated_protein_g: 38,
          estimated_carbs_g: 28,
          estimated_fat_g: 14,
        },
        {
          name: 'Protein Shake',
          meal_type: 'snack',
          prep_time_minutes: 2,
          difficulty: 'easy',
          ingredients: [{ name: 'protein powder', quantity: '1 scoop', in_stock: true }],
          missing_ingredients: [],
          instructions: 'Mix with water.',
          estimated_calories: 120,
          estimated_protein_g: 24,
          estimated_carbs_g: 3,
          estimated_fat_g: 1,
        },
      ],
    };
    expect(SuggestionsSchema.parse(valid).suggestions).toHaveLength(3);
  });

  it('rejects responses with fewer than 3 suggestions', () => {
    expect(() => SuggestionsSchema.parse({ suggestions: [] })).toThrow();
  });

  it('rejects invalid difficulty', () => {
    const invalid = {
      suggestions: [
        {
          name: 'X',
          meal_type: 'lunch',
          prep_time_minutes: 5,
          difficulty: 'impossible',
          ingredients: [],
          missing_ingredients: [],
          instructions: '',
          estimated_calories: 100,
          estimated_protein_g: 5,
          estimated_carbs_g: 10,
          estimated_fat_g: 2,
        },
      ],
    };
    expect(() => SuggestionsSchema.parse(invalid)).toThrow();
  });
});
