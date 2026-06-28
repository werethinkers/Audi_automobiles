import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVendorDetail, useCreateVendor, useUpdateVendor, useDeleteVendor, useUpdateVendorAccess } from '../../api/vendor'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import { BuildingOfficeIcon, MapPinIcon, KeyIcon } from '@heroicons/react/24/outline'

export default function VendorForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: vendor, isLoading: detailLoading } = useVendorDetail(id)

  const [activeTab, setActiveTab] = useState('general')

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

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm text-slate-800 transition-all bg-white shadow-sm"
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5"

  const TABS = [
    { id: 'general', label: 'General Info', icon: BuildingOfficeIcon },
    { id: 'location', label: 'Location & Tax', icon: MapPinIcon },
    { id: 'portal', label: 'Portal Access', icon: KeyIcon, hidden: !isEdit },
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title={isEdit ? 'Edit Vendor Profile' : 'Add New Vendor'} 
        breadcrumb={[
          { label: 'Vendors', href: '/vendors' },
          { label: isEdit ? vendor?.name || 'Edit' : 'New' }
        ]}
        backHref="/vendors"
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col p-6 animate-fade-in">
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 mb-6 pb-2 overflow-x-auto scrollbar-hide shrink-0">
          {TABS.filter(t => !t.hidden).map(tab => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  active 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 space-y-6">
          
          {/* GENERAL TAB */}
          <div className={activeTab === 'general' ? 'block' : 'hidden'}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Vendor Name *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Company or Supplier Name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contact Person</label>
                  <input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className={inputClass} placeholder="Full Name" />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+91..." />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="contact@supplier.com" />
              </div>
            </div>
          </div>

          {/* LOCATION & TAX TAB */}
          <div className={activeTab === 'location' ? 'block' : 'hidden'}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>GST Number</label>
                <input type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value)} className={inputClass} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label className={labelClass}>Address Line 1</label>
                <input type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={inputClass} placeholder="Street, Industrial Area" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Payment Terms</label>
                <input type="text" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className={inputClass} placeholder="e.g., Net 30, 50% Advance" />
              </div>
              
              {isEdit && (
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-slate-600 cursor-pointer">Vendor is Active</label>
                </div>
              )}
            </div>
          </div>

          {/* PORTAL ACCESS TAB */}
          {isEdit && (
            <div className={activeTab === 'portal' ? 'block' : 'hidden'}>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${portalEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                    <KeyIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Vendor Portal Access</h3>
                    <p className="text-xs text-slate-500">Allow this vendor to log in and manage ASNs.</p>
                  </div>
                  <div className="ml-auto">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={portalEnabled} onChange={e => setPortalEnabled(e.target.checked)} />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className={`space-y-4 transition-opacity ${portalEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <div>
                    <label className={labelClass}>Portal Username</label>
                    <input
                      type="text" value={portalUsername} onChange={e => setPortalUsername(e.target.value)} disabled={!portalEnabled}
                      className={inputClass} placeholder="e.g. mobile or email"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Set/Reset Password</label>
                    <input
                      type="password" value={portalPassword} onChange={e => setPortalPassword(e.target.value)} disabled={!portalEnabled}
                      className={inputClass} placeholder="Leave blank to keep unchanged"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-6 mt-8 border-t border-slate-200/60 shrink-0">
          <div>
            {isEdit && (
              <button
                type="button" onClick={handleDelete}
                className="px-4 py-2.5 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors cursor-pointer"
              >
                Deactivate
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button" onClick={() => navigate('/vendors')}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
              disabled={updateMutation.isPending || createMutation.isPending || accessMutation.isPending}
            >
              {(updateMutation.isPending || createMutation.isPending || accessMutation.isPending) ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
