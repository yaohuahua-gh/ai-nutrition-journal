import { NextResponse } from 'next/server'
import { demoUserId, getSupabaseAdmin } from '@/lib/supabase'
import { mockEntries } from '@/lib/mock-data'
import type { AnalyzedIngredient, MealEntry, MealType } from '@/types/nutrition'

type DbIngredient = {
  id: string
  name: string
  weight_g: number | string
  calories_kcal: number | string
  protein_g: number | string
  fat_g: number | string
  carbs_g: number | string
  fiber_g: number | string
  confidence: number | string | null
  source: string
  standard_payload?: Record<string, unknown>
}

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ entries: mockEntries, mode: 'mock' })

  const userId = demoUserId()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('meal_entries')
    .select('*, ingredients(*)')
    .eq('user_id', userId)
    .gte('eaten_at', start.toISOString())
    .order('eaten_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    entries: (data || []).map((entry) => ({
      id: entry.id,
      userId: entry.user_id,
      mealType: entry.meal_type,
      eatenAt: entry.eaten_at,
      photoUrl: entry.photo_url,
      title: entry.title,
      ingredients: (entry.ingredients as DbIngredient[]).map((item) => ({
        id: item.id,
        name: item.name,
        weightG: Number(item.weight_g),
        caloriesKcal: Number(item.calories_kcal),
        proteinG: Number(item.protein_g),
        fatG: Number(item.fat_g),
        carbsG: Number(item.carbs_g),
        fiberG: Number(item.fiber_g),
        confidence: Number(item.confidence || 0),
        source: item.source,
        standard: item.standard_payload?.sourceId ? item.standard_payload : undefined
      }))
    })),
    mode: 'live'
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as { mealType: MealType; title: string; ingredients: AnalyzedIngredient[]; photoUrl?: string }
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    const entry: MealEntry = {
      id: crypto.randomUUID(),
      userId: 'demo',
      mealType: body.mealType,
      title: body.title || '新饮食记录',
      eatenAt: new Date().toISOString(),
      photoUrl: body.photoUrl,
      ingredients: body.ingredients
    }
    return NextResponse.json({ entry, mode: 'mock' })
  }

  const userId = demoUserId()
  const { data: meal, error: mealError } = await supabase
    .from('meal_entries')
    .insert({ user_id: userId, meal_type: body.mealType, title: body.title || '新饮食记录', photo_url: body.photoUrl })
    .select()
    .single()
  if (mealError) return NextResponse.json({ error: mealError.message }, { status: 500 })

  const rows = body.ingredients.map((item) => ({
    meal_entry_id: meal.id,
    name: item.name,
    weight_g: item.weightG,
    calories_kcal: item.caloriesKcal,
    protein_g: item.proteinG,
    fat_g: item.fatG,
    carbs_g: item.carbsG,
    fiber_g: item.fiberG,
    confidence: item.confidence,
    source: item.source || 'user',
    standard_source: item.standard?.source,
    standard_source_id: item.standard?.sourceId,
    standard_display_name: item.standard?.displayName,
    standard_payload: item.standard || {}
  }))
  const { error: ingredientError } = await supabase.from('ingredients').insert(rows)
  if (ingredientError) return NextResponse.json({ error: ingredientError.message }, { status: 500 })

  return NextResponse.json({ entry: { ...meal, ingredients: body.ingredients }, mode: 'live' })
}
