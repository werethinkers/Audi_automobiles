import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStoreDetail, useCreateStore, useUpdateStore, useDeleteStore } from '../../api/store'
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
 
export default function StoreForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
 
  const [storeName, setStoreName] = useState('')
  const [location, setLocation] = useState('')
  const [isActive, setIsActive] = useState(true)
 
  const { data: store, isLoading: detailLoading } = useStoreDetail(id)
  
  const createMutation = useCreateStore()
  const updateMutation = useUpdateStore()
  const deleteMutation = useDeleteStore()
 
  useEffect(() => {
    if (isEdit && store) {
      setStoreName(store.store_name || '')
      setLocation(store.location || '')
      setIsActive(store.is_active ?? true)
    }
  }, [isEdit, store])
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      store_name: storeName,
      location: location || null,
    }
 
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload, is_active: isActive })
        toast.success('Store details updated successfully!')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Store created successfully!')
      }
      navigate('/stores')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving store')
    }
  }
 
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to deactivate this store?')) {
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('Store deactivated successfully!')
        navigate('/stores')
      } catch (err) {
        toast.error('Error deactivating store')
      }
    }
  }
 
  if (isEdit && detailLoading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Loading details...</div>
  }
 
  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        title={isEdit ? 'Edit Store' : 'Add New Store'}
        breadcrumb={[
          { label: 'Masters', href: '/dashboard' },
          { label: 'Stores', href: '/stores' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
        backHref="/stores"
      />
 
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Store Name *</label>
            <input
              type="text" required value={storeName} onChange={e => setStoreName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 text-sm text-slate-800 transition-all bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
            <input
              type="text" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/10 text-sm text-slate-800 transition-all bg-white"
            />
          </div>
          {isEdit && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-green-600 focus:ring-green-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="isActive" className="text-sm font-semibold text-slate-600 cursor-pointer">Active Store</label>
            </div>
          )}
        </div>
 
        <div className="flex justify-between items-center border-t border-slate-100 pt-6">
          <div>
            {isEdit && (
              <button
                type="button" onClick={handleDelete}
                className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer"
              >
                Deactivate
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button" onClick={() => navigate('/stores')}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
