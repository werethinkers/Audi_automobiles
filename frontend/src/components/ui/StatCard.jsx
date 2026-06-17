// src/components/ui/StatCard.jsx
export default function StatCard({ title, value, sub, icon: Icon, color = 'blue' }) {
  const borderMap = {
    blue:   'border-l-[#3498db]',
    green:  'border-l-green-500',
    amber:  'border-l-amber-500',
    red:    'border-l-red-500',
    purple: 'border-l-purple-500',
    slate:  'border-l-slate-400',
    gray:   'border-l-slate-400',
  }
  const iconMap = {
    blue:   'bg-[#3498db]/10 text-[#3498db]',
    green:  'bg-green-100 text-green-600',
    amber:  'bg-amber-100 text-amber-600',
    red:    'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    slate:  'bg-slate-100 text-slate-500',
    gray:   'bg-slate-100 text-slate-500',
  }
  const subMap = {
    blue:   'text-[#3498db]',
    green:  'text-green-600',
    amber:  'text-amber-600',
    red:    'text-red-600',
    purple: 'text-purple-600',
    slate:  'text-slate-500',
    gray:   'text-slate-500',
  }

  return (
    <div className={`bg-white rounded border border-slate-200 border-l-4 ${borderMap[color]} shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow duration-200`}>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg ${iconMap[color]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">{title}</p>
        <p className="text-2xl font-black text-[#2c3e50] leading-tight">{value}</p>
        {sub && <p className={`text-xs font-semibold mt-1 ${subMap[color]}`}>{sub}</p>}
      </div>
    </div>
  )
}
