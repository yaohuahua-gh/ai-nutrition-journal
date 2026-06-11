import { NextResponse } from 'next/server'
import { demoUserId, getSupabaseAdmin } from '@/lib/supabase'
import { mockFavorites } from '@/lib/mock-data'
import type { AnalyzedIngredient } from '@/types/nutrition'

export async function GET() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ favorites: mockFavorites, mode: 'mock' })
  const { data, error } = await supabase.from('favorite_foods').select('*').eq('user_id', demoUserId()).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    favorites: (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      ingredients: item.ingredients,
      createdAt: item.created_at
    }))
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; ingredients?: AnalyzedIngredient[] }
  if (!body.name || !body.ingredients?.length) return NextResponse.json({ error: 'Missing favorite name or ingredients' }, { status: 400 })
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({
      favorite: { id: crypto.randomUUID(), userId: 'demo', name: body.name, ingredients: body.ingredients, createdAt: new Date().toISOString() },
      mode: 'mock'
    })
  }
  const { data, error } = await supabase
    .from('favorite_foods')
    .insert({ user_id: demoUserId(), name: body.name, ingredients: body.ingredients })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ favorite: data, mode: 'live' })
}
