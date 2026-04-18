import apiClient from './axios.config';

export const authApi = {
  // POST /api/auth/register
  register: async (userData) => {
    return apiClient.post('/auth/register', {
      email: userData.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: userData.password,
      phoneNumber: userData.phoneNumber || null,
      gender: userData.gender || null,
      dateOfBirth: userData.dateOfBirth || null,
      country: userData.country || null,
      bio: userData.bio || null
    }); // { success: true, data: token }
  },

  // POST /api/auth/login
  login: async (credentials) => {
    return apiClient.post('/auth/login', {
      email: credentials.email,
      password: credentials.password
    }); // { success: true, data: token }
  },

  // POST /api/auth/validate-token
  validateToken: async (token) => {
    return apiClient.post('/auth/validate-token', token);
  },

  // GET /api/users/profile
  getProfile: async () => {
    return apiClient.get('/users/profile');
  },

  // PUT /api/users/profile
  updateProfile: async (data) => {
    return apiClient.put('/users/profile', data);
  },

  // DELETE /api/users/profile
  deleteAccount: async () => {
    return apiClient.delete('/users/profile');
  },

  // PUT /api/users/change-password
  changePassword: async (newPassword) => {
    return apiClient.put('/users/change-password', { newPassword });
  },

  // POST /api/auth/forgot-password
  forgotPassword: async (email) => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  // POST /api/auth/reset-password
  resetPassword: async (email, token, newPassword) => {
    return apiClient.post('/auth/reset-password', { email, token, newPassword });
  },

  // POST /api/auth/verify-email
  verifyEmail: async ({ email, token }) => {
    return apiClient.post('/auth/verify-email', { email, token });
  },

  // POST /api/auth/resend-verification
  resendVerification: async (email) => {
    return apiClient.post('/auth/resend-verification', { email });
  }
};
