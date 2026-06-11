import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { mockEntries } from '@/lib/mock-data'
import { summarizeDay } from '@/lib/nutrition'
import type { MealEntry } from '@/types/nutrition'

function fallbackNarrative(entries: MealEntry[]) {
  const summary = summarizeDay(entries)
  const proteinOk = summary.proteinG >= summary.target.proteinG
  const calorieOver = summary.caloriesKcal > summary.target.caloriesKcal
  return [
    `今天记录了 ${entries.length} 餐，总热量约 ${summary.caloriesKcal} kcal。`,
    proteinOk ? '蛋白质已经达标，保留这类高蛋白组合。' : `蛋白质还差约 ${Math.round(summary.target.proteinG - summary.proteinG)} g，下一餐可以补充鸡蛋、鱼虾、豆制品或酸奶。`,
    calorieOver ? '热量略高，明天优先减少精制主食和高油烹饪。' : '热量仍在目标附近，节奏不错。',
    '明天建议：每餐先确定蛋白质，再配一拳主食和两拳蔬菜。'
  ].join('\n')
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { entries?: MealEntry[] }
  const entries = body.entries?.length ? body.entries : mockEntries
  const summary = summarizeDay(entries)

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ summary, narrative: fallbackNarrative(entries), mode: 'mock' })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: '你是克制、可靠的中文营养记录教练。不要医疗化诊断，给出可执行建议。' },
      { role: 'user', content: `基于这些饮食记录生成今日复盘、蛋白质是否达标、热量是否超标、明天建议：${JSON.stringify({ entries, summary })}` }
    ]
  })

  return NextResponse.json({ summary, narrative: completion.choices[0]?.message.content || fallbackNarrative(entries), mode: 'live' })
}
