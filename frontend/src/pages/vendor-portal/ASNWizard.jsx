import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Truck, Calendar, User, Package, ChevronRight, CheckCircle, Clock } from 'lucide-react';

export default function ASNWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem('vendor_token');

  const [selectedPoId, setSelectedPoId] = useState(searchParams.get('po') || '');
  
  // Form State
  const [step, setStep] = useState(1);
  const [expectedDate, setExpectedDate] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('SELF');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [lineItems, setLineItems] = useState({});

  // Fetch Open POs
  const { data: pos } = useQuery({
    queryKey: ['vendorPOs'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/v1/portal/purchase-orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  // Fetch selected PO details
  const { data: poDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['poDetails', selectedPoId],
    enabled: !!selectedPoId,
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/api/v1/portal/purchase-orders/${selectedPoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }
  });

  // Pre-fill line items when PO details load
  useEffect(() => {
    if (poDetails?.details) {
      const initialItems = {};
      poDetails.details.forEach(line => {
        initialItems[line.po_detail_id] = {
          qty_shipped: 0,
          vendor_batch_ref: ''
        };
      });
      setLineItems(initialItems);
    }
  }, [poDetails]);

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('http://localhost:8000/api/v1/portal/asns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to submit ASN');
      return res.json();
    },
    onSuccess: () => {
      toast.success('ASN successfully created!');
      queryClient.invalidateQueries(['vendorPOs']);
      navigate('/vendor-portal/purchase-orders');
    },
    onError: () => toast.error('Error creating ASN')
  });

  const handleNext = () => {
    if (step === 1 && !selectedPoId) return toast.error('Select a Purchase Order');
    if (step === 2) {
      if (!expectedDate) return toast.error('Expected delivery date is required');
      const selected = new Date(expectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) return toast.error('Expected delivery date cannot be in the past');
    }
    setStep(s => s + 1);
  };

  const handleSubmit = () => {
    const linesPayload = Object.entries(lineItems)
      .filter(([_, val]) => val.qty_shipped > 0)
      .map(([id, val]) => ({
        po_detail_id: id,
        qty_shipped: parseFloat(val.qty_shipped),
        vendor_batch_ref: val.vendor_batch_ref || null
      }));

    if (linesPayload.length === 0) {
      return toast.error('You must ship at least one item');
    }

    submitMutation.mutate({
      po_id: selectedPoId,
      expected_date: expectedDate,
      delivery_mode: deliveryMode,
      courier_name: deliveryMode === 'COURIER' ? courierName || null : null,
      tracking_number: deliveryMode === 'COURIER' ? trackingNumber || null : null,
      vehicle_number: deliveryMode === 'SELF' ? vehicleNumber || null : null,
      driver_name: deliveryMode === 'SELF' ? driverName || null : null,
      arrival_window: deliveryMode === 'SELF' ? (startTime && endTime ? `${startTime} - ${endTime}` : null) : null,
      lines: linesPayload
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Advance Shipping Notice</h1>
        <p className="text-gray-500 mt-2">Notify us about your upcoming delivery.</p>
      </div>

      <div className="flex mb-8 items-center justify-between">
        <StepIndicator current={step} step={1} title="Select PO" />
        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
        <StepIndicator current={step} step={2} title="Shipment Info" />
        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
        <StepIndicator current={step} step={3} title="Line Items" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Which Purchase Order are you shipping against?</h3>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedPoId}
              onChange={(e) => setSelectedPoId(e.target.value)}
            >
              <option value="">Select a PO...</option>
              {pos?.map(po => (
                <option key={po.po_id} value={po.po_id}>{po.po_number} - {po.order_date}</option>
              ))}
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Delivery Mode Toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
                <button
                  onClick={() => setDeliveryMode('SELF')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    deliveryMode === 'SELF' 
                      ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Self Delivery
                </button>
                <button
                  onClick={() => setDeliveryMode('COURIER')}
                  className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    deliveryMode === 'COURIER' 
                      ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Delivery Partner
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Expected Delivery Date <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Calendar size={20} />
                  </div>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-400"
                  />
                </div>
              </div>

              {deliveryMode === 'SELF' ? (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Arrival Window</label>
                    <div className="flex items-center space-x-4">
                      <div className="relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                          <Clock size={20} />
                        </div>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-400"
                        />
                      </div>
                      <span className="text-slate-400 font-semibold">to</span>
                      <div className="relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                          <Clock size={20} />
                        </div>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Vehicle Number</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Truck size={20} />
                      </div>
                      <input
                        type="text"
                        placeholder="MH 12 AB 1234"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-400"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Driver Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <User size={20} />
                      </div>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-400"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Courier / Delivery Partner Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Package size={20} />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. FedEx, Blue Dart, DHL"
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-400"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tracking Number</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Truck size={20} />
                      </div>
                      <input
                        type="text"
                        placeholder="Tracking ID or URL"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-400"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Specify quantities to ship</h3>
            {isDetailsLoading ? (
              <p>Loading PO details...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Part</th>
                      <th className="px-4 py-3">Ordered</th>
                      <th className="px-4 py-3">Rcvd</th>
                      <th className="px-4 py-3">Shipping Now</th>
                      <th className="px-4 py-3">Your Batch Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poDetails?.details?.map(line => (
                      <tr key={line.po_detail_id} className="border-b border-gray-100">
                        <td className="px-4 py-3 font-medium text-gray-900">{line.name}</td>
                        <td className="px-4 py-3">{line.order_qty} {line.unit_of_measurement}</td>
                        <td className="px-4 py-3">{line.received_qty}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={lineItems[line.po_detail_id]?.qty_shipped || ''}
                            onChange={(e) => setLineItems({
                              ...lineItems,
                              [line.po_detail_id]: { ...lineItems[line.po_detail_id], qty_shipped: e.target.value }
                            })}
                            className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            placeholder="Optional"
                            value={lineItems[line.po_detail_id]?.vendor_batch_ref || ''}
                            onChange={(e) => setLineItems({
                              ...lineItems,
                              [line.po_detail_id]: { ...lineItems[line.po_detail_id], vendor_batch_ref: e.target.value }
                            })}
                            className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-end space-x-4">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Next <ChevronRight size={18} className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit ASN'} <CheckCircle size={18} className="ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current, step, title }) {
  const isActive = current === step;
  const isPast = current > step;
  
  return (
    <div className={`flex items-center space-x-2 ${isActive ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 
        ${isActive ? 'border-blue-600 bg-blue-50' : isPast ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
        {isPast ? <CheckCircle size={16} /> : step}
      </div>
      <span className={`font-medium ${isActive ? 'text-gray-900' : ''}`}>{title}</span>
    </div>
  );
}
