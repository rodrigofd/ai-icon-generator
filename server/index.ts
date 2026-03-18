import https from 'https'
import fs from 'fs'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const HOST = '0.0.0.0'
const PORT = 443

const SSL_CERT_DIR = 'C:\\Certbot\\archive\\rodrigofd.pro'

async function startServer()
{
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  // API routes
  app.get('/api/health', (_req, res) =>
  {
    res.json({ status: 'ok' })
  })

  // Background removal endpoint (using sharp)
  app.post('/api/process-image', async (req, res) =>
  {
    try
    {
      const { base64Image, tolerance = 25, padding = 0 } = req.body
      if (!base64Image)
      {
        return res.status(400).json({ error: 'Missing base64Image' })
      }

      const imageBuffer = Buffer.from(base64Image.split(',')[1] || base64Image, 'base64')

      let processed = sharp(imageBuffer).ensureAlpha()

      const { data: pixelBuffer, info } = await processed.raw().toBuffer({ resolveWithObject: true })

      // Sample top-left pixel
      const bgR = pixelBuffer[0]
      const bgG = pixelBuffer[1]
      const bgB = pixelBuffer[2]
      const bgRgb = { r: bgR, g: bgG, b: bgB }

      const colorDistance = (
        rgb1: { r: number; g: number; b: number },
        rgb2: { r: number; g: number; b: number },
      ): number =>
      {
        return Math.sqrt(
          Math.pow(rgb1.r - rgb2.r, 2) +
          Math.pow(rgb1.g - rgb2.g, 2) +
          Math.pow(rgb1.b - rgb2.b, 2),
        )
      }

      for (let i = 0; i < pixelBuffer.length; i += info.channels)
      {
        const r = pixelBuffer[i]
        const g = pixelBuffer[i + 1]
        const b = pixelBuffer[i + 2]

        if (colorDistance({ r, g, b }, bgRgb) < tolerance)
        {
          pixelBuffer[i + 3] = 0
        }
      }

      let finalImage = sharp(pixelBuffer, {
        raw: { width: info.width, height: info.height, channels: info.channels },
      }).png()

      if (padding > 0)
      {
        const metadata = await finalImage.metadata()
        if (metadata.width && metadata.height)
        {
          const newWidth = metadata.width - padding * 2
          const newHeight = metadata.height - padding * 2
          if (newWidth > 0 && newHeight > 0)
          {
            const resized = await finalImage.resize(newWidth, newHeight).toBuffer()
            finalImage = sharp({
              create: {
                width: metadata.width,
                height: metadata.height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            }).composite([{ input: resized, top: padding, left: padding }]).png()
          }
        }
      }

      const finalBuffer = await finalImage.toBuffer()
      res.json({ dataUrl: `data:image/png;base64,${finalBuffer.toString('base64')}` })
    }
    catch (error)
    {
      console.error('Image processing error:', error)
      res.status(500).json({ error: 'Failed to process image' })
    }
  })

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production')
  {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }
  else
  {
    const distPath = path.join(__dirname, '..', 'dist')
    app.use(express.static(distPath))
    app.get('*all', (_req, res) =>
    {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  // Read SSL certs
  const sslOptions = {
    cert: fs.readFileSync(path.join(SSL_CERT_DIR, 'fullchain2.pem')),
    key: fs.readFileSync(path.join(SSL_CERT_DIR, 'privkey2.pem')),
  }

  https.createServer(sslOptions, app).listen(PORT, HOST, () =>
  {
    console.log(`Server running on https://pc.rodrigofd.pro:${PORT}`)
  })
}

startServer()
