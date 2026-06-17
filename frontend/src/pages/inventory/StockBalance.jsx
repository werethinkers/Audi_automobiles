import { useState } from 'react'
import { useInventoryBalances } from '../../api/inventory'
import { useStoreList } from '../../api/store'
import { useRmList } from '../../api/rm'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
 
export default function StockBalance() {
  const [storeId, setStoreId] = useState('')
  const { data: stores } = useStoreList({ is_active: true })
  const { data: rms } = useRmList({ is_active: true })
  const { data: balances, isLoading: balLoading } = useInventoryBalances(storeId ? { store_id: storeId } : {})
 
  const getRmName = (rmId) => {
    return rms?.find(r => r.rm_id === rmId)?.name || 'Unknown Material'
  }
 
  const getRmUom = (rmId) => {
    return rms?.find(r => r.rm_id === rmId)?.unit_of_measurement || ''
  }
 
  const getStoreName = (sId) => {
    return stores?.find(s => s.store_id === sId)?.store_name || 'Unknown Store'
  }
 
  const getStockHealth = (row) => {
    const rm = rms?.find(r => r.rm_id === row.rm_id)
    const minStock = rm?.minimum_stock || 0
    const qty = row.current_qty || 0
    
    if (minStock === 0) return <Badge variant="blue">Operational</Badge>
    if (qty === 0) return <Badge variant="red">Out of Stock</Badge>
    if (qty < minStock) return <Badge variant="amber">Low Stock</Badge>
    return <Badge variant="green">Healthy</Badge>
  }
 
  const COLUMNS = [
    { key: 'rm_id',        header: 'Material Name', render: v => <span className="font-semibold text-slate-800">{getRmName(v)}</span> },
    { key: 'store_id',     header: 'Store',         render: v => getStoreName(v) },
    { key: 'current_qty',  header: 'Current Stock', render: (v, row) => `${parseFloat(v).toLocaleString()} ${getRmUom(row.rm_id)}` },
    { 
      key: 'health',        
      header: 'Stock Health', 
      render: (_, row) => {
        const rm = rms?.find(r => r.rm_id === row.rm_id)
        const minStock = rm?.minimum_stock || 0
        const qty = row.current_qty || 0
        const ratio = minStock > 0 ? Math.min(100, (qty / minStock) * 100) : 100
        
        return (
          <div className="flex items-center gap-3">
            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/40">
              <div 
                className={`h-full rounded-full ${qty === 0 ? 'bg-red-500' : qty < minStock ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${ratio}%` }}
              ></div>
            </div>
            {getStockHealth(row)}
          </div>
        )
      } 
    }
  ]
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Stock Balances"
        breadcrumb={['Inventory', 'Stock Balance']}
      />
 
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        {/* Filter controls */}
        <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-slate-50/20">
          <div className="w-72">
            <select
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Stores</option>
              {stores?.map(s => (
                <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
              ))}
            </select>
          </div>
        </div>
 
        <DataTable
          columns={COLUMNS}
          data={balances}
          loading={balLoading}
        />
      </div>
    </div>
  )
}
