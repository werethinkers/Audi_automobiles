// src/api/procurement.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'
 
const KEYS = {
  po_all: ['po'],
  po_list: ['po', 'list'],
  po_detail: (id) => ['po', id],
  grn_all: ['grn'],
  grn_list: ['grn', 'list']
}
 
// ── PO HOOKS ─────────────────────────────────────────
export const usePoList = () =>
  useQuery({
    queryKey: KEYS.po_list,
    queryFn: () => api.get('/procurement/purchase-orders').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
 
export const usePoDetail = (id) =>
  useQuery({
    queryKey: KEYS.po_detail(id),
    queryFn: () => api.get(`/procurement/purchase-orders/${id}`).then(r => r.data),
    enabled: !!id,
  })
 
export const useCreatePo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/procurement/purchase-orders', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.po_all }),
  })
}
 
export const useUpdatePoStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status_id }) => api.put(`/procurement/purchase-orders/${id}/status`, { status_id }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.po_all })
    },
  })
}

export const useDeletePo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/procurement/purchase-orders/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.po_all }),
  })
}
 
// ── GRN HOOKS ────────────────────────────────────────
export const useGrnList = () =>
  useQuery({
    queryKey: KEYS.grn_list,
    queryFn: () => api.get('/procurement/grn').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
 
export const useCreateGrn = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/procurement/grn', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.grn_all })
      qc.invalidateQueries({ queryKey: KEYS.po_all })
      qc.invalidateQueries({ queryKey: ['inventory'] }) // invalidate stock balances
    },
  })
}

export const useDeleteGrn = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/procurement/grn/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.grn_all })
      qc.invalidateQueries({ queryKey: KEYS.po_all })
    },
  })
}
