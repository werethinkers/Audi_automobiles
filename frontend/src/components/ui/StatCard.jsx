// src/components/ui/StatCard.jsx
export default function StatCard({ title, value, sub, icon: Icon, color = 'blue' }) {
  const accentMap = {
    blue:   'border-l-[#3498db]',
    green:  'border-l-emerald-400',
    amber:  'border-l-amber-400',
    red:    'border-l-red-400',
    purple: 'border-l-violet-400',
    slate:  'border-l-slate-400',
    gray:   'border-l-slate-400',
  }
  const iconBgMap = {
    blue:   'bg-slate-100 text-[#3498db]',
    green:  'bg-slate-100 text-emerald-600',
    amber:  'bg-slate-100 text-amber-600',
    red:    'bg-slate-100 text-red-500',
    purple: 'bg-slate-100 text-violet-600',
    slate:  'bg-slate-100 text-slate-500',
    gray:   'bg-slate-100 text-slate-500',
  }

  return (
    <div className={`
      bg-white rounded-xl border border-slate-200 border-l-4 ${accentMap[color]}
      shadow-sm p-5 flex items-start gap-4
      hover:shadow-md transition-shadow duration-200
    `}>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg ${iconBgMap[color]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-[#2c3e50] leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs font-medium mt-1 text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}
