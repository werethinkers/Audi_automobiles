// src/components/ui/StatCard.jsx
// Vibrant gradient stat card — each color produces a distinct rich gradient
export default function StatCard({ title, value, sub, icon: Icon, color = 'blue' }) {
  const styleMap = {
    blue:   { gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'border-blue-300/30',   icon: 'bg-blue-700' },
    green:  { gradient: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'border-green-300/30',  icon: 'bg-green-700' },
    amber:  { gradient: 'linear-gradient(135deg, #d97706, #b45309)', border: 'border-amber-300/30',  icon: 'bg-amber-700' },
    red:    { gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)', border: 'border-red-300/30',    icon: 'bg-red-700' },
    purple: { gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)', border: 'border-purple-300/30', icon: 'bg-purple-700' },
    orange: { gradient: 'linear-gradient(135deg, #ea580c, #c2410c)', border: 'border-orange-300/30', icon: 'bg-orange-700' },
    slate:  { gradient: 'linear-gradient(135deg, #475569, #334155)', border: 'border-slate-300/30',  icon: 'bg-slate-600' },
    gray:   { gradient: 'linear-gradient(135deg, #475569, #334155)', border: 'border-slate-300/30',  icon: 'bg-slate-600' },
  }

  const s = styleMap[color] || styleMap.blue

  return (
    <div
      className={`relative rounded-2xl p-5 overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 border ${s.border}`}
      style={{ background: s.gradient }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -right-2 w-12 h-12 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between mb-4">
        {Icon && (
          <div className={`w-11 h-11 rounded-xl ${s.icon} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
        <p className="text-3xl font-black text-white leading-none">{value ?? '—'}</p>
      </div>
      <div className="relative">
        <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">{title}</p>
        {sub && <p className="text-xs text-white/55 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
