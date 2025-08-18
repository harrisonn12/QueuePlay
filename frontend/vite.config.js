import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://backend:8000', // Use backend service name for Docker
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // rewrite /api to ''
      },
      '/ws': {
        target: 'ws://multiplayer:6789', // target is the multiplayer service in Docker
        ws: true, // enable WebSocket proxy
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    allowedHosts: [
      'queue-play-34edc7c1b26f.herokuapp.com',
      'queue-play-backend-49545a31800d.herokuapp.com',
      'queue-play-multiplayer-server-9ddcf88d473d.herokuapp.com',
      'queueplay.io',
      '137.184.121.229',
      'localhost',
      '127.0.0.1'
    ]
  }
});
