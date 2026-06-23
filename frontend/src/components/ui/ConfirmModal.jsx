// src/components/ui/ConfirmModal.jsx
import { useEffect } from 'react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function ConfirmModal({
  open,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onCancel?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-modal-in">
        {/* Red top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-600" />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
