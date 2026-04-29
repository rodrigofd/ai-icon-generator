import http from 'http'
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
const BEHIND_PROXY = process.env.BEHIND_PROXY === 'true'
const PORT = parseInt(process.env.PORT || (BEHIND_PROXY ? '3444' : '443'), 10)

const SSL_CERT_DIR = path.resolve(__dirname, '../cert')

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

  // --- OpenAI proxy endpoints ---

  app.post('/api/openai/generate', async (req, res) =>
  {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey)
    {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' })
    }

    try
    {
      const {
        prompt,
        n = 1,
        model = 'gpt-image-2',
        size = '1024x1024',
        quality = 'low',
        background = 'auto',
        outputFormat = 'png',
      } = req.body

      const apiResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          n,
          model,
          size,
          quality,
          background,
          output_format: outputFormat,
        }),
      })

      if (!apiResponse.ok)
      {
        const errBody = await apiResponse.json().catch(() => ({}))
        const msg = (errBody as any)?.error?.message || `OpenAI API returned ${apiResponse.status}`
        return res.status(apiResponse.status).json({ error: msg })
      }

      const data = await apiResponse.json() as { data: { b64_json: string }[] }
      const images = data.data.map(d => d.b64_json)
      res.json({ images })
    }
    catch (error)
    {
      console.error('OpenAI generate error:', error)
      res.status(500).json({ error: 'Failed to generate images via OpenAI.' })
    }
  })

  app.post('/api/openai/edit', async (req, res) =>
  {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey)
    {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' })
    }

    try
    {
      const {
        prompt,
        n = 1,
        model = 'gpt-image-2',
        images: inputImages = [],
        size = '1024x1024',
        quality = 'low',
        background = 'auto',
      } = req.body

      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('model', model)
      formData.append('n', String(n))
      formData.append('size', size)
      formData.append('quality', quality)
      formData.append('background', background)

      for (const b64 of inputImages as string[])
      {
        const buffer = Buffer.from(b64, 'base64')
        const blob = new Blob([buffer], { type: 'image/png' })
        formData.append('image[]', blob, 'image.png')
      }

      const apiResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!apiResponse.ok)
      {
        const errBody = await apiResponse.json().catch(() => ({}))
        const msg = (errBody as any)?.error?.message || `OpenAI API returned ${apiResponse.status}`
        return res.status(apiResponse.status).json({ error: msg })
      }

      const data = await apiResponse.json() as { data: { b64_json: string }[] }
      const resultImages = data.data.map(d => d.b64_json)
      res.json({ images: resultImages })
    }
    catch (error)
    {
      console.error('OpenAI edit error:', error)
      res.status(500).json({ error: 'Failed to edit images via OpenAI.' })
    }
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

  if (BEHIND_PROXY)
  {
    http.createServer(app).listen(PORT, HOST, () =>
    {
      console.log(`Server running on http://${HOST}:${PORT} (behind proxy)`)
    })
  }
  else
  {
    const sslOptions = {
      cert: fs.readFileSync(path.join(SSL_CERT_DIR, 'cert.pem')),
      key: fs.readFileSync(path.join(SSL_CERT_DIR, 'key.pem')),
    }

    https.createServer(sslOptions, app).listen(PORT, HOST, () =>
    {
      console.log(`Server running on https://${HOST}:${PORT}`)
    })
  }
}

startServer()
