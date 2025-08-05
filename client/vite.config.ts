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
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
          animation: ['framer-motion', 'react-beautiful-dnd'],
          calendar: ['@fullcalendar/react', '@fullcalendar/daygrid'],
          utils: ['date-fns', 'react-hot-toast'],
          firebase: ['firebase']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  base: '',
  publicDir: 'public',
  root: '.',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}) 