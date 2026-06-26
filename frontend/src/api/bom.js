// src/api/bom.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'

const KEYS = {
  products: ['products'],
  product_detail: (id) => ['products', id],
  boms: ['boms'],
  bom_detail: (id) => ['boms', id]
}

// -- Products --

export const useProductList = () =>
  useQuery({
    queryKey: KEYS.products,
    queryFn: () => api.get('/bom/products').then(r => r.data),
  })

export const useProductDetail = (id) =>
  useQuery({
    queryKey: KEYS.product_detail(id),
    queryFn: () => api.get(`/bom/products/${id}`).then(r => r.data),
    enabled: !!id,
  })

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/bom/products', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.products }),
  })
}

// -- BOMs --

export const useBomList = () =>
  useQuery({
    queryKey: KEYS.boms,
    queryFn: () => api.get('/bom').then(r => r.data),
  })

export const useBomDetail = (id) =>
  useQuery({
    queryKey: KEYS.bom_detail(id),
    queryFn: () => api.get(`/bom/${id}`).then(r => r.data),
    enabled: !!id,
  })

export const useCreateBom = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/bom', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.boms }),
  })
}

export const useUpdateBom = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/bom/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.boms }),
  })
}
