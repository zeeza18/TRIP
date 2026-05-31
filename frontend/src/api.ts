import axios from 'axios'

export const api = axios.create({ baseURL: 'http://localhost:4001' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const res = await axios.post('http://localhost:4001/auth/refresh', { refreshToken })
          localStorage.setItem('accessToken', res.data.accessToken)
          original.headers.Authorization = `Bearer ${res.data.accessToken}`
          return api(original)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(error)
  }
)
