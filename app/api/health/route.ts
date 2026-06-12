import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: 'zhipu',
    zhipuConfigured: Boolean(process.env.ZHIPU_API_KEY),
    usdaConfigured: Boolean(process.env.USDA_API_KEY)
  })
}
