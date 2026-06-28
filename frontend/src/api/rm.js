// src/api/rm.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'
 
const KEYS = { all: ['rm'], list: ['rm', 'list'], detail: (id) => ['rm', id], mat_types: ['rm', 'material_types'], proc_sources: ['rm', 'procurement_sources'] }
 
export const useMaterialTypes = () =>
  useQuery({
    queryKey: KEYS.mat_types,
    queryFn: () => api.get('/rm-master/material-types').then(r => r.data),
  })
 
export const useProcurementSources = () =>
  useQuery({
    queryKey: KEYS.proc_sources,
    queryFn: () => api.get('/rm-master/procurement-sources').then(r => r.data),
  })
 
export const useRmList = (params = {}) =>
  useQuery({
    queryKey: [...KEYS.list, params],
    queryFn: () => api.get('/rm-master/', { params }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
 
export const useRmDetail = (id) =>
  useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get(`/rm-master/${id}`).then(r => r.data),
    enabled: !!id,
  })
 
export const useCreateRm = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/rm-master/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
 
export const useUpdateRm = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/rm-master/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
 
export const useDeleteRm = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/rm-master/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export const uploadRmExcel = async (file) => {
  const formData = new FormData()
  formData.append("file", file)

  const response = await api.post(
    "/rm-master/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  )

  return response.data
}
