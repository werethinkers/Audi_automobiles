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

      <div className="bg-white rounded border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm mb-1">
              Station Code
            </label>

            <input
              className="w-full border rounded px-3 py-2"
              name="station_code"
              value={formData.station_code}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              Station Name
            </label>

            <input
              className="w-full border rounded px-3 py-2"
              name="station_name"
              value={formData.station_name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              Description
            </label>

            <textarea
              className="w-full border rounded px-3 py-2"
              rows={5}
              name="station_description"
              value={formData.station_description}
              onChange={handleChange}
            />
          </div>

          <div className="flex justify-between items-center pt-4">

            <div className="flex gap-3">

              {isEdit && (
                <>
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    className="border border-orange-300 text-orange-600 px-4 py-2 rounded hover:bg-orange-50"
                  >
                    Deactivate
                  </button>

                  <button
                    type="button"
                    onClick={handleHardDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </>
              )}

            </div>

            <div className="flex gap-3">

              <button
                type="button"
                className="border px-4 py-2 rounded"
                onClick={() => navigate('/stations')}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="bg-[#3498db] text-white px-4 py-2 rounded"
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