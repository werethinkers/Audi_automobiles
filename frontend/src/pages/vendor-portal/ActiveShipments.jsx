import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Truck, Clock, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';

export default function ActiveShipments() {
  const navigate = useNavigate();
  const token = localStorage.getItem('vendor_token');

  const { data: asns, isLoading } = useQuery({
    queryKey: ['vendorASNs'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/v1/portal/asns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch ASNs');
      return res.json();
    }
  });

  if (isLoading) return <div className="p-8 text-slate-500">Loading your shipments...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Active Shipments & History</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">Track and manage your advance shipping notices.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ASN Number</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Expected Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {asns?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <Truck className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-sm font-medium">No shipments found.</p>
                  </td>
                </tr>
              ) : asns?.map((asn) => (
                <tr key={asn.asn_id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                    {asn.asn_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                    {asn.po_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {asn.expected_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                      {asn.delivery_mode === 'SELF' ? 'Self Delivery' : 'Courier'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {asn.status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        <Clock size={12} className="mr-1.5" /> Active
                      </span>
                    ) : asn.status === 'REPLACED_DUE_TO_DELAY' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        <AlertTriangle size={12} className="mr-1.5" /> Replaced
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CheckCircle size={12} className="mr-1.5" /> {asn.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {asn.status === 'SUBMITTED' && (
                      <button 
                        onClick={() => navigate(`/vendor-portal/asns/new?po=${asn.po_id}`)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all duration-200 shadow-sm hover:shadow"
                        title="Recreate ASN due to delay"
                      >
                        <RotateCcw size={14} className="mr-1.5" /> Update ASN
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
