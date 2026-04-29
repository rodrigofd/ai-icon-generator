import React, { useState, useCallback, useEffect, useRef } from 'react'
import { IconStyle, GeneratedIcon, ReferenceIcon, ReferenceMode, ToastState } from '../../types'
import { MODEL_STORAGE_KEY, DEFAULT_PROMPT, DEFAULT_COLOR, DEFAULT_PADDING, DEFAULT_NUM_VARIANTS, QUALITY_STORAGE_KEY, FRAMED_STORAGE_KEY, FRAME_PALETTE_STORAGE_KEY, getModelOption, getStoredModelId, getStoredQuality, getStoredFramed, getStoredFramePalette } from '../../constants'
import type { Quality } from '../../services/providers/types'
import { buildFullPrompt, isSingleColorStyle } from '../../utils/promptBuilder'
import { getSafeMaskColor } from '../../utils/maskColor'
import { removeGreenScreen, addPadding } from '../../utils/imageUtils'
import { applyFrame } from '../../utils/frameUtils'
import type { FramePalette } from '../../utils/frameUtils'
import { copyPngToClipboard, downloadZip, downloadPng } from '../../utils/fileUtils'
import { getProvider } from '../../services/providers'
import { useIconHistory } from '../../hooks/useIconHistory'
import { useSelection } from '../../hooks/useSelection'
import { useFileUpload } from '../../hooks/useFileUpload'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useCompactMode } from '../../hooks/useCompactMode'
import Portal from '../common/Portal'
import Toast from '../common/Toast'
import ConfirmationDialog from '../common/ConfirmationDialog'
import Spinner from '../common/Spinner'
import SelectionToolbar from '../SelectionToolbar'
import ReferenceBanner from './ReferenceBanner'
import PromptCard from './PromptCard'
import SettingsCard from './SettingsCard'
import CompactHeader from './CompactHeader'
import ResultsGrid from './ResultsGrid'

const IconGenerator = () =>
{
  // --- Form State ---
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT)
  const [style, setStyle] = useState<IconStyle>(IconStyle.FLAT_SINGLE_COLOR)
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [numVariants, setNumVariants] = useState<number>(DEFAULT_NUM_VARIANTS)
  const [isUiIcon, setIsUiIcon] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [processingIds, setProcessingIds] = useState(new Set<string>())
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const [referenceIcon, setReferenceIcon] = useState<ReferenceIcon | null>(null)

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [padding, setPadding] = useState<number>(DEFAULT_PADDING)
  const [customPrompt, setCustomPrompt] = useState<string>('')
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [skeletonsCount, setSkeletonsCount] = useState(0)

  // Model
  const [selectedModel, setSelectedModel] = useState<string>(() => getStoredModelId())
  const [quality, setQuality] = useState<Quality>(() => getStoredQuality())
  const [framed, setFramed] = useState<boolean>(() => getStoredFramed())
  const [framePalette, setFramePalette] = useState<FramePalette>(() => getStoredFramePalette())

  // Prompts list for random suggestions
  const [allPrompts, setAllPrompts] = useState<string[]>([])
  const [lastAutoPrompt, setLastAutoPrompt] = useState<string>(DEFAULT_PROMPT)
  const [placeholderPrompt, setPlaceholderPrompt] = useState<string>(DEFAULT_PROMPT)

  // Refs
  const formRef = useRef<HTMLFormElement>(null)
  const resultsSectionRef = useRef<HTMLDivElement>(null)

  // --- Custom Hooks ---
  const {
    history, setHistory,
    newlyAddedIds, setNewlyAddedIds,
    deletingIds, confirmingDelete,
    requestDeletion, handleConfirmDelete, handleUndo, cancelDelete,
  } = useIconHistory()

  const {
    selectedIds, setSelectedIds,
    isSelectionMode, selectionBox, iconCardRefs,
    exitSelectionMode, handleToggleSelectAll, handleIconClick, handleMouseDown,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = useSelection(history)

  const {
    uploadedImages, setUploadedImages,
    isFileDragging, fileInputRef,
    handleFileChange, handleFileDragEnter, handleFileDragLeave, handleFileDrop,
    removeUploadedImage, clearUploads,
  } = useFileUpload((msg) => setToast({ message: msg }))

  const { showCompactForm, isCompactSettingsOpen, setIsCompactSettingsOpen } = useCompactMode(formRef)

  // --- Effects ---

  useEffect(() =>
  {
    fetch('./prompts.json')
      .then(res => res.ok ? res.json() : [])
      .then(data =>
      {
        if (Array.isArray(data) && data.length > 0)
        {
          setAllPrompts(data)
          const random = data[Math.floor(Math.random() * data.length)]
          setPrompt(random)
          setPlaceholderPrompt(random)
          setLastAutoPrompt(random)
        }
      })
      .catch(e => console.error('Failed to load prompts', e))
  }, [])

  useEffect(() =>
  {
    if (isLoading && skeletonsCount > 0 && window.innerWidth < 768)
    {
      resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isLoading, skeletonsCount])

  useEffect(() =>
  {
    if (referenceIcon) return
    if (isSingleColorStyle(style))
    {
      setColor(DEFAULT_COLOR)
    }
  }, [style, referenceIcon])

  // Sync custom prompt with generated prompt
  const currentModelOption = getModelOption(selectedModel)
  const currentVendor = currentModelOption?.vendor ?? 'gemini'
  const currentSupportsTransparency = currentModelOption?.supportsTransparency ?? false

  const generateFullPrompt = useCallback((promptForIcon: string) =>
  {
    return buildFullPrompt(promptForIcon, {
      vendor: currentVendor,
      style,
      color,
      isUiIcon,
      padding,
      referenceMode: referenceIcon?.mode ?? null,
      referencePrompt: referenceIcon?.icon.prompt,
      hasExternalRefs: uploadedImages.length > 0,
      useTransparentBackground: currentSupportsTransparency,
      framed,
    })
  }, [currentVendor, style, color, isUiIcon, padding, referenceIcon, uploadedImages, currentSupportsTransparency, framed])

  useEffect(() =>
  {
    setCustomPrompt(isBatchMode ? 'Batch mode is on. Prompts will be generated for each line in the description.' : generateFullPrompt(prompt))
  }, [generateFullPrompt, prompt, isBatchMode])

  // --- Handlers ---

  const handleModelChange = (newModel: string) =>
  {
    setSelectedModel(newModel)
    localStorage.setItem(MODEL_STORAGE_KEY, newModel)
  }

  const handleQualityChange = (newQuality: Quality) =>
  {
    setQuality(newQuality)
    localStorage.setItem(QUALITY_STORAGE_KEY, newQuality)
  }

  const handleFramedChange = (v: boolean) =>
  {
    setFramed(v)
    localStorage.setItem(FRAMED_STORAGE_KEY, v ? 'true' : 'false')
  }

  const handleFramePaletteChange = (p: FramePalette) =>
  {
    setFramePalette(p)
    localStorage.setItem(FRAME_PALETTE_STORAGE_KEY, p)
  }

  const handleSetReference = useCallback((iconId: string, mode: ReferenceMode) =>
  {
    const icon = history.find(i => i.id === iconId)
    if (icon)
    {
      setReferenceIcon({ icon, mode })
      clearUploads()
      setStyle(icon.style)
      setColor(icon.color)
      setIsUiIcon(icon.isUiIcon)
      setPrompt(mode === 'edit' ? icon.prompt : '')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [history, clearUploads])

  const handleRemoveBackground = useCallback(async (id: string, silent: boolean = false) =>
  {
    const icon = history.find(i => i.id === id)
    if (!icon) return

    setProcessingIds(prev => new Set(prev).add(id))

    try
    {
      const base64Original = icon.pngSrc.split(',')[1]
      const singleColor = isSingleColorStyle(icon.style)
      const maskColor = getSafeMaskColor(singleColor ? icon.color : undefined)
      const provider = getProvider(currentVendor)

      const fixPrompt = currentSupportsTransparency
        ? 'Remove any background in the image. The result must have a fully transparent background with only the icon subject remaining.'
        : `remove any background in the image and replace it with a flat, single-color background of color ${maskColor} filling the entire canvas behind the object.`

      const result = await provider.editImage(base64Original, 'image/png', fixPrompt, selectedModel, quality)

      let processedDataUrl: string
      if (result.nativeTransparency)
      {
        processedDataUrl = `data:image/png;base64,${result.base64Data}`
      }
      else
      {
        const tolerance = icon.style === IconStyle.FLAT_SINGLE_COLOR ? 50 : 25
        processedDataUrl = await removeGreenScreen(result.base64Data, tolerance)
      }

      setHistory(prev => prev.map(item =>
        item.id === id ? { ...item, pngSrc: processedDataUrl } : item,
      ))

      if (!silent) setToast({ message: 'Background removed successfully!' })
    }
    catch (err)
    {
      console.error(err)
      if (!silent) setToast({ message: 'Failed to remove background.' })
    }
    finally
    {
      setProcessingIds(prev =>
      {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [history, selectedModel, currentVendor, currentSupportsTransparency, quality, setHistory])

  const handleRemoveBackgroundSelected = useCallback(async () =>
  {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setToast({ message: `Removing background for ${ids.length} icons...` })
    try
    {
      await Promise.all(ids.map(id => handleRemoveBackground(id, true)))
      setToast({ message: 'Batch background removal complete!' })
    }
    catch (e)
    {
      console.error('Batch processing error', e)
      setToast({ message: 'Some icons could not be processed.' })
    }
  }, [selectedIds, handleRemoveBackground])

  const handleDeleteSelected = useCallback(() => requestDeletion(Array.from(selectedIds)), [selectedIds, requestDeletion])

  const handleDownload = useCallback((id: string, promptName: string) =>
  {
    const icon = history.find(i => i.id === id)
    if (icon)
    {
      const name = promptName.toLowerCase().replace(/\s+/g, '-').slice(0, 30)
      downloadPng(icon.pngSrc, name)
    }
  }, [history])

  const handleDownloadSelected = useCallback(async () =>
  {
    const selectedIcons = history.filter(icon => selectedIds.has(icon.id))
    if (selectedIcons.length === 0) return
    const filesToZip = selectedIcons.map((icon) => ({
      name: `${icon.prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}-${icon.id.slice(-6)}`,
      dataUrl: icon.pngSrc,
    }))
    setToast({ message: `Zipping ${selectedIcons.length} icons...` })
    try
    {
      await downloadZip(filesToZip, 'ai-icons.zip')
      setToast({ message: 'Zip download started!' })
    }
    catch (err)
    {
      setError(err instanceof Error ? err.message : 'An unknown zip error occurred.')
    }
  }, [history, selectedIds])

  const handleCopyImage = useCallback(async (id: string) =>
  {
    const icon = history.find(i => i.id === id)
    if (icon)
    {
      try
      {
        await copyPngToClipboard(icon.pngSrc)
        setToast({ message: 'Icon copied to clipboard!' })
      }
      catch
      {
        setToast({ message: 'Failed to copy icon.' })
      }
    }
  }, [history])

  const handleBatchModeToggle = (checked: boolean) =>
  {
    setIsBatchMode(checked)
    if (allPrompts.length === 0) return
    let newPrompt = ''
    if (checked)
    {
      const shuffled = [...allPrompts].sort(() => 0.5 - Math.random())
      newPrompt = shuffled.slice(0, 3).join('\n')
    }
    else
    {
      newPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)]
    }
    setPlaceholderPrompt(newPrompt)
    if (prompt === lastAutoPrompt || prompt === DEFAULT_PROMPT || prompt === '')
    {
      setPrompt(newPrompt)
      setLastAutoPrompt(newPrompt)
    }
    else
    {
      setLastAutoPrompt(newPrompt)
    }
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) =>
  {
    e.preventDefault()
    if (!prompt.trim()) { setError('Prompt cannot be empty.'); return }

    const promptsToProcess = isBatchMode ? prompt.split('\n').filter(p => p.trim() !== '') : [prompt.trim()]
    if (promptsToProcess.length === 0) { setError('Prompt is empty.'); return }

    setIsLoading(true)
    setError(null)
    setSkeletonsCount(promptsToProcess.length * numVariants)
    setIsCompactSettingsOpen(false)

    if (window.innerWidth < 1024)
    {
      setTimeout(() => resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }

    const referenceImagesList: string[] = [...uploadedImages]
    if (referenceIcon)
    {
      referenceImagesList.push(referenceIcon.icon.pngSrc)
    }

    const cleanedReferenceImages = referenceImagesList.map(img => img.split(',')[1] || img)

    const provider = getProvider(currentVendor)

    const allPromises = promptsToProcess.map(async (currentPrompt) =>
    {
      try
      {
        const fullApiPrompt = isBatchMode ? generateFullPrompt(currentPrompt) : customPrompt

        const results = cleanedReferenceImages.length > 0
          ? await provider.generateReferencedIcons(fullApiPrompt, numVariants, cleanedReferenceImages, selectedModel, quality)
          : await provider.generateIcons(fullApiPrompt, numVariants, selectedModel, quality)

        const processedDataUrls = await Promise.all(
          results.map(async (result) =>
          {
            if (result.nativeTransparency)
            {
              return `data:image/png;base64,${result.base64Data}`
            }
            const tolerance = style === IconStyle.FLAT_SINGLE_COLOR ? 50 : 25
            return removeGreenScreen(result.base64Data, tolerance)
          }),
        )

        // When framed, the tile already provides its own internal layout — skip canvas-edge padding.
        const paddedDataUrls = framed || padding <= 0
          ? processedDataUrls
          : await Promise.all(processedDataUrls.map(url => addPadding(url, padding)))

        const finalPngDataUrls = framed
          ? await Promise.all(paddedDataUrls.map(url => applyFrame(url, { palette: framePalette })))
          : paddedDataUrls

        const newIcons: GeneratedIcon[] = finalPngDataUrls.map((dataUrl, index) => ({
          id: `icon-${Date.now()}-${currentPrompt.slice(0, 10)}-${index}`,
          pngSrc: dataUrl,
          prompt: currentPrompt,
          style,
          color,
          isUiIcon,
        }))

        setNewlyAddedIds(new Set(newIcons.map(i => i.id)))
        setHistory(prevHistory => [...newIcons, ...prevHistory])
      }
      finally
      {
        setSkeletonsCount(prev => Math.max(0, prev - numVariants))
      }
    })

    try
    {
      await Promise.all(allPromises)
      if (referenceIcon) setReferenceIcon(null)
      if (uploadedImages.length > 0) setUploadedImages([])
    }
    catch (err)
    {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.'
      setError(errorMessage)

      if (errorMessage.includes('permission') || errorMessage.includes('403') || errorMessage.includes('not found'))
      {
        setToast({
          message: 'Permission denied. Please ensure you have selected a valid paid API key.',
        })
      }
    }
    finally
    {
      setIsLoading(false)
      setSkeletonsCount(0)
    }
  }, [prompt, style, numVariants, isUiIcon, color, referenceIcon, uploadedImages, customPrompt, padding, isBatchMode, generateFullPrompt, selectedModel, currentVendor, quality, framed, framePalette, setHistory, setNewlyAddedIds, setUploadedImages])

  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts({
    isLoading,
    formRef,
    selectedIds,
    confirmingDelete: !!confirmingDelete,
    onToggleSelectAll: handleToggleSelectAll,
    onUndo: () =>
    {
      const restoredSelection = handleUndo()
      if (restoredSelection)
      {
        setSelectedIds(restoredSelection)
        setToast({ message: 'Deletion reverted.' })
      }
    },
    onExitSelectionMode: exitSelectionMode,
    onDeleteSelected: handleDeleteSelected,
  })

  // --- Derived ---
  const singleSelectedIcon = selectedIds.size === 1 ? history.find(icon => icon.id === Array.from(selectedIds)[0]) : null

  // --- Render ---
  return (
    <div className="relative min-h-[80vh]">
      <Portal>
        <ConfirmationDialog
          isOpen={!!confirmingDelete}
          title="Confirm Deletion"
          message={`Are you sure you want to permanently delete ${confirmingDelete?.count} icon(s)?`}
          onConfirm={() => handleConfirmDelete(selectedIds, (msg, undoFn) =>
          {
            setSelectedIds(new Set())
            setToast({ message: msg, action: { label: 'Undo', onClick: undoFn } })
          })}
          onCancel={cancelDelete}
        />

        {toast && <Toast message={toast.message} action={toast.action} onClose={() => setToast(null)} />}

        <CompactHeader
          visible={showCompactForm}
          prompt={prompt}
          onPromptChange={setPrompt}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          isCompactSettingsOpen={isCompactSettingsOpen}
          onToggleSettings={() => setIsCompactSettingsOpen(!isCompactSettingsOpen)}
          style={style}
          onStyleChange={setStyle}
          color={color}
          onColorChange={setColor}
          numVariants={numVariants}
          onNumVariantsChange={setNumVariants}
        />

        {selectionBox && (
          <div
            className="fixed z-[9999] pointer-events-none border-[0.5px] border-[var(--color-accent)] bg-[var(--color-accent)]/10 backdrop-blur-[2px] rounded shadow-sm ring-1 ring-[var(--color-accent)]/20"
            style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }}
          />
        )}

        <SelectionToolbar
          selectedCount={selectedIds.size}
          totalCount={history.length}
          onDelete={handleDeleteSelected}
          onDownload={handleDownloadSelected}
          onToggleSelectAll={handleToggleSelectAll}
          onEdit={singleSelectedIcon ? () => handleSetReference(singleSelectedIcon.id, 'edit') : undefined}
          onInspire={singleSelectedIcon ? () => handleSetReference(singleSelectedIcon.id, 'inspire') : undefined}
          onCopy={singleSelectedIcon ? () => handleCopyImage(singleSelectedIcon.id) : undefined}
          onRemoveBackground={selectedIds.size > 0 ? handleRemoveBackgroundSelected : undefined}
          isSelectionMode={isSelectionMode}
          onExitSelectionMode={exitSelectionMode}
        />
      </Portal>

      <div className="mb-12">
        {referenceIcon && (
          <ReferenceBanner referenceIcon={referenceIcon} onClear={() => setReferenceIcon(null)} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <PromptCard
                prompt={prompt}
                onPromptChange={setPrompt}
                placeholderPrompt={placeholderPrompt}
                isBatchMode={isBatchMode}
                onBatchModeToggle={handleBatchModeToggle}
                uploadedImages={uploadedImages}
                isFileDragging={isFileDragging}
                fileInputRef={fileInputRef}
                onFileChange={handleFileChange}
                onFileDragEnter={handleFileDragEnter}
                onFileDragLeave={handleFileDragLeave}
                onFileDrop={handleFileDrop}
                onRemoveUploadedImage={removeUploadedImage}
              />

              <SettingsCard
                style={style}
                onStyleChange={setStyle}
                numVariants={numVariants}
                onNumVariantsChange={setNumVariants}
                padding={padding}
                onPaddingChange={setPadding}
                isUiIcon={isUiIcon}
                onUiIconChange={setIsUiIcon}
                color={color}
                onColorChange={setColor}
                isAdvancedOpen={isAdvancedOpen}
                onAdvancedToggle={() => setIsAdvancedOpen(!isAdvancedOpen)}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
                isBatchMode={isBatchMode}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                quality={quality}
                onQualityChange={handleQualityChange}
                framed={framed}
                onFramedChange={handleFramedChange}
                framePalette={framePalette}
                onFramePaletteChange={handleFramePaletteChange}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:transform-none disabled:shadow-none transition-all duration-200 flex justify-center items-center gap-3"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))' }}
              >
                {isLoading
                  ? <><Spinner /> Generating...</>
                  : (referenceIcon || uploadedImages.length > 0 ? 'Regenerate Icon' : 'Generate Icons')
                }
              </button>
            </form>
          </div>

          {/* Right Panel: Results */}
          <ResultsGrid
            history={history}
            isLoading={isLoading}
            skeletonsCount={skeletonsCount}
            selectedIds={selectedIds}
            processingIds={processingIds}
            newlyAddedIds={newlyAddedIds}
            deletingIds={deletingIds}
            iconCardRefs={iconCardRefs}
            resultsSectionRef={resultsSectionRef}
            onMouseDown={handleMouseDown}
            onIconClick={handleIconClick}
            onDelete={(id) => requestDeletion([id])}
            onPromptCopy={() => setToast({ message: 'Prompt copied!' })}
            onCopyImage={handleCopyImage}
            onDownload={handleDownload}
            onEditRequest={(id) => handleSetReference(id, 'edit')}
            onInspireRequest={(id) => handleSetReference(id, 'inspire')}
            onRemoveBackground={handleRemoveBackground}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>
    </div>
  )
}

export default IconGenerator
