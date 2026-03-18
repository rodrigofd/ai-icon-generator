import { useState, useEffect } from 'react'

export const useCompactMode = (formRef: React.RefObject<HTMLFormElement | null>) =>
{
  const [showCompactForm, setShowCompactForm] = useState(false)
  const [isCompactSettingsOpen, setIsCompactSettingsOpen] = useState(false)

  useEffect(() =>
  {
    const handleScroll = () =>
    {
      if (window.innerWidth >= 1024)
      {
        setShowCompactForm(false)
        return
      }

      if (formRef.current)
      {
        const rect = formRef.current.getBoundingClientRect()
        const threshold = 60
        if (rect.bottom < threshold)
        {
          setShowCompactForm(true)
        }
        else
        {
          setShowCompactForm(false)
          setIsCompactSettingsOpen(false)
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [formRef])

  return {
    showCompactForm,
    isCompactSettingsOpen,
    setIsCompactSettingsOpen,
  }
}
