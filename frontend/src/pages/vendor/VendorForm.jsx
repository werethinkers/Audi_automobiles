import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVendorDetail, useCreateVendor, useUpdateVendor, useDeleteVendor, useUpdateVendorAccess } from '../../api/vendor'
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

  // Portal Access State
  const [portalEnabled, setPortalEnabled] = useState(false)
  const [portalUsername, setPortalUsername] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
 
  const { data: vendor, isLoading: detailLoading } = useVendorDetail(id)
  
  const createMutation = useCreateVendor()
  const updateMutation = useUpdateVendor()
  const deleteMutation = useDeleteVendor()
  const accessMutation = useUpdateVendorAccess()
 
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
      setPortalEnabled(vendor.portal_enabled || false)
      setPortalUsername(vendor.portal_username || '')
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
        // Save portal access
        await accessMutation.mutateAsync({
          vendor_id: id,
          portal_enabled: portalEnabled,
          portal_username: portalUsername || null,
          portal_password: portalPassword || null
        })
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
        breadcrumb={[
          { label: 'Masters', href: '/dashboard' },
          { label: 'Vendors', href: '/vendors' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
        backHref="/vendors"
      />
 
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Vendor Name *</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contact Person</label>
              <input
                type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone</label>
              <input
                type="text" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Payment Terms</label>
              <input
                type="text" placeholder="e.g. Net 30, COD" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
          </div>
  
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">GST Number</label>
              <input
                type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Address Line 1</label>
              <input
                type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">City</label>
              <input
                type="text" value={city} onChange={e => setCity(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">State</label>
              <input
                type="text" value={state} onChange={e => setState(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white"
              />
            </div>
            {isEdit && (
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-600 cursor-pointer">Active Listing</label>
              </div>
            )}
          </div>
        </div>
        {isEdit && (
          <div className="border-t border-slate-100 pt-6 mt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Vendor Portal Access</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox" id="portalEnabled" checked={portalEnabled} onChange={e => setPortalEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="portalEnabled" className="text-sm font-semibold text-slate-600">Enable Portal Access</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Portal Username</label>
                <input
                  type="text" value={portalUsername} onChange={e => setPortalUsername(e.target.value)} disabled={!portalEnabled}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm disabled:bg-slate-50"
                  placeholder="e.g. mobile or email"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Set/Reset Password</label>
                <input
                  type="password" value={portalPassword} onChange={e => setPortalPassword(e.target.value)} disabled={!portalEnabled}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm disabled:bg-slate-50"
                  placeholder="Leave blank to keep unchanged"
                />
              </div>
            </div>
          </div>
        )}

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
              type="button" onClick={() => navigate('/vendors')}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              disabled={updateMutation.isPending || createMutation.isPending || accessMutation.isPending}
            >
              {(updateMutation.isPending || createMutation.isPending || accessMutation.isPending) ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
