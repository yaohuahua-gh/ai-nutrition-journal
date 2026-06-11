'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Camera, Check, Database, Flame, Heart, Images, Loader2, Plus, RefreshCcw, ScanBarcode, Search, Sparkles, Target } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { IngredientEditor } from '@/components/IngredientEditor'
import { MetricPill } from '@/components/MetricPill'
import { PwaBootstrap } from '@/components/PwaBootstrap'
import { defaultTargets, summarizeDay, summarizeIngredients } from '@/lib/nutrition'
import type { AnalyzedIngredient, DailyTargets, FavoriteFood, MealEntry, MealType, NutritionMatch } from '@/types/nutrition'

type Tab = 'capture' | 'today' | 'favorites' | 'settings'

const mealLabels: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
}

const targetFields: { key: keyof DailyTargets; label: string; unit: string; tone: 'coral' | 'leaf' | 'yolk' | 'plain' }[] = [
  { key: 'caloriesKcal', label: '热量', unit: 'kcal', tone: 'coral' },
  { key: 'proteinG', label: '蛋白质', unit: 'g', tone: 'leaf' },
  { key: 'fatG', label: '脂肪', unit: 'g', tone: 'yolk' },
  { key: 'carbsG', label: '碳水', unit: 'g', tone: 'plain' }
]

function todayLabel() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date())
}

function emptyMacro() {
  return { caloriesKcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 }
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('capture')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [ingredients, setIngredients] = useState<AnalyzedIngredient[]>([])
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [targets, setTargets] = useState<DailyTargets>(defaultTargets)
  const [report, setReport] = useState('')
  const [barcode, setBarcode] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [libraryWeight, setLibraryWeight] = useState(100)
  const [libraryResult, setLibraryResult] = useState<NutritionMatch | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const currentTotal = useMemo(() => summarizeIngredients(ingredients), [ingredients])
  const today = useMemo(() => summarizeDay(entries, targets), [entries, targets])
  const mealsToday = useMemo(
    () =>
      (Object.keys(mealLabels) as MealType[]).map((type) => {
        const mealEntries = entries.filter((entry) => entry.mealType === type)
        const mealIngredients = mealEntries.flatMap((entry) => entry.ingredients)
        return {
          type,
          label: mealLabels[type],
          entries: mealEntries,
          total: mealIngredients.length ? summarizeIngredients(mealIngredients) : emptyMacro()
        }
      }),
    [entries]
  )

  useEffect(() => {
    const savedTargets = window.localStorage.getItem('nutrition-targets')
    if (savedTargets) {
      setTargets({ ...defaultTargets, ...JSON.parse(savedTargets) })
    }
    void refreshEntries()
    void refreshFavorites()
  }, [])

  function updateTargets(next: DailyTargets) {
    setTargets(next)
    window.localStorage.setItem('nutrition-targets', JSON.stringify(next))
  }

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
      body: JSON.stringify({ entries, targets })
    })
    const data = await response.json()
    setReport(data.narrative || '')
    setBusy(null)
  }

  async function searchNutritionLibrary() {
    if (!libraryQuery.trim()) return
    setBusy('library')
    const response = await fetch('/api/match-nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: libraryQuery.trim(), weightG: libraryWeight })
    })
    const data = await response.json()
    setLibraryResult(data.match || null)
    setBusy(null)
  }

  function addLibraryResultToCurrent() {
    if (!libraryResult) return
    setIngredients((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: libraryResult.displayName,
        weightG: libraryWeight,
        confidence: 1,
        source: libraryResult.source === 'mock' ? 'user' : libraryResult.source,
        caloriesKcal: libraryResult.caloriesKcal,
        proteinG: libraryResult.proteinG,
        fatG: libraryResult.fatG,
        carbsG: libraryResult.carbsG,
        fiberG: libraryResult.fiberG,
        standard: libraryResult
      }
    ])
    setTab('capture')
  }

  function addFavoriteToCurrent(favorite: FavoriteFood) {
    setIngredients(favorite.ingredients.map((item) => ({ ...item, id: crypto.randomUUID() })))
    setTab('capture')
  }

  function handleFileChange(file?: File) {
    if (file) void analyzePhoto(file)
  }

  return (
    <main className="safe-bottom min-h-screen bg-cloud">
      <PwaBootstrap />
      <div className="mx-auto max-w-md px-4 pt-5">
        <header
          className="relative -mx-4 -mt-5 min-h-[270px] overflow-hidden bg-cover bg-center px-4 pb-5 pt-7 text-white"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(23,33,27,0.12) 0%, rgba(23,33,27,0.46) 62%, rgba(23,33,27,0.76) 100%), url('/images/wellness-hero.png')" }}
        >
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-white/18 px-3 py-1 text-xs font-bold backdrop-blur">AI 初筛 + 标准库校准</div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/18 backdrop-blur">
              <Flame size={21} aria-hidden="true" />
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-5">
            <h1 className="max-w-[290px] text-4xl font-black leading-tight tracking-normal">化化姐的AI营养记录</h1>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/16 px-3 py-2 backdrop-blur">
                <div className="text-[11px] text-white/75">今日热量</div>
                <div className="mt-0.5 text-sm font-black">{today.caloriesKcal} kcal</div>
              </div>
              <div className="rounded-lg bg-white/16 px-3 py-2 backdrop-blur">
                <div className="text-[11px] text-white/75">蛋白质</div>
                <div className="mt-0.5 text-sm font-black">{today.proteinG} g</div>
              </div>
              <div className="rounded-lg bg-white/16 px-3 py-2 backdrop-blur">
                <div className="text-[11px] text-white/75">完成度</div>
                <div className="mt-0.5 text-sm font-black">{today.score}</div>
              </div>
            </div>
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

            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-leaf/45 bg-white text-center shadow-soft">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="已选择的食物照片" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Images className="text-leaf" size={34} aria-hidden="true" />
                  <div className="mt-3 text-base font-black">选择食物照片</div>
                  <div className="mt-1 text-xs text-ink/50">可以现场拍照，也可以从相册选</div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-leaf px-3 text-sm font-black text-white">
                <Camera size={18} aria-hidden="true" />
                拍照
                <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => handleFileChange(event.target.files?.[0])} />
              </label>
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-ink shadow-soft">
                <Images size={18} aria-hidden="true" />
                从相册选
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleFileChange(event.target.files?.[0])} />
              </label>
            </div>

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
                  <div className="text-xs text-white/65">{todayLabel()}</div>
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

            {report && (
              <section className="rounded-lg bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-leaf">今天日报</div>
                    <h2 className="mt-1 text-xl font-black">{todayLabel()}</h2>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-leaf">
                    <BookOpen size={18} aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {mealsToday.map((meal) => (
                    <div key={meal.type} className="rounded-lg bg-cloud p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-black">{meal.label}</div>
                        <div className="text-sm font-black text-coral">{meal.total.caloriesKcal} kcal</div>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{meal.total.proteinG}</div>
                          <div className="text-ink/45">蛋白</div>
                        </div>
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{meal.total.fatG}</div>
                          <div className="text-ink/45">脂肪</div>
                        </div>
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{meal.total.carbsG}</div>
                          <div className="text-ink/45">碳水</div>
                        </div>
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{meal.total.fiberG}</div>
                          <div className="text-ink/45">纤维</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg bg-ink p-3 text-white">
                  <div className="text-xs text-white/65">全天加总</div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
                    <div>
                      <div className="text-base font-black">{today.caloriesKcal}</div>
                      <div className="text-white/55">kcal</div>
                    </div>
                    <div>
                      <div className="text-base font-black">{today.proteinG}</div>
                      <div className="text-white/55">蛋白</div>
                    </div>
                    <div>
                      <div className="text-base font-black">{today.fatG}</div>
                      <div className="text-white/55">脂肪</div>
                    </div>
                    <div>
                      <div className="text-base font-black">{today.carbsG}</div>
                      <div className="text-white/55">碳水</div>
                    </div>
                  </div>
                </div>

                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-mint p-3 text-sm leading-6 text-leaf">{report}</pre>
              </section>
            )}

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
            <section className="rounded-lg bg-white p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-leaf">
                  <Database size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-black">标准营养库</div>
                  <div className="mt-0.5 text-xs text-ink/50">查询 USDA / Open Food Facts 对照数据</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_86px_auto] gap-2">
                <input
                  className="min-w-0 rounded-lg bg-cloud px-3 py-3 text-sm font-semibold outline-none"
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder="鸡胸肉 / 酸奶 / 燕麦"
                />
                <div className="flex items-center gap-1 rounded-lg bg-cloud px-2 py-2">
                  <input
                    className="w-full min-w-0 bg-transparent text-sm font-black outline-none"
                    inputMode="numeric"
                    value={libraryWeight}
                    onChange={(event) => setLibraryWeight(Number(event.target.value || 0))}
                    aria-label="查询重量"
                  />
                  <span className="text-xs text-ink/45">g</span>
                </div>
                <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-ink text-white" onClick={searchNutritionLibrary} aria-label="查询标准营养库">
                  {busy === 'library' ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                </button>
              </div>

              {libraryResult && (
                <div className="mt-3 rounded-lg bg-cloud p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{libraryResult.displayName}</div>
                      <div className="mt-1 text-[11px] text-ink/45">{libraryResult.source} · {libraryResult.servingBasis}</div>
                    </div>
                    <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-leaf text-white" onClick={addLibraryResultToCurrent} aria-label="加入当前记录">
                      <Plus size={17} />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
                    <div className="rounded-lg bg-white px-1 py-2">
                      <div className="font-black">{libraryResult.caloriesKcal}</div>
                      <div className="text-ink/45">kcal</div>
                    </div>
                    <div className="rounded-lg bg-white px-1 py-2">
                      <div className="font-black">{libraryResult.proteinG}</div>
                      <div className="text-ink/45">蛋白</div>
                    </div>
                    <div className="rounded-lg bg-white px-1 py-2">
                      <div className="font-black">{libraryResult.fatG}</div>
                      <div className="text-ink/45">脂肪</div>
                    </div>
                    <div className="rounded-lg bg-white px-1 py-2">
                      <div className="font-black">{libraryResult.carbsG}</div>
                      <div className="text-ink/45">碳水</div>
                    </div>
                  </div>
                </div>
              )}
            </section>

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
          <section className="mt-5 space-y-4">
            <div className="rounded-lg bg-white p-4 shadow-soft">
              <div className="text-base font-black">每日目标</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {targetFields.map((field) => (
                  <label key={field.key} className="rounded-lg bg-cloud p-3">
                    <span className="text-xs font-semibold text-ink/55">{field.label}</span>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2">
                      <input
                        className="w-full min-w-0 bg-transparent text-lg font-black outline-none"
                        inputMode="numeric"
                        value={targets[field.key]}
                        onChange={(event) => updateTargets({ ...targets, [field.key]: Number(event.target.value || 0) })}
                      />
                      <span className="shrink-0 text-xs text-ink/45">{field.unit}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button className="mt-4 w-full rounded-lg bg-ink px-4 py-3 text-sm font-black text-white" onClick={() => updateTargets(defaultTargets)}>
                恢复默认目标
              </button>
            </div>
            <div className="rounded-lg bg-mint p-3 text-sm leading-6 text-leaf">
              修改后会保存在这台手机里，并立刻影响“今日完成度”和目标对比。以后接入登录后，可以同步到云端。
            </div>
          </section>
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </main>
  )
}
