// lib/ai/prompts.ts
import type { ChatMessage } from './client';

const MEAL_EXTRACTION_SYSTEM = `You extract meal information from a user's description.

Estimate macros based on typical portions and preparations.

If the description is ambiguous about quantities, use reasonable defaults and set "confidence": "low". Otherwise use "medium" or "high".

Round all macro values to integers. Never return negative numbers.

Respond with valid JSON matching exactly this schema:
{
  "name": string,
  "calories": integer,
  "protein_g": integer,
  "carbs_g": integer,
  "fat_g": integer,
  "confidence": "low" | "medium" | "high",
  "notes": string
}

In "notes", briefly describe any assumptions you made (e.g., portion size, preparation method). Keep notes under 100 characters.`;

export function buildMealExtractionPrompt(rawInput: string): ChatMessage[] {
  return [
    { role: 'system', content: MEAL_EXTRACTION_SYSTEM },
    { role: 'user', content: rawInput },
  ];
}
