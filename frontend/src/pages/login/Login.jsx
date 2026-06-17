import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'
import { toast } from 'react-hot-toast'
 
export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const loginStore = useAuthStore((state) => state.login)
  const navigate = useNavigate()
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.post('/auth/login', { username, password })
      loginStore(response.data.access_token)
      toast.success('Login Successful!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Incorrect username or password')
    } finally {
      setLoading(false)
    }
  }
 
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 font-sans px-4">
      <div className="max-w-md w-full space-y-8 p-10 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-2xl backdrop-blur-md">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold font-display text-white tracking-tight">ERP Platform</h2>
          <p className="mt-2 text-sm text-slate-400">Raw Material & Inventory Module</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 text-slate-100 rounded-lg outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>
 
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
          
          <div className="text-center mt-4 text-xs text-slate-500">
            Default credentials: <span className="font-semibold text-slate-400">admin / admin</span>
          </div>
        </form>
      </div>
    </div>
  )
}
