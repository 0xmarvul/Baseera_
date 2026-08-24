import apiClient from './axios.config';

// All endpoints are Admin-only server-side ([Authorize(Roles="Admin")]).
export const adminApi = {
  getStats: () => apiClient.get('/admin/stats'),
  getUsers: () => apiClient.get('/admin/users'),
  updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
  resetUserPassword: (id) => apiClient.post(`/admin/users/${id}/reset-password`),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
};
