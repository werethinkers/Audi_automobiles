import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { 
  useBomDetail, 
  useCreateBom, 
  useUpdateBom, 
  useProductList,
  useCreateProduct // We'll add a quick way to create products if needed
} from '../../api/bom'
import { useRmList } from '../../api/rm'
import PageHeader from '../../components/ui/PageHeader'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function BomForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: initialData, isLoading: detailLoading } = useBomDetail(id)
  const { data: products } = useProductList()
  const { data: rmList } = useRmList({ is_active: true })
  const createBom = useCreateBom()
  const updateBom = useUpdateBom()
  const createProduct = useCreateProduct()

  const [newProductName, setNewProductName] = useState('')
  const [showNewProduct, setShowNewProduct] = useState(false)

  const { register, control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      bom_number: '',
      product_id: '',
      description: '',
      is_active: true,
      details: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details"
  })

  useEffect(() => {
    if (initialData && isEdit) {
      reset({
        bom_number: initialData.bom_number,
        product_id: initialData.product_id,
        description: initialData.description || '',
        is_active: initialData.is_active,
        details: initialData.details.map(d => ({
          rm_id: d.rm_id,
          quantity: d.quantity,
          uom: d.uom || '',
          scrap_percentage: d.scrap_percentage || 0
        }))
      })
    }
  }, [initialData, isEdit, reset])

  const onSubmit = async (data) => {
    if (data.details.length === 0) {
      toast.error('Please add at least one component to the BOM')
      return
    }

    try {
      if (isEdit) {
        await updateBom.mutateAsync({ id, data })
        toast.success('BOM updated successfully')
      } else {
        await createBom.mutateAsync(data)
        toast.success('BOM created successfully')
      }
      navigate('/bom')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'An error occurred')
    }
  }

  const handleCreateProduct = async () => {
    if (!newProductName.trim()) return
    try {
      const p = await createProduct.mutateAsync({ name: newProductName, unit_of_measurement: 'NOS' })
      toast.success('Product created')
      setValue('product_id', p.product_id)
      setShowNewProduct(false)
      setNewProductName('')
    } catch (e) {
      toast.error('Failed to create product')
    }
  }

  if (isEdit && detailLoading) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Bill of Materials' : 'Create Bill of Materials'}
        breadcrumb={[
          { label: 'Engineering', href: '/dashboard' },
          { label: 'BOM List', href: '/bom' },
          { label: isEdit ? 'Edit BOM' : 'New BOM' }
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">BOM Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Product <span className="text-red-500">*</span></label>
              {!showNewProduct ? (
                <div className="flex gap-2">
                  <select
                    {...register("product_id", { required: true })}
                    className="flex-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Product...</option>
                    {products?.map(p => (
                      <option key={p.product_id} value={p.product_id}>{p.name} {p.product_code ? `(${p.product_code})` : ''}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowNewProduct(true)} className="px-3 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100">
                    + New
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={newProductName}
                    onChange={e => setNewProductName(e.target.value)}
                    placeholder="Enter product name..."
                    className="flex-1 w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button type="button" onClick={handleCreateProduct} className="px-3 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100">Save</button>
                  <button type="button" onClick={() => setShowNewProduct(false)} className="px-3 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100">Cancel</button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">BOM Number <span className="text-red-500">*</span></label>
              <input
                {...register("bom_number", { required: true })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                placeholder="e.g. BOM-001"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Description</label>
              <textarea
                {...register("description")}
                rows={2}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="Optional description..."
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("is_active")}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-semibold text-slate-700">Active BOM</span>
              </label>
            </div>
          </div>
        </div>

        {/* Components Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Components / Raw Materials</h3>
            <button
              type="button"
              onClick={() => append({ rm_id: '', quantity: 1, uom: '', scrap_percentage: 0 })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Add Component
            </button>
          </div>
          
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-2 text-xs font-bold text-slate-500 uppercase">Raw Material</th>
                    <th className="pb-2 text-xs font-bold text-slate-500 uppercase w-32">Quantity</th>
                    <th className="pb-2 text-xs font-bold text-slate-500 uppercase w-24">UOM</th>
                    <th className="pb-2 text-xs font-bold text-slate-500 uppercase w-32">Scrap (%)</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="py-3 pr-2">
                        <select
                          {...register(`details.${index}.rm_id`, { required: true })}
                          className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-indigo-500"
                          onChange={(e) => {
                            // Auto-fill UOM when selecting RM
                            const selectedRm = rmList?.find(rm => rm.rm_id === e.target.value)
                            if (selectedRm) {
                              setValue(`details.${index}.uom`, selectedRm.unit_of_measurement)
                            }
                          }}
                        >
                          <option value="">Select RM...</option>
                          {rmList?.map(rm => (
                            <option key={rm.rm_id} value={rm.rm_id}>
                              {rm.name} {rm.part_no ? `(${rm.part_no})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          step="0.001"
                          {...register(`details.${index}.quantity`, { required: true, min: 0.001 })}
                          className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-indigo-500 text-right font-mono"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          {...register(`details.${index}.uom`)}
                          className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-indigo-500 uppercase"
                          placeholder="e.g. KG"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="number"
                          step="0.1"
                          {...register(`details.${index}.scrap_percentage`)}
                          className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-indigo-500 text-right font-mono"
                        />
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {fields.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                        No components added. Click "Add Component" to build your BOM.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/bom')}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
          >
            {isEdit ? 'Save Changes' : 'Create BOM'}
          </button>
        </div>
      </form>
    </div>
  )
}
