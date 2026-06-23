import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConsumeStock, useSingleBalance } from '../../api/inventory'
import { useStoreList } from '../../api/store'
import { useRmList } from '../../api/rm'
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
import {
  BuildingStorefrontIcon,
  CubeIcon,
  HashtagIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ChatBubbleBottomCenterTextIcon,
  InboxArrowDownIcon,
  ArrowLeftIcon,
  CheckIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

const inputCls = "w-full px-3.5 py-2.5 border border-slate-200 rounded outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 text-sm text-[#2c3e50] transition-all bg-white"

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function Consumption() {
  const navigate = useNavigate()
  const { data: stores } = useStoreList({ is_active: true })
  const { data: rms }    = useRmList({ is_active: true })

  const [storeId, setStoreId]         = useState('')
  const [rmId, setRmId]               = useState('')
  const [qty, setQty]                 = useState('')
  const [consumedDate, setConsumedDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [remarks, setRemarks]         = useState('')

  const { data: availableQty, refetch: refetchBalance } = useSingleBalance(rmId, storeId)
  const consumeMutation = useConsumeStock()

  useEffect(() => { if (rmId && storeId) refetchBalance() }, [rmId, storeId, refetchBalance])

  const selectedRm = rms?.find(r => r.rm_id === rmId)
  const avail      = availableQty !== undefined ? parseFloat(availableQty) : null
  const qtyNum     = parseFloat(qty) || 0
  const ratio      = avail !== null && avail > 0 ? Math.min(100, (qtyNum / avail) * 100) : 0
  const isOverDraw = avail !== null && qtyNum > avail && avail > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!storeId || !rmId) { toast.error('Please select both a store and a material'); return }
    if (qtyNum <= 0) { toast.error('Quantity must be greater than zero'); return }
    if (avail !== null && qtyNum > avail) {
      toast.error(`Insufficient stock! Available: ${avail} ${selectedRm?.unit_of_measurement}`)
      return
    }
    try {
      await consumeMutation.mutateAsync({ rm_id: rmId, store_id: storeId, qty: qtyNum, consumed_date: consumedDate, description: description || null, remarks: remarks || null })
      toast.success('Material issued successfully!')
      setQty(''); setDescription(''); setRemarks('')
      refetchBalance()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to issue material')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Issue Material"
        subtitle="Record manual material consumption from a store"
        breadcrumb={[{ label: 'Inventory', href: '/dashboard' }, { label: 'Issue Material' }]}
        actions={[{ label: 'Back', onClick: () => navigate('/stock-balance'), icon: ArrowLeftIcon }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-[#2c3e50] text-white px-5 py-3 flex items-center gap-2">
            <InboxArrowDownIcon className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide">Issue Details</p>
              <p className="text-xs text-slate-400">Select source, material and specify quantity</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Source Store" required>
                <div className="relative">
                  <BuildingStorefrontIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select value={storeId} required onChange={e => setStoreId(e.target.value)} className={inputCls + " pl-9 cursor-pointer"}>
                    <option value="">Select Store</option>
                    {stores?.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name}</option>)}
                  </select>
                </div>
              </Field>

              <Field label="Raw Material" required>
                <div className="relative">
                  <CubeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select value={rmId} required onChange={e => setRmId(e.target.value)} className={inputCls + " pl-9 cursor-pointer"}>
                    <option value="">Select Material</option>
                    {rms?.map(r => <option key={r.rm_id} value={r.rm_id}>{r.name} ({r.part_no || 'No part no.'})</option>)}
                  </select>
                </div>
              </Field>

              <Field label="Quantity to Issue" required hint={selectedRm ? `Unit: ${selectedRm.unit_of_measurement}` : undefined}>
                <div className="relative">
                  <HashtagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number" step="any" min="0.001" required value={qty}
                    onChange={e => setQty(e.target.value)} placeholder="0.00"
                    className={`${inputCls} pl-9 ${isOverDraw ? 'border-red-300 focus:border-red-500' : ''}`}
                  />
                </div>
                {isOverDraw && (
                  <p className="text-xs text-red-500 mt-1 font-bold flex items-center gap-1">
                    <ShieldExclamationIcon className="w-3.5 h-3.5" />
                    Exceeds available stock ({avail?.toLocaleString()} {selectedRm?.unit_of_measurement})
                  </p>
                )}
              </Field>

              <Field label="Issue Date" required>
                <div className="relative">
                  <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="date" required value={consumedDate} onChange={e => setConsumedDate(e.target.value)} className={inputCls + " pl-9"} />
                </div>
              </Field>

              <Field label="Purpose / Description" hint="e.g. Production Line A, Prototype Testing">
                <div className="relative">
                  <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this material used for?" className={inputCls + " pl-9"} />
                </div>
              </Field>

              <Field label="Remarks">
                <div className="relative">
                  <ChatBubbleBottomCenterTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional remarks..." className={inputCls + " pl-9"} />
                </div>
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => navigate('/stock-balance')} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                type="submit" disabled={consumeMutation.isPending || isOverDraw}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#3498db] hover:bg-[#2980b9] text-white rounded text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {consumeMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing...</>
                  : <><CheckIcon className="w-4 h-4" /> Issue Stock</>
                }
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#2c3e50] text-white px-4 py-3 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-[#3498db]" />
              <span className="text-sm font-bold uppercase tracking-wide">Live Stock Preview</span>
            </div>

            <div className="p-4">
              {rmId && storeId ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Material</p>
                    <p className="text-sm font-bold text-[#2c3e50]">{selectedRm?.name}</p>
                    {selectedRm?.part_no && <span className="font-mono text-xs text-[#3498db] bg-[#3498db]/10 px-2 py-0.5 rounded mt-1 inline-block">{selectedRm.part_no}</span>}
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Available Stock</p>
                    <p className={`text-3xl font-black ${avail === 0 ? 'text-red-600' : 'text-[#2c3e50]'}`}>
                      {avail !== null ? avail.toLocaleString() : '—'}
                      <span className="text-sm font-semibold text-slate-400 ml-2">{selectedRm?.unit_of_measurement}</span>
                    </p>
                  </div>

                  {qtyNum > 0 && avail !== null && avail > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-2">
                        <span>Issue amount</span>
                        <span className={`font-bold ${isOverDraw ? 'text-red-500' : 'text-[#3498db]'}`}>{ratio.toFixed(0)}% of available</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isOverDraw ? 'bg-red-500' : ratio > 75 ? 'bg-amber-500' : 'bg-[#3498db]'}`}
                          style={{ width: `${Math.min(100, ratio)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                        <span>Remaining after issue:</span>
                        <span className={`font-bold ${isOverDraw ? 'text-red-500' : 'text-green-600'}`}>
                          {isOverDraw ? 'Insufficient!' : `${(avail - qtyNum).toLocaleString()} ${selectedRm?.unit_of_measurement}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {avail === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
                      <ShieldExclamationIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs font-bold text-red-700">No stock available in this store</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CubeIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Select a store and material to see live stock levels</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-4">
            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
              <ShieldExclamationIcon className="w-4 h-4" /> Guidelines
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Ensure quantity is within available stock</li>
              <li>Record a purpose for better traceability</li>
              <li>Every issue is logged in the stock ledger</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
