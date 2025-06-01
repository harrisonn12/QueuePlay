import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://backend:8000', // target is the backend service in Docker
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
    allowedHosts: ["queue-play-34edc7c1b26f.herokuapp.com"]
  },
});
