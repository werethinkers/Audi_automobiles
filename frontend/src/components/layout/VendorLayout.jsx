import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Package, AlertCircle, FileText, Activity, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorLayout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const token = localStorage.getItem('vendor_token');
  const vendorName = localStorage.getItem('vendor_name');

  if (!token) {
    return <Navigate to="/vendor-portal/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('vendor_token');
    localStorage.removeItem('vendor_name');
    qc.clear();
    toast.success('Logged out successfully');
    navigate('/vendor-portal/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: Activity, path: '/vendor-portal/dashboard' },
    { name: 'Purchase Orders', icon: FileText, path: '/vendor-portal/purchase-orders' },
    { name: 'Active Shipments', icon: Truck, path: '/vendor-portal/active-shipments' },
    { name: 'Create ASN', icon: Package, path: '/vendor-portal/asns/new' },
    { name: 'Rejections / NCRs', icon: AlertCircle, path: '/vendor-portal/rejections' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20 shadow-inner">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Audi Vendor Portal
            </h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-white tracking-wide">{vendorName}</span>
              <span className="text-xs text-blue-300 font-medium tracking-wider uppercase">Vendor Account</span>
            </div>
            <div className="h-8 w-px bg-slate-700 mx-2 hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-slate-600 shadow-sm"
            >
              <LogOut size={16} className="text-blue-400" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Premium Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-2 sticky top-24">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center space-x-3 px-4 py-3.5 text-sm font-medium rounded-xl text-slate-600 hover:text-slate-900 bg-transparent hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200 transition-all duration-200 group"
              >
                <div className="text-slate-400 group-hover:text-blue-600 transition-colors duration-200">
                  <item.icon size={20} />
                </div>
                <span className="tracking-wide">{item.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 min-w-0 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 p-6 md:p-8 min-h-[500px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
