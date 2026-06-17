import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePoList, useUpdatePoStatus } from '../../api/procurement'
import { useVendorList } from '../../api/vendor'
import api from '../../api/client'
import { useQuery } from '@tanstack/react-query'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { toast } from 'react-hot-toast'
 
export default function PoList() {
  const navigate = useNavigate()
  const { data: pos, isLoading: poLoading } = usePoList()
  const { data: vendors } = useVendorList()
  
  // Fetch PO statuses mapping
  const { data: statuses } = useQuery({
    queryKey: ['po_statuses'],
    queryFn: () => api.get('/procurement/po-statuses').then(r => r.data)
  })
 
  const statusMutation = useUpdatePoStatus()
 
  const getVendorName = (vendorId) => {
    return vendors?.find(v => v.vendor_id === vendorId)?.name || 'Unknown Vendor'
  }
 
  const getStatusBadge = (statusId) => {
    const status = statuses?.find(s => s.id === statusId)
    if (!status) return <Badge variant="gray">Unknown</Badge>
    
    const code = status.code
    if (code === 'DRAFT') return <Badge variant="gray">Draft</Badge>
    if (code === 'PENDING_APPROVAL') return <Badge variant="amber">Pending Approval</Badge>
    if (code === 'BLOCKED') return <Badge variant="red">Blocked</Badge>
    if (code === 'RELEASED') return <Badge variant="blue">Released</Badge>
    if (code === 'PARTIALLY_RECEIVED') return <Badge variant="teal">Partially Received</Badge>
    if (code === 'COMPLETED') return <Badge variant="green">Completed</Badge>
    return <Badge variant="gray">{status.name}</Badge>
  }
 
  const handleStatusChange = async (e, poId) => {
    e.stopPropagation() // prevent row click navigate
    const status_id = e.target.value
    if (!status_id) return
    
    try {
      await statusMutation.mutateAsync({ id: poId, status_id })
      toast.success('PO Status updated!')
    } catch (err) {
      toast.error('Failed to update PO status')
    }
  }
 
  const COLUMNS = [
    { key: 'po_number',    header: 'PO Number', render: v => <span className="font-semibold text-slate-800">{v}</span> },
    { key: 'vendor_id',    header: 'Vendor',    render: v => getVendorName(v) },
    { key: 'order_date',   header: 'Order Date' },
    { key: 'total_amount', header: 'Total Amount', render: v => v ? `₹${parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00' },
    { key: 'status_id',    header: 'Status',    render: v => getStatusBadge(v) },
    { 
      key: 'actions',      
      header: 'Change Status',
      render: (_, row) => (
        <select 
          onClick={e => e.stopPropagation()} 
          onChange={e => handleStatusChange(e, row.po_id)}
          value={row.status_id || ''}
          className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 bg-white"
        >
          <option value="">Update...</option>
          {statuses?.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )
    }
  ]
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Purchase Orders"
        breadcrumb={['Procurement', 'Purchase Orders']}
        actions={[{ label: '+ Create PO', onClick: () => navigate('/purchase-orders/new'), primary: true }]}
      />
      
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={pos}
          loading={poLoading}
          onRowClick={row => navigate(`/purchase-orders/${row.po_id}`)}
        />
      </div>
    </div>
  )
}
