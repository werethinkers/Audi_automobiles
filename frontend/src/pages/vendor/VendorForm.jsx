import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVendorDetail, useCreateVendor, useUpdateVendor, useDeleteVendor } from '../../api/vendor'
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
 
export default function VendorForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
 
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [isActive, setIsActive] = useState(true)
 
  const { data: vendor, isLoading: detailLoading } = useVendorDetail(id)
  
  const createMutation = useCreateVendor()
  const updateMutation = useUpdateVendor()
  const deleteMutation = useDeleteVendor()
 
  useEffect(() => {
    if (isEdit && vendor) {
      setName(vendor.name || '')
      setContactPerson(vendor.contact_person || '')
      setPhone(vendor.phone || '')
      setEmail(vendor.email || '')
      setGstNumber(vendor.gst_number || '')
      setAddressLine1(vendor.address_line1 || '')
      setCity(vendor.city || '')
      setState(vendor.state || '')
      setPaymentTerms(vendor.payment_terms || '')
      setIsActive(vendor.is_active ?? true)
    }
  }, [isEdit, vendor])
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name,
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      gst_number: gstNumber || null,
      address_line1: addressLine1 || null,
      city: city || null,
      state: state || null,
      payment_terms: paymentTerms || null,
    }
 
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, ...payload, is_active: isActive })
        toast.success('Vendor details updated successfully!')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Vendor profile created successfully!')
      }
      navigate('/vendors')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving vendor')
    }
  }
 
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to deactivate this vendor?')) {
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('Vendor deactivated successfully!')
        navigate('/vendors')
      } catch (err) {
        toast.error('Error deactivating vendor')
      }
    }
  }
 
  if (isEdit && detailLoading) {
    return <div className="p-8 text-center text-slate-500 font-sans">Loading details...</div>
  }
 
  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title={isEdit ? 'Edit Vendor Profile' : 'Add New Vendor'}
        breadcrumb={['Masters', 'Vendors', isEdit ? 'Edit' : 'New']}
      />
 
      <form onSubmit={handleSubmit} className="bg-white rounded border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor Name *</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Person</label>
              <input
                type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
              <input
                type="text" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Payment Terms</label>
              <input
                type="text" placeholder="e.g. Net 30, COD" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>
 
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GST Number</label>
              <input
                type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Address Line 1</label>
              <input
                type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">City</label>
              <input
                type="text" value={city} onChange={e => setCity(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">State</label>
              <input
                type="text" value={state} onChange={e => setState(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
            {isEdit && (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-600">Active Listing</label>
              </div>
            )}
          </div>
        </div>
 
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
              type="button" onClick={() => navigate('/vendors')}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3498db] text-white rounded text-sm font-bold hover:bg-[#2980b9] shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
