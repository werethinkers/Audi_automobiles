// src/components/ui/DataTable.jsx
export default function DataTable({ columns, data, onRowClick, loading }) {
  if (loading) return <div className='p-8 text-center text-slate-500 font-sans'>Loading...</div>
  if (!data?.length) return <div className='p-8 text-center text-slate-400 font-sans'>No records found</div>
  return (
    <div className='overflow-x-auto font-sans'>
      <table className='min-w-full divide-y divide-slate-200/80'>
        <thead className='bg-slate-50/70'>
          <tr>
            {columns.map(col => (
              <th key={col.key} className='px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider'>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='bg-white divide-y divide-slate-100'>
          {data.map((row, i) => (
            <tr key={i}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-blue-50/40 transition-colors' : ''} ${i%2===0?'bg-white':'bg-slate-50/20'}`}
            >
              {columns.map(col => (
                <td key={col.key} className='px-4 py-3 text-sm text-slate-700 whitespace-nowrap'>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
