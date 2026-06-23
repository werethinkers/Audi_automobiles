import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Login from './pages/login/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Diagnostics from './pages/Diagnostics'
import RmList from './pages/rm/RmList'
import RmForm from './pages/rm/RmForm'
import VendorList from './pages/vendor/VendorList'
import VendorForm from './pages/vendor/VendorForm'
import StoreList from './pages/store/StoreList'
import StoreForm from './pages/store/StoreForm'
import PoList from './pages/procurement/PoList'
import PoForm from './pages/procurement/PoForm'
import GrnList from './pages/procurement/GrnList'
import GrnForm from './pages/procurement/GrnForm'
import StockBalance from './pages/inventory/StockBalance'
import Ledger from './pages/inventory/Ledger'
import Consumption from './pages/inventory/Consumption'
import StationList from './pages/stations/StationList'
import StationForm from './pages/stations/StationForm'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })
 
export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Private Authenticated Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="diagnostics" element={<Diagnostics />} />
            
            {/* Masters */}
            <Route path="rm-master" element={<RmList />} />
            <Route path="rm-master/new" element={<RmForm />} />
            <Route path="rm-master/:id" element={<RmForm />} />
            
            <Route path="vendors" element={<VendorList />} />
            <Route path="vendors/new" element={<VendorForm />} />
            <Route path="vendors/:id" element={<VendorForm />} />
            
            <Route path="stores" element={<StoreList />} />
            <Route path="stores/new" element={<StoreForm />} />
            <Route path="stores/:id" element={<StoreForm />} />
            
            {/* Procurement */}
            <Route path="purchase-orders" element={<PoList />} />
            <Route path="purchase-orders/new" element={<PoForm />} />
            <Route path="purchase-orders/:id" element={<PoForm />} />
            
            <Route path="grn" element={<GrnList />} />
            <Route path="grn/new" element={<GrnForm />} />
            <Route path="grn/:id" element={<GrnForm />} />
            
            {/* Inventory */}
            <Route path="stock-balance" element={<StockBalance />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="consumption" element={<Consumption />} />
            
            {/* Stations */}
            <Route path="stations" element={<StationList />} />
            <Route path="/stations/new" element={<StationForm />} />
            <Route path="/stations/:id" element={<StationForm />} />

            {/* Configuration */}
          </Route>
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}
