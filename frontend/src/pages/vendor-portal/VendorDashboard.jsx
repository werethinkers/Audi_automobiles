import { useQuery } from '@tanstack/react-query';
import { Package, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function VendorDashboard() {
  const token = localStorage.getItem('vendor_token');

  const { data: scorecard, isLoading } = useQuery({
    queryKey: ['vendorScorecard'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/api/v1/portal/scorecard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const currentScore = scorecard?.[0] || {
    deliveries_total: 0,
    deliveries_on_time: 0,
    batches_total: 0,
    batches_first_pass: 0,
    rejection_count: 0
  };

  const onTimePct = currentScore.deliveries_total ? (currentScore.deliveries_on_time / currentScore.deliveries_total * 100).toFixed(1) : 0;
  const firstPassPct = currentScore.batches_total ? (currentScore.batches_first_pass / currentScore.batches_total * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-sm text-gray-500">Your performance metrics for the current period</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="On-Time Delivery"
          value={`${onTimePct}%`}
          subtitle={`${currentScore.deliveries_on_time} / ${currentScore.deliveries_total} deliveries`}
          icon={Clock}
          color="text-green-600"
          bg="bg-green-100"
        />
        <MetricCard
          title="First Pass Acceptance"
          value={`${firstPassPct}%`}
          subtitle={`${currentScore.batches_first_pass} / ${currentScore.batches_total} batches`}
          icon={CheckCircle}
          color="text-blue-600"
          bg="bg-blue-100"
        />
        <MetricCard
          title="Total Rejections"
          value={currentScore.rejection_count}
          subtitle="Action required on NCRs"
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-100"
        />
        <MetricCard
          title="Active Orders"
          value="--"
          subtitle="Pending fulfillment"
          icon={Package}
          color="text-indigo-600"
          bg="bg-indigo-100"
        />
      </div>

      {/* Placeholder for Recent Activity or Charts */}
      <div className="mt-8 bg-gray-50 rounded-lg p-8 border border-gray-100 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-400">Activity charts will appear here</p>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-start space-x-4">
      <div className={`p-3 rounded-lg ${bg} ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
