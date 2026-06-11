import { Database, Sparkles } from 'lucide-react'
import type { AnalyzedIngredient } from '@/types/nutrition'
import { nutritionDelta } from '@/lib/nutrition'

type IngredientEditorProps = {
  ingredient: AnalyzedIngredient
  onChange: (ingredient: AnalyzedIngredient) => void
  onRematch: () => void
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="min-w-0">
      <span className="text-[11px] font-medium text-ink/55">{label}</span>
      <div className="mt-1 flex items-center gap-1 rounded-lg border border-ink/10 bg-white px-2 py-2">
        <input
          className="w-full min-w-0 bg-transparent text-sm font-semibold outline-none"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(Number(event.target.value || 0))}
        />
        <span className="shrink-0 text-[11px] text-ink/45">{suffix}</span>
      </div>
    </label>
  )
}

export function IngredientEditor({ ingredient, onChange, onRematch }: IngredientEditorProps) {
  const delta = nutritionDelta(ingredient, ingredient.standard)

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-3 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint text-leaf">
          <Sparkles size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-base font-bold outline-none"
            value={ingredient.name}
            onChange={(event) => onChange({ ...ingredient, name: event.target.value })}
            aria-label="食材名称"
          />
          <div className="mt-1 text-xs text-ink/55">AI 置信度 {Math.round(ingredient.confidence * 100)}%</div>
        </div>
        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink/10 text-ink/70"
          onClick={onRematch}
          title="重新匹配标准数据库"
          aria-label="重新匹配标准数据库"
        >
          <Database size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField label="重量" value={ingredient.weightG} suffix="g" onChange={(weightG) => onChange({ ...ingredient, weightG })} />
        <NumberField label="热量" value={ingredient.caloriesKcal} suffix="kcal" onChange={(caloriesKcal) => onChange({ ...ingredient, caloriesKcal })} />
        <NumberField label="蛋白质" value={ingredient.proteinG} suffix="g" onChange={(proteinG) => onChange({ ...ingredient, proteinG })} />
        <NumberField label="脂肪" value={ingredient.fatG} suffix="g" onChange={(fatG) => onChange({ ...ingredient, fatG })} />
        <NumberField label="碳水" value={ingredient.carbsG} suffix="g" onChange={(carbsG) => onChange({ ...ingredient, carbsG })} />
        <NumberField label="纤维" value={ingredient.fiberG} suffix="g" onChange={(fiberG) => onChange({ ...ingredient, fiberG })} />
      </div>

      <div className="mt-3 rounded-lg bg-cloud p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-ink/70">AI 估算 vs 标准数据库</div>
          <div className="text-[11px] text-ink/50">{ingredient.standard?.source || '未匹配'}</div>
        </div>
        {ingredient.standard ? (
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
            <div>
              <div className="font-bold">{ingredient.standard.caloriesKcal}</div>
              <div className="text-ink/45">kcal</div>
              <div className={delta && delta.caloriesKcal > 0 ? 'text-coral' : 'text-leaf'}>{delta?.caloriesKcal}</div>
            </div>
            <div>
              <div className="font-bold">{ingredient.standard.proteinG}</div>
              <div className="text-ink/45">蛋白</div>
              <div>{delta?.proteinG}</div>
            </div>
            <div>
              <div className="font-bold">{ingredient.standard.fatG}</div>
              <div className="text-ink/45">脂肪</div>
              <div>{delta?.fatG}</div>
            </div>
            <div>
              <div className="font-bold">{ingredient.standard.carbsG}</div>
              <div className="text-ink/45">碳水</div>
              <div>{delta?.carbsG}</div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-ink/50">可点右上角数据库按钮重新匹配。</div>
        )}
      </div>
    </section>
  )
}
