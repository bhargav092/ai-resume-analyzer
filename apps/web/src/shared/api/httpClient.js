import axios from 'axios'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 30_000,
})

httpClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('guestAccessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
