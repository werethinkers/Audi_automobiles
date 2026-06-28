import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVendorDetail, useVendorMaterials, useAddVendorMaterial } from '../../api/vendor'
import { useRmList } from '../../api/rm'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import { BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, IdentificationIcon, CurrencyRupeeIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function VendorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const { data: vendor, isLoading: vendorLoading } = useVendorDetail(id)
  const { data: materials, isLoading: materialsLoading } = useVendorMaterials(id)
  const { data: allRms } = useRmList({ is_active: true })
  
  const addMutation = useAddVendorMaterial()
  
  const [selectedRmId, setSelectedRmId] = useState('')
  const [standardCost, setStandardCost] = useState('')

  const handleAddMaterial = async (e) => {
    e.preventDefault()
    if (!selectedRmId) return toast.error('Please select a material')
    
    try {
      await addMutation.mutateAsync({
        vendor_id: id,
        rm_id: selectedRmId,
        standard_cost: standardCost ? parseFloat(standardCost) : null
      })
      toast.success('Material added to vendor')
      setSelectedRmId('')
      setStandardCost('')
    } catch (err) {
      toast.error('Failed to add material')
    }
  }

  const RM_COLUMNS = [
    { key: 'part_no', header: 'Part No', render: v => <span className="font-mono text-xs">{v || '—'}</span> },
    { key: 'name', header: 'Material Name', render: v => <span className="font-semibold text-slate-800">{v}</span> },
    { key: 'unit_of_measurement', header: 'UOM' },
    { key: 'standard_cost', header: 'Standard Cost', render: v => v ? `₹${parseFloat(v).toFixed(2)}` : '—' }
  ]

  if (vendorLoading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Loading profile...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={vendor?.name || 'Vendor Profile'}
        breadcrumb={[
          { label: 'Vendors', href: '/vendors' },
          { label: vendor?.name || 'Profile' }
        ]}
        backHref="/vendors"
        actions={[
          { label: 'Edit Profile', onClick: () => navigate(`/vendors/${id}/edit`), primary: true }
        ]}
      />

      <div className="space-y-6 animate-fade-in">
        {/* Combined Vendor Details Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IdentificationIcon className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700">Vendor Details</h3>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${vendor?.portal_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {vendor?.portal_enabled ? 'Portal Enabled' : 'Portal Disabled'}
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><BuildingOfficeIcon className="w-3.5 h-3.5"/> Contact</p>
                <p className="text-sm font-semibold text-slate-800">{vendor?.contact_person || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5"/> Phone</p>
                <p className="text-sm font-semibold text-slate-800">{vendor?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5"/> Email</p>
                <p className="text-sm font-semibold text-slate-800">{vendor?.email || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><IdentificationIcon className="w-3.5 h-3.5"/> GSTIN</p>
                <p className="text-sm font-mono font-bold text-slate-800">{vendor?.gst_number || '—'}</p>
              </div>
              
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><MapPinIcon className="w-3.5 h-3.5"/> Address</p>
                <p className="text-sm text-slate-700">{vendor?.address_line1 || '—'} {[vendor?.city, vendor?.state].filter(Boolean).join(', ') ? `- ${[vendor?.city, vendor?.state].filter(Boolean).join(', ')}` : ''}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5"><CurrencyRupeeIcon className="w-3.5 h-3.5"/> Payment Terms</p>
                <p className="text-sm text-slate-700">{vendor?.payment_terms || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Materials Supplied */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Raw Materials Supplied</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{materials?.length || 0} Items</span>
          </div>
          <div className="p-0 border-none">
            {materials?.length > 0 ? (
              <DataTable 
                columns={RM_COLUMNS} 
                data={materials} 
                loading={materialsLoading}
              />
            ) : materialsLoading ? (
              <DataTable columns={RM_COLUMNS} loading={true} />
            ) : (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
                  <IdentificationIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">No Materials Linked</p>
                <p className="text-sm text-slate-500 max-w-sm">Use the form below to link raw materials that you purchase from this vendor.</p>
              </div>
            )}
            
            {/* Inline Add Material Form */}
            <form onSubmit={handleAddMaterial} className="p-4 bg-slate-50/50 flex flex-wrap items-end gap-4 border-t border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Raw Material</label>
                <select 
                  value={selectedRmId} 
                  onChange={e => setSelectedRmId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-700 bg-white shadow-sm"
                >
                  <option value="">-- Select Material --</option>
                  {allRms?.map(rm => (
                    <option key={rm.rm_id} value={rm.rm_id} disabled={materials?.some(m => m.rm_id === rm.rm_id)}>
                      {rm.part_no ? `[${rm.part_no}] ` : ''}{rm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Std. Cost (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={standardCost}
                  onChange={e => setStandardCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-slate-700 bg-white shadow-sm"
                />
              </div>
              <button 
                type="submit" 
                disabled={!selectedRmId || addMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2 h-[38px]"
              >
                <PlusIcon className="w-4 h-4" />
                {addMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
