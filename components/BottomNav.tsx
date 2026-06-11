import { Camera, Heart, Settings, Utensils } from 'lucide-react'
import type { ComponentType } from 'react'

type Tab = 'capture' | 'today' | 'favorites' | 'settings'

const items: { id: Tab; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { id: 'capture', label: '记录', icon: Camera },
  { id: 'today', label: '今日', icon: Utensils },
  { id: 'favorites', label: '常吃', icon: Heart },
  { id: 'settings', label: '目标', icon: Settings }
]

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/10 bg-white/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon
          const selected = active === item.id
          return (
            <button
              key={item.id}
              className={`flex flex-col items-center justify-center rounded-lg py-2 text-xs font-semibold ${selected ? 'bg-mint text-leaf' : 'text-ink/50'}`}
              onClick={() => onChange(item.id)}
            >
              <Icon size={20} />
              <span className="mt-1">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
