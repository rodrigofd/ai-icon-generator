/**
 * Removes a solid-color background from a base64 encoded image using a canvas.
 * Determines background color by sampling the top-left pixel.
 * Uses Euclidean distance and a de-spill algorithm to handle noise and fringing.
 */
export const removeGreenScreen = (base64Image: string, tolerance: number = 25): Promise<string> =>
{
  return new Promise((resolve, reject) =>
  {
    const img = new Image()
    img.crossOrigin = 'Anonymous'

    img.onload = () =>
    {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      if (!ctx)
      {
        return reject(new Error('Could not get 2D canvas context'))
      }

      ctx.drawImage(img, 0, 0)

      try
      {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Sample the top-left pixel to determine the background color
        const bgR = data[0]
        const bgG = data[1]
        const bgB = data[2]

        const isGreenScreen = bgG > bgR && bgG > bgB
        const isBlueScreen = bgB > bgR && bgB > bgG

        // Convert tolerance to Euclidean distance threshold
        const threshold = tolerance * 1.5

        for (let i = 0; i < data.length; i += 4)
        {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          const dist = Math.sqrt(
            (r - bgR) ** 2 +
            (g - bgG) ** 2 +
            (b - bgB) ** 2,
          )

          if (dist < threshold)
          {
            data[i + 3] = 0
          }
          else if (dist < threshold * 3)
          {
            // De-spill: neutralize background color component on edge pixels
            if (isGreenScreen && g > r && g > b)
            {
              data[i + 1] = Math.max(r, b)
            }
            else if (isBlueScreen && b > r && b > g)
            {
              data[i + 2] = Math.max(r, g)
            }
          }
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      catch (error)
      {
        console.error('Error processing image data:', error)
        reject(new Error('Failed to process image for background removal. The image might be from a tainted canvas.'))
      }
    }

    img.onerror = (err) =>
    {
      reject(new Error(`Failed to load image for processing: ${err}`))
    }

    img.src = `data:image/png;base64,${base64Image}`
  })
}

/**
 * Resizes an image to fit within a new canvas, creating transparent padding.
 * The canvas size is kept the same as the original image.
 */
export const addPadding = (dataUrl: string, padding: number): Promise<string> =>
{
  return new Promise((resolve, reject) =>
  {
    if (padding <= 0)
    {
      resolve(dataUrl)
      return
    }

    const img = new Image()

    img.onload = () =>
    {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      if (!ctx)
      {
        return reject(new Error('Could not get 2D canvas context'))
      }

      const newImageWidth = img.width - (padding * 2)
      const newImageHeight = img.height - (padding * 2)

      if (newImageWidth > 0 && newImageHeight > 0)
      {
        ctx.drawImage(img, padding, padding, newImageWidth, newImageHeight)
      }

      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = (err) =>
    {
      reject(new Error(`Failed to load image for padding: ${err}`))
    }

    img.src = dataUrl
  })
}
