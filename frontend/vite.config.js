import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy: the browser calls same-origin /api, Vite forwards it to the
    // live Baseera backend. This sidesteps the production CORS allowlist (which
    // does not include localhost) so you can sign in with your real account and
    // use real data from http://localhost:5173. To run against a LOCAL backend
    // instead, set VITE_API_URL=http://localhost:5000/api in .env and remove
    // this proxy (or point target at http://localhost:5000).
    proxy: {
      '/api': {
        target: 'https://baseera-api.runasp.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
