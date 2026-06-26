import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCreateGrn, usePoList, useGrnDetail, useUpdateGrn } from '../../api/procurement'
import { useStoreList } from '../../api/store'
import { useRmList } from '../../api/rm'
import PageHeader from '../../components/ui/PageHeader'
import api from '../../api/client'
import { toast } from 'react-hot-toast'
 
export default function GrnForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const createMutation = useCreateGrn()
  const updateMutation = useUpdateGrn()
  const { data: grn, isLoading: grnLoading } = useGrnDetail(id)
  
  const { data: pos } = usePoList()
  const { data: stores } = useStoreList({ is_active: true })
  const { data: rms } = useRmList({ is_active: true })
 
  // Form Header State
  const [grnNumber, setGrnNumber] = useState('')
  const [poId, setPoId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [dcNumber, setDcNumber] = useState('')
  const [remarks, setRemarks] = useState('')
 
  // Active PO Details
  const [poDetails, setPoDetails] = useState([])
  
  // Lines State representing GRN detail inputs
  const [lines, setLines] = useState([])
 
  // Generate GRN number
  useEffect(() => {
    if (!isEdit) {
      const num = 'GRN-' + Math.floor(100000 + Math.random() * 900000)
      setGrnNumber(num)
    }
  }, [isEdit])
 
  useEffect(() => {
    if (isEdit && grn) {
      setGrnNumber(grn.grn_number || '')
      setPoId(grn.po_id || '')
      setVendorId(grn.vendor_id || '')
      setReceivedDate(grn.received_date || '')
      setVehicleNumber(grn.vehicle_number || '')
      setDcNumber(grn.dc_number || '')
      setRemarks(grn.remarks || '')
      setLines(grn.details?.map(d => ({
        grn_detail_id: d.grn_detail_id,
        po_detail_id: d.po_detail_id,
        rm_id: d.rm_id,
        received_qty: d.received_qty,
        accepted_qty: d.accepted_qty,
        rejected_qty: d.rejected_qty,
        rejection_reason: d.rejection_reason || '',
        store_id: d.store_id || ''
      })) || [])
    }
  }, [isEdit, grn])

  // Trigger when PO selection changes: fetch PO details to load line items
  useEffect(() => {
    if (isEdit) return // Do not overwrite with PO details when editing/viewing
    if (!poId) {
      setLines([])
      setVendorId('')
      return
    }
 
    const selectedPo = pos?.find(p => p.po_id === poId)
    if (selectedPo) {
      setVendorId(selectedPo.vendor_id)
      
      // Load PO details (lines)
      setLines(selectedPo.details?.map(d => ({
        po_detail_id: d.po_detail_id,
        rm_id: d.rm_id,
        order_qty: d.order_qty,
        already_received: d.received_qty || 0,
        received_qty: d.order_qty - (d.received_qty || 0), // Default to remaining qty
        accepted_qty: d.order_qty - (d.received_qty || 0),
        rejected_qty: 0,
        rejection_reason: '',
        store_id: stores && stores.length > 0 ? stores[0].store_id : ''
      })) || [])
    }
  }, [poId, pos, stores])
 
  const getRmName = (rmId) => {
    return rms?.find(r => r.rm_id === rmId)?.name || 'Unknown Material'
  }

  const getPoDetailForGrnLine = (poDetailId) => {
    const selectedPo = pos?.find(p => p.po_id === (isEdit ? grn?.po_id : poId))
    return selectedPo?.details?.find(d => d.po_detail_id === poDetailId)
  }
 
  const updateLine = (index, key, val) => {
    const updated = [...lines]
    updated[index][key] = val
    
    // Automatically balance accepted/rejected if received qty changes
    if (key === 'received_qty') {
      const rec = parseFloat(val) || 0
      updated[index]['accepted_qty'] = rec
      updated[index]['rejected_qty'] = 0
    }
    // Automatically balance accepted if rejected qty changes
    if (key === 'rejected_qty') {
      const rej = parseFloat(val) || 0
      const rec = parseFloat(updated[index]['received_qty']) || 0
      updated[index]['accepted_qty'] = Math.max(0, rec - rej)
    }
    setLines(updated)
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!poId) {
      toast.error('Please select a Purchase Order')
      return
    }
    if (lines.some(l => !l.store_id)) {
      toast.error('Please select destination stores for all accepted items')
      return
    }
 
    const payload = {
      grn_number: grnNumber,
      po_id: poId,
      vendor_id: vendorId,
      received_date: receivedDate,
      vehicle_number: vehicleNumber || null,
      dc_number: dcNumber || null,
      grn_status: 'COMPLETED',
      remarks: remarks || null,
      details: lines.map(l => ({
        po_detail_id: l.po_detail_id,
        rm_id: l.rm_id,
        received_qty: parseFloat(l.received_qty),
        accepted_qty: parseFloat(l.accepted_qty),
        rejected_qty: parseFloat(l.rejected_qty),
        rejection_reason: l.rejection_reason || null,
        store_id: l.store_id
      }))
    }
 
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload })
        toast.success('Goods received note updated successfully!')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Goods received note filed successfully!')
      }
      navigate('/grn')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving GRN')
    }
  }
 
  if (isEdit && grnLoading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Loading details...</div>
  }

  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title={isEdit ? 'Edit Goods Received Note' : 'Log Goods Received Note'}
        breadcrumb={[
          { label: 'Procurement', href: '/dashboard' },
          { label: 'GRN Log', href: '/grn' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
        backHref="/grn"
      />
 
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-6">
        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">GRN Number *</label>
            <input
              type="text" required value={grnNumber} onChange={e => setGrnNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Purchase Order *</label>
            <select
              value={poId} required onChange={e => setPoId(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white cursor-pointer"
            >
              <option value="">Select PO</option>
              {pos?.filter(po => po.line_status !== 'COMPLETED' && po.line_status !== 'CANCELLED')?.map(p => (
                <option key={p.po_id} value={p.po_id}>{p.po_number}</option>
              ))}
            </select>
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Received Date *</label>
            <input
              type="date" required value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Number</label>
            <input
              type="text" placeholder="e.g. MH-12-AB-1234" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Delivery Challan (DC) Number</label>
            <input
              type="text" value={dcNumber} onChange={e => setDcNumber(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Remarks</label>
            <input
              type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
            />
          </div>
        </div>
 
        {/* Dynamic Lines (details) */}
        {lines.length > 0 && (
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Mappable Items from PO</h3>
            
            <div className="space-y-6">
              {lines.map((line, index) => {
                const poDetail = getPoDetailForGrnLine(line.po_detail_id)
                const orderQty = poDetail ? poDetail.order_qty : '—'
                const alreadyReceived = isEdit && poDetail ? poDetail.received_qty - line.accepted_qty : (poDetail ? poDetail.received_qty || 0 : '—')
 
                return (
                <div key={index} className="bg-slate-50/40 p-5 rounded-xl border border-slate-200/40 space-y-4">
                  {/* Item Summary Headers */}
                  <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                    <div>Material: <span className="text-slate-800 font-bold">{getRmName(line.rm_id)}</span></div>
                    <div>Ordered Qty: <span className="text-slate-800">{orderQty}</span></div>
                    <div>Already Received: <span className="text-slate-800">{alreadyReceived}</span></div>
                  </div>
 
                  {/* Inputs Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Received Qty</label>
                      <input
                        type="number" step="any" min="0" required value={line.received_qty}
                        onChange={e => updateLine(index, 'received_qty', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Accepted Qty</label>
                      <input
                        type="number" step="any" min="0" required value={line.accepted_qty}
                        onChange={e => updateLine(index, 'accepted_qty', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all"
                      />
                    </div>
 
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Rejected Qty</label>
                      <input
                        type="number" step="any" min="0" value={line.rejected_qty}
                        onChange={e => updateLine(index, 'rejected_qty', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all"
                      />
                    </div>
 
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Store Location (To Stock)</label>
                      <select
                        value={line.store_id} required onChange={e => updateLine(index, 'store_id', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white cursor-pointer"
                      >
                        <option value="">Select Store</option>
                        {stores?.map(s => (
                          <option key={s.store_id} value={s.store_id}>{s.store_name}</option>
                        ))}
                      </select>
                    </div>
 
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Rejection Reason</label>
                      <input
                        type="text" value={line.rejection_reason}
                        onChange={e => updateLine(index, 'rejection_reason', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
 
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <button
            type="button" onClick={() => navigate('/grn')}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit" disabled={lines.length === 0}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isEdit ? 'Update GRN' : 'File Goods Receipt'}
          </button>
        </div>
      </form>
    </div>
  )
}
