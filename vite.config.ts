import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SSL_CERT_DIR = 'C:\\Certbot\\archive\\rodrigofd.pro'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 443,
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1', '192.168.0.40', 'pc.rodrigofd.pro'],
    https: {
      cert: fs.readFileSync(`${SSL_CERT_DIR}\\fullchain2.pem`),
      key: fs.readFileSync(`${SSL_CERT_DIR}\\privkey2.pem`),
    },
  },
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY ?? ''),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-genai': ['@google/genai'],
        },
      },
    },
  },
})
