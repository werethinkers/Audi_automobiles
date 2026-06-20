// src/api/station.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'

const KEYS = {
  all: ['station'],
  list: ['station', 'list'],
  detail: (id) => ['station', id],
}

export const useStationList = (params = {}) =>
  useQuery({
    queryKey: [...KEYS.list, params],
    queryFn: () => api.get('/stations/', { params }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })

export const useStationDetail = (id) =>
  useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get(`/stations/${id}`).then(r => r.data),
    enabled: !!id,
  })

export const useCreateStation = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data) => api.post('/stations/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export const useUpdateStation = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }) =>
      api.put(`/stations/${id}`, data).then(r => r.data),

    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export const useDeleteStation = () => {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id) => api.delete(`/stations/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}