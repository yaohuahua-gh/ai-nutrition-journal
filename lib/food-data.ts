import type { NutritionMatch } from '@/types/nutrition'
import { macroByWeight } from '@/lib/nutrition'

type UsdaFood = {
  fdcId: number
  description: string
  foodNutrients?: { nutrientName: string; value?: number }[]
}

function nutrient(food: UsdaFood, names: string[]) {
  const item = food.foodNutrients?.find((entry) => names.some((name) => entry.nutrientName.toLowerCase().includes(name)))
  return item?.value || 0
}

export async function searchUsdaFood(query: string, weightG: number): Promise<NutritionMatch | undefined> {
  if (!process.env.USDA_API_KEY) return undefined
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
  url.searchParams.set('api_key', process.env.USDA_API_KEY)
  url.searchParams.set('query', query)
  url.searchParams.set('pageSize', '1')

  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } })
  if (!response.ok) return undefined

  const data = (await response.json()) as { foods?: UsdaFood[] }
  const food = data.foods?.[0]
  if (!food) return undefined

  const per100g = {
    caloriesKcal: nutrient(food, ['energy']),
    proteinG: nutrient(food, ['protein']),
    fatG: nutrient(food, ['total lipid', 'total fat']),
    carbsG: nutrient(food, ['carbohydrate']),
    fiberG: nutrient(food, ['fiber'])
  }

  return {
    ...macroByWeight(per100g, weightG),
    source: 'usda',
    sourceId: String(food.fdcId),
    displayName: food.description,
    servingBasis: `${weightG} g, USDA FoodData Central`
  }
}

export async function searchOpenFoodFacts(query: string, weightG: number): Promise<NutritionMatch | undefined> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '1')

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AI Nutrition Journal prototype - contact local' },
    next: { revalidate: 60 * 60 * 24 }
  })
  if (!response.ok) return undefined

  const data = (await response.json()) as {
    products?: {
      code?: string
      product_name?: string
      nutriments?: Record<string, number>
    }[]
  }
  const product = data.products?.[0]
  if (!product?.nutriments) return undefined

  const per100g = {
    caloriesKcal: product.nutriments['energy-kcal_100g'] || 0,
    proteinG: product.nutriments.proteins_100g || 0,
    fatG: product.nutriments.fat_100g || 0,
    carbsG: product.nutriments.carbohydrates_100g || 0,
    fiberG: product.nutriments.fiber_100g || 0
  }

  return {
    ...macroByWeight(per100g, weightG),
    source: 'open_food_facts',
    sourceId: product.code || query,
    displayName: product.product_name || query,
    servingBasis: `${weightG} g, Open Food Facts`
  }
}

export async function getOpenFoodFactsBarcode(code: string, weightG = 100): Promise<NutritionMatch | undefined> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
    headers: { 'User-Agent': 'AI Nutrition Journal prototype - contact local' },
    next: { revalidate: 60 * 60 * 24 }
  })
  if (!response.ok) return undefined

  const data = (await response.json()) as {
    product?: { product_name?: string; nutriments?: Record<string, number> }
  }
  const product = data.product
  if (!product?.nutriments) return undefined

  const per100g = {
    caloriesKcal: product.nutriments['energy-kcal_100g'] || 0,
    proteinG: product.nutriments.proteins_100g || 0,
    fatG: product.nutriments.fat_100g || 0,
    carbsG: product.nutriments.carbohydrates_100g || 0,
    fiberG: product.nutriments.fiber_100g || 0
  }

  return {
    ...macroByWeight(per100g, weightG),
    source: 'open_food_facts',
    sourceId: code,
    displayName: product.product_name || `Barcode ${code}`,
    servingBasis: `${weightG} g, Open Food Facts barcode`
  }
}
