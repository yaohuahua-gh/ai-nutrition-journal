import { NextResponse } from 'next/server'
import { mockEntries } from '@/lib/mock-data'
import { summarizeDay } from '@/lib/nutrition'
import type { DailyTargets, MealEntry } from '@/types/nutrition'

function fallbackNarrative(entries: MealEntry[], targets?: DailyTargets) {
  const summary = summarizeDay(entries, targets)
  const proteinOk = summary.proteinG >= summary.target.proteinG
  const calorieOver = summary.caloriesKcal > summary.target.caloriesKcal
  const mealCount = entries.length

  return [
    `今天记录了 ${mealCount} 餐，总热量约 ${Math.round(summary.caloriesKcal)} kcal。`,
    proteinOk
      ? `蛋白质约 ${Math.round(summary.proteinG)} g，已经达到目标。`
      : `蛋白质约 ${Math.round(summary.proteinG)} g，还差约 ${Math.max(0, Math.round(summary.target.proteinG - summary.proteinG))} g。`,
    calorieOver ? '热量高于目标，明天可以优先减少高油烹饪、甜饮和额外零食。' : '热量仍在目标附近，今天节奏不错。',
    '明天建议：每餐先确定蛋白质，再配一拳主食和两拳蔬菜；如果外食，优先选择清晰可估算的单品。'
  ].join('\n')
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { entries?: MealEntry[]; targets?: DailyTargets }
  const entries = body.entries?.length ? body.entries : mockEntries
  const summary = summarizeDay(entries, body.targets)

  return NextResponse.json({ summary, narrative: fallbackNarrative(entries, body.targets), mode: 'local' })
}
