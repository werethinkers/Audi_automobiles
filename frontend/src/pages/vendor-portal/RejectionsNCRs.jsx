import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileWarning, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function RejectionsNCRs() {
  const token = localStorage.getItem('vendor_token');
  const [activeTab, setActiveTab] = useState('rejections');

  // Fetch Rejections
  const { data: rejections, isLoading: rejectionsLoading } = useQuery({
    queryKey: ['vendorRejections'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/v1/portal/rejections', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch rejections');
      return res.json();
    }
  });

  // Fetch NCRs
  const { data: ncrs, isLoading: ncrsLoading } = useQuery({
    queryKey: ['vendorNcrs'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/v1/portal/ncrs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch ncrs');
      return res.json();
    }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Quality Management</h2>
        <p className="text-sm text-gray-500">Track material rejections and Non-Conformance Reports (NCRs).</p>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('rejections')}
          className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors
            ${activeTab === 'rejections' 
              ? 'border-red-500 text-red-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <FileWarning size={18} />
          <span>Recent Rejections</span>
          {rejections?.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
              {rejections.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ncrs')}
          className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors
            ${activeTab === 'ncrs' 
              ? 'border-orange-500 text-orange-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <ShieldAlert size={18} />
          <span>Active NCRs</span>
          {ncrs?.length > 0 && (
            <span className="ml-2 bg-orange-100 text-orange-600 py-0.5 px-2 rounded-full text-xs">
              {ncrs.length}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        {activeTab === 'rejections' && (
          <div>
            {rejectionsLoading ? (
              <div className="p-8 text-center text-gray-500">Loading rejections...</div>
            ) : rejections?.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-gray-500">
                <CheckCircle size={48} className="text-green-400 mb-4" />
                <p className="text-lg font-medium text-gray-900">No Rejections Found</p>
                <p>Excellent! Your materials have passed all recent quality checks.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Rejection #</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Material</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Qty Rejected</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Reason</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rejections?.map(rej => (
                    <tr key={rej.rejection_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{rej.rln}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(rej.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{'Part linked to GRN'}</td>
                      <td className="px-6 py-4 text-right font-medium text-red-600">{rej.total_qty}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1">
                          <AlertTriangle size={14} className="text-red-400" />
                          <span>{rej.reason_code}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {rej.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'ncrs' && (
          <div>
            {ncrsLoading ? (
              <div className="p-8 text-center text-gray-500">Loading NCRs...</div>
            ) : ncrs?.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-gray-500">
                <CheckCircle size={48} className="text-green-400 mb-4" />
                <p className="text-lg font-medium text-gray-900">No Active NCRs</p>
                <p>You have no non-conformance reports requiring action.</p>
              </div>
            ) : (
              <div className="p-6 grid gap-6">
                {ncrs?.map(ncr => (
                  <div key={ncr.ncr_id} className="border border-orange-200 bg-orange-50/30 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-bold text-gray-900">{ncr.ncr_number}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-orange-100 text-orange-800`}>
                            NCR SEVERITY
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 flex items-center">
                          <Clock size={14} className="mr-1" />
                          Issued on {new Date(ncr.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-800 shadow-sm">
                        {ncr.status}
                      </span>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Issue Description</h4>
                      <p className="text-gray-800 text-sm">{ncr.defect_description}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Required Action Due</h4>
                      <div className="flex items-start space-x-2 text-sm text-orange-800 bg-orange-100/50 p-3 rounded-lg border border-orange-200/50">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <p>{ncr.car_due ? new Date(ncr.car_due).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
