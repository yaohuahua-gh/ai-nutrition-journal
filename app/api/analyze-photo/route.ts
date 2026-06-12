import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getVisionProvider, missingVisionConfigMessage } from '@/lib/ai-vision'
import { searchOpenFoodFacts, searchUsdaFood } from '@/lib/food-data'
import { foodSearchCandidates } from '@/lib/food-name'
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

  const provider = getVisionProvider()
  if (!provider) {
    return NextResponse.json({ ingredients: mockAnalyze(), mode: 'mock', note: missingVisionConfigMessage() })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const dataUrl = `data:${file.type || 'image/jpeg'};base64,${bytes.toString('base64')}`

  let completion
  try {
    completion = await provider.client.chat.completions.create({
      model: provider.model,
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
  } catch (error) {
    return NextResponse.json(
      {
        ingredients: [],
        mode: 'error',
        provider: provider.name,
        error: error instanceof Error ? error.message : `${provider.name} photo analysis failed.`
      },
      { status: 500 }
    )
  }

  const raw = completion.choices[0]?.message.content || '{"ingredients":[]}'
  const parsed = responseSchema.parse(JSON.parse(raw))
  const ingredients = await Promise.all(
    parsed.ingredients.map(async (item) => {
      const ai: IngredientEstimate = {
        id: crypto.randomUUID(),
        source: 'ai',
        ...roundNutrition(item)
      }
      let standard
      for (const query of foodSearchCandidates(ai.name)) {
        standard = (await searchUsdaFood(query, ai.weightG)) || (await searchOpenFoodFacts(query, ai.weightG))
        if (standard) break
      }
      standard = standard || mockMatchNutrition(ai.name, ai.weightG)
      return mergeWithStandard(ai, standard)
    })
  )

  return NextResponse.json({ ingredients, mode: 'live', provider: provider.name })
}
