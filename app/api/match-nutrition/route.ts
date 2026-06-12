import { NextResponse } from 'next/server'
import { searchOpenFoodFacts, searchUsdaFood } from '@/lib/food-data'
import { foodSearchCandidates } from '@/lib/food-name'
import { mockMatchNutrition } from '@/lib/mock-data'

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; weightG?: number; prefer?: 'usda' | 'open_food_facts' }
  const name = body.name?.trim()
  const weightG = Math.max(1, Number(body.weightG || 100))
  if (!name) return NextResponse.json({ error: 'Missing food name' }, { status: 400 })
  const candidates = foodSearchCandidates(name)

  for (const query of candidates) {
    const primary = body.prefer === 'open_food_facts'
      ? await searchOpenFoodFacts(query, weightG)
      : await searchUsdaFood(query, weightG)
    if (primary) return NextResponse.json({ match: primary, query, candidates })

    const fallback = body.prefer === 'open_food_facts'
      ? await searchUsdaFood(query, weightG)
      : await searchOpenFoodFacts(query, weightG)
    if (fallback) return NextResponse.json({ match: fallback, query, candidates })
  }

  return NextResponse.json({ match: mockMatchNutrition(name, weightG) || null, candidates })
}
