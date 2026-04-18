import apiClient from './axios.config';

export const vulnerabilitiesApi = {
  // GET /api/scans/:scanId/vulnerabilities
  getScanVulnerabilities: async (scanId) => {
    const response = await apiClient.get(`/scans/${scanId}/vulnerabilities`);
    return response.data;
  },

  // GET /api/scans/:scanId/vulnerabilities/severity/:severity
  getVulnerabilitiesBySeverity: async (scanId, severity) => {
    const response = await apiClient.get(`/scans/${scanId}/vulnerabilities/severity/${severity}`);
    return response.data;
  }
};
