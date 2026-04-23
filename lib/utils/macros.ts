// lib/utils/macros.ts
export type Macros = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function sumMacros(rows: Macros[]): Macros {
  return rows.reduce<Macros>(
    (acc, r) => ({
      calories: acc.calories + r.calories,
      protein_g: acc.protein_g + r.protein_g,
      carbs_g: acc.carbs_g + r.carbs_g,
      fat_g: acc.fat_g + r.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function remainingMacros(target: Macros, consumed: Macros): Macros {
  return {
    calories: target.calories - consumed.calories,
    protein_g: target.protein_g - consumed.protein_g,
    carbs_g: target.carbs_g - consumed.carbs_g,
    fat_g: target.fat_g - consumed.fat_g,
  };
}

export function percentConsumed(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((consumed / target) * 100);
}
