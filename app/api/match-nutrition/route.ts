import { NextResponse } from 'next/server'
import { searchOpenFoodFacts, searchUsdaFood } from '@/lib/food-data'
import { mockMatchNutrition } from '@/lib/mock-data'

const foodNameMap: Record<string, string> = {
  鸡胸肉: 'chicken breast',
  鸡肉: 'chicken',
  牛肉: 'beef',
  三文鱼: 'salmon',
  鸡蛋: 'egg',
  米饭: 'white rice',
  燕麦: 'oatmeal',
  酸奶: 'greek yogurt',
  牛奶: 'milk',
  西兰花: 'broccoli',
  牛油果: 'avocado',
  香蕉: 'banana',
  苹果: 'apple',
  豆腐: 'tofu'
}

function normalizeFoodName(name: string) {
  return foodNameMap[name] || name
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; weightG?: number; prefer?: 'usda' | 'open_food_facts' }
  const name = body.name?.trim()
  const weightG = Math.max(1, Number(body.weightG || 100))
  if (!name) return NextResponse.json({ error: 'Missing food name' }, { status: 400 })
  const query = normalizeFoodName(name)

  const primary = body.prefer === 'open_food_facts'
    ? await searchOpenFoodFacts(query, weightG)
    : await searchUsdaFood(query, weightG)
  const fallback = body.prefer === 'open_food_facts'
    ? await searchUsdaFood(query, weightG)
    : await searchOpenFoodFacts(query, weightG)

  return NextResponse.json({ match: primary || fallback || mockMatchNutrition(name, weightG) || null })
}
