// lib/ai/calls/extract-meal.ts
import { chatJson } from '../client';
import { buildMealExtractionPrompt } from '../prompts';
import { MealExtractionSchema, type MealExtraction } from '../schemas';
import { AI_CONFIG } from '../config';

export async function extractMeal(rawInput: string): Promise<MealExtraction> {
  return chatJson(
    {
      messages: buildMealExtractionPrompt(rawInput),
      temperature: AI_CONFIG.tempExtraction,
    },
    (raw) => {
      const parsed = JSON.parse(raw);
      return MealExtractionSchema.parse(parsed);
    },
  );
}
