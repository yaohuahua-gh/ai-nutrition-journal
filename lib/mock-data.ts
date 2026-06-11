import type { AnalyzedIngredient, FavoriteFood, IngredientEstimate, MealEntry, NutritionMatch } from '@/types/nutrition'
import { macroByWeight, mergeWithStandard } from '@/lib/nutrition'

const per100: Record<string, Omit<NutritionMatch, 'sourceId' | 'displayName' | 'servingBasis'> & { aliases: string[] }> = {
  chicken: { source: 'mock', caloriesKcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0, fiberG: 0, aliases: ['鸡胸肉', 'chicken breast'] },
  rice: { source: 'mock', caloriesKcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28, fiberG: 0.4, aliases: ['米饭', 'white rice'] },
  broccoli: { source: 'mock', caloriesKcal: 35, proteinG: 2.4, fatG: 0.4, carbsG: 7.2, fiberG: 3.3, aliases: ['西兰花', 'broccoli'] },
  egg: { source: 'mock', caloriesKcal: 155, proteinG: 13, fatG: 11, carbsG: 1.1, fiberG: 0, aliases: ['鸡蛋', 'egg'] },
  yogurt: { source: 'mock', caloriesKcal: 95, proteinG: 9, fatG: 1.5, carbsG: 8, fiberG: 0, aliases: ['希腊酸奶', 'yogurt'] }
}

export function mockAnalyze(): AnalyzedIngredient[] {
  const estimates: IngredientEstimate[] = [
    { id: crypto.randomUUID(), name: '鸡胸肉', weightG: 135, confidence: 0.86, source: 'ai', ...macroByWeight(per100.chicken, 135) },
    { id: crypto.randomUUID(), name: '米饭', weightG: 160, confidence: 0.79, source: 'ai', ...macroByWeight(per100.rice, 160) },
    { id: crypto.randomUUID(), name: '西兰花', weightG: 90, confidence: 0.82, source: 'ai', ...macroByWeight(per100.broccoli, 90) }
  ]
  return estimates.map((item) => mergeWithStandard(item, mockMatchNutrition(item.name, item.weightG)))
}

export function mockMatchNutrition(query: string, weightG = 100): NutritionMatch | undefined {
  const normalized = query.toLowerCase()
  const item = Object.entries(per100).find(([, value]) => value.aliases.some((alias) => normalized.includes(alias.toLowerCase())))
  if (!item) return undefined
  const [key, value] = item
  return {
    ...macroByWeight(value, weightG),
    source: 'mock',
    sourceId: `mock-${key}`,
    displayName: value.aliases[0],
    servingBasis: `${weightG} g, derived from per-100g reference`
  }
}

export const mockEntries: MealEntry[] = [
  {
    id: 'demo-lunch',
    userId: 'demo',
    mealType: 'lunch',
    eatenAt: new Date().toISOString(),
    title: '高蛋白午餐',
    ingredients: mockAnalyze()
  }
]

export const mockFavorites: FavoriteFood[] = [
  {
    id: 'fav-protein-bowl',
    userId: 'demo',
    name: '鸡胸肉米饭碗',
    ingredients: mockAnalyze(),
    createdAt: new Date().toISOString()
  }
]
