import { create } from 'zustand'
 
export const useAuthStore = create((set) => ({
  token: localStorage.getItem('access_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  login: (token) => {
    localStorage.setItem('access_token', token)
    set({ token, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    set({ token: null, isAuthenticated: false })
  }
}))
