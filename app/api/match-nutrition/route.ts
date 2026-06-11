import { NextResponse } from 'next/server'
import { searchOpenFoodFacts, searchUsdaFood } from '@/lib/food-data'
import { mockMatchNutrition } from '@/lib/mock-data'

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; weightG?: number; prefer?: 'usda' | 'open_food_facts' }
  const name = body.name?.trim()
  const weightG = Math.max(1, Number(body.weightG || 100))
  if (!name) return NextResponse.json({ error: 'Missing food name' }, { status: 400 })

  const primary = body.prefer === 'open_food_facts'
    ? await searchOpenFoodFacts(name, weightG)
    : await searchUsdaFood(name, weightG)
  const fallback = body.prefer === 'open_food_facts'
    ? await searchUsdaFood(name, weightG)
    : await searchOpenFoodFacts(name, weightG)

  return NextResponse.json({ match: primary || fallback || mockMatchNutrition(name, weightG) || null })
}
