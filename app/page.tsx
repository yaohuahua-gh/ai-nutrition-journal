'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Flame, Heart, ImagePlus, Loader2, Plus, RefreshCcw, ScanBarcode, Sparkles, Target } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { IngredientEditor } from '@/components/IngredientEditor'
import { MetricPill } from '@/components/MetricPill'
import { PwaBootstrap } from '@/components/PwaBootstrap'
import { defaultTargets, summarizeDay, summarizeIngredients } from '@/lib/nutrition'
import type { AnalyzedIngredient, FavoriteFood, MealEntry, MealType } from '@/types/nutrition'

type Tab = 'capture' | 'today' | 'favorites' | 'settings'

const mealLabels: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('capture')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [ingredients, setIngredients] = useState<AnalyzedIngredient[]>([])
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [report, setReport] = useState('')
  const [barcode, setBarcode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const currentTotal = useMemo(() => summarizeIngredients(ingredients), [ingredients])
  const today = useMemo(() => summarizeDay(entries), [entries])

  useEffect(() => {
    void refreshEntries()
    void refreshFavorites()
  }, [])

  async function refreshEntries() {
    const response = await fetch('/api/entries')
    const data = await response.json()
    setEntries(data.entries || [])
  }

  async function refreshFavorites() {
    const response = await fetch('/api/favorites')
    const data = await response.json()
    setFavorites(data.favorites || [])
  }

  async function analyzePhoto(file: File) {
    setBusy('analyze')
    setPhotoPreview(URL.createObjectURL(file))
    const form = new FormData()
    form.append('photo', file)
    const response = await fetch('/api/analyze-photo', { method: 'POST', body: form })
    const data = await response.json()
    setIngredients(data.ingredients || [])
    setBusy(null)
  }

  async function rematch(index: number) {
    const item = ingredients[index]
    setBusy(`match-${item.id}`)
    const response = await fetch('/api/match-nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.name, weightG: item.weightG })
    })
    const data = await response.json()
    setIngredients((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, standard: data.match || undefined } : entry)))
    setBusy(null)
  }

  async function scanBarcode() {
    if (!barcode.trim()) return
    setBusy('barcode')
    const response = await fetch('/api/barcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: barcode.trim(), weightG: 100 })
    })
    const data = await response.json()
    if (data.match) {
      setIngredients((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: data.match.displayName,
          weightG: 100,
          confidence: 0.95,
          source: 'open_food_facts',
          caloriesKcal: data.match.caloriesKcal,
          proteinG: data.match.proteinG,
          fatG: data.match.fatG,
          carbsG: data.match.carbsG,
          fiberG: data.match.fiberG,
          standard: data.match
        }
      ])
    }
    setBusy(null)
  }

  async function saveEntry() {
    if (!ingredients.length) return
    setBusy('save')
    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealType, title: `${mealLabels[mealType]}记录`, ingredients })
    })
    const data = await response.json()
    if (data.entry) setEntries((current) => [data.entry, ...current])
    setIngredients([])
    setPhotoPreview('')
    setBusy(null)
    setTab('today')
  }

  async function saveFavorite() {
    if (!ingredients.length) return
    setBusy('favorite')
    const name = ingredients.slice(0, 2).map((item) => item.name).join(' + ') || '常吃组合'
    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ingredients })
    })
    const data = await response.json()
    if (data.favorite) setFavorites((current) => [data.favorite, ...current])
    setBusy(null)
  }

  async function generateReport() {
    setBusy('report')
    const response = await fetch('/api/daily-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries })
    })
    const data = await response.json()
    setReport(data.narrative || '')
    setBusy(null)
  }

  function addFavoriteToCurrent(favorite: FavoriteFood) {
    setIngredients(favorite.ingredients.map((item) => ({ ...item, id: crypto.randomUUID() })))
    setTab('capture')
  }

  return (
    <main className="safe-bottom min-h-screen bg-cloud">
      <PwaBootstrap />
      <div className="mx-auto max-w-md px-4 pt-5">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-leaf">AI 初筛 + 标准库校准</div>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-ink">营养记录</h1>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
            <Flame size={21} aria-hidden="true" />
          </div>
        </header>

        {tab === 'capture' && (
          <section className="mt-5 space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(mealLabels) as MealType[]).map((item) => (
                <button
                  key={item}
                  className={`rounded-lg px-2 py-2 text-sm font-bold ${mealType === item ? 'bg-ink text-white' : 'bg-white text-ink/65'}`}
                  onClick={() => setMealType(item)}
                >
                  {mealLabels[item]}
                </button>
              ))}
            </div>

            <label className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-leaf/45 bg-white text-center shadow-soft">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="已选择的食物照片" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="text-leaf" size={34} aria-hidden="true" />
                  <div className="mt-3 text-base font-black">拍照或上传食物</div>
                  <div className="mt-1 text-xs text-ink/50">手机会直接打开相机或相册</div>
                </>
              )}
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void analyzePhoto(file)
                }}
              />
            </label>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-soft">
                <ScanBarcode size={18} className="text-ink/45" aria-hidden="true" />
                <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="包装食品条形码" />
              </div>
              <button className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white" onClick={scanBarcode} aria-label="匹配条形码">
                {busy === 'barcode' ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              </button>
            </div>

            {busy === 'analyze' && (
              <div className="flex items-center gap-2 rounded-lg bg-mint p-3 text-sm font-semibold text-leaf">
                <Loader2 className="animate-spin" size={18} />
                正在识别食物并匹配标准营养库
              </div>
            )}

            {ingredients.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <MetricPill label="热量" value={`${currentTotal.caloriesKcal} kcal`} tone="coral" />
                  <MetricPill label="蛋白" value={`${currentTotal.proteinG} g`} tone="leaf" />
                  <MetricPill label="脂肪" value={`${currentTotal.fatG} g`} tone="yolk" />
                  <MetricPill label="碳水" value={`${currentTotal.carbsG} g`} />
                </div>

                <div className="space-y-3">
                  {ingredients.map((ingredient, index) => (
                    <IngredientEditor
                      key={ingredient.id}
                      ingredient={ingredient}
                      onChange={(next) => setIngredients((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)))}
                      onRematch={() => void rematch(index)}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <button className="rounded-lg bg-leaf px-4 py-3 text-sm font-black text-white" onClick={saveEntry}>
                    {busy === 'save' ? '保存中' : '确认保存到今天'}
                  </button>
                  <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-leaf shadow-soft" onClick={saveFavorite} aria-label="保存为常吃组合">
                    <Heart size={19} />
                  </button>
                  <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-ink/65 shadow-soft" onClick={() => setIngredients([])} aria-label="清空">
                    <RefreshCcw size={18} />
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'today' && (
          <section className="mt-5 space-y-4">
            <div className="rounded-lg bg-ink p-4 text-white shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/65">今日完成度</div>
                  <div className="mt-1 text-4xl font-black">{today.score}</div>
                </div>
                <Target size={34} className="text-mint" aria-hidden="true" />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <MetricPill label="热量" value={`${today.caloriesKcal}/${today.target.caloriesKcal}`} tone="coral" />
                <MetricPill label="蛋白" value={`${today.proteinG}/${today.target.proteinG}`} tone="leaf" />
                <MetricPill label="脂肪" value={`${today.fatG}/${today.target.fatG}`} tone="yolk" />
                <MetricPill label="碳水" value={`${today.carbsG}/${today.target.carbsG}`} />
              </div>
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-leaf px-4 py-3 text-sm font-black text-white" onClick={generateReport}>
              {busy === 'report' ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
              生成今天日报
            </button>

            {report && <pre className="whitespace-pre-wrap rounded-lg bg-white p-4 text-sm leading-6 text-ink shadow-soft">{report}</pre>}

            <div className="space-y-3">
              {entries.map((entry) => {
                const total = summarizeIngredients(entry.ingredients)
                return (
                  <article key={entry.id} className="rounded-lg bg-white p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black">{mealLabels[entry.mealType]}</div>
                        <div className="mt-1 text-xs text-ink/50">{new Date(entry.eatenAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-coral">{total.caloriesKcal}</div>
                        <div className="text-[11px] text-ink/45">kcal</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.ingredients.map((item) => (
                        <span key={item.id} className="rounded-lg bg-cloud px-2 py-1 text-xs font-semibold text-ink/65">
                          {item.name} {item.weightG}g
                        </span>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {tab === 'favorites' && (
          <section className="mt-5 space-y-3">
            {favorites.map((favorite) => {
              const total = summarizeIngredients(favorite.ingredients)
              return (
                <article key={favorite.id} className="rounded-lg bg-white p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black">{favorite.name}</div>
                      <div className="mt-1 text-xs text-ink/50">{favorite.ingredients.length} 个食材 · {total.caloriesKcal} kcal</div>
                    </div>
                    <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-leaf" onClick={() => addFavoriteToCurrent(favorite)} aria-label="添加常吃组合">
                      <Check size={18} />
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}

        {tab === 'settings' && (
          <section className="mt-5 rounded-lg bg-white p-4 shadow-soft">
            <div className="text-base font-black">每日目标</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricPill label="热量" value={`${defaultTargets.caloriesKcal} kcal`} tone="coral" />
              <MetricPill label="蛋白质" value={`${defaultTargets.proteinG} g`} tone="leaf" />
              <MetricPill label="脂肪" value={`${defaultTargets.fatG} g`} tone="yolk" />
              <MetricPill label="碳水" value={`${defaultTargets.carbsG} g`} />
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/60">接入 Supabase Auth 后，这里可以改成个人目标、减脂速度、运动日系数和蛋白质下限。</p>
          </section>
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </main>
  )
}
