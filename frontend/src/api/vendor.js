// src/api/vendor.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'
 
const KEYS = { all: ['vendor'], list: ['vendor', 'list'], detail: (id) => ['vendor', id] }
 
export const useVendorList = (params = {}) =>
  useQuery({
    queryKey: [...KEYS.list, params],
    queryFn: () => api.get('/vendors/', { params }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
 
export const useVendorDetail = (id) =>
  useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get(`/vendors/${id}`).then(r => r.data),
    enabled: !!id,
  })
export const useVendorMaterials = (id) =>
  useQuery({
    queryKey: [...KEYS.detail(id), 'materials'],
    queryFn: () => api.get(`/vendors/${id}/materials`).then(r => r.data),
    enabled: !!id,
  })

export const useCreateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/vendors/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
 
export const useUpdateVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/vendors/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
 
export const useDeleteVendor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/vendors/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export const useUpdateVendorAccess = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/admin/vendor-portal/vendor-access', data).then(r => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.vendor_id) })
    },
  })
}

export const useAddVendorMaterial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendor_id, rm_id, standard_cost }) => 
      api.post(`/vendors/${vendor_id}/materials`, { rm_id, standard_cost }).then(r => r.data),
    onSuccess: (_, { vendor_id }) => {
      qc.invalidateQueries({ queryKey: [...KEYS.detail(vendor_id), 'materials'] })
    },
  })
}
