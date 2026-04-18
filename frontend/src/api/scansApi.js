import apiClient from './axios.config';

export const scansApi = {
  // POST /api/scans
  createScan: async (targetURL) => {
    const response = await apiClient.post('/scans', { targetURL });
    return response.data;
  },

  // GET /api/scans
  getUserScans: async () => {
    const response = await apiClient.get('/scans');
    return response.data;
  },

  // GET /api/scans/paged
  getPagedScans: async (params) => {
    const response = await apiClient.get('/scans/paged', { params });
    return response.data;
  },

  // GET /api/scans/:id
  getScanById: async (scanId) => {
    const response = await apiClient.get(`/scans/${scanId}`);
    return response.data;
  },

  // PUT /api/scans/:id/status
  updateScanStatus: async (scanId, status) => {
    const response = await apiClient.put(`/scans/${scanId}/status`, { status });
    return response.data;
  },

  // DELETE /api/scans/:id
  deleteScan: async (scanId) => {
    const response = await apiClient.delete(`/scans/${scanId}`);
    return response.data;
  },

  // POST /api/scans/extension
  submitExtensionScan: async (scanData) => {
    return apiClient.post('/scans/extension', scanData);
  }
};
