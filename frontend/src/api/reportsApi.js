import apiClient from './axios.config';

export const reportsApi = {
  // POST /api/scans/:scanId/reports/generate
  generateReport: async (scanId) => {
    const response = await apiClient.post(`/scans/${scanId}/reports/generate`);
    return response.data;
  },

  // GET /api/reports/:id
  getReport: async (reportId) => {
    const response = await apiClient.get(`/reports/${reportId}`);
    return response.data;
  },

  // GET /api/reports/:id/download
  downloadReport: async (reportId) => {
    const response = await apiClient.get(`/reports/${reportId}/download`, {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
