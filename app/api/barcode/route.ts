import { NextResponse } from 'next/server'
import { getOpenFoodFactsBarcode } from '@/lib/food-data'

export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string; weightG?: number }
  if (!body.code) return NextResponse.json({ error: 'Missing barcode' }, { status: 400 })
  const match = await getOpenFoodFactsBarcode(body.code, body.weightG || 100)
  return NextResponse.json({ match: match || null })
}
