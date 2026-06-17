import { useState } from 'react'
import { useLedgerList } from '../../api/inventory'
import { useStoreList } from '../../api/store'
import { useRmList } from '../../api/rm'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import { format } from 'date-fns'
 
export default function Ledger() {
  const { data: stores } = useStoreList({ is_active: true })
  const { data: rms } = useRmList({ is_active: true })
  const [storeId, setStoreId] = useState('')
  const { data: logs, isLoading: logsLoading } = useLedgerList(storeId ? { store_id: storeId } : {})
 
  const getRmName = (rmId) => {
    return rms?.find(r => r.rm_id === rmId)?.name || 'Unknown Material'
  }
 
  const getStoreName = (sId) => {
    return stores?.find(s => s.store_id === sId)?.store_name || 'Unknown Store'
  }
 
  const getTransactionTypeBadge = (type) => {
    if (type === 'GRN_RECEIPT') return <Badge variant="green">GRN Receipt</Badge>
    if (type === 'CONSUMPTION') return <Badge variant="red">Consumption</Badge>
    if (type === 'TRANSFER_IN') return <Badge variant="blue">Transfer In</Badge>
    if (type === 'TRANSFER_OUT') return <Badge variant="purple">Transfer Out</Badge>
    return <Badge variant="gray">{type}</Badge>
  }
 
  const COLUMNS = [
    { 
      key: 'created_at', 
      header: 'Date & Time', 
      render: v => v ? format(new Date(v), 'dd-MMM-yyyy HH:mm:ss') : '-' 
    },
    { key: 'rm_id',            header: 'Material Name', render: v => <span className="font-semibold text-slate-800">{getRmName(v)}</span> },
    { key: 'store_id',         header: 'Store',         render: v => getStoreName(v) },
    { key: 'transaction_type', header: 'Transaction Type', render: v => getTransactionTypeBadge(v) },
    { 
      key: 'qty',              
      header: 'Quantity', 
      render: v => {
        const val = parseFloat(v)
        const isPos = val > 0
        return (
          <span className={`font-semibold ${isPos ? 'text-green-600' : 'text-red-500'}`}>
            {isPos ? '+' : ''}{val.toLocaleString()}
          </span>
        )
      } 
    },
    { key: 'balance_before',  header: 'Before Qty', render: v => parseFloat(v).toLocaleString() },
    { key: 'balance_after',   header: 'After Qty', render: v => parseFloat(v).toLocaleString() },
    { key: 'remarks',         header: 'Remarks',    render: v => v || '-' }
  ]
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Inventory Ledger"
        breadcrumb={['Inventory', 'Stock Ledger']}
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
          data={logs}
          loading={logsLoading}
        />
      </div>
    </div>
  )
}
