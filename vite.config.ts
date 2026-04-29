import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SSL_CERT_DIR = path.resolve(__dirname, 'cert')

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 443,
    host: '0.0.0.0',
    allowedHosts: ['localhost', '127.0.0.1', '192.168.0.40', 'icongen.rodrigofd.pro'],
    https: {
      cert: fs.readFileSync(`${SSL_CERT_DIR}\\cert.pem`),
      key: fs.readFileSync(`${SSL_CERT_DIR}\\key.pem`),
    },
  },
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY ?? ''),
    __APP_VERSION__: JSON.stringify(pkg.version),
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
