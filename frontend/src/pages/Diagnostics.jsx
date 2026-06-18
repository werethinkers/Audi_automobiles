import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function Diagnostics() {
  const { token, isAuthenticated } = useAuthStore()
  const [rmCount, setRmCount] = useState(null)
  const [poCount, setPoCount] = useState(null)
  const [invCount, setInvCount] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testApis = async () => {
      setLoading(true)
      console.log('=== FRONTEND DIAGNOSTICS ===')
      console.log('Token in store:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')
      console.log('Token in localStorage:', localStorage.getItem('access_token') ? 'YES' : 'NO')
      console.log('isAuthenticated:', isAuthenticated)

      // Test RM API
      try {
        console.log('Fetching RM data...')
        const response = await api.get('/rm-master/?is_active=true')
        console.log('RM Response:', response.status, response.data.length)
        setRmCount(response.data.length)
      } catch (err) {
        console.error('RM Error:', err.message, err.response?.status, err.response?.data)
        setErrors(prev => ({ ...prev, rm: `${err.response?.status || 'ERROR'}: ${err.response?.data?.detail || err.message}` }))
      }

      // Test PO API
      try {
        console.log('Fetching PO data...')
        const response = await api.get('/procurement/purchase-orders')
        console.log('PO Response:', response.status, response.data.length)
        setPoCount(response.data.length)
      } catch (err) {
        console.error('PO Error:', err.message, err.response?.status, err.response?.data)
        setErrors(prev => ({ ...prev, po: `${err.response?.status || 'ERROR'}: ${err.response?.data?.detail || err.message}` }))
      }

      // Test Inventory API
      try {
        console.log('Fetching Inventory data...')
        const response = await api.get('/inventory/balances')
        console.log('Inventory Response:', response.status, response.data.length)
        setInvCount(response.data.length)
      } catch (err) {
        console.error('Inventory Error:', err.message, err.response?.status, err.response?.data)
        setErrors(prev => ({ ...prev, inv: `${err.response?.status || 'ERROR'}: ${err.response?.data?.detail || err.message}` }))
      }

      setLoading(false)
    }

    testApis()
  }, [token, isAuthenticated])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Frontend Diagnostics</h1>
      
      <div className="mb-6 p-4 bg-slate-100 rounded border border-slate-300">
        <h2 className="font-bold mb-2">Auth Status</h2>
        <p>Token in Store: <code className="bg-white px-2 py-1 rounded">{token ? 'YES' : 'NO'}</code></p>
        <p>localStorage Token: <code className="bg-white px-2 py-1 rounded">{localStorage.getItem('access_token') ? 'YES' : 'NO'}</code></p>
        <p>isAuthenticated: <code className="bg-white px-2 py-1 rounded">{isAuthenticated ? 'TRUE' : 'FALSE'}</code></p>
      </div>

      <div className="mb-6">
        <h2 className="font-bold mb-3">API Tests</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-3">
            <div className={`p-3 rounded border-l-4 ${rmCount !== null ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <p className="font-semibold">RM Master</p>
              {rmCount !== null ? (
                <p className="text-green-700">✓ Success: {rmCount} records</p>
              ) : (
                <p className="text-red-700">✗ {errors.rm}</p>
              )}
            </div>

            <div className={`p-3 rounded border-l-4 ${poCount !== null ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <p className="font-semibold">Purchase Orders</p>
              {poCount !== null ? (
                <p className="text-green-700">✓ Success: {poCount} records</p>
              ) : (
                <p className="text-red-700">✗ {errors.po}</p>
              )}
            </div>

            <div className={`p-3 rounded border-l-4 ${invCount !== null ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
              <p className="font-semibold">Inventory Balances</p>
              {invCount !== null ? (
                <p className="text-green-700">✓ Success: {invCount} records</p>
              ) : (
                <p className="text-red-700">✗ {errors.inv}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600">Check the browser console (F12) for detailed logs.</p>
    </div>
  )
}
