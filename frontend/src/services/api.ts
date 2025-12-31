import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error.response?.data || error)
  }
)

export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (newPassword: string) =>
    api.post('/auth/change-password', { new_password: newPassword }),
}

export const iconApi = {
  getIcons: (params?: { category?: string; search?: string; page?: number }) =>
    api.get('/icons', { params }),
  deleteIcon: (filename: string) => api.delete(`/icons/${filename}`),
  uploadIcons: (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('file', file))
    return api.post('/icons/upload', formData)
  },
  generateJson: (iconIds?: string[], baseUrl?: string) =>
    api.post('/icons/json', { icon_ids: iconIds, base_url: baseUrl }),
  checkUpdate: () => api.get('/check-update'),
  retryThumbnails: () => api.post('/thumbnails/retry'),
  getThumbnailStatus: () => api.get('/thumbnails/status'),
}

export const userApi = {
  getUsers: (page = 1) => api.get('/users', { params: { page } }),
  createUser: (data: { username: string; password: string; role_id?: number }) =>
    api.post('/users', data),
  updateUser: (id: number, data: { role_id?: number; password?: string }) =>
    api.put(`/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/users/${id}`),
}

export const systemApi = {
  getConfig: () => api.get('/system/config'),
  getAllConfig: () => api.get('/system/config/all'),
  updateConfig: (data: Record<string, string>) => api.put('/system/config', data),
  getInfo: () => api.get('/system/info'),
}

export default api
