import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://192.168.1.24:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
