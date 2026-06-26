import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Eye, Truck, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function POList() {
  const token = localStorage.getItem('vendor_token');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedPoId, setSelectedPoId] = useState(null);

  const { data: pos, isLoading, isError } = useQuery({
    queryKey: ['vendorPOs'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/v1/portal/purchase-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch POs');
      return res.json();
    }
  });

  const { data: poDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['poDetails', selectedPoId],
    enabled: !!selectedPoId,
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/v1/portal/purchase-orders/${selectedPoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch PO Details');
      return res.json();
    }
  });

  const ackMutation = useMutation({
    mutationFn: async (poId) => {
      const res = await fetch(`http://localhost:8000/api/v1/portal/purchase-orders/${poId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: 'Acknowledged via portal' })
      });
      if (!res.ok) throw new Error('Failed to acknowledge PO');
      return res.json();
    },
    onSuccess: () => {
      toast.success('PO Acknowledged Successfully');
      queryClient.invalidateQueries(['vendorPOs']);
    },
    onError: () => {
      toast.error('Failed to acknowledge PO');
    }
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading purchase orders...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Error loading data</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Purchase Orders
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">
            Manage and acknowledge your incoming orders efficiently
          </p>
        </div>
      </div>

      <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300">
        <div className="w-full">
          <table className="w-full divide-y divide-slate-200 table-fixed">
            <thead>
              <tr className="bg-slate-50/80 backdrop-blur-sm">
                <th className="px-2 sm:px-4 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">PO Number</th>
                <th className="px-2 sm:px-4 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Order Date</th>
                <th className="hidden md:table-cell px-2 sm:px-4 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Delivery</th>
                <th className="px-2 sm:px-4 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Amount</th>
                <th className="px-2 sm:px-4 py-4 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Status</th>
                <th className="px-2 sm:px-4 py-4 text-right text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider w-[25%] md:w-[25%]">Actions</th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {pos?.map((po) => (
              <tr key={po.po_id} className="hover:bg-slate-50/80 transition-colors duration-200 group">
                <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-blue-600 group-hover:text-blue-700 truncate">
                  {po.po_number}
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-600 truncate">
                  {new Date(po.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="hidden md:table-cell px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-medium text-slate-600 truncate">
                  {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-slate-300">-</span>}
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-slate-900 font-bold tracking-tight truncate">
                  ₹{po.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4">
                  {po.status === 'Released' ? (
                    <span className="text-slate-300 font-medium">-</span>
                  ) : po.status === 'Acknowledged' ? (
                    <span className="px-2 py-1 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-sm truncate">
                      {po.status}
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-sm truncate">
                      {po.status}
                    </span>
                  )}
                </td>
                <td className="px-2 sm:px-4 py-3 sm:py-4 text-right text-sm font-medium">
                  <div className="flex justify-end items-center gap-1 sm:gap-2 flex-wrap">
                    {po.status === 'Released' && (
                      <button 
                        onClick={() => ackMutation.mutate(po.po_id)}
                        disabled={ackMutation.isLoading}
                        className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 disabled:opacity-50"
                        title="Acknowledge Order"
                      >
                        <CheckCircle size={14} className="sm:mr-1 opacity-90" />
                        <span className="hidden xl:inline">Acknowledge</span>
                        <span className="xl:hidden sm:inline">Ack</span>
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setSelectedPoId(po.po_id)}
                      className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow"
                      title="View Details"
                    >
                      <Eye size={14} className="sm:mr-1 text-slate-400" />
                      <span className="hidden sm:inline">View</span>
                    </button>
                    
                    {po.status === 'Acknowledged' && (
                      <button 
                        onClick={() => navigate(`/vendor-portal/asns/new?po=${po.po_id}`)}
                        className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5"
                        title="Create ASN"
                      >
                        <Truck size={14} className="sm:mr-1 opacity-90" />
                        <span className="hidden xl:inline">Create ASN</span>
                        <span className="xl:hidden sm:inline">ASN</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pos?.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No purchase orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedPoId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Purchase Order Details: {poDetails?.po_number || 'Loading...'}
              </h2>
              <button onClick={() => setSelectedPoId(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isDetailsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading details...</div>
              ) : poDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Order Date</p>
                      <p className="font-medium">{new Date(poDetails.order_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Expected Delivery</p>
                      <p className="font-medium">{poDetails.expected_delivery_date ? new Date(poDetails.expected_delivery_date).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Total Amount</p>
                      <p className="font-medium text-blue-600">₹{poDetails.total_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Status</p>
                      <p className="font-medium">{poDetails.status}</p>
                    </div>
                  </div>
                  
                  {poDetails.notes && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700"><span className="font-medium">Notes:</span> {poDetails.notes}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium text-gray-900 mb-4 border-b pb-2">Line Items</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                          {poDetails.details?.map(line => (
                            <tr key={line.po_detail_id}>
                              <td className="px-4 py-3 font-medium text-gray-900">{line.part_no}</td>
                              <td className="px-4 py-3 text-gray-500">{line.name}</td>
                              <td className="px-4 py-3 text-right">{line.order_qty} {line.unit_of_measurement}</td>
                              <td className="px-4 py-3 text-right">{line.received_qty}</td>
                              <td className="px-4 py-3 text-right">₹{line.unit_price?.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-medium">₹{line.line_amount?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-red-500">Failed to load details</div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-xl">
              <button 
                onClick={() => setSelectedPoId(null)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
