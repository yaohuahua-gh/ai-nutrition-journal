import { NextResponse } from 'next/server'

export async function GET() {
  const provider = process.env.AI_PROVIDER || 'auto'
  return NextResponse.json({
    ok: true,
    provider,
    zhipuConfigured: Boolean(process.env.ZHIPU_API_KEY),
    doubaoConfigured: Boolean(process.env.DOUBAO_API_KEY && process.env.DOUBAO_MODEL),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    usdaConfigured: Boolean(process.env.USDA_API_KEY)
  })
}
