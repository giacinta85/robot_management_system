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
  listResourceLinks: (id: string) => api.get(`/machines/${id}/resource-links`),
  addResourceLink: (id: string, data: { resource_type: string; resource_id: string }) =>
    api.post(`/machines/${id}/resource-links`, data),
  deleteResourceLink: (machineId: string, linkId: string) =>
    api.delete(`/machines/${machineId}/resource-links/${linkId}`),
  getAttributeValues: (machineId: string) => api.get(`/machines/${machineId}/attributes`),
  setAttributeValues: (machineId: string, data: { values: Record<string, string | null> }) =>
    api.patch(`/machines/${machineId}/attributes`, data),
}

export const maintenanceApi = {
  list: (machine_id?: string) => api.get('/maintenance', { params: machine_id ? { machine_id } : {} }),
  get: (id: string) => api.get(`/maintenance/${id}`),
  create: (data: any) => api.post('/maintenance', data),
  update: (id: string, data: any) => api.patch(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
}

export const testRecordsApi = {
  list: (machine_id?: string) => api.get('/test-records', { params: machine_id ? { machine_id } : {} }),
  get: (id: string) => api.get(`/test-records/${id}`),
  create: (data: any) => api.post('/test-records', data),
  update: (id: string, data: any) => api.patch(`/test-records/${id}`, data),
  delete: (id: string) => api.delete(`/test-records/${id}`),
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
  getMachineAllocations: (machineId: string) => api.get(`/marketing/machine-allocations/${machineId}`),
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
  updateDepartment: (id: string, data: { name: string }) => api.patch(`/admin/departments/${id}`, data),
  deleteDepartment: (id: string) => api.delete('/admin/departments/' + id),
  // Damage cause presets
  listDamageCausePresets: () => api.get('/admin/damage-cause-presets'),
  createDamageCausePreset: (data: { name: string }) => api.post('/admin/damage-cause-presets', data),
  updateDamageCausePreset: (id: string, data: { name: string }) => api.patch(`/admin/damage-cause-presets/${id}`, data),
  deleteDamageCausePreset: (id: string) => api.delete(`/admin/damage-cause-presets/${id}`),
  // Motor firmware versions
  listMotorFirmwareVersions: (machine_model?: string) => api.get('/admin/motor-firmware-versions', { params: machine_model ? { machine_model } : {} }),
  createMotorFirmwareVersion: (data: any) => api.post('/admin/motor-firmware-versions', data),
  updateMotorFirmwareVersion: (id: string, data: any) => api.put(`/admin/motor-firmware-versions/${id}`, data),
  deleteMotorFirmwareVersion: (id: string) => api.delete(`/admin/motor-firmware-versions/${id}`),
  // Power board versions
  listPowerBoardVersions: (machine_model?: string) => api.get('/admin/power-board-versions', { params: machine_model ? { machine_model } : {} }),
  createPowerBoardVersion: (data: any) => api.post('/admin/power-board-versions', data),
  updatePowerBoardVersion: (id: string, data: any) => api.put(`/admin/power-board-versions/${id}`, data),
  deletePowerBoardVersion: (id: string) => api.delete(`/admin/power-board-versions/${id}`),
  // System image versions
  listSystemImageVersions: (machine_model?: string) => api.get('/admin/system-image-versions', { params: machine_model ? { machine_model } : {} }),
  createSystemImageVersion: (data: any) => api.post('/admin/system-image-versions', data),
  updateSystemImageVersion: (id: string, data: any) => api.put(`/admin/system-image-versions/${id}`, data),
  deleteSystemImageVersion: (id: string) => api.delete(`/admin/system-image-versions/${id}`),
  // Attribute Definitions
  listAttributeDefinitions: () => api.get('/admin/attribute-definitions'),
  createAttributeDefinition: (data: any) => api.post('/admin/attribute-definitions', data),
  updateAttributeDefinition: (id: string, data: any) => api.patch(`/admin/attribute-definitions/${id}`, data),
  deleteAttributeDefinition: (id: string) => api.delete(`/admin/attribute-definitions/${id}`),
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

