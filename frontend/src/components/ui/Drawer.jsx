import { Fragment, useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function Drawer({ open, onClose, title, children, size = 'md' }) {
  const [isRendered, setIsRendered] = useState(open)

  useEffect(() => {
    if (open) {
      setIsRendered(true)
      document.body.style.overflow = 'hidden'
    } else {
      setTimeout(() => setIsRendered(false), 300) // Match transition duration
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [open])

  if (!isRendered) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${open ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div 
          className={`w-screen ${sizeClasses[size]} pointer-events-auto transition duration-300 ease-in-out transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex h-full flex-col bg-slate-50 shadow-2xl rounded-l-3xl overflow-hidden border-l border-slate-200/60">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
