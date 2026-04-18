import api from './client'

export const authApi = {
  login: (username: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  me: () => api.get('/auth/me'),
  createUser: (data: { username: string; password: string; full_name?: string; role: string }) =>
    api.post('/auth/users', data),
}

export const machinesApi = {
  list: () => api.get('/machines'),
  create: (data: any) => api.post('/machines', data),
  get: (id: string) => api.get(`/machines/${id}`),
  update: (id: string, data: any) => api.patch(`/machines/${id}`, data),
  delete: (id: string) => api.delete(`/machines/${id}`),
  listAssignments: (id: string) => api.get(`/machines/${id}/assignments`),
  createAssignment: (id: string, data: any) => api.post(`/machines/${id}/assignments`, data),
}

export const maintenanceApi = {
  list: (machine_id?: string) => api.get('/maintenance', { params: machine_id ? { machine_id } : {} }),
  create: (data: any) => api.post('/maintenance', data),
  update: (id: string, data: any) => api.patch(`/maintenance/${id}`, data),
}

export const marketingApi = {
  submitRequest: (data: any) => api.post('/marketing/requests', data),
  listRequests: () => api.get('/marketing/requests'),
  reviewRequest: (id: string, data: any) => api.patch(`/marketing/requests/${id}/review`, data),
  getAvailability: (start: string, end: string) =>
    api.get('/marketing/availability', { params: { start, end } }),
}
