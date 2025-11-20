import React, { useState, useCallback, useEffect, useRef, PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { generateIcons, generateReferencedIcon, getStyleDescription as getBaseStyleDescription, getSafeMaskColor, editImage } from '../services/geminiService';
import { IconStyle, GeneratedIcon } from '../types';
import { removeGreenScreen, addPadding } from '../utils/imageUtils';
import { copyPngToClipboard, downloadZip, downloadPng } from '../utils/fileUtils';
import IconCard from './IconCard';
import Spinner from './Spinner';
import Toast from './Toast';
import SelectionToolbar from './SelectionToolbar';
import XCircleIcon from './icons/XCircleIcon';
import IconCardSkeleton from './IconCardSkeleton';
import Switch from './Switch';
import ConfirmationDialog from './ConfirmationDialog';

// Portal component for overlay elements (Toast, Selection Box, Dialog, Toolbar)
// This ensures 'fixed' positioning is relative to the viewport, avoiding issues with parent transforms.
const Portal = ({ children }: PropsWithChildren) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

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

const getStyleDescription = (style: IconStyle, color?: string): string => {
  switch (style) {
    case IconStyle.FLAT_SINGLE_COLOR:
      return `Style: Flat Vector Glyph.
      - Visuals: Solid shapes, no outlines, no gradients, no shadows.
      - Aesthetic: Minimalist, symbolic, clean silhouette.
      - Color: Use strictly ${color} for the icon shape.`;
    case IconStyle.FLAT_COLORED:
      return `Style: Flat Vector Illustration.
      - Visuals: geometric shapes, flat colors.
      - Aesthetic: Corporate art style, modern, clean.
      - Palette: Vibrant but limited (2-3 colors). No gradients.`;
    case IconStyle.OUTLINE:
      return `Style: Monoline Icon.
      - Visuals: Line art only, consistent stroke width (approx 4px).
      - Aesthetic: Minimalist, technical, blueprint feel.
      - Color: Lines must be ${color}. Background inside the shape should be transparent (or match the mask).`;
    case IconStyle.GRADIENT:
      return `Style: Modern Gradient Icon.
      - Visuals: Soft rounded shapes with smooth, trendy gradients.
      - Aesthetic: Modern UI aesthetic, glassmorphism hints, vibrant.`;
    case IconStyle.ISOMETRIC:
      return `Style: Isometric 3D View.
      - Perspective: Orthographic isometric.
      - Visuals: Clean 3D geometry, soft shading.
      - Object: Single floating element.`;
    case IconStyle.THREE_D:
      return `Style: 3D Clay Render.
      - Material: Matte plastic or clay.
      - Lighting: Soft studio lighting.
      - Aesthetics: Cute, rounded, 3D styling.`;
    default:
      return color
        ? `Style: Standard Vector Icon. Color: ${color}.`
        : `Style: Standard Vector Icon.`;
  }
};

const StyleSelector: React.FC<{ selected: IconStyle, onSelect: (style: IconStyle) => void }> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {STYLE_OPTIONS.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onSelect(style.id)}
          className={`group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-200 outline-none`}
        >
           <div 
             className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${selected === style.id ? 'border-[var(--color-accent)] shadow-md scale-105' : 'border-transparent group-hover:scale-105'}`}
             style={{ backgroundColor: 'var(--color-surface-secondary)' }}
           >
              <img src={style.imageUrl} alt={style.label} className="w-full h-full object-cover" />
              {selected === style.id && (
                 <div className="absolute inset-0 bg-[var(--color-accent)] opacity-10" />
              )}
           </div>
           <span className={`text-xs font-medium transition-colors ${selected === style.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-dim)] group-hover:text-[var(--color-text)]'}`}>
             {style.label}
           </span>
        </button>
      ))}
    </div>
  );
}

const IconGenerator = () => {
  const [prompt, setPrompt] = useState<string>('A rocket ship launching');
  const [style, setStyle] = useState<IconStyle>(IconStyle.FLAT_SINGLE_COLOR);
  const [color, setColor] = useState<string>('#4F46E5');
  const [numVariants, setNumVariants] = useState<number>(2);
  const [isUiIcon, setIsUiIcon] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [processingIds, setProcessingIds] = useState(new Set<string>());
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
  
  // Drag Selection State
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const dragStartPoint = useRef<{x: number, y: number} | null>(null);
  const dragInitialSelection = useRef<Set<string> | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false); // Mobile selection mode
  const longPressTimeout = useRef<number | null>(null);
  
  const [allPrompts, setAllPrompts] = useState<string[]>([]);
  const [lastAutoPrompt, setLastAutoPrompt] = useState<string>('A rocket ship launching');
  const [placeholderPrompt, setPlaceholderPrompt] = useState<string>('A rocket ship launching...');

  const isSingleColorStyle = style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE;

  // Load randomized prompts
  useEffect(() => {
    fetch('./prompts.json')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
            setAllPrompts(data);
            const random = data[Math.floor(Math.random() * data.length)];
            setPrompt(random);
            setPlaceholderPrompt(random);
            setLastAutoPrompt(random);
        }
      })
      .catch(e => console.error("Failed to load prompts", e));
  }, []);

  // Load/Save History
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
        if (window.innerWidth < 768) {
             resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
  }, [isLoading, skeletonsCount]);

  useEffect(() => {
    if (referenceIcon) return;
    if (style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE) {
        setColor('#4F46E5');
    }
  }, [style, referenceIcon]);

  const generateFullPrompt = useCallback((promptForIcon: string) => {
    const is3D = style === IconStyle.THREE_D || style === IconStyle.ISOMETRIC;
    const maskColor = getSafeMaskColor(isSingleColorStyle ? color : undefined);
    const styleDescription = getStyleDescription(style, isSingleColorStyle ? color : undefined);
    
    const paddingInstruction = padding > 0 
      ? "Constraint: Ensure distinct separation from the canvas edges (fit within safe zone)." 
      : "Constraint: Fit effectively within the frame.";

    let systemPreamble = "";
    let backgroundInstruction = "";
    let negativePrompt = "";
    let mainSubject = "";

    if (is3D) {
        const entityType = style === IconStyle.ISOMETRIC ? "Isometric 3D Object" : "3D Rendered Object";
        systemPreamble = `Role: Expert 3D Modeler. Task: Render a single, isolated ${entityType} based on: "${promptForIcon}".`;
        mainSubject = `Subject: "${promptForIcon}" as a tangible 3D object. CRITICAL INSTRUCTION: Generate the object completely ISOLATED in the void.`;
        backgroundInstruction = `BACKGROUND: SINGLE, FLAT, UNIFORM COLOR: ${maskColor}. NO gradients. NO shadows on the background.`;
        negativePrompt = `Negative Prompt: icon container, icon background, app icon shape, rounded square, squircle, circle background, card, tile, badge, button, ui element, border, frame, vignette, noise, floor, ground, shadow, gradient background.`;
    } else {
        const complexityInstruction = isUiIcon 
        ? "Complexity: LOW. Create a High-Contrast, Simple, Legible icon. Avoid small details. Readable at 24px." 
        : "Complexity: Medium. Professional icon detail level.";
        systemPreamble = `Role: Senior Icon Designer. Task: Create a professional 512x512 vector-style icon. IMPORTANT: Generate the ISOLATED OBJECT only.`;
        mainSubject = `Subject: "${promptForIcon}" ${complexityInstruction}`;
        backgroundInstruction = `Background: SOLID ${maskColor}. CRITICAL: The background is a chroma-key mask.`;
        negativePrompt = `Negative Prompt: text, watermark, signature, frame, border, margin, bounding box, card, container, background shape, rounded square, squircle, app icon base, launcher icon, platform, podium, stage, floor, photorealistic, noise, grainy, blurry, landscape.`;
    }

    if (referenceIcon) {
        if (referenceIcon.mode === 'edit') {
            return `${systemPreamble} Mode: EDITING. Original Description: "${referenceIcon.icon.prompt}" User Instruction: "${promptForIcon}" Constraint: Apply the instruction while preserving the original's exact style, perspective, and composition. ${styleDescription} ${backgroundInstruction} ${negativePrompt}`;
        } else { 
            return `${systemPreamble} Mode: INSPIRATION. Task: Create a NEW ${is3D ? 'asset' : 'icon'} for: "${promptForIcon}". Constraint: Strictly copy the artistic style, lighting, and rendering technique of the provided reference image. ${backgroundInstruction} ${negativePrompt}`;
        }
    } else {
        return `${systemPreamble} ${mainSubject} ${styleDescription} ${paddingInstruction} Composition: Centered, single isolated object. ${backgroundInstruction} ${negativePrompt}`;
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

  const handleRemoveBackground = useCallback(async (id: string, silent: boolean = false) => {
      const icon = history.find(i => i.id === id);
      if (!icon) return;

      setProcessingIds(prev => new Set(prev).add(id));

      try {
          const base64Original = icon.pngSrc.split(',')[1];
          const isSingleColor = icon.style === IconStyle.FLAT_SINGLE_COLOR || icon.style === IconStyle.OUTLINE;
          const maskColor = getSafeMaskColor(isSingleColor ? icon.color : undefined);
          const fixPrompt = `remove any background in the image and replace it with a flat, single-color background of color ${maskColor} filling the entire canvas behind the object.`;
          
          const editedB64 = await editImage(base64Original, 'image/png', fixPrompt);
          const tolerance = icon.style === IconStyle.FLAT_SINGLE_COLOR ? 50 : 25;
          const processedDataUrl = await removeGreenScreen(editedB64, tolerance);

          setHistory(prev => prev.map(item => {
              if (item.id === id) return { ...item, pngSrc: processedDataUrl };
              return item;
          }));
          
          if (!silent) setToast({ message: 'Background removed successfully!' });

      } catch (error) {
          console.error(error);
          if (!silent) setToast({ message: 'Failed to remove background.' });
      } finally {
          setProcessingIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
          });
      }
  }, [history]);

  const handleRemoveBackgroundSelected = useCallback(async () => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setToast({ message: `Removing background for ${ids.length} icons...` });
      try {
          await Promise.all(ids.map(id => handleRemoveBackground(id, true)));
          setToast({ message: 'Batch background removal complete!' });
      } catch (e) {
          console.error("Batch processing error", e);
          setToast({ message: 'Some icons could not be processed.' });
      }
  }, [selectedIds, handleRemoveBackground]);

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

  const handleDownload = useCallback((id: string, promptName: string) => {
    const icon = history.find(i => i.id === id);
    if(icon) {
        const name = promptName.toLowerCase().replace(/\s+/g, '-').slice(0, 30);
        downloadPng(icon.pngSrc, name);
    }
  }, [history]);

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

  const handleCopyImage = useCallback(async (id: string) => {
    const icon = history.find(i => i.id === id);
    if (icon) {
        try {
            await copyPngToClipboard(icon.pngSrc);
            setToast({ message: 'Icon copied to clipboard!' });
        } catch (e) {
            setToast({ message: 'Failed to copy icon.' });
        }
    }
  }, [history]);

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

  const handleBatchModeToggle = (checked: boolean) => {
      setIsBatchMode(checked);
      if (allPrompts.length === 0) return;
      let newPrompt = '';
      if (checked) {
         const shuffled = [...allPrompts].sort(() => 0.5 - Math.random());
         newPrompt = shuffled.slice(0, 3).join('\n');
      } else {
         newPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
      }
      setPlaceholderPrompt(newPrompt);
      if (prompt === lastAutoPrompt || prompt === 'A rocket ship launching' || prompt === '') {
         setPrompt(newPrompt);
         setLastAutoPrompt(newPrompt);
      } else {
         setLastAutoPrompt(newPrompt);
      }
  };

  // Hotkeys & Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).matches('textarea, input, select');

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && formRef.current) formRef.current.requestSubmit();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        if (isInput) return;
        e.preventDefault();
        handleToggleSelectAll();
        return;
      } 

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isInput) return;
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.key === 'Escape') {
        if (confirmingDelete) return; 
        e.preventDefault();
        exitSelectionMode();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isInput) return;
        if (selectedIds.size > 0) {
            e.preventDefault();
            handleDeleteSelected();
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, handleToggleSelectAll, exitSelectionMode, selectedIds, handleDeleteSelected, handleUndo, confirmingDelete]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) { setError("Prompt cannot be empty."); return; }
    const promptsToProcess = isBatchMode ? prompt.split('\n').filter(p => p.trim() !== '') : [prompt.trim()];
    if (promptsToProcess.length === 0) { setError("Prompt is empty."); return; }
    
    setIsLoading(true);
    setError(null);
    setSkeletonsCount(promptsToProcess.length * numVariants);

    if (window.innerWidth < 1024) {
         setTimeout(() => resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }

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
  
  // Selection Logic (Click)
  const handleIconClick = useCallback((e: React.MouseEvent, clickedId: string) => {
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
        if (lastIndex !== -1 && currentIndex !== -1) {
             const from = Math.min(lastIndex, currentIndex);
             const to = Math.max(lastIndex, currentIndex);
             const rangeIds = history.slice(from, to + 1).map(i => i.id);
             
             if (!isCtrl) newSelection.clear(); 
             rangeIds.forEach(id => newSelection.add(id));
        }
    } else if (isCtrl) {
        newSelection.has(clickedId) ? newSelection.delete(clickedId) : newSelection.add(clickedId);
        setLastSelectedId(clickedId);
    } else {
        newSelection.clear();
        newSelection.add(clickedId);
        setLastSelectedId(clickedId);
    }
    setSelectedIds(newSelection);
  }, [history, lastSelectedId, selectedIds, isSelectionMode, exitSelectionMode]);


  // Drag Selection Logic
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('[data-icon-card="true"]') || target.closest('[data-selection-toolbar="true"]')) {
        return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    dragStartPoint.current = { x: e.clientX, y: e.clientY };
    setSelectionBox({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    
    if (isCtrl || isShift) {
        dragInitialSelection.current = new Set(selectedIds);
    } else {
        setSelectedIds(new Set()); 
        dragInitialSelection.current = new Set();
    }
  }, [selectedIds]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartPoint.current || !dragInitialSelection.current) return;
    e.preventDefault();

    const startX = dragStartPoint.current.x;
    const startY = dragStartPoint.current.y;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);

    setSelectionBox({ x, y, width, height });

    const selectionRect = { left: x, top: y, right: x + width, bottom: y + height };
    const itemsInBox = new Set<string>();

    iconCardRefs.current.forEach((el, id) => {
      if(el) {
        const elRect = el.getBoundingClientRect();
        const intersects = !(selectionRect.right < elRect.left || 
                           selectionRect.left > elRect.right || 
                           selectionRect.bottom < elRect.top || 
                           selectionRect.top > elRect.bottom);
        
        if (intersects) {
            itemsInBox.add(id);
        }
      }
    });

    const newSelection = new Set(dragInitialSelection.current);
    itemsInBox.forEach(id => newSelection.add(id));
    setSelectedIds(newSelection);

  }, [isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging) {
        setIsDragging(false);
        setSelectionBox(null);
        dragStartPoint.current = null;
        dragInitialSelection.current = null;
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  const handleTouchStart = (id: string) => {
    longPressTimeout.current = window.setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedIds(prev => new Set(prev).add(id));
      setLastSelectedId(id);
      if (navigator.vibrate) navigator.vibrate(50);
      longPressTimeout.current = null;
    }, 500);
  };
  
  const handleTouchMove = () => { if (longPressTimeout.current) clearTimeout(longPressTimeout.current); };
  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  const singleSelectedIcon = selectedIds.size === 1 ? history.find(icon => icon.id === Array.from(selectedIds)[0]) : null;
  const newIdsArray = Array.from(newlyAddedIds);

  return (
    <div className="relative min-h-[80vh]">
      <Portal>
        <ConfirmationDialog isOpen={!!confirmingDelete} title="Confirm Deletion" message={`Are you sure you want to permanently delete ${confirmingDelete?.count} icon(s)?`} onConfirm={handleConfirmDelete} onCancel={() => setConfirmingDelete(null)} />
        
        {toast && <Toast message={toast.message} action={toast.action} onClose={() => setToast(null)} />}
        
        {selectionBox && (
            <div 
                className="fixed z-[9999] pointer-events-none border-[0.5px] border-[var(--color-accent)] bg-[var(--color-accent)]/10 backdrop-blur-[2px] rounded shadow-sm ring-1 ring-[var(--color-accent)]/20" 
                style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }} 
            />
        )}

        <SelectionToolbar 
            selectedCount={selectedIds.size} totalCount={history.length} onDelete={handleDeleteSelected} onDownload={handleDownloadSelected} onToggleSelectAll={handleToggleSelectAll} 
            onEdit={singleSelectedIcon ? () => handleSetReference(singleSelectedIcon.id, 'edit') : undefined} 
            onInspire={singleSelectedIcon ? () => handleSetReference(singleSelectedIcon.id, 'inspire') : undefined} 
            onCopy={singleSelectedIcon ? () => handleCopyImage(singleSelectedIcon.id) : undefined} 
            onRemoveBackground={selectedIds.size > 0 ? handleRemoveBackgroundSelected : undefined} isSelectionMode={isSelectionMode} onExitSelectionMode={exitSelectionMode} 
        />
      </Portal>

      <div className="mb-12">
        {referenceIcon && (
          <div className="mb-6 p-4 flex items-center justify-between border rounded-2xl animate-scale-in bg-[var(--color-accent-glow)] border-[var(--color-accent-dark)] text-[var(--color-accent)]">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-sm border-2 border-white/20 flex-shrink-0">
                 <img src={referenceIcon.icon.pngSrc} className="w-full h-full object-contain" alt="Reference Icon" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                  {referenceIcon.mode === 'edit' ? 'Editing Mode' : 'Inspiration Mode'}
                </span>
                <span className="font-medium truncate text-sm opacity-90">Based on: {referenceIcon.icon.prompt}</span>
              </div>
            </div>
            <button type="button" onClick={() => setReferenceIcon(null)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Clear reference">
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Controls - Wrapped in FORM */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
             <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
             {/* Prompt Card */}
             <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-1 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-[var(--color-accent)]">
                <div className="p-3 flex justify-between items-center border-b border-[var(--color-border)]/50 mb-1">
                    <label htmlFor="prompt" className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] ml-1">
                        {isBatchMode ? "Batch Prompts" : "Prompt"}
                    </label>
                    <div className="flex items-center gap-2">
                        <label htmlFor="batch-mode-toggle" className="text-xs font-medium text-[var(--color-text-dim)] cursor-pointer select-none">Batch Mode</label>
                        <Switch id="batch-mode-toggle" checked={isBatchMode} onChange={handleBatchModeToggle} />
                    </div>
                </div>
                <textarea 
                  id="prompt" 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder={placeholderPrompt}
                  className="w-full h-32 bg-transparent p-3 text-lg font-medium placeholder:text-[var(--color-text-dim)]/50 focus:outline-none resize-none rounded-xl"
                  style={{ color: 'var(--color-text)' }}
                  onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                         // Propagation allows global handler to submit
                      }
                  }}
                />
             </div>

             {/* Settings Card */}
             <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Style</label>
                  <StyleSelector selected={style} onSelect={setStyle} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   {/* Variants Control */}
                   <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Count</label>
                      <div className="flex bg-[var(--color-surface-secondary)] p-1 rounded-xl border border-[var(--color-border)]">
                         {VARIANT_OPTIONS.map(v => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setNumVariants(v)}
                              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${numVariants === v ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm border border-[var(--color-border)]' : 'text-[var(--color-text-dim)] hover:text-[var(--color-text)]'}`}
                            >
                               {v}
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* Padding Input */}
                   <div>
                      <label htmlFor="padding" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Padding (px)</label>
                      <input 
                        id="padding" 
                        type="number" 
                        value={padding} 
                        onChange={e => setPadding(Math.max(0, parseInt(e.target.value, 10) || 0))} 
                        className="w-full h-[42px] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl text-center font-semibold focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                        style={{ color: 'var(--color-text)' }}
                      />
                   </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex items-center justify-between bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl p-3 flex-1">
                       <span className="text-sm font-medium ml-1">Optimize for UI</span>
                       <Switch id="ui-icon-toggle" checked={isUiIcon} onChange={setIsUiIcon} />
                    </div>

                    <div className={`relative flex-1 h-[50px] rounded-xl border border-[var(--color-border)] overflow-hidden transition-all duration-300 ${isSingleColorStyle ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                         <input id="native-color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                         <div className="w-full h-full flex items-center justify-center gap-2" style={{ backgroundColor: color }}>
                             <span className="font-mono text-xs font-bold bg-black/20 backdrop-blur-sm text-white px-2 py-1 rounded uppercase shadow-sm">{color}</span>
                         </div>
                    </div>
                </div>

                {/* Advanced Toggle */}
                <div className="border-t border-[var(--color-border)] pt-4">
                    <button type="button" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="text-xs font-semibold text-[var(--color-text-dim)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-1">
                        {isAdvancedOpen ? 'Hide Advanced' : 'Show Advanced Prompt'}
                    </button>
                    <div className={`transition-all duration-300 overflow-hidden ${isAdvancedOpen ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                        <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} readOnly={isBatchMode} className="w-full h-32 text-xs font-mono p-3 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] focus:outline-none text-[var(--color-text-dim)] resize-none" />
                    </div>
                </div>
             </div>
             
             <button type="submit" disabled={isLoading} className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:transform-none disabled:shadow-none transition-all duration-200 flex justify-center items-center gap-3"
                style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))' }}>
                  {isLoading ? <><Spinner /> Generating...</> : (referenceIcon ? 'Regenerate Icon' : 'Generate Icons')}
             </button>
             </form>
          </div>

          {/* Right Panel: Results - Drag Area */}
          {/* We attach mouse down here, but ensure it fills height to allow dragging in empty space */}
          <div className="lg:col-span-7 flex flex-col min-h-[500px]" onMouseDown={handleMouseDown}>
             {(history.length > 0 || isLoading) ? (
                <div ref={resultsSectionRef} className="space-y-6 pb-20 flex-1">
                   <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-[var(--color-text)]">Generated Icons</h2>
                      <span className="text-sm text-[var(--color-text-dim)]">{history.length} assets</span>
                   </div>
                   
                   {/* Grid */}
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-4 select-none">
                      {isLoading && Array.from({ length: skeletonsCount }).map((_, index) => <IconCardSkeleton key={`skeleton-${index}`} />)}
                      {history.map(icon => {
                        const isNew = newlyAddedIds.has(icon.id);
                        const isDeleting = deletingIds.has(icon.id);
                        return (
                            <div 
                              key={icon.id}
                              ref={(el) => { if (el) iconCardRefs.current.set(icon.id, el); else iconCardRefs.current.delete(icon.id); }}
                              className={isDeleting ? 'scale-0 opacity-0 transition-all duration-300' : isNew ? 'animate-scale-in' : ''}
                              style={isNew ? { animationDelay: `${newIdsArray.findIndex(id => id === icon.id) * 50}ms` } : {}}
                              onTouchStart={() => handleTouchStart(icon.id)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={(e) => handleTouchEnd(e, icon.id)}
                            >
                              <IconCard 
                                {...icon} 
                                isSelected={selectedIds.has(icon.id)} 
                                isProcessing={processingIds.has(icon.id)}
                                onSelect={handleIconClick} 
                                onDelete={handleDelete} 
                                onPromptCopy={() => setToast({ message: 'Prompt copied!'})} 
                                onCopyImage={handleCopyImage}
                                onDownload={handleDownload}
                                onEditRequest={() => handleSetReference(icon.id, 'edit')} 
                                onInspireRequest={() => handleSetReference(icon.id, 'inspire')} 
                                onRemoveBackground={handleRemoveBackground}
                              />
                            </div>
                        );
                      })}
                   </div>
                </div>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-dim)] opacity-40 py-20 lg:py-0 border-2 border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/50 select-none h-full">
                   <div className="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-surface-secondary)]" />
                   <p className="text-lg font-medium">Your icons will appear here</p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconGenerator;