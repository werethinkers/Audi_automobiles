import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGrnList } from '../../api/procurement'
import { usePoList } from '../../api/procurement'
import { useVendorList } from '../../api/vendor'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
 
export default function GrnList() {
  const navigate = useNavigate()
  const { data: grns, isLoading: grnLoading } = useGrnList()
  const { data: pos } = usePoList()
  const { data: vendors } = useVendorList()
 
  const getPoNumber = (poId) => {
    return pos?.find(p => p.po_id === poId)?.po_number || 'Unknown PO'
  }
 
  const getVendorName = (vendorId) => {
    return vendors?.find(v => v.vendor_id === vendorId)?.name || 'Unknown Vendor'
  }
 
  const getGrnStatusBadge = (status) => {
    if (status === 'PENDING_QA') return <Badge variant="amber">Pending QA</Badge>
    if (status === 'COMPLETED') return <Badge variant="green">Completed</Badge>
    if (status === 'REJECTED') return <Badge variant="red">Rejected</Badge>
    return <Badge variant="gray">{status}</Badge>
  }
 
  const COLUMNS = [
    { key: 'grn_number',    header: 'GRN Number',    render: v => <span className="font-semibold text-slate-800">{v}</span> },
    { key: 'po_id',         header: 'PO Number',     render: v => getPoNumber(v) },
    { key: 'vendor_id',     header: 'Vendor Name',   render: v => getVendorName(v) },
    { key: 'received_date', header: 'Received Date' },
    { key: 'vehicle_number',header: 'Vehicle Number',render: v => v || '-' },
    { key: 'grn_status',    header: 'Status',        render: v => getGrnStatusBadge(v) }
  ]
 
  return (
    <div className="p-6 space-y-6 font-sans">
      <PageHeader
        title="Goods Received Notes"
        breadcrumb={['Procurement', 'GRN Log']}
        actions={[{ label: '+ Log GRN Receipt', onClick: () => navigate('/grn/new'), primary: true }]}
      />
      
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
        <DataTable
          columns={COLUMNS}
          data={grns}
          loading={grnLoading}
        />
      </div>
    </div>
  )
}
