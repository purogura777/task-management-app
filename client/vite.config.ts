import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          animation: ['framer-motion', 'react-beautiful-dnd'],
          calendar: ['@fullcalendar/react', '@fullcalendar/daygrid'],
          utils: ['date-fns', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  base: '/',
  publicDir: 'public'
}) 