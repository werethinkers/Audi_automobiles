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
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
import {
  CubeIcon,
  TagIcon,
  BeakerIcon,
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  ShieldExclamationIcon,
  ClockIcon,
  CheckBadgeIcon,
  SparklesIcon,
  TrashIcon,
  ArrowLeftIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

// ── Field wrapper ──────────────────────────────────────────────────────────────
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

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color = 'blue' }) {
  const colorMap = {
    blue:   'bg-[#3498db]/10 text-[#3498db] border-[#3498db]/20',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber:  'bg-amber-50 text-amber-600 border-amber-200',
    green:  'bg-green-50 text-green-600 border-green-200',
  }
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#2c3e50]">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Input styles ───────────────────────────────────────────────────────────────
const inputCls = "w-full px-3.5 py-2.5 border border-slate-200 rounded outline-none focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/10 text-sm text-[#2c3e50] transition-all bg-white"
const selectCls = inputCls + " cursor-pointer"

export default function RmForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: matTypes }      = useMaterialTypes()
  const { data: procSources }   = useProcurementSources()

  const [name, setName]               = useState('')
  const [partNo, setPartNo]           = useState('')
  const [uom, setUom]                 = useState('')
  const [description, setDescription] = useState('')
  const [matTypeId, setMatTypeId]     = useState('')
  const [procSourceId, setProcSourceId] = useState('')
  const [minStock, setMinStock]       = useState('')
  const [leadTime, setLeadTime]       = useState('')
  const [isActive, setIsActive]       = useState(true)

  const { data: rm, isLoading: detailLoading } = useRmDetail(id)
  const createMutation    = useCreateRm()
  const updateMutation    = useUpdateRm()
  const deleteMutation    = useDeleteRm()

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
      } catch {
        toast.error('Error deactivating material')
      }
    }
  }

  if (isEdit && detailLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading material details...</p>
        </div>
      </div>
    )
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title={isEdit ? `Edit: ${rm?.name || 'Raw Material'}` : 'Add New Raw Material'}
        subtitle={isEdit ? `RM ID: ${id}` : 'Fill in the details to register a new material'}
        breadcrumb={['Masters', 'Raw Materials', isEdit ? 'Edit' : 'New']}
        actions={[
          {
            label: 'Back to List',
            onClick: () => navigate('/rm-master'),
            icon: ArrowLeftIcon
          }
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Section 1: Basic Info ────────────────────────────────── */}
        <div className="bg-white rounded border border-slate-200 shadow-sm p-6">
          <SectionHeader
            icon={CubeIcon}
            title="Basic Information"
            subtitle="Core identity fields for the raw material"
            color="blue"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Material Name" required>
              <input
                type="text" required value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Aluminium Sheet 3mm"
                className={inputCls}
              />
            </Field>

            <Field label="Part Number" hint="Leave blank if not applicable">
              <div className="relative">
                <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" value={partNo}
                  onChange={e => setPartNo(e.target.value)}
                  placeholder="e.g. ALU-3MM-001"
                  className={inputCls + " pl-9 font-mono"}
                />
              </div>
            </Field>

            <Field label="Unit of Measurement (UOM)" required hint="e.g. Kg, Pcs, Mtr, Ltr">
              <div className="relative">
                <BeakerIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text" required value={uom}
                  onChange={e => setUom(e.target.value)}
                  placeholder="Kg / Pcs / Mtr"
                  className={inputCls + " pl-9"}
                />
              </div>
            </Field>

            <Field label="Description">
              <div className="relative">
                <DocumentTextIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea
                  rows="3" value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional notes about this material..."
                  className={inputCls + " pl-9 resize-none"}
                />
              </div>
            </Field>
          </div>
        </div>

        {/* ── Section 2: Classification ───────────────────────────── */}
        <div className="bg-white rounded border border-slate-200 shadow-sm p-6">
          <SectionHeader
            icon={WrenchScrewdriverIcon}
            title="Classification"
            subtitle="Material type and procurement source details"
            color="purple"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Material Type">
              <div className="relative">
                <WrenchScrewdriverIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={matTypeId} onChange={e => setMatTypeId(e.target.value)}
                  className={selectCls + " pl-9"}
                >
                  <option value="">Select Type</option>
                  {matTypes?.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Procurement Source">
              <div className="relative">
                <TruckIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={procSourceId} onChange={e => setProcSourceId(e.target.value)}
                  className={selectCls + " pl-9"}
                >
                  <option value="">Select Source</option>
                  {procSources?.map(src => (
                    <option key={src.id} value={src.id}>{src.name}</option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
        </div>

        {/* ── Section 3: Stock Settings ───────────────────────────── */}
        <div className="bg-white rounded border border-slate-200 shadow-sm p-6">
          <SectionHeader
            icon={ShieldExclamationIcon}
            title="Stock & Replenishment Settings"
            subtitle="Safety stock and lead time configuration"
            color="amber"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Minimum Safety Stock Level" hint="Alert triggers below this quantity">
              <div className="relative">
                <ShieldExclamationIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number" step="any" value={minStock}
                  onChange={e => setMinStock(e.target.value)}
                  placeholder="0.00"
                  className={inputCls + " pl-9"}
                />
              </div>
            </Field>

            <Field label="Lead Time (Days)" hint="Expected days from order to delivery">
              <div className="relative">
                <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number" value={leadTime}
                  onChange={e => setLeadTime(e.target.value)}
                  placeholder="e.g. 14"
                  className={inputCls + " pl-9"}
                />
              </div>
            </Field>
          </div>

          {isEdit && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                  onClick={() => setIsActive(v => !v)}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Active Listing</p>
                  <p className="text-xs text-slate-400">{isActive ? 'This material is available for use' : 'This material is deactivated'}</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* ── Form Actions ─────────────────────────────────────────── */}
        <div className="bg-white rounded border border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
          <div>
            {isEdit && (
              <button
                type="button" onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded text-sm font-bold hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
                Deactivate
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button" onClick={() => navigate('/rm-master')}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded text-sm font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#3498db] text-white rounded text-sm font-bold hover:bg-[#2980b9] shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                : <><CheckIcon className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Material'}</>
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
