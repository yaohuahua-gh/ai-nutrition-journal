export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type Macro = {
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
  fiberG: number
}

export type IngredientEstimate = Macro & {
  id: string
  name: string
  weightG: number
  confidence: number
  source?: 'ai' | 'usda' | 'open_food_facts' | 'user'
}

export type NutritionMatch = Macro & {
  source: 'usda' | 'open_food_facts' | 'mock'
  sourceId: string
  displayName: string
  servingBasis: string
}

export type AnalyzedIngredient = IngredientEstimate & {
  standard?: NutritionMatch
}

export type MealEntry = {
  id: string
  userId: string
  mealType: MealType
  eatenAt: string
  photoUrl?: string
  title: string
  ingredients: AnalyzedIngredient[]
}

export type DailyTargets = {
  caloriesKcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

export type DailySummary = Macro & {
  target: DailyTargets
  score: number
}

export type FavoriteFood = {
  id: string
  userId: string
  name: string
  ingredients: AnalyzedIngredient[]
  createdAt: string
}
