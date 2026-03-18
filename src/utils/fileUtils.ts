import JSZip from 'jszip'

export const downloadPng = (pngDataUrl: string, fileName: string): void =>
{
  const a = document.createElement('a')
  a.href = pngDataUrl
  a.download = `${fileName}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export const copyPngToClipboard = async (pngDataUrl: string): Promise<void> =>
{
  const response = await fetch(pngDataUrl)
  const blob = await response.blob()
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}

/**
 * Creates a .zip file from a list of files and initiates a download.
 */
export const downloadZip = async (
  files: { name: string; dataUrl: string }[],
  zipFileName: string = 'archive.zip',
): Promise<void> =>
{
  const zip = new JSZip()

  files.forEach(file =>
  {
    const base64Data = file.dataUrl.split(',')[1]
    const safeName = file.name.replace(/[^a-z0-9-._]/gi, '_').toLowerCase()
    zip.file(`${safeName}.png`, base64Data, { base64: true })
  })

  const content = await zip.generateAsync({ type: 'blob' })

  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = zipFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}
