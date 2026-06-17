import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useRmDetail,
  useCreateRm,
  useUpdateRm,
  useDeleteRm,
  useMaterialTypes,
  useProcurementSources
} from '../../api/rm'
import { useCustomFieldsList, useCustomFieldValues, useSaveCustomFieldValues } from '../../api/customFields'
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
 
export default function RmForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
 
  // API Lookups
  const { data: matTypes } = useMaterialTypes()
  const { data: procSources } = useProcurementSources()
  const { data: customFields } = useCustomFieldsList({ entity_type: 'rm_master' })
  const { data: fieldValues } = useCustomFieldValues('rm_master', id)
 
  // Form State
  const [name, setName] = useState('')
  const [partNo, setPartNo] = useState('')
  const [uom, setUom] = useState('')
  const [description, setDescription] = useState('')
  const [matTypeId, setMatTypeId] = useState('')
  const [procSourceId, setProcSourceId] = useState('')
  const [minStock, setMinStock] = useState('')
  const [leadTime, setLeadTime] = useState('')
  const [isActive, setIsActive] = useState(true)
  
  // Custom Fields Values State
  const [cfValues, setCfValues] = useState({})
 
  // Query Detail for Edit
  const { data: rm, isLoading: detailLoading } = useRmDetail(id)
 
  // Mutations
  const createMutation = useCreateRm()
  const updateMutation = useUpdateRm()
  const deleteMutation = useDeleteRm()
  const saveCfValuesMutation = useSaveCustomFieldValues()
 
  // Load existing RM values
  useEffect(() => {
    if (isEdit && rm) {
      setName(rm.name || '')
      setPartNo(rm.part_no || '')
      setUom(rm.unit_of_measurement || '')
      setDescription(rm.description || '')
      setMatTypeId(rm.material_type_id || '')
      setProcSourceId(rm.procurement_source_id || '')
      setMinStock(rm.minimum_stock !== null ? String(rm.minimum_stock) : '')
      setLeadTime(rm.lead_time_days !== null ? String(rm.lead_time_days) : '')
      setIsActive(rm.is_active ?? true)
    }
  }, [isEdit, rm])
 
  // Load custom field values
  useEffect(() => {
    if (isEdit && fieldValues) {
      const vals = {}
      fieldValues.forEach(val => {
        vals[val.field_id] = val.field_value || ''
      })
      setCfValues(vals)
    }
  }, [isEdit, fieldValues])
 
  const handleCfChange = (fieldId, val) => {
    setCfValues(prev => ({ ...prev, [fieldId]: val }))
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name,
      part_no: partNo || null,
      unit_of_measurement: uom,
      description: description || null,
      material_type_id: matTypeId || null,
      procurement_source_id: procSourceId || null,
      minimum_stock: minStock !== '' ? parseFloat(minStock) : null,
      lead_time_days: leadTime !== '' ? parseInt(leadTime) : null,
    }
 
    try {
      let savedRmId = id
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload, is_active: isActive })
        toast.success('Material updated successfully!')
      } else {
        const res = await createMutation.mutateAsync(payload)
        savedRmId = res.rm_id
        toast.success('Material created successfully!')
      }
 
      // Save Custom Field Values if any
      if (customFields && customFields.length > 0) {
        const bulkValues = Object.keys(cfValues).map(fid => ({
          field_id: fid,
          field_value: String(cfValues[fid])
        }))
        if (bulkValues.length > 0) {
          await saveCfValuesMutation.mutateAsync({
            entity_type: 'rm_master',
            entity_id: savedRmId,
            values: bulkValues
          })
        }
      }
 
      navigate('/rm-master')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving material')
    }
  }
 
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to deactivate this material?')) {
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('Material deactivated')
        navigate('/rm-master')
      } catch (err) {
        toast.error('Error deactivating material')
      }
    }
  }
 
  if (isEdit && detailLoading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Loading details...</div>
  }
 
  return (
    <div className="p-6 space-y-6 font-sans max-w-4xl">
      <PageHeader
        title={isEdit ? 'Edit Raw Material' : 'Add New Raw Material'}
        breadcrumb={['Masters', 'Raw Materials', isEdit ? 'Edit' : 'New']}
      />
 
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Material Name *</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Part Number</label>
              <input
                type="text" value={partNo} onChange={e => setPartNo(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Unit of Measurement (UOM) *</label>
              <input
                type="text" required placeholder="e.g. Kg, Pcs, Mtr" value={uom} onChange={e => setUom(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</label>
              <textarea
                rows="3" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm resize-none"
              />
            </div>
          </div>
 
          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Material Type</label>
              <select
                value={matTypeId} onChange={e => setMatTypeId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option value="">Select Type</option>
                {matTypes?.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Procurement Source</label>
              <select
                value={procSourceId} onChange={e => setProcSourceId(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option value="">Select Source</option>
                {procSources?.map(src => (
                  <option key={src.id} value={src.id}>{src.name}</option>
                ))}
              </select>
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Minimum Safety Stock Level</label>
              <input
                type="number" step="any" value={minStock} onChange={e => setMinStock(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lead Time (Days)</label>
              <input
                type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
 
            {isEdit && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-600">Active Listing</label>
              </div>
            )}
          </div>
        </div>
 
        {/* Dynamic Custom Fields Section */}
        {customFields && customFields.length > 0 && (
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Additional Details (Custom Fields)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customFields.map(field => (
                <div key={field.field_id}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {field.field_label} {field.is_required && '*'}
                  </label>
                  {field.field_type === 'dropdown' ? (
                    <select
                      required={field.is_required}
                      value={cfValues[field.field_id] || ''}
                      onChange={e => handleCfChange(field.field_id, e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
                    >
                      <option value="">Select Option</option>
                      {field.dropdown_options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                      required={field.is_required}
                      value={cfValues[field.field_id] || ''}
                      onChange={e => handleCfChange(field.field_id, e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
 
        {/* Form Actions */}
        <div className="flex justify-between items-center border-t border-slate-100 pt-6">
          <div>
            {isEdit && (
              <button
                type="button" onClick={handleDelete}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer"
              >
                Deactivate
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button" onClick={() => navigate('/rm-master')}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
