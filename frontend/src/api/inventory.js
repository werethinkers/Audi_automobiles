// src/api/inventory.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'
 
const KEYS = {
  balances: ['inventory', 'balances'],
  balance_detail: (rm_id, store_id) => ['inventory', 'balance', rm_id, store_id],
  ledger: ['inventory', 'ledger']
}
 
export const useInventoryBalances = (params = {}) =>
  useQuery({
    queryKey: [...KEYS.balances, params],
    queryFn: () => api.get('/inventory/balances', { params }).then(r => r.data),
    staleTime: 1 * 60 * 1000, // 1 min stale cache
  })
 
export const useSingleBalance = (rm_id, store_id) =>
  useQuery({
    queryKey: KEYS.balance_detail(rm_id, store_id),
    queryFn: () => api.get(`/inventory/balances/${rm_id}/${store_id}`).then(r => r.data),
    enabled: !!rm_id && !!store_id,
  })
 
export const useConsumeStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/inventory/consume', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: KEYS.ledger })
    },
  })
}
 
export const useTransferStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/inventory/transfer', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: KEYS.ledger })
    },
  })
}
 
export const useLedgerList = (params = {}) =>
  useQuery({
    queryKey: [...KEYS.ledger, params],
    queryFn: () => api.get('/inventory/ledger', { params }).then(r => r.data),
    staleTime: 30 * 1000,
  })
