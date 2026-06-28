import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'
import { toast } from 'react-hot-toast'
import {
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'

const MODULES = [
  { label: 'Procurement', color: 'bg-blue-500', desc: 'Vendors & Purchase Orders' },
  { label: 'Inventory',   color: 'bg-green-500', desc: 'Stock & Consumption Reports' },
  { label: 'Engineering', color: 'bg-orange-500', desc: 'Bill of Materials' },
  { label: 'Locations',   color: 'bg-purple-500', desc: 'Production Stations' },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">

      {/* ══════════════════════════════════════════════
          LEFT PANEL — ERP Module Showcase
      ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[58%] relative flex-col justify-between overflow-hidden" style={{ background: '#0f172a' }}>

        {/* Background industrial banner image */}
        <img
          src="/login_banner.png"
          alt="Manufacturing ERP"
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/90" />

        {/* Top nav bar */}
        <div className="relative z-10 flex items-center justify-between px-10 pt-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-black text-sm" style={{ fontFamily: 'serif' }}>AA</span>
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight">Audi Automobiles</p>
              <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">Manufacturing ERP</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            System Live
          </div>
        </div>

        {/* Main hero content */}
        <div className="relative z-10 px-10 pb-4">
          <h1 className="text-white text-4xl xl:text-5xl font-black leading-tight tracking-tight mb-4">
            Integrated<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Bus Manufacturing
            </span><br />
            ERP Platform
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md">
            End-to-end operations management — from raw material procurement and inventory tracking to bill of materials and station operations.
          </p>
        </div>

        {/* Module cards */}
        <div className="relative z-10 px-10 pb-12">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-4">Platform Modules</p>
          <div className="grid grid-cols-2 gap-3">
            {MODULES.map((m) => (
              <div
                key={m.label}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-all duration-200"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${m.color}`} />
                  <span className="text-white text-xs font-bold">{m.label}</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-snug">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Astute Bridge branding */}
        <div className="relative z-10 px-10 pb-8 border-t border-white/5 pt-5">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">Powered by</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm font-black text-slate-300 leading-none">astute</span>
            <span className="text-sm font-black leading-none" style={{ color: '#f59e0b' }}>BRIDGE</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — Login Form
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 md:px-16 py-12 bg-slate-50/50 relative">
        {/* Mobile-only soft glows */}
        <div className="lg:hidden absolute top-0 right-0 w-64 h-64 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />
        <div className="lg:hidden absolute bottom-0 left-0 w-64 h-64 rounded-full bg-purple-100/30 blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile-only header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-xl bg-slate-900 items-center justify-center shadow-lg mb-3">
              <span className="text-white font-serif font-black text-xl">AA</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">Audi Automobiles</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">Manufacturing ERP</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-8">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Welcome back</p>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">Sign in to<br />your workspace</h2>
            <p className="text-sm text-slate-500 mt-2">Enter your credentials to access the ERP platform.</p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-sm font-medium outline-none transition-all focus:border-slate-700 focus:ring-4 focus:ring-slate-700/8 placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-0.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-sm font-medium outline-none transition-all focus:border-slate-700 focus:ring-4 focus:ring-slate-700/8 placeholder:text-slate-400 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Credentials hint */}
            <div className="flex items-center justify-between bg-blue-50/80 border border-blue-100 rounded-xl px-4 py-2.5">
              <span className="text-xs text-blue-600 font-medium">Default credentials</span>
              <span className="text-xs font-bold text-blue-800 bg-white border border-blue-200/60 px-2 py-0.5 rounded-lg shadow-sm">
                admin / admin
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-slate-900/15 active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Mobile-only footer branding */}
          <div className="lg:hidden mt-10 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Powered by</p>
            <div className="flex items-baseline gap-0.5 justify-center mt-0.5">
              <span className="text-xs font-black text-slate-500">astute</span>
              <span className="text-xs font-black" style={{ color: '#f59e0b' }}>BRIDGE</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
