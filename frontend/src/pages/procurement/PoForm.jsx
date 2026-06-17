import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreatePo } from '../../api/procurement'
import { useVendorList } from '../../api/vendor'
import { useRmList } from '../../api/rm'
import api from '../../api/client'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
 
export default function PoForm() {
  const navigate = useNavigate()
  const createMutation = useCreatePo()
  
  const { data: vendors } = useVendorList({ is_active: true })
  const { data: rms } = useRmList({ is_active: true })
 
  // Fetch PO statuses
  const { data: statuses } = useQuery({
    queryKey: ['po_statuses'],
    queryFn: () => api.get('/procurement/po-statuses').then(r => r.data)
  })
 
  // Form Header State
  const [poNumber, setPoNumber] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
 
  // Line Items State
  const [lines, setLines] = useState([
    { rm_id: '', order_qty: 1, unit_price: 0, gst_percent: 18 }
  ])
 
  // Generate random PO number for ease
  useEffect(() => {
    const num = 'PO-' + Math.floor(100000 + Math.random() * 900000)
    setPoNumber(num)
  }, [])
 
  const addLine = () => {
    setLines([...lines, { rm_id: '', order_qty: 1, unit_price: 0, gst_percent: 18 }])
  }
 
  const removeLine = (index) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, i) => i !== index))
  }
 
  const updateLine = (index, key, val) => {
    const updated = [...lines]
    updated[index][key] = val
    setLines(updated)
  }
 
  const calculateLineTotal = (line) => {
    const qty = parseFloat(line.order_qty) || 0
    const price = parseFloat(line.unit_price) || 0
    const gst = parseFloat(line.gst_percent) || 0
    return qty * price * (1 + gst / 100)
  }
 
  const calculateGrandTotal = () => {
    return lines.reduce((sum, line) => sum + calculateLineTotal(line), 0)
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!vendorId) {
      toast.error('Please select a vendor')
      return
    }
    if (lines.some(l => !l.rm_id)) {
      toast.error('Please select raw materials for all lines')
      return
    }
 
    // Default status to DRAFT
    const draftStatus = statuses?.find(s => s.code === 'DRAFT')
 
    const payload = {
      po_number: poNumber,
      vendor_id: vendorId,
      order_date: orderDate,
      expected_delivery_date: expectedDate || null,
      status_id: draftStatus?.id || null,
      notes: notes || null,
      details: lines.map(l => ({
        rm_id: l.rm_id,
        order_qty: parseFloat(l.order_qty),
        unit_price: parseFloat(l.unit_price),
        gst_percent: parseFloat(l.gst_percent)
      }))
    }
 
    try {
      await createMutation.mutateAsync(payload)
      toast.success('Purchase Order created in DRAFT!')
      navigate('/purchase-orders')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error creating Purchase Order')
    }
  }
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Create Purchase Order"
        breadcrumb={['Procurement', 'Purchase Orders', 'New']}
      />
 
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-6">
        {/* Header Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PO Number *</label>
            <input
              type="text" required value={poNumber} onChange={e => setPoNumber(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor *</label>
            <select
              value={vendorId} required onChange={e => setVendorId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Select Vendor</option>
              {vendors?.map(v => (
                <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Order Date *</label>
            <input
              type="date" required value={orderDate} onChange={e => setOrderDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Expected Delivery Date</label>
            <input
              type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
            <input
              type="text" placeholder="Add custom terms, payment schedules..." value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>
 
        {/* Dynamic Lines Section */}
        <div className="border-t border-slate-100 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Line Items</h3>
            <button
              type="button" onClick={addLine}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Add Row
            </button>
          </div>
 
          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50/40 p-4 rounded-xl border border-slate-200/40">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Raw Material *</label>
                  <select
                    value={line.rm_id} required onChange={e => updateLine(index, 'rm_id', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">Select Material</option>
                    {rms?.map(r => (
                      <option key={r.rm_id} value={r.rm_id}>{r.name} ({r.part_no || 'No part no.'})</option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full md:w-32">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Order Qty *</label>
                  <input
                    type="number" step="any" min="0.001" required value={line.order_qty}
                    onChange={e => updateLine(index, 'order_qty', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                  />
                </div>
 
                <div className="w-full md:w-36">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Unit Price * (INR)</label>
                  <input
                    type="number" step="any" min="0" required value={line.unit_price}
                    onChange={e => updateLine(index, 'unit_price', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                  />
                </div>
 
                <div className="w-full md:w-24">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">GST %</label>
                  <input
                    type="number" step="any" min="0" value={line.gst_percent}
                    onChange={e => updateLine(index, 'gst_percent', e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                  />
                </div>
 
                <div className="w-full md:w-36 text-right">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Line Sum</span>
                  <span className="text-sm font-semibold text-slate-700 block py-1.5">
                    ₹{calculateLineTotal(line).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
 
                <button
                  type="button" disabled={lines.length === 1} onClick={() => removeLine(index)}
                  className="p-2 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 rounded-lg disabled:opacity-30 cursor-pointer"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
 
        {/* Grand Total & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-end border-t border-slate-100 pt-6">
          <div className="mb-4 md:mb-0">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase Order Grand Total</span>
            <span className="text-2xl font-bold font-display text-slate-800">
              ₹{calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button" onClick={() => navigate('/purchase-orders')}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
            >
              Save Draft PO
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
