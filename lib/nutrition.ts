import type { AnalyzedIngredient, DailySummary, DailyTargets, IngredientEstimate, Macro, MealEntry, NutritionMatch } from '@/types/nutrition'

export const defaultTargets: DailyTargets = {
  caloriesKcal: 1800,
  proteinG: 110,
  fatG: 55,
  carbsG: 210
}

export function roundNutrition<T extends Partial<Macro>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, typeof item === 'number' ? Math.round(item * 10) / 10 : item])
  ) as T
}

export function macroByWeight(per100g: Macro, weightG: number): Macro {
  const ratio = weightG / 100
  return roundNutrition({
    caloriesKcal: per100g.caloriesKcal * ratio,
    proteinG: per100g.proteinG * ratio,
    fatG: per100g.fatG * ratio,
    carbsG: per100g.carbsG * ratio,
    fiberG: per100g.fiberG * ratio
  })
}

export function summarizeIngredients(ingredients: Pick<AnalyzedIngredient, keyof Macro>[]): Macro {
  return roundNutrition(
    ingredients.reduce(
      (sum, item) => ({
        caloriesKcal: sum.caloriesKcal + item.caloriesKcal,
        proteinG: sum.proteinG + item.proteinG,
        fatG: sum.fatG + item.fatG,
        carbsG: sum.carbsG + item.carbsG,
        fiberG: sum.fiberG + item.fiberG
      }),
      { caloriesKcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 }
    )
  )
}

export function summarizeDay(entries: MealEntry[], target = defaultTargets): DailySummary {
  const total = summarizeIngredients(entries.flatMap((entry) => entry.ingredients))
  const calorieScore = Math.max(0, 1 - Math.abs(total.caloriesKcal - target.caloriesKcal) / target.caloriesKcal)
  const proteinScore = Math.min(1, total.proteinG / target.proteinG)
  const score = Math.round((calorieScore * 0.45 + proteinScore * 0.4 + Math.min(1, total.fiberG / 25) * 0.15) * 100)
  return { ...total, target, score }
}

export function mergeWithStandard(ai: IngredientEstimate, standard?: NutritionMatch): AnalyzedIngredient {
  if (!standard) return ai
  return {
    ...ai,
    standard
  }
}

export function nutritionDelta(ai: IngredientEstimate, standard?: NutritionMatch) {
  if (!standard) return null
  return {
    caloriesKcal: Math.round(ai.caloriesKcal - standard.caloriesKcal),
    proteinG: Math.round((ai.proteinG - standard.proteinG) * 10) / 10,
    fatG: Math.round((ai.fatG - standard.fatG) * 10) / 10,
    carbsG: Math.round((ai.carbsG - standard.carbsG) * 10) / 10
  }
}
