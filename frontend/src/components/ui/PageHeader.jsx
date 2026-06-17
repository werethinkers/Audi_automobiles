// src/components/ui/PageHeader.jsx
export default function PageHeader({ title, breadcrumb = [], actions = [] }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-200/60 font-sans">
      <div>
        {breadcrumb.length > 0 && (
          <nav className="flex text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {breadcrumb.map((item, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && <span className="mx-2 text-slate-300">/</span>}
                {item}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold font-display text-slate-800 tracking-tight">{title}</h1>
      </div>
      
      {actions.length > 0 && (
        <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
          {actions.map((act, index) => (
            <button
              key={index}
              onClick={act.onClick}
              className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                act.primary
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
