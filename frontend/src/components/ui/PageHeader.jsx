// src/components/ui/PageHeader.jsx
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

/**
 * PageHeader
 * @param {string}   title
 * @param {string}   subtitle
 * @param {Array}    breadcrumb  - Array of { label, href } objects, or plain strings (non-clickable)
 * @param {string}   backHref    - If provided, shows a ← Back button that navigates here
 * @param {Array}    actions     - Array of { label, onClick, primary, danger, icon }
 */
export default function PageHeader({ title, subtitle, breadcrumb = [], backHref, actions = [] }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-5 gap-3 font-sans">
      <div className="min-w-0">
        {/* Breadcrumb nav */}
        {breadcrumb.length > 0 && (
          <nav className="flex items-center flex-wrap text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 gap-0.5">
            {breadcrumb.map((item, index) => {
              const label = typeof item === 'string' ? item : item.label
              const href  = typeof item === 'object' ? item.href : null
              const isLast = index === breadcrumb.length - 1

              return (
                <span key={index} className="flex items-center">
                  {index > 0 && <ChevronRightIcon className="w-3 h-3 mx-1 text-slate-300 flex-shrink-0" />}
                  {href && !isLast ? (
                    <Link
                      to={href}
                      className="hover:text-[#3498db] transition-colors cursor-pointer"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'text-slate-500' : ''}>{label}</span>
                  )}
                </span>
              )
            })}
          </nav>
        )}

        {/* Back button + title row */}
        <div className="flex items-center gap-3">
          {backHref && (
            <button
              onClick={() => navigate(backHref)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#2c3e50] transition-colors cursor-pointer flex-shrink-0 shadow-sm"
              title="Go back"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-[#2c3e50] tracking-tight leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2.5 flex-shrink-0 md:mt-0.5">
          {actions.map((act, index) => (
            <button
              key={index}
              onClick={act.onClick}
              className={`
                inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg shadow-sm
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
