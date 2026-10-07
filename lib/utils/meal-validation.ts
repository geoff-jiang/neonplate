// Supabase stores these values in PostgreSQL integer columns.
export const MAX_DATABASE_INTEGER = 2_147_483_647;

export type VerificationResult = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};
export type MealDraft = { [Field in keyof VerificationResult]: string };
export type TargetValues = {
  daily_calories: number;
  daily_protein_g: number;
  daily_carbs_g: number;
  daily_fat_g: number;
};
export type TargetDraft = { [Field in keyof TargetValues]: string };

function parseInteger(value: string, label: string, minimum = 0): number {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(
      `Enter ${label.toLowerCase()}.${minimum === 0 ? ' Use 0 if there is none.' : ''}`,
    );
  }
  const number = Number(trimmed);
  if (
    !/^\d+$/.test(trimmed) ||
    !Number.isSafeInteger(number) ||
    number < minimum ||
    number > MAX_DATABASE_INTEGER
  ) {
    throw new Error(
      `${label} must be a whole number from ${minimum} to ${MAX_DATABASE_INTEGER.toLocaleString('en-US')}.`,
    );
  }
  return number;
}

export function mealToDraft(meal: VerificationResult, blankZeroes = false): MealDraft {
  const amount = (value: number) => (blankZeroes && value === 0 ? '' : String(value));
  return {
    name: meal.name,
    calories: amount(meal.calories),
    protein_g: amount(meal.protein_g),
    carbs_g: amount(meal.carbs_g),
    fat_g: amount(meal.fat_g),
  };
}

export function parseMealDraft(draft: MealDraft): VerificationResult {
  const name = draft.name.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Enter a meal name.');
  return {
    name,
    calories: parseInteger(draft.calories, 'Calories'),
    protein_g: parseInteger(draft.protein_g, 'Protein'),
    carbs_g: parseInteger(draft.carbs_g, 'Carbs'),
    fat_g: parseInteger(draft.fat_g, 'Fat'),
  };
}

export function targetsToDraft(targets: TargetValues): TargetDraft {
  return {
    daily_calories: String(targets.daily_calories),
    daily_protein_g: String(targets.daily_protein_g),
    daily_carbs_g: String(targets.daily_carbs_g),
    daily_fat_g: String(targets.daily_fat_g),
  };
}

export function parseTargetDraft(draft: TargetDraft): TargetValues {
  return {
    daily_calories: parseInteger(draft.daily_calories, 'Daily calories', 1),
    daily_protein_g: parseInteger(draft.daily_protein_g, 'Daily protein'),
    daily_carbs_g: parseInteger(draft.daily_carbs_g, 'Daily carbs'),
    daily_fat_g: parseInteger(draft.daily_fat_g, 'Daily fat'),
  };
}
