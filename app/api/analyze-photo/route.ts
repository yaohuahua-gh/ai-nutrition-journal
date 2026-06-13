import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getVisionProvider, missingVisionConfigMessage } from '@/lib/ai-vision'
import { searchOpenFoodFacts, searchUsdaFood } from '@/lib/food-data'
import { foodSearchCandidates } from '@/lib/food-name'
import { mockAnalyze, mockMatchNutrition } from '@/lib/mock-data'
import { mergeWithStandard, roundNutrition } from '@/lib/nutrition'
import type { IngredientEstimate } from '@/types/nutrition'

export const runtime = 'nodejs'
export const maxDuration = 60

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

function parseModelJson(raw: string) {
  const direct = JSON.parse(raw)
  return responseSchema.parse(direct)
}

function parseModelContent(raw: string) {
  try {
    return parseModelJson(raw)
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI did not return valid JSON.')
    return parseModelJson(match[0])
  }
}

export async function POST(request: Request) {
  let form
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ingredients: [], mode: 'error', error: 'Could not read uploaded image.' }, { status: 400 })
  }

  const file = form.get('photo')
  if (!(file instanceof File)) return NextResponse.json({ ingredients: mockAnalyze(), mode: 'mock' })
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ ingredients: [], mode: 'error', error: '图片太大，请先换一张较小的照片或截图。' }, { status: 413 })
  }

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
      messages: [
        {
          role: 'system',
          content: 'You estimate food photo nutrition. Return only JSON, no markdown. The JSON shape is {"ingredients":[{"name":"string","weightG":number,"caloriesKcal":number,"proteinG":number,"fatG":number,"carbsG":number,"fiberG":number,"confidence":number}]}. Values are per visible portion, in grams and kcal. Be conservative.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '识别图片中可见的每一种食材或菜品组成，并估算营养。只返回 JSON，不要解释。' },
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

  let parsed
  try {
    const raw = completion.choices[0]?.message.content || '{"ingredients":[]}'
    parsed = parseModelContent(raw)
  } catch (error) {
    return NextResponse.json(
      {
        ingredients: [],
        mode: 'error',
        provider: provider.name,
        error: error instanceof Error ? error.message : 'AI returned an invalid response.'
      },
      { status: 502 }
    )
  }

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
