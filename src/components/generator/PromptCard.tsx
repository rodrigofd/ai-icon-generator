import React from 'react'
import Switch from '../common/Switch'
import UploadIcon from '../icons/UploadIcon'
import XCircleIcon from '../icons/XCircleIcon'
import ImageIcon from '../icons/ImageIcon'

interface PromptCardProps
{
  prompt: string
  onPromptChange: (value: string) => void
  placeholderPrompt: string
  isBatchMode: boolean
  onBatchModeToggle: (checked: boolean) => void
  uploadedImages: string[]
  isFileDragging: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFileDragEnter: (e: React.DragEvent) => void
  onFileDragLeave: (e: React.DragEvent) => void
  onFileDrop: (e: React.DragEvent) => void
  onRemoveUploadedImage: (index: number) => void
}

const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  onPromptChange,
  placeholderPrompt,
  isBatchMode,
  onBatchModeToggle,
  uploadedImages,
  isFileDragging,
  fileInputRef,
  onFileChange,
  onFileDragEnter,
  onFileDragLeave,
  onFileDrop,
  onRemoveUploadedImage,
}) => (
  <div
    className={`relative bg-[var(--color-surface)] border rounded-2xl p-1 shadow-sm transition-all duration-300 focus-within:shadow-md focus-within:border-[var(--color-accent)] ${
      isFileDragging
        ? 'border-2 border-dashed border-[var(--color-accent)] ring-4 ring-[var(--color-accent)]/10 scale-[1.02] bg-[var(--color-accent-glow)]'
        : 'border-[var(--color-border)]'
    }`}
    onDragEnter={onFileDragEnter}
    onDragOver={onFileDragEnter}
    onDragLeave={onFileDragLeave}
    onDrop={onFileDrop}
  >
    {/* Drop Zone Overlay */}
    {isFileDragging && (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm rounded-2xl pointer-events-none">
        <UploadIcon className="w-12 h-12 text-[var(--color-accent)] animate-bounce" />
        <p className="font-bold text-[var(--color-accent)] mt-2">Drop image for inspiration</p>
      </div>
    )}

    <div className="p-3 flex justify-between items-center border-b border-[var(--color-border)]/50 mb-1">
      <label htmlFor="prompt" className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] ml-1">
        {isBatchMode ? 'Batch (one prompt per line)' : 'Prompt'}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-secondary)] rounded-lg transition-colors flex items-center gap-1.5"
          title="Attach inspiration image (Drag & Drop supported)"
        >
          <UploadIcon className="w-4 h-4" />
          <span className="text-[10px] font-semibold uppercase tracking-wide hidden sm:inline">Attach</span>
        </button>
        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
        <label htmlFor="batch-mode-toggle" className="text-xs font-medium text-[var(--color-text-dim)] cursor-pointer select-none">Batch</label>
        <Switch id="batch-mode-toggle" checked={isBatchMode} onChange={onBatchModeToggle} />
      </div>
    </div>

    {/* Attached Images Preview */}
    {uploadedImages.length > 0 && (
      <div className="px-3 pt-2 pb-1 flex gap-2 overflow-x-auto custom-scrollbar">
        {uploadedImages.map((img, idx) => (
          <div key={idx} className="relative group flex-shrink-0 w-14 h-14 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden">
            <img src={img} alt="Inspiration" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveUploadedImage(idx)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <XCircleIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 rounded-lg border border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all flex-shrink-0"
        >
          <UploadIcon className="w-5 h-5" />
        </button>
      </div>
    )}

    <textarea
      id="prompt"
      value={prompt}
      onChange={(e) => onPromptChange(e.target.value)}
      placeholder={uploadedImages.length > 0 ? 'Describe how to adapt the attached reference...' : placeholderPrompt}
      className="w-full h-32 bg-transparent p-3 text-base font-medium placeholder:text-[var(--color-text-dim)]/50 focus:outline-none resize-none rounded-xl"
      style={{ color: 'var(--color-text)' }}
    />

    {uploadedImages.length > 0 && (
      <div className="px-3 pb-2 flex items-center gap-2 text-[10px] font-medium text-[var(--color-accent)] uppercase tracking-wider animate-fade-in">
        <ImageIcon className="w-3 h-3" />
        <span>Inspiration Mode Active</span>
      </div>
    )}
  </div>
)

export default PromptCard
