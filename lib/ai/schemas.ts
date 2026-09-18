// lib/ai/schemas.ts
import { z } from 'zod';

const intFromNumber = z.number().transform((n) => Math.round(n));
const nonNegativeInt = intFromNumber.refine((n) => n >= 0, 'Must be >= 0');

export const MealExtractionSchema = z.object({
  name: z.string().min(1),
  calories: nonNegativeInt,
  protein_g: nonNegativeInt,
  carbs_g: nonNegativeInt,
  fat_g: nonNegativeInt,
  confidence: z.enum(['low', 'medium', 'high']),
  notes: z.string().default(''),
});

export type MealExtraction = z.infer<typeof MealExtractionSchema>;

export const SuggestionSchema = z.object({
  name: z.string().min(1),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  prep_time_minutes: nonNegativeInt,
  difficulty: z.enum(['easy', 'medium', 'hard']),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      in_stock: z.boolean(),
    }),
  ),
  missing_ingredients: z.array(z.string()),
  instructions: z.string(),
  estimated_calories: nonNegativeInt,
  estimated_protein_g: nonNegativeInt,
  estimated_carbs_g: nonNegativeInt,
  estimated_fat_g: nonNegativeInt,
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionSchema).length(3),
});
export type Suggestions = z.infer<typeof SuggestionsSchema>;
