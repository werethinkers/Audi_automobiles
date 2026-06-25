// src/components/ui/DataTable.jsx
import { MagnifyingGlassIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'

function SkeletonRow({ cols }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3 bg-slate-200 rounded-full w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

/**
 * DataTable
 * @param {Array}    columns      - Column definitions: { key, header, render }
 * @param {Array}    data         - Rows of data
 * @param {boolean}  loading      - Show skeleton while loading
 * @param {Function} onRowClick   - Called with the row when the row is clicked
 * @param {Function} onEdit       - If provided, shows an Edit button per row
 * @param {Function} onDelete     - If provided, shows a Delete button per row
 * @param {string}   hoverColor   - Tailwind hover bg class e.g. 'hover:bg-blue-50/40'
 * @param {string}   editColor    - Tailwind classes for edit icon hover
 */
export default function DataTable({ columns, data, onRowClick, loading, onEdit, onDelete, hoverColor, editColor }) {
  const hasActions = onEdit || onDelete
  const rowHover   = hoverColor  || 'hover:bg-blue-50/40'
  const editHover  = editColor   || 'hover:text-blue-600 hover:bg-blue-50'

  if (loading) {
    return (
      <div className="overflow-x-auto font-sans">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
              {hasActions && <th className="px-4 py-3 w-24" />}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} cols={columns.length + (hasActions ? 1 : 0)} />)}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center font-sans">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <MagnifyingGlassIcon className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-600 mb-1">No records found</p>
        <p className="text-xs text-slate-400">Try adjusting your filters or add a new entry.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto font-sans">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {col.header}
              </th>
            ))}
            {hasActions && (
              <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-28">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`group transition-colors duration-100 ${onRowClick ? `cursor-pointer ${rowHover}` : ''}`}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {hasActions && (
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <div className="row-actions inline-flex items-center gap-1">
                    {onEdit && (
                      <button
                        title="Edit"
                        onClick={e => { e.stopPropagation(); onEdit(row) }}
                        className={`p-1.5 rounded-lg text-slate-400 ${editHover} transition-colors cursor-pointer`}
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        title="Delete"
                        onClick={e => { e.stopPropagation(); onDelete(row) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">
          {data.length} record{data.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
