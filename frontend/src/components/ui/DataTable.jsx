// src/components/ui/DataTable.jsx
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

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

export default function DataTable({ columns, data, onRowClick, loading }) {
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} cols={columns.length} />)}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center font-sans">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <MagnifyingGlassIcon className="w-6 h-6 text-slate-400" />
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
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`
                transition-colors duration-100
                ${onRowClick ? 'cursor-pointer hover:bg-[#3498db]/5' : ''}
              `}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">{data.length} record{data.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
