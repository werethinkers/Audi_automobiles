import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConsumeStock, useSingleBalance } from '../../api/inventory'
import { useStoreList } from '../../api/store'
import { useRmList } from '../../api/rm'
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
 
export default function Consumption() {
  const navigate = useNavigate()
  const { data: stores } = useStoreList({ is_active: true })
  const { data: rms } = useRmList({ is_active: true })
  
  const [storeId, setStoreId] = useState('')
  const [rmId, setRmId] = useState('')
  const [qty, setQty] = useState('')
  const [consumedDate, setConsumedDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [remarks, setRemarks] = useState('')
 
  // Fetch available balance dynamically
  const { data: availableQty, refetch: refetchBalance } = useSingleBalance(rmId, storeId)
  const consumeMutation = useConsumeStock()
 
  useEffect(() => {
    if (rmId && storeId) {
      refetchBalance()
    }
  }, [rmId, storeId, refetchBalance])
 
  const getSelectedRm = () => rms?.find(r => r.rm_id === rmId)
  const selectedRm = getSelectedRm()
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!storeId || !rmId) {
      toast.error('Please select both a store and a material')
      return
    }
 
    const valQty = parseFloat(qty) || 0
    if (valQty <= 0) {
      toast.error('Quantity must be greater than zero')
      return
    }
 
    if (availableQty !== undefined && valQty > parseFloat(availableQty)) {
      toast.error(`Insufficient stock! Available: ${availableQty} ${selectedRm?.unit_of_measurement}`)
      return
    }
 
    const payload = {
      rm_id: rmId,
      store_id: storeId,
      qty: valQty,
      consumed_date: consumedDate,
      description: description || null,
      remarks: remarks || null
    }
 
    try {
      await consumeMutation.mutateAsync(payload)
      toast.success('Material issued successfully!')
      setQty('')
      setDescription('')
      setRemarks('')
      refetchBalance()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to issue material')
    }
  }
 
  return (
    <div className="p-6 space-y-6 font-sans max-w-2xl">
      <PageHeader
        title="Issue Material (Manual Consumption)"
        breadcrumb={['Inventory', 'Issue Material']}
      />
 
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Source Store *</label>
            <select
              value={storeId} required onChange={e => setStoreId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Select Store</option>
              {stores?.map(s => (
                <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
              ))}
            </select>
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Raw Material *</label>
            <select
              value={rmId} required onChange={e => setRmId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Select Material</option>
              {rms?.map(r => (
                <option key={r.rm_id} value={r.rm_id}>{r.name} ({r.part_no || 'No part no.'})</option>
              ))}
            </select>
          </div>
 
          {/* Live stock preview helper */}
          {rmId && storeId && (
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-lg flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Stock in Store</span>
              <span className="text-sm font-bold text-slate-800">
                {availableQty !== undefined ? parseFloat(availableQty).toLocaleString() : '0'} {selectedRm?.unit_of_measurement}
              </span>
            </div>
          )}
 
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Quantity to Issue *</label>
            <input
              type="number" step="any" min="0.001" required value={qty} onChange={e => setQty(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Issue Date *</label>
            <input
              type="date" required value={consumedDate} onChange={e => setConsumedDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Purpose / Description</label>
            <input
              type="text" placeholder="e.g. Production Line A, Prototype Testing" value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Remarks</label>
            <input
              type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>
 
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <button
            type="button" onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
          >
            Issue Stock
          </button>
        </div>
      </form>
    </div>
  )
}
