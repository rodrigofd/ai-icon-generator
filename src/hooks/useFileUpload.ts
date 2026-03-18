import { useState, useCallback, useEffect, useRef } from 'react'

export const useFileUpload = (onFilesAttached: (message: string) => void) =>
{
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isFileDragging, setIsFileDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback((files: FileList | null) =>
  {
    if (!files || files.length === 0) return

    const newImages: string[] = []
    const readers: Promise<void>[] = []

    for (let i = 0; i < files.length; i++)
    {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      const reader = new FileReader()
      const promise = new Promise<void>((resolve) =>
      {
        reader.onload = (e) =>
        {
          if (e.target?.result)
          {
            newImages.push(e.target.result as string)
          }
          resolve()
        }
        reader.readAsDataURL(file)
      })
      readers.push(promise)
    }

    Promise.all(readers).then(() =>
    {
      if (newImages.length > 0)
      {
        setUploadedImages(prev => [...prev, ...newImages])
        onFilesAttached(`${newImages.length} image(s) attached for inspiration.`)
      }
    })
  }, [onFilesAttached])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) =>
  {
    processFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = useCallback((e: ClipboardEvent) =>
  {
    if (e.clipboardData && e.clipboardData.items)
    {
      const items = e.clipboardData.items
      const files: File[] = []
      for (let i = 0; i < items.length; i++)
      {
        if (items[i].type.indexOf('image') !== -1)
        {
          const file = items[i].getAsFile()
          if (file) files.push(file)
        }
      }

      if (files.length > 0)
      {
        e.preventDefault()
        const dt = new DataTransfer()
        files.forEach(f => dt.items.add(f))
        processFiles(dt.files)
      }
    }
  }, [processFiles])

  useEffect(() =>
  {
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const handleFileDragEnter = (e: React.DragEvent) =>
  {
    e.preventDefault()
    e.stopPropagation()
    setIsFileDragging(true)
  }

  const handleFileDragLeave = (e: React.DragEvent) =>
  {
    e.preventDefault()
    e.stopPropagation()
    setIsFileDragging(false)
  }

  const handleFileDrop = (e: React.DragEvent) =>
  {
    e.preventDefault()
    e.stopPropagation()
    setIsFileDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const removeUploadedImage = (index: number) =>
  {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const clearUploads = useCallback(() =>
  {
    setUploadedImages([])
  }, [])

  return {
    uploadedImages,
    setUploadedImages,
    isFileDragging,
    fileInputRef,
    handleFileChange,
    handleFileDragEnter,
    handleFileDragLeave,
    handleFileDrop,
    removeUploadedImage,
    clearUploads,
  }
}
