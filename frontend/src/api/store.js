// src/api/store.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'
 
const KEYS = { all: ['store'], list: ['store', 'list'], detail: (id) => ['store', id] }
 
export const useStoreList = (params = {}) =>
  useQuery({
    queryKey: [...KEYS.list, params],
    queryFn: () => api.get('/stores/', { params }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
 
export const useStoreDetail = (id) =>
  useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => api.get(`/stores/${id}`).then(r => r.data),
    enabled: !!id,
  })
 
export const useCreateStore = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/stores/', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
 
export const useUpdateStore = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/stores/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
 
export const useDeleteStore = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/stores/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
