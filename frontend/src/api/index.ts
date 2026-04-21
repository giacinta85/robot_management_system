import api from './client'

export const authApi = {
  login: (username: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  },
  me: () => api.get('/auth/me'),
  listUsers: () => api.get('/auth/users'),
  createUser: (data: { username: string; password: string; full_name?: string; role: string }) =>
    api.post('/auth/users', data),
  updateUser: (id: string, data: { role?: string; full_name?: string; password?: string }) =>
    api.patch(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
}

export const machinesApi = {
  list: () => api.get('/machines'),
  create: (data: any) => api.post('/machines', data),
  get: (id: string) => api.get(`/machines/${id}`),
  update: (id: string, data: any) => api.patch(`/machines/${id}`, data),
  delete: (id: string) => api.delete(`/machines/${id}`),
  listAssignments: (id: string) => api.get(`/machines/${id}/assignments`),
  createAssignment: (id: string, data: any) => api.post(`/machines/${id}/assignments`, data),
  getStats: () => api.get('/machines/stats/summary'),
}

export const maintenanceApi = {
  list: (machine_id?: string) => api.get('/maintenance', { params: machine_id ? { machine_id } : {} }),
  get: (id: string) => api.get(`/maintenance/${id}`),
  create: (data: any) => api.post('/maintenance', data),
  update: (id: string, data: any) => api.patch(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
}

export const marketingApi = {
  submitRequest: (data: any) => api.post('/marketing/requests', data),
  listRequests: () => api.get('/marketing/requests'),
  getRequest: (id: string) => api.get('/marketing/requests/' + id),
  reviewRequest: (id: string, data: any) => api.patch(`/marketing/requests/${id}/review`, data),
  updateRequest: (id: string, data: any) => api.patch(`/marketing/requests/${id}`, data),
  deleteRequest: (id: string) => api.delete(`/marketing/requests/${id}`),
  getAvailability: (start: string, end: string) =>
    api.get('/marketing/availability', { params: { start, end } }),
  getIdleMachines: () => api.get('/marketing/idle-machines'),
  getOccupancy: () => api.get('/marketing/occupancy'),
}

export const adminResourcesApi = {
  // Machine models
  listMachineModels: () => api.get('/admin/machine-models'),
  createMachineModel: (data: any) => api.post('/admin/machine-models', data),
  updateMachineModel: (id: string, data: any) => api.put(`/admin/machine-models/${id}`, data),
  deleteMachineModel: (id: string) => api.delete(`/admin/machine-models/${id}`),
  // Dance policies
  listDancePolicies: (machine_model?: string) => api.get('/admin/dance-policies', { params: machine_model ? { machine_model } : {} }),
  createDancePolicy: (data: any) => api.post('/admin/dance-policies', data),
  updateDancePolicy: (id: string, data: any) => api.put(`/admin/dance-policies/${id}`, data),
  deleteDancePolicy: (id: string) => api.delete(`/admin/dance-policies/${id}`),
  // Motion actions
  listMotionActions: (machine_model?: string) => api.get('/admin/motion-actions', { params: machine_model ? { machine_model } : {} }),
  createMotionAction: (data: any) => api.post('/admin/motion-actions', data),
  updateMotionAction: (id: string, data: any) => api.put(`/admin/motion-actions/${id}`, data),
  deleteMotionAction: (id: string) => api.delete(`/admin/motion-actions/${id}`),
  // Voice packages
  listVoicePackages: (machine_model?: string) => api.get('/admin/voice-packages', { params: machine_model ? { machine_model } : {} }),
  createVoicePackage: (data: any) => api.post('/admin/voice-packages', data),
  updateVoicePackage: (id: string, data: any) => api.put(`/admin/voice-packages/${id}`, data),
  deleteVoicePackage: (id: string) => api.delete(`/admin/voice-packages/${id}`),
  // Feature flags
  getFeatures: () => api.get('/admin/features'),
  updateFeatures: (data: Record<string, boolean>) => api.put('/admin/features', data),
  // Departments
  listDepartments: () => api.get('/admin/departments'),
  createDepartment: (data: { name: string }) => api.post('/admin/departments', data),
  deleteDepartment: (id: string) => api.delete('/admin/departments/' + id),
}

export const shippingApi = {
  submitRequest: (data: any) => api.post('/shipping/requests', data),
  listRequests: () => api.get('/shipping/requests'),
  updateStatus: (id: string, status: string) => api.patch(`/shipping/requests/${id}/status`, null, { params: { status } }),
  uploadAttachment: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/shipping/requests/${id}/attachments`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteAttachment: (id: string, url: string) => api.delete(`/shipping/requests/${id}/attachments`, { params: { url } }),
}

export const afterSalesApi = {
  submitRequest: (data: any) => api.post('/after-sales/requests', data),
  listRequests: () => api.get('/after-sales/requests'),
  updateRequest: (id: string, params: { status?: string; handled_notes?: string }) =>
    api.patch(`/after-sales/requests/${id}`, null, { params }),
}

export const auditApi = {
  listLogs: (limit = 200) => api.get('/admin/audit/logs', { params: { limit } }),
  revertLog: (id: string) => api.post(`/admin/audit/logs/${id}/revert`),
}

