// src/components/ui/PageHeader.jsx
import { ChevronRightIcon } from '@heroicons/react/24/outline'

export default function PageHeader({ title, subtitle, breadcrumb = [], actions = [] }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-5 gap-4 font-sans">
      <div>
        {breadcrumb.length > 0 && (
          <nav className="flex items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {breadcrumb.map((item, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && <ChevronRightIcon className="w-3 h-3 mx-1.5 text-slate-300 flex-shrink-0" />}
                <span>{item}</span>
              </span>
            ))}
          </nav>
        )}
        <h2 className="text-xl font-black text-[#2c3e50] tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2.5 flex-shrink-0">
          {actions.map((act, index) => (
            <button
              key={index}
              onClick={act.onClick}
              className={`
                inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded shadow-sm
                transition-all duration-150 cursor-pointer
                ${act.primary
                  ? 'bg-[#3498db] hover:bg-[#2980b9] text-white'
                  : act.danger
                  ? 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-[#2c3e50]'
                }
              `}
            >
              {act.icon && <act.icon className="w-4 h-4" />}
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
