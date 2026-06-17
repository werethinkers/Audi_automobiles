import { useState } from 'react'
import { useCustomFieldsList, useCreateCustomField } from '../../api/customFields'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import { toast } from 'react-hot-toast'
 
export default function CustomFields() {
  const [entityType, setEntityType] = useState('rm_master')
  const { data: fields, isLoading } = useCustomFieldsList(entityType ? { entity_type: entityType } : {})
  const createMutation = useCreateCustomField()
 
  // Add Field Modal/Form state
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState('text')
  const [rawOptions, setRawOptions] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [sortOrder, setSortOrder] = useState('0')
  const [showAddForm, setShowAddForm] = useState(false)
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newKey || !newLabel) {
      toast.error('Field Key and Label are required')
      return
    }
 
    let dropdown_options = null
    if (newType === 'dropdown' && rawOptions.trim() !== '') {
      dropdown_options = rawOptions.split(',').map(o => o.trim()).filter(Boolean)
    }
 
    const payload = {
      entity_type: entityType,
      field_key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
      field_label: newLabel,
      field_type: newType,
      dropdown_options,
      is_required: isRequired,
      sort_order: parseInt(sortOrder) || 0
    }
 
    try {
      await createMutation.mutateAsync(payload)
      toast.success('Custom Field created successfully!')
      setNewKey('')
      setNewLabel('')
      setNewType('text')
      setRawOptions('')
      setIsRequired(false)
      setSortOrder('0')
      setShowAddForm(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error creating custom field')
    }
  }
 
  const COLUMNS = [
    { key: 'field_key',   header: 'Field Key', render: v => <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs">{v}</code> },
    { key: 'field_label', header: 'Field Label' },
    { key: 'field_type',  header: 'Type', render: v => <Badge variant="blue">{v}</Badge> },
    { 
      key: 'is_required', 
      header: 'Required', 
      render: v => <Badge variant={v ? 'amber' : 'gray'}>{v ? 'Yes' : 'No'}</Badge> 
    },
    { key: 'sort_order',  header: 'Sort Order' },
    { 
      key: 'dropdown_options', 
      header: 'Options', 
      render: v => v && v.length > 0 ? (
        <span className="text-xs text-slate-500 max-w-[200px] truncate block">{v.join(', ')}</span>
      ) : '-' 
    }
  ]
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Custom Fields Configuration"
        breadcrumb={['Configuration', 'Custom Fields']}
        actions={[
          { 
            label: showAddForm ? 'View List' : '+ Define Field', 
            onClick: () => setShowAddForm(!showAddForm), 
            primary: true 
          }
        ]}
      />
 
      {showAddForm ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 space-y-6 max-w-xl">
          <h2 className="text-lg font-bold font-display text-slate-800">Add New Field Definition</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Target Entity Type *</label>
              <select
                value={entityType} required onChange={e => setEntityType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option value="rm_master">Raw Materials Catalog (rm_master)</option>
                <option value="vendor_master">Vendors Master (vendor_master)</option>
                <option value="rm_purchase_order">Purchase Order Header (rm_purchase_order)</option>
              </select>
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Field Label * (e.g. Shelf Life)</label>
              <input
                type="text" required value={newLabel} onChange={e => setNewLabel(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Field Key * (Unique alphanumeric, lowercase)</label>
              <input
                type="text" required placeholder="e.g. shelf_life" value={newKey} onChange={e => setNewKey(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
              />
            </div>
 
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Field Type *</label>
              <select
                value={newType} required onChange={e => setNewType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option value="text">Single-line Text</option>
                <option value="number">Number</option>
                <option value="date">Date picker</option>
                <option value="dropdown">Dropdown Options</option>
              </select>
            </div>
 
            {newType === 'dropdown' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Dropdown Options * (Comma separated list)</label>
                <input
                  type="text" required placeholder="Red, Green, Blue" value={rawOptions} onChange={e => setRawOptions(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                />
              </div>
            )}
 
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sort Order</label>
                <input
                  type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox" id="isRequired" checked={isRequired} onChange={e => setIsRequired(e.target.checked)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isRequired" className="text-sm font-semibold text-slate-600">Mandatory / Required</label>
              </div>
            </div>
          </div>
 
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button
              type="button" onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
            >
              Create Field
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden font-sans">
          {/* Target Filter */}
          <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-slate-50/20">
            <div className="w-72">
              <select
                value={entityType}
                onChange={e => setEntityType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-blue-500 bg-white"
              >
                <option value="rm_master">Raw Materials (rm_master)</option>
                <option value="vendor_master">Vendors (vendor_master)</option>
                <option value="rm_purchase_order">Purchase Orders (rm_purchase_order)</option>
              </select>
            </div>
          </div>
 
          <DataTable
            columns={COLUMNS}
            data={fields}
            loading={isLoading}
          />
        </div>
      )}
    </div>
  )
}
