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
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // target is the backend server
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // rewrite /api to ''
      },
      '/ws': {
        target: 'ws://127.0.0.1:6789', // target is the WebSocket server
        ws: true, // enable WebSocket proxy
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: ["queue-play-34edc7c1b26f.herokuapp.com"]
  },
});
