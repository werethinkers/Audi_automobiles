// src/api/client.js
import axios from 'axios'
 
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})
 
// Attach JWT to every request
api.interceptors.request.use(config => {
  const isPortal = config.url?.includes('/portal') || config.baseURL?.includes('/portal');
  const token = isPortal ? localStorage.getItem('vendor_token') : localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
 
// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isPortal = err.config?.url?.includes('/portal');
      if (isPortal) {
        localStorage.removeItem('vendor_token')
        window.location.href = '/vendor-portal/login'
      } else {
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)
 
export default api
