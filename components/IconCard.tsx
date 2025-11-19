import React, { useRef } from 'react';
import { downloadPng, copyPngToClipboard } from '../utils/fileUtils';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';
import EditIcon from './icons/EditIcon';
import InspirationIcon from './icons/InspirationIcon';
import EraserIcon from './icons/EraserIcon';
import Spinner from './Spinner';

interface IconCardProps {
  id: string;
  pngSrc: string;
  prompt: string;
  isSelected: boolean;
  isProcessing?: boolean;
  onDelete: (id: string) => void;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onPromptCopy: () => void;
  onEditRequest: (id: string) => void;
  onInspireRequest: (id: string) => void;
  onRemoveBackground: (id: string) => void;
}

const IconCard: React.FC<IconCardProps> = ({ 
  id, 
  pngSrc, 
  prompt, 
  isSelected, 
  isProcessing = false,
  onDelete, 
  onSelect, 
  onPromptCopy, 
  onEditRequest, 
  onInspireRequest,
  onRemoveBackground
}) => {
  const iconName = prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 20) || "generated-icon";
  
  const handlePromptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    onPromptCopy();
  };

  const handleActionClick = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      data-icon-card="true"
      onClick={(e) => !isProcessing && onSelect(e, id)}
      onContextMenu={(e) => { e.preventDefault(); !isProcessing && onSelect(e, id); }}
      title={isProcessing ? "Processing..." : "Click to select. Ctrl/Cmd+Click or Shift+Click to multi-select."}
      className={`relative group border p-3 rounded-lg flex flex-col items-center justify-center aspect-square transition-all duration-200 cursor-pointer overflow-hidden ring-2 ring-offset-2 hover:-translate-y-1 ${isProcessing ? 'pointer-events-none' : ''}`}
      style={{
        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        '--tw-ring-color': isSelected ? 'var(--color-accent)' : 'transparent',
        '--tw-ring-offset-color': 'var(--color-surface)',
        boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
      } as React.CSSProperties}
    >
      <img
        src={pngSrc}
        alt={prompt}
        className={`w-full h-full object-contain transition-opacity duration-300 ${isProcessing ? 'opacity-50 blur-sm' : ''}`}
      />
      
      {isProcessing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <Spinner />
        </div>
      )}

      {isSelected && !isProcessing && (
          <div 
            className="absolute top-2 left-2 w-5 h-5 border-2 rounded-md flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent-dark)'}}
          >
            <CheckIcon className="w-3.5 h-3.5 text-white" />
          </div>
      )}
      
      {!isProcessing && (
        <div className="absolute top-2 right-2 grid grid-cols-2 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={handleActionClick}>
          {[
            { action: () => onEditRequest(id), title: "Edit Icon", icon: <EditIcon className="w-4 h-4" /> },
            { action: () => onInspireRequest(id), title: "Generate Similar", icon: <InspirationIcon className="w-4 h-4" /> },
            { action: () => onRemoveBackground(id), title: "Remove Background (Fix Artifacts)", icon: <EraserIcon className="w-4 h-4" /> },
            { action: () => copyPngToClipboard(pngSrc), title: "Copy as PNG", icon: <ClipboardIcon className="w-4 h-4" /> },
            { action: () => downloadPng(pngSrc, iconName), title: "Download PNG", icon: <DownloadIcon className="w-4 h-4" /> },
            { action: () => onDelete(id), title: "Delete Icon", icon: <TrashIcon className="w-4 h-4" /> },
          ].map((btn, index) => {
             const isDelete = btn.title === "Delete Icon";
             const buttonClasses = `p-1.5 border rounded-full transition-all duration-200 transform group-hover:scale-100 scale-90 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isDelete
                  ? 'hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
              }`;
              const buttonStyles = {
                transitionDelay: `${index * 30}ms`,
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-dim)',
                boxShadow: 'var(--shadow-sm)',
                '--tw-ring-color': isDelete ? 'rgb(239 68 68 / 0.5)' : 'var(--color-accent)',
                '--tw-ring-offset-color': 'var(--color-surface)',
              } as React.CSSProperties;

            return (
              <button
                key={btn.title}
                onClick={btn.action}
                className={buttonClasses}
                title={btn.title}
                style={buttonStyles}
              >
                {btn.icon}
              </button>
            )
          })}
        </div>
      )}
      
      <div
        onClick={handlePromptClick}
        title="Click to copy prompt"
        className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex items-center justify-center"
        style={{ 
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <p className="text-xs text-center line-clamp-2 text-white font-medium drop-shadow-sm">
          {prompt}
        </p>
      </div>
    </div>
  );
};

export default IconCard;