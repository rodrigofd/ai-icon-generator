import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateIcons, generateReferencedIcon, getStyleDescription, getSafeMaskColor } from '../services/geminiService';
import { IconStyle, GeneratedIcon } from '../types';
import { removeGreenScreen, addPadding } from '../utils/imageUtils';
import { copyPngToClipboard, downloadZip } from '../utils/fileUtils';
import IconCard from './IconCard';
import Spinner from './Spinner';
import Toast from './Toast';
import SelectionToolbar from './SelectionToolbar';
import XCircleIcon from './icons/XCircleIcon';
import IconCardSkeleton from './IconCardSkeleton';
import Switch from './Switch';
import ConfirmationDialog from './ConfirmationDialog';

type ReferenceMode = 'edit' | 'inspire';

interface ToastAction {
  label: string;
  onClick: () => void;
}

const STYLE_OPTIONS = [
  { id: IconStyle.FLAT_SINGLE_COLOR, label: 'Flat', imageUrl: './assets/style-flat.png' },
  { id: IconStyle.FLAT_COLORED, label: 'Colored', imageUrl: './assets/style-colored.png' },
  { id: IconStyle.OUTLINE, label: 'Outline', imageUrl: './assets/style-outline.png' },
  { id: IconStyle.GRADIENT, label: 'Gradient', imageUrl: './assets/style-gradient.png' },
  { id: IconStyle.ISOMETRIC, label: 'Isometric', imageUrl: './assets/style-isometric.png' },
  { id: IconStyle.THREE_D, label: '3D Render', imageUrl: './assets/style-3d-render.png' },
];

const VARIANT_OPTIONS = [1, 2, 4, 8];

const getContrastColor = (hex: string) => {
    if (hex.indexOf('#') === 0) hex = hex.slice(1);
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length !== 6) return '#FFFFFF';
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#FFFFFF';
};

const StyleSelector: React.FC<{ selected: IconStyle, onSelect: (style: IconStyle) => void }> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STYLE_OPTIONS.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onSelect(style.id)}
          title={style.id}
          className="flex flex-col items-center justify-center p-2 border rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/5 hover:-translate-y-0.5"
          style={{ 
            backgroundColor: selected === style.id ? 'var(--color-accent-glow)' : 'transparent',
            borderColor: selected === style.id ? 'var(--color-accent)' : 'var(--color-border)',
            color: 'var(--color-text)',
            boxShadow: selected === style.id ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          }}
        >
          <img src={style.imageUrl} alt={style.label} className="w-8 h-8 mb-1" />
          <span className="text-xs font-medium">{style.label}</span>
        </button>
      ))}
    </div>
  );
}

const IconGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('A rocket ship launching');
  const [style, setStyle] = useState<IconStyle>(IconStyle.FLAT_SINGLE_COLOR);
  const [color, setColor] = useState<string>('#4F46E5');
  const [numVariants, setNumVariants] = useState<number>(2);
  const [isUiIcon, setIsUiIcon] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedIcon[]>([]);
  const [toast, setToast] = useState<{ message: string; action?: ToastAction } | null>(null);
  
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const undoStateRef = useRef<{ history: GeneratedIcon[], selectedIds: Set<string> } | null>(null);

  const [referenceIcon, setReferenceIcon] = useState<{ icon: GeneratedIcon, mode: ReferenceMode } | null>(null);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [padding, setPadding] = useState<number>(32);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [skeletonsCount, setSkeletonsCount] = useState<number>(0);

  const [confirmingDelete, setConfirmingDelete] = useState<{ ids: string[]; count: number } | null>(null);
  const [deletingIds, setDeletingIds] = useState(new Set<string>());
  const [newlyAddedIds, setNewlyAddedIds] = useState(new Set<string>());

  const formRef = useRef<HTMLFormElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const iconCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const dragStartPoint = useRef<{x: number, y: number} | null>(null);
  const dragInitialState = useRef<{ initialIds: Set<string> } | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const longPressTimeout = useRef<number | null>(null);

  const isSingleColorStyle = style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE;

  useEffect(() => {
    window.localforage.getItem('iconHistory')
      .then((storedHistory: GeneratedIcon[] | null) => {
        if (storedHistory) setHistory(storedHistory);
      })
      .catch((e: Error) => {
        console.error("Failed to load history", e);
        window.localforage.removeItem('iconHistory');
      });
  }, []);

  useEffect(() => {
    window.localforage.setItem('iconHistory', history).catch((e: Error) => console.error("Failed to save history", e));
  }, [history]);

  useEffect(() => {
    if (newlyAddedIds.size > 0) {
        const timer = setTimeout(() => setNewlyAddedIds(new Set()), 2000);
        return () => clearTimeout(timer);
    }
  }, [newlyAddedIds]);

  useEffect(() => {
    if (isLoading && skeletonsCount > 0) {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isLoading, skeletonsCount]);

  useEffect(() => {
    if (referenceIcon) return;
    if (style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE) {
        setColor('#4F46E5'); // Default modern blue/purple
    }
  }, [style, referenceIcon]);

  const generateFullPrompt = useCallback((promptForIcon: string) => {
    const styleDescription = getStyleDescription(style, isSingleColorStyle ? color : undefined);
    const maskColor = getSafeMaskColor(isSingleColorStyle ? color : undefined);
    
    // Technical constraints
    const paddingInstruction = padding > 0 
      ? "Constraint: Ensure distinct separation from the canvas edges (fit within safe zone)." 
      : "Constraint: Fit effectively within the frame.";

    // UI Icon logic: simpler, bolder
    const complexityInstruction = isUiIcon 
      ? "Complexity: LOW. Create a High-Contrast, Simple, Legible icon. Avoid small details, thin lines, or clutter. This must be readable at 24px." 
      : "Complexity: Medium. Professional icon detail level.";

    // The core system instruction for the model
    const systemPreamble = `Role: Senior Icon Designer.
Task: Create a professional 512x512 vector-style icon.`;

    const backgroundInstruction = `Background: SOLID ${maskColor}. Do NOT use this color in the icon itself. No gradients in background. No shadows on background.`;

    const negativePrompt = `Negative Prompt: Text, watermarks, signature, photorealism, noise, dithering, blurry, complex background, scene, landscape.`;

    if (referenceIcon) {
        if (referenceIcon.mode === 'edit') {
            return `${systemPreamble}
Mode: EDITING.
Original Icon Description: "${referenceIcon.icon.prompt}"
User Instruction: "${promptForIcon}"
Constraint: Apply the user instruction while preserving the original's exact style, perspective, and composition.
${styleDescription}
${backgroundInstruction}`;
        } else { // inspire mode
            return `${systemPreamble}
Mode: INSPIRATION.
Task: Generate a NEW icon for: "${promptForIcon}".
Constraint: Strictly copy the artistic style, lighting, and rendering technique of the provided reference image.
${backgroundInstruction}`;
        }
    } else {
        // Standard Generation
        return `${systemPreamble}
Subject: "${promptForIcon}"
${styleDescription}
${complexityInstruction}
${paddingInstruction}
Composition: Centered, single isolated object.
${backgroundInstruction}
${negativePrompt}`;
    }
  }, [style, color, isUiIcon, padding, referenceIcon, isSingleColorStyle]);

  useEffect(() => {
    setCustomPrompt(isBatchMode ? "Batch mode is on. Prompts will be generated for each line in the description." : generateFullPrompt(prompt));
  }, [generateFullPrompt, prompt, isBatchMode]);

  const handleUndo = useCallback(() => {
    if (undoStateRef.current) {
      setHistory(undoStateRef.current.history);
      setSelectedIds(undoStateRef.current.selectedIds);
      undoStateRef.current = null;
      setToast({ message: 'Deletion reverted.' });
    }
  }, []);

  const handleSetReference = useCallback((iconId: string, mode: ReferenceMode) => {
    const icon = history.find(i => i.id === iconId);
    if (icon) {
      setReferenceIcon({ icon, mode });
      setStyle(icon.style);
      setColor(icon.color);
      setIsUiIcon(icon.isUiIcon);
      setPrompt(mode === 'edit' ? icon.prompt : '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [history]);

  const requestDeletion = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmingDelete({ ids, count: ids.length });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmingDelete) return;
    const idsToDelete = new Set(confirmingDelete.ids);
    undoStateRef.current = { history: [...history], selectedIds: new Set(selectedIds) };
    setDeletingIds(idsToDelete);
    setTimeout(() => {
        setHistory(prev => prev.filter(icon => !idsToDelete.has(icon.id)));
        setSelectedIds(new Set());
        setDeletingIds(new Set());
        setToast({
            message: `${confirmingDelete.count} icon(s) removed.`,
            action: { label: 'Undo', onClick: handleUndo }
        });
    }, 400);
    setConfirmingDelete(null);
  }, [confirmingDelete, history, selectedIds, handleUndo]);

  const handleDeleteSelected = useCallback(() => requestDeletion(Array.from(selectedIds)), [selectedIds, requestDeletion]);

  const handleDownloadSelected = useCallback(async () => {
    const selectedIcons = history.filter(icon => selectedIds.has(icon.id));
    if (selectedIcons.length === 0) return;
    const filesToZip = selectedIcons.map((icon) => ({
      name: `${icon.prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}-${icon.id.slice(-6)}`,
      dataUrl: icon.pngSrc,
    }));
    setToast({ message: `Zipping ${selectedIcons.length} icons...` });
    try {
      await downloadZip(filesToZip, 'ai-icons.zip');
      setToast({ message: 'Zip download started!' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown zip error occurred.');
    }
  }, [history, selectedIds]);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(icon => icon.id)));
    }
  }, [history, selectedIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcut for Generation: Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && formRef.current) {
          formRef.current.requestSubmit();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        // Avoid conflicting with text input selection
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'textarea' || activeTag === 'input') {
            return;
        }
        e.preventDefault();
        handleToggleSelectAll();
        return;
      } 
      
      if (e.key === 'Escape') {
        e.preventDefault();
        exitSelectionMode();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, handleToggleSelectAll, exitSelectionMode]);


  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) { setError("Prompt cannot be empty."); return; }
    const promptsToProcess = isBatchMode ? prompt.split('\n').filter(p => p.trim() !== '') : [prompt.trim()];
    if (promptsToProcess.length === 0) { setError("Prompt is empty."); return; }
    
    setIsLoading(true);
    setError(null);
    setSkeletonsCount(promptsToProcess.length * numVariants);

    const allPromises = promptsToProcess.map(async (currentPrompt) => {
      try {
        const fullApiPrompt = isBatchMode ? generateFullPrompt(currentPrompt) : customPrompt;
        const pngB64StringsWithGreen = referenceIcon
          ? await generateReferencedIcon(fullApiPrompt, numVariants, referenceIcon.icon.pngSrc.split(',')[1])
          : await generateIcons(fullApiPrompt, numVariants);
        
        const transparentPngDataUrls = await Promise.all(pngB64StringsWithGreen.map(b64 => removeGreenScreen(b64, style === IconStyle.FLAT_SINGLE_COLOR ? 50 : 25)));
        const finalPngDataUrls = padding > 0 ? await Promise.all(transparentPngDataUrls.map(url => addPadding(url, padding))) : transparentPngDataUrls;

        const newIcons: GeneratedIcon[] = finalPngDataUrls.map((dataUrl, index) => ({
          id: `icon-${Date.now()}-${currentPrompt.slice(0, 10)}-${index}`,
          pngSrc: dataUrl, prompt: currentPrompt, style, color, isUiIcon
        }));
        
        setNewlyAddedIds(new Set(newIcons.map(i => i.id)));
        setHistory(prevHistory => [...newIcons, ...prevHistory]);

      } finally {
        setSkeletonsCount(prev => Math.max(0, prev - numVariants));
      }
    });
    
    try {
      await Promise.all(allPromises);
      if (referenceIcon) setReferenceIcon(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
      setSkeletonsCount(0);
    }
  }, [prompt, style, numVariants, isUiIcon, color, referenceIcon, customPrompt, padding, isBatchMode, generateFullPrompt]);

  const handleDelete = (id: string) => requestDeletion([id]);
  
  const handleIconClick = useCallback((e: React.MouseEvent, clickedId: string) => {
    e.preventDefault();
    if (isSelectionMode) {
        const newSelection = new Set(selectedIds);
        newSelection.has(clickedId) ? newSelection.delete(clickedId) : newSelection.add(clickedId);
        if (newSelection.size === 0) exitSelectionMode();
        setSelectedIds(newSelection);
        setLastSelectedId(clickedId);
        return;
    }

    const { shiftKey, ctrlKey, metaKey } = e;
    const isCtrl = ctrlKey || metaKey;

    let newSelection = new Set(selectedIds);

    if (shiftKey && lastSelectedId && history.length > 0) {
        const lastIndex = history.findIndex(i => i.id === lastSelectedId);
        const currentIndex = history.findIndex(i => i.id === clickedId);
        const from = Math.min(lastIndex, currentIndex);
        const to = Math.max(lastIndex, currentIndex);
        if (from !== -1 && to !== -1) {
            const rangeIds = history.slice(from, to + 1).map(i => i.id);
            if (!isCtrl) {
              newSelection.clear();
            }
            // Add all items in range to selection
            rangeIds.forEach(id => newSelection.add(id));
        }
    } else if (isCtrl) {
        newSelection.has(clickedId) ? newSelection.delete(clickedId) : newSelection.add(clickedId);
    } else {
        if (selectedIds.has(clickedId) && selectedIds.size === 1) {
            newSelection = new Set();
        } else {
            newSelection = new Set([clickedId]);
        }
    }
    
    setSelectedIds(newSelection);
    setLastSelectedId(clickedId);
  }, [history, lastSelectedId, selectedIds, isSelectionMode, exitSelectionMode]);


  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('form') || target.closest('[data-selection-toolbar="true"]') || target.closest('[data-icon-card="true"]')) return;
    
    // Allow starting drag from a small margin around the grid
    if (resultsSectionRef.current) {
        const rect = resultsSectionRef.current.getBoundingClientRect();
        const margin = 20; // Virtual margin in pixels
        if (e.clientX < rect.left - margin || e.clientX > rect.right + margin || e.clientY < rect.top - margin || e.clientY > rect.bottom + margin) {
            return;
        }
    } else {
        return;
    }

    e.preventDefault();
    setIsDragging(true);
    dragStartPoint.current = { x: e.clientX, y: e.clientY };
    setSelectionBox({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    dragInitialState.current = { initialIds: new Set(selectedIds) };
  }, [selectedIds]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartPoint.current || !dragInitialState.current) return;
    e.preventDefault();
    const { x: startX, y: startY } = dragStartPoint.current;
    const { clientX: currentX, clientY: currentY } = e;
    const x = Math.min(startX, currentX), y = Math.min(startY, currentY), width = Math.abs(startX - currentX), height = Math.abs(startY - currentY);
    setSelectionBox({ x, y, width, height });

    const selectionRect = { left: x, top: y, right: x + width, bottom: y + height };
    const initialIds = dragInitialState.current.initialIds;
    const newSelection = new Set(initialIds);

    iconCardRefs.current.forEach((el, id) => {
        if (el) {
            const elRect = el.getBoundingClientRect();
            const intersects = !(selectionRect.right < elRect.left || selectionRect.left > elRect.right || selectionRect.bottom < elRect.top || selectionRect.top > elRect.bottom);
            
            if (intersects) {
                newSelection.add(id);
            } else if (initialIds.has(id)) {
                // This logic is complex. Standard drag is to just select what's inside.
                // Let's simplify: drag selects intersecting items.
            }
        }
    });
    
    const finalSelection = new Set<string>();
    iconCardRefs.current.forEach((el, id) => {
      if(el) {
        const elRect = el.getBoundingClientRect();
        if (!(selectionRect.right < elRect.left || selectionRect.left > elRect.right || selectionRect.bottom < elRect.top || selectionRect.top > elRect.bottom)) {
          finalSelection.add(id);
        }
      }
    });

    setSelectedIds(finalSelection);

  }, [isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging && dragStartPoint.current) {
        const dist = Math.sqrt(Math.pow(e.clientX - dragStartPoint.current.x, 2) + Math.pow(e.clientY - dragStartPoint.current.y, 2));
        const target = e.target as HTMLElement;
        if (dist < 5 && !target.closest('[data-icon-card="true"]')) {
           exitSelectionMode();
        }
    }
    setIsDragging(false);
    dragStartPoint.current = null;
    setSelectionBox(null);
    dragInitialState.current = null;
  }, [isDragging, exitSelectionMode]);

  const handleVariantChange = (direction: 'inc' | 'dec') => {
      const currentIndex = VARIANT_OPTIONS.indexOf(numVariants);
      setNumVariants(VARIANT_OPTIONS[direction === 'inc' ? Math.min(currentIndex + 1, VARIANT_OPTIONS.length - 1) : Math.max(currentIndex - 1, 0)]);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  const handleTouchStart = (id: string) => {
    longPressTimeout.current = window.setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedIds(prev => new Set(prev).add(id));
      setLastSelectedId(id);
      longPressTimeout.current = null;
    }, 500);
  };
  
  const handleTouchMove = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
  };

  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      // It was a tap, not a long press.
      handleIconClick(e as any, id);
    }
  };


  const singleSelectedIcon = selectedIds.size === 1 ? history.find(icon => icon.id === Array.from(selectedIds)[0]) : null;

  const newIdsArray = Array.from(newlyAddedIds);

  return (
    <div className="space-y-6" onMouseDown={handleMouseDown}>
      <ConfirmationDialog isOpen={!!confirmingDelete} title="Confirm Deletion" message={`Are you sure you want to permanently delete ${confirmingDelete?.count} icon(s)?`} onConfirm={handleConfirmDelete} onCancel={() => setConfirmingDelete(null)} />
      {toast && <Toast message={toast.message} action={toast.action} onClose={() => setToast(null)} />}
      {selectionBox && <div className="fixed border-2 rounded-lg pointer-events-none z-50" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height, borderColor: 'var(--color-accent)', background: 'var(--color-accent-glow)' }} />}
      <SelectionToolbar selectedCount={selectedIds.size} totalCount={history.length} onDelete={handleDeleteSelected} onDownload={handleDownloadSelected} onToggleSelectAll={handleToggleSelectAll} onEdit={singleSelectedIcon ? () => handleSetReference(singleSelectedIcon.id, 'edit') : undefined} onInspire={singleSelectedIcon ? () => handleSetReference(singleSelectedIcon.id, 'inspire') : undefined} onCopy={singleSelectedIcon ? () => copyPngToClipboard(singleSelectedIcon.pngSrc).then(() => setToast({ message: 'Icon copied!' })) : undefined} isSelectionMode={isSelectionMode} onExitSelectionMode={exitSelectionMode} />
      
      <form ref={formRef} onSubmit={handleSubmit}>
        {referenceIcon && (
          <div className="mb-4 p-3 flex items-center justify-between border rounded-lg" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-accent-glow)' }}>
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={referenceIcon.icon.pngSrc} className="w-10 h-10 flex-shrink-0 rounded" alt="Reference Icon" />
              <div className="overflow-hidden">
                <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
                  {referenceIcon.mode === 'edit' ? 'Editing Icon' : 'Inspired by Icon'}
                </span>
                <p className="text-sm truncate" style={{ color: 'var(--color-text-dim)' }}>
                  {referenceIcon.icon.prompt}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setReferenceIcon(null)} className="p-1 flex-shrink-0 ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" title="Clear reference">
              <XCircleIcon className="w-6 h-6" style={{ color: 'var(--color-text-dim)' }}/>
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
                <div className="flex justify-between items-center">
                    <label htmlFor="prompt" className="text-sm font-semibold" style={{ color: 'var(--color-text-dim)' }}>
                        {isBatchMode ? "Prompts (one per line)" : "Describe the icon you want to create"}
                    </label>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="batch-mode-toggle" className="text-sm" style={{ color: 'var(--color-text-dim)' }}>Batch Mode</label>
                        <Switch id="batch-mode-toggle" checked={isBatchMode} onChange={setIsBatchMode} />
                    </div>
                </div>
                {isBatchMode && <p className="text-xs mt-1" style={{color: 'var(--color-text-dim)'}}>Enter multiple prompts on separate lines to generate icons in bulk.</p>}
            </div>
            <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={ isBatchMode ? 'a smiling coffee cup\na paper airplane\na vintage camera' : 'a smiling coffee cup...' }
              className="w-full h-28 sm:h-32 bg-transparent border rounded-lg p-3 focus:outline-none focus:ring-2 focus:shadow-[var(--shadow-inner-sm)]"
              // FIX: Replaced invalid `ringColor` property with the correct CSS custom property `--tw-ring-color`
              // to align with Tailwind's ring utilities and resolve the TypeScript error.
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
              title={isBatchMode ? "Enter one prompt per line to generate multiple icons at once" : "Describe the icon you want, e.g., 'a rocket ship launching'"}
            />
          </div>

          <div className="flex flex-col justify-between space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Style</label>
              <StyleSelector selected={style} onSelect={setStyle} />
            </div>
            <div className="grid grid-cols-1 gap-4 items-end">
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="block text-xs font-semibold mb-1 text-center" style={{ color: 'var(--color-text-dim)' }}>Variants</label>
                        <div className="flex items-center justify-between w-full h-11 border rounded-lg" style={{borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)'}}>
                            <button type="button" onClick={() => handleVariantChange('dec')} disabled={numVariants === VARIANT_OPTIONS[0]} className="px-3 py-2 text-lg disabled:opacity-25 transition-colors hover:bg-black/5 dark:hover:bg-white/10" title="Decrease number of variants">-</button>
                            <span className="font-semibold text-lg" style={{ color: 'var(--color-accent)' }}>{numVariants}</span>
                            <button type="button" onClick={() => handleVariantChange('inc')} disabled={numVariants === VARIANT_OPTIONS[VARIANT_OPTIONS.length - 1]} className="px-3 py-2 text-lg disabled:opacity-25 transition-colors hover:bg-black/5 dark:hover:bg-white/10" title="Increase number of variants">+</button>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="padding" className="block text-xs font-semibold mb-1 text-center" style={{ color: 'var(--color-text-dim)' }}>Padding</label>
                        <input id="padding" type="number" value={padding} onChange={e => setPadding(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-full h-11 text-lg bg-transparent border rounded-lg p-2 text-center focus:outline-none focus:ring-2 focus:shadow-[var(--shadow-inner-sm)]" 
                        // FIX: Replaced invalid `ringColor` property with the correct CSS custom property `--tw-ring-color`
                        // to align with Tailwind's ring utilities and resolve the TypeScript error.
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-accent)', boxShadow: 'var(--shadow-sm)' } as React.CSSProperties} min="0" title="Set transparent padding around the icon (in pixels). Use 0 for no padding." />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1 text-center" style={{ color: 'var(--color-text-dim)' }}>For UI</label>
                        <div className="flex items-center justify-center w-full h-11"><Switch id="ui-icon-toggle" checked={isUiIcon} onChange={setIsUiIcon} title="Optimize for simple, clear icons suitable for user interfaces." /></div>
                    </div>
                </div>
                <div className={`col-span-2 transition-opacity duration-300 ${isSingleColorStyle ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Color</label>
                  <div onClick={() => document.getElementById('native-color-picker')?.click()} title="Select the primary color for single-color or outline styles." className="relative w-full h-11 border rounded-lg flex items-center justify-center text-center cursor-pointer transition-opacity hover:opacity-90" style={{ backgroundColor: color, borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                      <span className="font-semibold text-sm" style={{ color: getContrastColor(color) }}>{color.toUpperCase()}</span>
                      <input id="native-color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute w-full h-full opacity-0 cursor-pointer" />
                  </div>
                </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <label className="flex items-center space-x-2 cursor-pointer w-fit" title="Show the full, detailed prompt that will be sent to the AI model">
            <input type="checkbox" checked={isAdvancedOpen} onChange={e => setIsAdvancedOpen(e.target.checked)} className="h-4 w-4 rounded" style={{ accentColor: 'var(--color-accent)'}} />
            <span className="text-sm" style={{ color: 'var(--color-text-dim)' }}>Show Advanced Options</span>
          </label>
        </div>
        
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAdvancedOpen ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 border border-dashed rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
              <label htmlFor="custom-prompt" className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Raw Generation Prompt</label>
              <textarea id="custom-prompt" value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} readOnly={isBatchMode} className="w-full h-40 bg-transparent border rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-2 disabled:opacity-50"
                  // FIX: Replaced invalid `ringColor` property with the correct CSS custom property `--tw-ring-color`
                  // to align with Tailwind's ring utilities and resolve the TypeScript error.
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-dim)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties} />
            </div>
        </div>
        
        <div className="mt-6 flex justify-center">
            <button type="submit" disabled={isLoading} title="Generate Icons (Ctrl+Enter)" className="w-full md:w-1/2 flex justify-center items-center gap-2 font-bold py-3 px-4 border rounded-lg text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-wait hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5"
             style={{
                background: `linear-gradient(45deg, var(--color-accent), var(--color-accent-dark))`,
                color: '#FFFFFF',
                borderColor: 'transparent',
                opacity: isLoading ? 0.7 : 1,
              }}>
              {isLoading ? <><Spinner /> GENERATING...</> : (referenceIcon ? 'REGENERATE' : 'GENERATE')}
            </button>
        </div>
      </form>
      
      {error && <div className="text-red-500 border border-red-500 bg-red-500/10 p-3 text-center rounded-lg">{error}</div>}
      
      {(isLoading || history.length > 0) && (
        <div ref={resultsSectionRef} className="space-y-4 pt-6 border-t" style={{ borderColor: 'var(--color-border)'}}>
          <h2 className="text-2xl text-center font-bold" style={{ color: 'var(--color-text)' }}>Generated Icons</h2>
          <div className="p-2 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 select-none">
              {isLoading && Array.from({ length: skeletonsCount }).map((_, index) => <IconCardSkeleton key={`skeleton-${index}`} />)}
              {history.map(icon => {
                const isNew = newlyAddedIds.has(icon.id);
                const isDeleting = deletingIds.has(icon.id);
                return (
                    <div 
                      key={icon.id}
                      ref={(el) => { if (el) iconCardRefs.current.set(icon.id, el); else iconCardRefs.current.delete(icon.id); }}
                      className={isDeleting ? 'animate-fade-out-scale' : isNew ? 'animate-fade-in-scale' : ''}
                      style={isNew ? { animationDelay: `${newIdsArray.findIndex(id => id === icon.id) * 60}ms` } : {}}
                      onTouchStart={() => handleTouchStart(icon.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={(e) => handleTouchEnd(e, icon.id)}
                    >
                      <IconCard {...icon} isSelected={selectedIds.has(icon.id)} onSelect={handleIconClick} onDelete={handleDelete} onPromptCopy={() => setToast({ message: 'Prompt copied!'})} onEditRequest={() => handleSetReference(icon.id, 'edit')} onInspireRequest={() => handleSetReference(icon.id, 'inspire')} />
                    </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconGenerator;