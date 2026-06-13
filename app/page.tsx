'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Camera,
  Check,
  Database,
  Flame,
  Heart,
  History,
  Images,
  Loader2,
  Plus,
  RefreshCcw,
  ScanBarcode,
  Search,
  Sparkles,
  Target
} from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { IngredientEditor } from '@/components/IngredientEditor'
import { MetricPill } from '@/components/MetricPill'
import { PwaBootstrap } from '@/components/PwaBootstrap'
import { defaultTargets, summarizeDay, summarizeIngredients } from '@/lib/nutrition'
import type { AnalyzedIngredient, DailySummary, DailyTargets, FavoriteFood, Macro, MealEntry, MealType, NutritionMatch } from '@/types/nutrition'

type Tab = 'capture' | 'today' | 'favorites' | 'settings'
type AnalyzeMode = 'idle' | 'live' | 'mock' | 'error'
type SavedReport = {
  id: string
  date: string
  narrative: string
  summary: DailySummary
  meals: { label: string; total: Macro }[]
}

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

function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date)
}

function emptyMacro() {
  return { caloriesKcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 }
}

function kcal(value: number) {
  return Math.round(value)
}

function grams(value: number) {
  return Math.round(value * 10) / 10
}

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  const maxSide = 1280
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.78))
  bitmap.close()
  if (!blob) return file
  return new File([blob], 'meal-photo.jpg', { type: 'image/jpeg' })
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('capture')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [photoPreview, setPhotoPreview] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [ingredients, setIngredients] = useState<AnalyzedIngredient[]>([])
  const [entries, setEntries] = useState<MealEntry[]>([])
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [targets, setTargets] = useState<DailyTargets>(defaultTargets)
  const [targetDraft, setTargetDraft] = useState<DailyTargets>(defaultTargets)
  const [report, setReport] = useState('')
  const [reportHistory, setReportHistory] = useState<SavedReport[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [libraryWeight, setLibraryWeight] = useState(100)
  const [libraryResult, setLibraryResult] = useState<NutritionMatch | null>(null)
  const [libraryMessage, setLibraryMessage] = useState('')
  const [analyzeMode, setAnalyzeMode] = useState<AnalyzeMode>('idle')
  const [analyzeMessage, setAnalyzeMessage] = useState('')
  const [analyzeProvider, setAnalyzeProvider] = useState('')
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
    try {
      const savedTargets = window.localStorage.getItem('nutrition-targets')
      const savedReports = window.localStorage.getItem('nutrition-report-history')
      if (savedTargets) {
        const parsed = { ...defaultTargets, ...JSON.parse(savedTargets) }
        setTargets(parsed)
        setTargetDraft(parsed)
      }
      if (savedReports) setReportHistory(JSON.parse(savedReports))
    } catch {
      window.localStorage.removeItem('nutrition-targets')
      window.localStorage.removeItem('nutrition-report-history')
    }
    void refreshEntries()
    void refreshFavorites()
  }, [])

  function selectPhoto(file?: File) {
    if (!file) return
    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setIngredients([])
    setAnalyzeMode('idle')
    setAnalyzeMessage('')
    setAnalyzeProvider('')
  }

  async function analyzeSelectedPhoto() {
    if (!selectedPhoto) return
    setBusy('analyze')
    setAnalyzeMode('idle')
    setAnalyzeMessage('')

    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 60_000)
      const form = new FormData()
      const compressedPhoto = await compressImage(selectedPhoto)
      form.append('photo', compressedPhoto)
      const response = await fetch('/api/analyze-photo', { method: 'POST', body: form, signal: controller.signal })
      window.clearTimeout(timer)

      let data
      try {
        data = await response.json()
      } catch {
        data = { mode: 'error', error: `服务器返回异常，状态码 ${response.status}` }
      }

      setIngredients(data.ingredients || [])
      setAnalyzeMode(response.ok && data.mode === 'live' ? 'live' : data.mode === 'mock' ? 'mock' : 'error')
      setAnalyzeMessage(data.error || data.note || `识别失败，状态码 ${response.status}`)
      setAnalyzeProvider(data.provider || '')
    } catch (error) {
      setIngredients([])
      setAnalyzeMode('error')
      setAnalyzeMessage(error instanceof Error && error.name === 'AbortError' ? '识别超时，请换一张更小、更清晰的图片再试。' : '网络请求失败，请检查网络或稍后重试。')
      setAnalyzeProvider('')
    } finally {
      setBusy(null)
    }
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
    setSelectedPhoto(null)
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
    const narrative = data.narrative || ''
    setReport(narrative)
    const nextReport: SavedReport = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      narrative,
      summary: today,
      meals: mealsToday.map((meal) => ({ label: meal.label, total: meal.total }))
    }
    const nextHistory = [nextReport, ...reportHistory].slice(0, 14)
    setReportHistory(nextHistory)
    window.localStorage.setItem('nutrition-report-history', JSON.stringify(nextHistory))
    setBusy(null)
  }

  async function searchNutritionLibrary() {
    if (!libraryQuery.trim()) return
    setBusy('library')
    setLibraryMessage('')
    const response = await fetch('/api/match-nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: libraryQuery.trim(), weightG: libraryWeight })
    })
    const data = await response.json()
    setLibraryResult(data.match || null)
    if (!data.match) setLibraryMessage('暂时没查到。可以试试英文名，例如 chicken breast、oatmeal、greek yogurt。')
    if (data.match?.source === 'mock') setLibraryMessage('当前是演示匹配结果。如果 USDA Key 已配置，请确认 Vercel 已重新部署，并尽量用英文食材名查询。')
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

  function confirmTargets() {
    setTargets(targetDraft)
    window.localStorage.setItem('nutrition-targets', JSON.stringify(targetDraft))
  }

  return (
    <main className="safe-bottom min-h-screen bg-cloud">
      <PwaBootstrap />
      <div className="mx-auto max-w-md px-4 pt-5">
        <header
          className="relative -mx-4 -mt-5 min-h-[205px] overflow-hidden bg-cover bg-center px-4 pb-4 pt-6 text-white"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(23,33,27,0.10) 0%, rgba(23,33,27,0.45) 58%, rgba(23,33,27,0.78) 100%), url('/images/wellness-hero.png')" }}
        >
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-white/18 px-3 py-1 text-xs font-bold backdrop-blur">AI 初筛 + 标准库校准</div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/18 backdrop-blur">
              <Flame size={21} aria-hidden="true" />
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-4">
            <h1 className="whitespace-nowrap text-[28px] font-black leading-none tracking-normal">Coco AI营养记录</h1>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/16 px-3 py-2 backdrop-blur">
                <div className="text-[11px] text-white/75">今日热量</div>
                <div className="mt-0.5 text-sm font-black">{kcal(today.caloriesKcal)} kcal</div>
              </div>
              <div className="rounded-lg bg-white/16 px-3 py-2 backdrop-blur">
                <div className="text-[11px] text-white/75">蛋白质</div>
                <div className="mt-0.5 text-sm font-black">{grams(today.proteinG)} g</div>
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
                  <div className="mt-3 text-base font-black">先选择食物照片</div>
                  <div className="mt-1 text-xs text-ink/50">选好后再确认识别，避免误触就开始分析</div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-leaf px-3 text-sm font-black text-white">
                <Camera size={18} aria-hidden="true" />
                拍照
                <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => selectPhoto(event.target.files?.[0])} />
              </label>
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-black text-ink shadow-soft">
                <Images size={18} aria-hidden="true" />
                从相册选
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => selectPhoto(event.target.files?.[0])} />
              </label>
            </div>

            {selectedPhoto && !ingredients.length && (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <button className="rounded-lg bg-ink px-4 py-3 text-sm font-black text-white" onClick={analyzeSelectedPhoto}>
                  {busy === 'analyze' ? '识别中' : '确认，开始AI识别'}
                </button>
                <button
                  className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-ink/65 shadow-soft"
                  onClick={() => {
                    setSelectedPhoto(null)
                    setPhotoPreview('')
                  }}
                  aria-label="重新选择照片"
                >
                  <RefreshCcw size={18} />
                </button>
              </div>
            )}

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

            {analyzeMode === 'mock' && (
              <div className="rounded-lg bg-[#fff4cc] p-3 text-sm leading-6 text-[#8a6100]">
                现在返回的是演示数据，所以可能总是鸡胸肉、米饭、西兰花。请确认 Vercel 里 `ZHIPU_API_KEY` 已保存到 Production，并且保存后重新部署。
              </div>
            )}

            {analyzeMode === 'live' && (
              <div className="rounded-lg bg-mint p-3 text-sm font-semibold text-leaf">
                已使用智谱 GLM-4V-Flash 真实识别。
              </div>
            )}

            {analyzeMode === 'error' && (
              <div className="rounded-lg bg-[#ffe9e4] p-3 text-sm leading-6 text-coral">
                真实识别失败。通常是智谱 API Key 没生效、Key 填错、余额/额度不足，或保存环境变量后还没重新部署。{analyzeMessage ? `错误信息：${analyzeMessage}` : ''}
              </div>
            )}

            {ingredients.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <MetricPill label="热量" value={`${kcal(currentTotal.caloriesKcal)} kcal`} tone="coral" />
                  <MetricPill label="蛋白" value={`${grams(currentTotal.proteinG)} g`} tone="leaf" />
                  <MetricPill label="脂肪" value={`${grams(currentTotal.fatG)} g`} tone="yolk" />
                  <MetricPill label="碳水" value={`${grams(currentTotal.carbsG)} g`} />
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
                  <div className="mt-1 text-4xl font-black">{today.score}</div>
                  <div className="text-xs text-white/65">今日完成度</div>
                </div>
                <Target size={34} className="text-mint" aria-hidden="true" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MetricPill label="热量" value={`${kcal(today.caloriesKcal)} / ${targets.caloriesKcal} kcal`} tone="coral" />
                <MetricPill label="蛋白质" value={`${grams(today.proteinG)} / ${targets.proteinG} g`} tone="leaf" />
                <MetricPill label="脂肪" value={`${grams(today.fatG)} / ${targets.fatG} g`} tone="yolk" />
                <MetricPill label="碳水" value={`${grams(today.carbsG)} / ${targets.carbsG} g`} />
              </div>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button className="flex items-center justify-center gap-2 rounded-lg bg-leaf px-4 py-3 text-sm font-black text-white" onClick={generateReport}>
                {busy === 'report' ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
                生成今天日报
              </button>
              <button className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-ink shadow-soft" onClick={() => setShowHistory((value) => !value)} aria-label="查看历史日报">
                <History size={18} />
              </button>
            </div>

            {showHistory && (
              <section className="rounded-lg bg-white p-4 shadow-soft">
                <div className="text-base font-black">过去几天日报</div>
                <div className="mt-3 space-y-2">
                  {reportHistory.length ? (
                    reportHistory.map((item) => (
                      <button key={item.id} className="w-full rounded-lg bg-cloud p-3 text-left" onClick={() => setReport(item.narrative)}>
                        <div className="text-sm font-black">{todayLabel(new Date(item.date))}</div>
                        <div className="mt-1 text-xs text-ink/50">{kcal(item.summary.caloriesKcal)} kcal · 蛋白 {grams(item.summary.proteinG)} g</div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg bg-cloud p-3 text-sm text-ink/55">还没有历史日报。生成今天日报后会自动保存在这里。</div>
                  )}
                </div>
              </section>
            )}

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
                        <div className="text-sm font-black text-coral">{kcal(meal.total.caloriesKcal)} kcal</div>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{grams(meal.total.proteinG)} g</div>
                          <div className="text-ink/45">蛋白</div>
                        </div>
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{grams(meal.total.fatG)} g</div>
                          <div className="text-ink/45">脂肪</div>
                        </div>
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{grams(meal.total.carbsG)} g</div>
                          <div className="text-ink/45">碳水</div>
                        </div>
                        <div className="rounded-lg bg-white px-1 py-2">
                          <div className="font-black">{grams(meal.total.fiberG)} g</div>
                          <div className="text-ink/45">纤维</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg bg-ink p-3 text-white">
                  <div className="text-xs text-white/65">全天加总</div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
                    <div><div className="text-base font-black">{kcal(today.caloriesKcal)}</div><div className="text-white/55">kcal</div></div>
                    <div><div className="text-base font-black">{grams(today.proteinG)}g</div><div className="text-white/55">蛋白</div></div>
                    <div><div className="text-base font-black">{grams(today.fatG)}g</div><div className="text-white/55">脂肪</div></div>
                    <div><div className="text-base font-black">{grams(today.carbsG)}g</div><div className="text-white/55">碳水</div></div>
                  </div>
                </div>

                <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-mint p-3 text-sm leading-6 text-leaf">{report}</pre>
              </section>
            )}
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
                  <div className="mt-0.5 text-xs text-ink/50">优先查 USDA，包装食品查 Open Food Facts</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_86px_auto] gap-2">
                <input
                  className="min-w-0 rounded-lg bg-cloud px-3 py-3 text-sm font-semibold outline-none"
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder="chicken breast / oatmeal"
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

              {libraryMessage && <div className="mt-3 rounded-lg bg-[#fff4cc] p-3 text-xs leading-5 text-[#8a6100]">{libraryMessage}</div>}

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
                    <div className="rounded-lg bg-white px-1 py-2"><div className="font-black">{kcal(libraryResult.caloriesKcal)}</div><div className="text-ink/45">kcal</div></div>
                    <div className="rounded-lg bg-white px-1 py-2"><div className="font-black">{grams(libraryResult.proteinG)}g</div><div className="text-ink/45">蛋白</div></div>
                    <div className="rounded-lg bg-white px-1 py-2"><div className="font-black">{grams(libraryResult.fatG)}g</div><div className="text-ink/45">脂肪</div></div>
                    <div className="rounded-lg bg-white px-1 py-2"><div className="font-black">{grams(libraryResult.carbsG)}g</div><div className="text-ink/45">碳水</div></div>
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
                      <div className="mt-1 text-xs text-ink/50">{favorite.ingredients.length} 个食材 · {kcal(total.caloriesKcal)} kcal</div>
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
                        value={targetDraft[field.key]}
                        onChange={(event) => setTargetDraft({ ...targetDraft, [field.key]: Number(event.target.value || 0) })}
                      />
                      <span className="shrink-0 text-xs text-ink/45">{field.unit}</span>
                    </div>
                  </label>
                ))}
              </div>
              <button className="mt-4 w-full rounded-lg bg-leaf px-4 py-3 text-sm font-black text-white" onClick={confirmTargets}>
                确认修改
              </button>
            </div>
            <div className="rounded-lg bg-mint p-3 text-sm leading-6 text-leaf">
              点“确认修改”后会保存在这台手机里，并影响“今日完成度”和日报判断。
            </div>
          </section>
        )}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </main>
  )
}
