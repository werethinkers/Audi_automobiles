import { useState } from 'react'
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { uploadRmExcel } from '../../api/rm'
import { toast } from 'react-hot-toast'

export default function BulkUploadModal({ open, onClose }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  if (!open) return null

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an Excel file.')
      return
    }

    try {
      setUploading(true)

      const result = await uploadRmExcel(file)

      toast.success(
        `Upload Completed\nInserted: ${result.inserted} | Updated: ${result.updated}`
      )

      setFile(null)
      onClose()
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || 'Failed to upload file.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-800">
            Bulk Upload Raw Materials
          </h2>

          <button onClick={onClose}>
            <XMarkIcon className="h-6 w-6 text-slate-500 hover:text-red-500" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-6">

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Upload Excel (.xlsx/.csv)
            </label>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full rounded-lg border border-slate-300 p-2"
            />

            <p className="mt-3 text-sm text-slate-500">
              Upload an Excel file matching the Raw Material template.
              Existing Part Numbers will be updated and new materials will
              be inserted automatically.
            </p>
          </div>

          {file && (
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-sm">
                <span className="font-semibold">Selected File:</span>{' '}
                {file.name}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">

          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg bg-slate-300 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-400"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />

            {uploading ? 'Uploading...' : 'Upload and Process'}
          </button>

        </div>
      </div>
    </div>
  )
}