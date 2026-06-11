type MetricPillProps = {
  label: string
  value: string
  tone?: 'leaf' | 'coral' | 'yolk' | 'plain'
}

const tones = {
  leaf: 'bg-mint text-leaf',
  coral: 'bg-[#ffe9e4] text-coral',
  yolk: 'bg-[#fff4cc] text-[#8a6100]',
  plain: 'bg-white text-ink'
}

export function MetricPill({ label, value, tone = 'plain' }: MetricPillProps) {
  return (
    <div className={`rounded-lg px-3 py-2 ${tones[tone]}`}>
      <div className="text-[11px] font-medium opacity-70">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  )
}
