import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import {
  useCreateStation,
  useUpdateStation,
  useDeleteStation,
  useHardDeleteStation,
  useStationDetail,
} from '../../api/station'

export default function StationForm() {
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = !!id

  const createMutation = useCreateStation()
  const updateMutation = useUpdateStation()
  const deleteMutation = useDeleteStation()
  const hardDeleteMutation = useHardDeleteStation()

  const { data: station, isLoading } = useStationDetail(id)

  const [formData, setFormData] = useState({
    station_code: '',
    station_name: '',
    station_description: '',
    is_active: true,
    custom_fields: {},
  })

  useEffect(() => {
    if (station) {
      setFormData({
        station_code: station.station_code || '',
        station_name: station.station_name || '',
        station_description: station.station_description || '',
        is_active: station.is_active,
        custom_fields: station.custom_fields || {},
      })
    }
  }, [station])

  const handleChange = e => {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = e => {
    e.preventDefault()

    if (isEdit) {
      updateMutation.mutate(
        {
          id,
          ...formData,
        },
        {
          onSuccess: () => navigate('/stations'),
        }
      )
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => navigate('/stations'),
      })
    }
  }

  const handleDeactivate = () => {
    if (!window.confirm('Deactivate this station?')) return

    deleteMutation.mutate(id, {
      onSuccess: () => navigate('/stations'),
    })
  }

  const handleHardDelete = () => {
    if (
      !window.confirm(
        'Permanently delete this station? This action cannot be undone.'
      )
    )
      return

    hardDeleteMutation.mutate(id, {
      onSuccess: () => navigate('/stations'),
    })
  }

  if (isEdit && isLoading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isEdit ? `Edit: ${formData.station_name}` : 'Add Station'}
        subtitle={isEdit ? 'Modify station details' : 'Create a new production station'}
        breadcrumb={[
          { label: 'Masters', href: '/dashboard' },
          { label: 'Stations', href: '/stations' },
          { label: isEdit ? 'Edit Station' : 'Add Station' },
        ]}
        backHref="/stations"
      />

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
 
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Station Code *
            </label>
 
            <input
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-sm text-slate-800 transition-all bg-white"
              name="station_code"
              value={formData.station_code}
              onChange={handleChange}
              placeholder="e.g. ST-WELD"
              required
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Station Name *
            </label>
 
            <input
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-sm text-slate-800 transition-all bg-white"
              name="station_name"
              value={formData.station_name}
              onChange={handleChange}
              placeholder="e.g. Welding Station"
              required
            />
          </div>
 
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
 
            <textarea
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 text-sm text-slate-800 transition-all bg-white"
              rows={4}
              name="station_description"
              value={formData.station_description}
              onChange={handleChange}
              placeholder="Optional details about this station..."
            />
          </div>
 
          <div className="flex justify-between items-center border-t border-slate-100 pt-6">
 
            <div className="flex gap-3">
 
              {isEdit && (
                <>
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    className="border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-50 transition-colors"
                  >
                    Deactivate
                  </button>
 
                  <button
                    type="button"
                    onClick={handleHardDelete}
                    className="bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
 
            </div>
 
            <div className="flex gap-3">
 
              <button
                type="button"
                className="border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => navigate('/stations')}
              >
                Cancel
              </button>
 
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm"
              >
                {isEdit ? 'Save Changes' : 'Save Station'}
              </button>
 
            </div>
 
          </div>
 
        </form>
      </div>
    </div>
  )
}