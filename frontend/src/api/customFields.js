// src/api/customFields.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'
 
const KEYS = {
  fields: ['custom_fields'],
  values: (entity_type, entity_id) => ['custom_field_values', entity_type, entity_id]
}
 
export const useCustomFieldsList = (params = {}) =>
  useQuery({
    queryKey: [...KEYS.fields, params],
    queryFn: () => api.get('/custom-fields/fields', { params }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
 
export const useCreateCustomField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/custom-fields/fields', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.fields }),
  })
}
 
export const useUpdateCustomField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/custom-fields/fields/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.fields }),
  })
}
 
export const useDeleteCustomField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/custom-fields/fields/${id}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.fields }),
  })
}
 
export const useCustomFieldValues = (entity_type, entity_id) =>
  useQuery({
    queryKey: KEYS.values(entity_type, entity_id),
    queryFn: () => api.get(`/custom-fields/values/${entity_type}/${entity_id}`).then(r => r.data),
    enabled: !!entity_type && !!entity_id,
  })
 
export const useSaveCustomFieldValues = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/custom-fields/values', data).then(r => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.values(variables.entity_type, variables.entity_id) })
    },
  })
}
