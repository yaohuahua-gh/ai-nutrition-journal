import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { searchOpenFoodFacts, searchUsdaFood } from '@/lib/food-data'
import { mockAnalyze, mockMatchNutrition } from '@/lib/mock-data'
import { mergeWithStandard, roundNutrition } from '@/lib/nutrition'
import type { IngredientEstimate } from '@/types/nutrition'

const ingredientSchema = z.object({
  name: z.string(),
  weightG: z.number(),
  caloriesKcal: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
  fiberG: z.number().default(0),
  confidence: z.number().min(0).max(1)
})

const responseSchema = z.object({
  ingredients: z.array(ingredientSchema).min(1)
})

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('photo')
  if (!(file instanceof File)) return NextResponse.json({ ingredients: mockAnalyze(), mode: 'mock' })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ingredients: mockAnalyze(), mode: 'mock', note: 'OPENAI_API_KEY is not configured.' })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const dataUrl = `data:${file.type || 'image/jpeg'};base64,${bytes.toString('base64')}`
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You estimate food photo nutrition. Return strict JSON with ingredients array. Values are per visible portion, in grams and kcal. Be conservative and include confidence 0-1.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identify each visible ingredient or dish component. Return name, weightG, caloriesKcal, proteinG, fatG, carbsG, fiberG, confidence.' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ]
  })

  const raw = completion.choices[0]?.message.content || '{"ingredients":[]}'
  const parsed = responseSchema.parse(JSON.parse(raw))
  const ingredients = await Promise.all(
    parsed.ingredients.map(async (item) => {
      const ai: IngredientEstimate = {
        id: crypto.randomUUID(),
        source: 'ai',
        ...roundNutrition(item)
      }
      const standard = (await searchUsdaFood(ai.name, ai.weightG)) || (await searchOpenFoodFacts(ai.name, ai.weightG)) || mockMatchNutrition(ai.name, ai.weightG)
      return mergeWithStandard(ai, standard)
    })
  )

  return NextResponse.json({ ingredients, mode: 'live' })
}
