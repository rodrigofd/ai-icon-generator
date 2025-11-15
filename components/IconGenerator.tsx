

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

const allPaletteColors = Object.values({
  "UI Tones": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"],
  "Vibrant": ["#FF4136", "#FF851B", "#2ECC40", "#0074D9", "#B10DC9", "#F012BE"],
  "Pastel": ["#FFDDC1", "#C1FFD7", "#A2D2FF", "#FFC1E3", "#E3C1FF", "#F6EAC2"],
}).flat();
const getRandomPaletteColor = () => allPaletteColors[Math.floor(Math.random() * allPaletteColors.length)];

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
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        return '#FFFFFF';
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // http://www.w3.org/TR/AERT#color-contrast
    const brightness = Math.round(((r * 299) + (g * 587) + (b * 114)) / 1000);
    return (brightness > 125) ? '#000000' : '#FFFFFF';
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
          className={`
            flex flex-col items-center justify-center p-2 rounded-md border-2 transition-all duration-200 transform hover:scale-105 active:scale-95
            ${selected === style.id 
              ? 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500 scale-105 shadow-md shadow-teal-500/10' 
              : 'bg-gray-100/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-sm'
            }
          `}
        >
          <img src={style.imageUrl} alt={style.label} className="w-10 h-10 mb-1" />
          <span className="text-base font-medium text-gray-600 dark:text-gray-300">{style.label}</span>
        </button>
      ))}
    </div>
  );
}

const IconGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('A rocket ship launching');
  const [style, setStyle] = useState<IconStyle>(IconStyle.FLAT_SINGLE_COLOR);
  const [color, setColor] = useState<string>('#000000');
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
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const iconCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const dragStartPoint = useRef<{x: number, y: number} | null>(null);
  const dragInitialState = useRef<{ initialIds: Set<string> } | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);


  const isSingleColorStyle = style === IconStyle.FLAT_SINGLE_COLOR || style === IconStyle.OUTLINE;

  useEffect(() => {
    window.localforage.getItem('iconHistory')
      .then((storedHistory: GeneratedIcon[] | null) => {
        if (storedHistory) {
          setHistory(storedHistory);
        }
      })
      .catch((e: Error) => {
        console.error("Failed to load history from localforage", e);
        window.localforage.removeItem('iconHistory');
      });
  }, []);

  useEffect(() => {
    window.localforage.setItem('iconHistory', history)
      .catch((e: Error) => {
        console.error("Failed to save history to localforage", e);
      });
  }, [history]);

  useEffect(() => {
    if (newlyAddedIds.size > 0) {
        const timer = setTimeout(() => {
            setNewlyAddedIds(new Set());
        }, 2000); // Duration should be longer than the max possible animation delay + animation duration
        return () => clearTimeout(timer);
    }
  }, [newlyAddedIds]);

  useEffect(() => {
    if (isLoading && skeletonsCount > 0) {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isLoading, skeletonsCount]);

  useEffect(() => {
    if (referenceIcon) return; // Don't auto-change color when in a reference mode
    
    if (style === IconStyle.FLAT_SINGLE_COLOR) {
      setColor('#000000');
    } else {
      setColor(currentColor => {
          if (currentColor === '#000000') {
              return getRandomPaletteColor();
          }
          return currentColor;
      });
    }
  }, [style, referenceIcon]);

  const generateFullPrompt = useCallback((promptForIcon: string) => {
    const styleDescription = getStyleDescription(style, isSingleColorStyle ? color : undefined);
    const purposeDescription = isUiIcon
      ? "The icon must be simple, clear, and instantly recognizable for a user interface."
      : "This is a general-purpose icon.";
    const maskColor = getSafeMaskColor(isSingleColorStyle ? color : undefined);
    const paddingInstruction = padding > 0 ? "The icon artwork must be drawn to the absolute edges of the 512x512 frame, with no internal padding or margin. It should touch all four sides of the canvas." : "";

    if (referenceIcon) {
        if (referenceIcon.mode === 'edit') {
            return `You are an expert icon editor. The user has provided an existing icon of "${referenceIcon.icon.prompt}" and an instruction to modify it.
**Your task:** Apply ONLY the changes from the user's instruction to the provided icon. Preserve the original artistic style, color palette, composition, and overall feel as much as possible. Do not remake the icon from scratch.
**User's edit instruction:** "${promptForIcon}"

**Original Style to Preserve:** ${styleDescription}
**Purpose:** ${purposeDescription}
**Composition:** The icon must be a clean, visually distinct object, centered in the frame. ${paddingInstruction}
**Background:** The background must be a solid, plain, non-transparent color (${maskColor}). This is critical. The icon artwork must not contain this specific shade of color.
**Negative Constraints:** Absolutely no text, letters, numbers, watermarks, or signatures.`;
        } else { // inspire mode
            return `You are an expert icon designer. The user has provided a reference icon for its artistic style and a prompt for a NEW icon concept.
**Your task:** Generate a brand new icon based on the "New Icon Prompt". The new icon MUST perfectly match the artistic style, color palette, lighting, and overall aesthetic of the provided reference icon.
**New Icon Prompt:** "${promptForIcon}"
**Reference Icon's Style to Replicate:** ${styleDescription}

**Purpose:** ${purposeDescription}
**Composition:** The icon must be a clean, visually distinct object, centered in the frame. ${paddingInstruction}
**Background:** The background must be a solid, plain, non-transparent color (${maskColor}). This is critical. The icon artwork must not contain this specific shade of color.
**Negative Constraints:** Absolutely no text, letters, numbers, watermarks, or signatures. Do not copy elements from the reference image unless the new prompt asks for them.`;
        }
    } else {
        return `Generate a single, high-resolution 512x512 icon of a "${promptForIcon}".

**Style:** ${styleDescription}
**Purpose:** ${purposeDescription}
**Composition:** The icon must be a clean, visually distinct object, centered in the frame. ${paddingInstruction}
**Background:** The background must be a solid, plain, non-transparent color (${maskColor}). This is critical for post-processing. The icon artwork itself must not contain this specific shade of color.
**Negative Constraints:** Absolutely no text, letters, numbers, watermarks, or signatures.`;
    }
  }, [style, color, isUiIcon, padding, referenceIcon, isSingleColorStyle]);

  useEffect(() => {
    if (isBatchMode) {
      setCustomPrompt("Batch mode is on. Prompts will be generated for each line in the description.");
    } else {
      const defaultPrompt = generateFullPrompt(prompt);
      setCustomPrompt(defaultPrompt);
    }
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
    const numDeleted = confirmingDelete.count;

    // Preserve state for undo
    undoStateRef.current = { history: [...history], selectedIds: new Set(selectedIds) };
    
    // Trigger exit animation
    setDeletingIds(idsToDelete);

    // Set timeout to remove from state after animation
    setTimeout(() => {
        setHistory(prev => prev.filter(icon => !idsToDelete.has(icon.id)));
        setSelectedIds(new Set());
        setDeletingIds(new Set()); // Clean up deleting IDs
        setToast({
            message: `${numDeleted} icon${numDeleted > 1 ? 's' : ''} removed.`,
            action: { label: 'Undo', onClick: handleUndo }
        });
    }, 400); // Corresponds to animation duration

    setConfirmingDelete(null); // Close dialog
  }, [confirmingDelete, history, selectedIds, handleUndo]);

  const handleDeleteSelected = useCallback(() => {
    requestDeletion(Array.from(selectedIds));
  }, [selectedIds, requestDeletion]);

  const handleDownloadSelected = useCallback(async () => {
    const selectedIcons = history.filter(icon => selectedIds.has(icon.id));
    if (selectedIcons.length === 0) return;

    const filesToZip = selectedIcons.map((icon) => {
      const iconName = icon.prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 30) || "generated-icon";
      // Add a unique suffix to prevent filename collisions within the zip
      return {
        name: `${iconName}-${icon.id.slice(-6)}`,
        dataUrl: icon.pngSrc,
      };
    });

    setToast({ message: `Zipping ${selectedIcons.length} icons...` });
    try {
      await downloadZip(filesToZip, 'ai-icons.zip');
      setToast({ message: 'Zip download started!' });
    } catch (err) {
      console.error('Failed to create or download zip file:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while creating the zip file.');
      setToast(null); // Clear any processing toast
    }
  }, [history, selectedIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Handle form submission with Ctrl+Enter globally, including inside text areas.
      if (isCtrlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading) {
          formRef.current?.requestSubmit();
        }
        return; // Submission is a terminal action for this handler.
      }

      // For all other shortcuts, ignore them if the user is typing in an input.
      if ((e.target as HTMLElement)?.closest('input, textarea')) return;

      if (e.key === 'Escape') {
        if (selectedIds.size > 0) setSelectedIds(new Set());
        if (referenceIcon) setReferenceIcon(null);
        if (isSelectionMode) exitSelectionMode();
      }

      if (isCtrlOrCmd && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }

      if (selectedIds.size > 0) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handleDeleteSelected();
        }
        if (isCtrlOrCmd && e.key === 'a') {
            e.preventDefault();
            handleToggleSelectAll();
        }
        if (isCtrlOrCmd && e.key === 'd') {
            e.preventDefault();
            setSelectedIds(new Set());
        }
        if (isCtrlOrCmd && e.key === 's') {
          e.preventDefault();
          handleDownloadSelected();
        }
      }

      if (selectedIds.size === 1) {
        const selectedId = Array.from(selectedIds)[0];
        const selectedIcon = history.find(icon => icon.id === selectedId);
        if (!selectedIcon) return;

        if (isCtrlOrCmd && e.key === 'c') {
          e.preventDefault();
          copyPngToClipboard(selectedIcon.pngSrc)
            .then(() => setToast({ message: 'Icon copied to clipboard!' }))
            .catch(() => setToast({ message: 'Failed to copy icon.' }));
        }

        if (isCtrlOrCmd && e.key === 'e') {
          e.preventDefault();
          handleSetReference(selectedId, 'edit');
        }

        if (isCtrlOrCmd && e.key === 'm') {
          e.preventDefault();
          handleSetReference(selectedId, 'inspire');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds, history, referenceIcon, isLoading, isSelectionMode, handleUndo, handleDeleteSelected, handleDownloadSelected, handleSetReference]);


  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      return;
    }

    const promptsToProcess = isBatchMode
      ? prompt.split('\n').filter(p => p.trim() !== '')
      : [prompt.trim()];
    
    if (promptsToProcess.length === 0) {
      setError("Prompt is empty or contains only whitespace lines.");
      return;
    }

    if (!isBatchMode && !customPrompt.trim()) {
      setError("Generation prompt cannot be empty.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSkeletonsCount(promptsToProcess.length * numVariants);

    const allPromises = promptsToProcess.map(async (currentPrompt) => {
      try {
        const fullApiPrompt = isBatchMode ? generateFullPrompt(currentPrompt) : customPrompt;
        
        let pngB64StringsWithGreen: string[];

        if (referenceIcon) {
          const base64Data = referenceIcon.icon.pngSrc.split(',')[1];
          pngB64StringsWithGreen = await generateReferencedIcon(
            fullApiPrompt,
            numVariants,
            base64Data,
          );
        } else {
          pngB64StringsWithGreen = await generateIcons(fullApiPrompt, numVariants);
        }
        
        const tolerance = style === IconStyle.FLAT_SINGLE_COLOR ? 50 : 25;
        const transparentPngPromises = pngB64StringsWithGreen.map(b64 => removeGreenScreen(b64, tolerance));
        const transparentPngDataUrls = await Promise.all(transparentPngPromises);

        const finalPngDataUrls = padding > 0
          ? await Promise.all(transparentPngDataUrls.map(url => addPadding(url, padding)))
          : transparentPngDataUrls;

        const newIcons: GeneratedIcon[] = finalPngDataUrls.map((dataUrl, index) => ({
          id: `icon-${Date.now()}-${currentPrompt.replace(/\s/g, '').slice(0, 10)}-${index}`,
          pngSrc: dataUrl,
          prompt: currentPrompt,
          style: style,
          color: color,
          isUiIcon: isUiIcon,
        }));
        
        setNewlyAddedIds(new Set(newIcons.map(i => i.id)));
        setHistory(prevHistory => [...newIcons, ...prevHistory]);

      } finally {
        setSkeletonsCount(prev => Math.max(0, prev - numVariants));
      }
    });
    
    try {
      await Promise.all(allPromises);
      if (referenceIcon) {
        setReferenceIcon(null); // Clear reference after successful generation
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during generation.");
    } finally {
      setIsLoading(false);
      setSkeletonsCount(0); // Safeguard to clear all skeletons
    }
  }, [prompt, style, numVariants, isUiIcon, color, referenceIcon, customPrompt, padding, isBatchMode, generateFullPrompt]);

  const handleDelete = (id: string) => {
    requestDeletion([id]);
  };
  
  const handleLongPress = useCallback((iconId: string) => {
    if (isSelectionMode) return;
    setIsSelectionMode(true);
    setSelectedIds(new Set([iconId]));
    setLastSelectedId(iconId);
  }, [isSelectionMode]);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const handleIconClick = useCallback((e: React.MouseEvent, clickedId: string) => {
    e.preventDefault();

    if (isSelectionMode) {
      setSelectedIds(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(clickedId)) {
          newSelection.delete(clickedId);
        } else {
          newSelection.add(clickedId);
        }
        if (newSelection.size === 0) {
          setIsSelectionMode(false); // auto-exit
        }
        return newSelection;
      });
      setLastSelectedId(clickedId);
      return;
    }
    
    const newSelectedIds = new Set(selectedIds);

    if (e.shiftKey && lastSelectedId) {
      const lastIndex = history.findIndex(icon => icon.id === lastSelectedId);
      const currentIndex = history.findIndex(icon => icon.id === clickedId);
      const from = Math.min(lastIndex, currentIndex);
      const to = Math.max(lastIndex, currentIndex);
      if(from !== -1 && to !== -1){
        for (let i = from; i <= to; i++) {
          newSelectedIds.add(history[i].id);
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelectedIds.has(clickedId)) {
        newSelectedIds.delete(clickedId);
      } else {
        newSelectedIds.add(clickedId);
      }
    } else {
      if (selectedIds.size === 1 && selectedIds.has(clickedId)) {
        setSelectedIds(new Set());
        setLastSelectedId(null);
      } else {
        setSelectedIds(new Set([clickedId]));
        setLastSelectedId(clickedId);
      }
      return;
    }
    
    setSelectedIds(newSelectedIds);
    setLastSelectedId(clickedId);
  }, [selectedIds, lastSelectedId, history, isSelectionMode]);

  const handleToggleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(icon => icon.id)));
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('form') || target.closest('[data-selection-toolbar="true"]')) return;
    const cardElement = (e.target as HTMLElement).closest('[data-icon-card="true"]');
    if (cardElement) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStartPoint.current = { x: e.clientX, y: e.clientY };
    setSelectionBox({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    dragInitialState.current = { initialIds: new Set(selectedIds) };
  }, [selectedIds]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartPoint.current || !dragInitialState.current) return;
    e.preventDefault();
    const currentX = e.clientX, currentY = e.clientY, startX = dragStartPoint.current.x, startY = dragStartPoint.current.y;
    const x = Math.min(startX, currentX), y = Math.min(startY, currentY), width = Math.abs(startX - currentX), height = Math.abs(startY - currentY);
    setSelectionBox({ x, y, width, height });
    const selectionRect = { left: x, top: y, right: x + width, bottom: y + height };
    const currentlyIntersecting = new Set<string>();
    iconCardRefs.current.forEach((el, id) => {
      if (el) {
        const elRect = el.getBoundingClientRect();
        const isIntersecting = !(selectionRect.right < elRect.left || selectionRect.left > elRect.right || selectionRect.bottom < elRect.top || selectionRect.top > elRect.bottom);
        if (isIntersecting) currentlyIntersecting.add(id);
      }
    });

    // Invert selection based on initial state (XOR logic)
    const initial = dragInitialState.current.initialIds;
    const newSelection = new Set([...initial].filter(id => !currentlyIntersecting.has(id))); // IDs in initial but not intersecting
    for (const id of currentlyIntersecting) {
        if (!initial.has(id)) {
            newSelection.add(id); // IDs in intersecting but not initial
        }
    }
    setSelectedIds(newSelection);
  }, [isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging && dragStartPoint.current) {
        const dx = e.clientX - dragStartPoint.current.x;
        const dy = e.clientY - dragStartPoint.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If the mouse barely moved, it's a click.
        if (distance < 5) {
            // Since handleMouseDown ensures this only fires on the background,
            // we can safely clear the selection.
            setSelectedIds(new Set());
            setLastSelectedId(null);
        }
    }

    // Always reset dragging state
    setIsDragging(false);
    dragStartPoint.current = null;
    setSelectionBox(null);
    dragInitialState.current = null;
  }, [isDragging]);

  const handleVariantChange = (direction: 'inc' | 'dec') => {
      const currentIndex = VARIANT_OPTIONS.indexOf(numVariants);
      if (direction === 'inc') {
          const nextIndex = Math.min(currentIndex + 1, VARIANT_OPTIONS.length - 1);
          setNumVariants(VARIANT_OPTIONS[nextIndex]);
      } else {
          const prevIndex = Math.max(currentIndex - 1, 0);
          setNumVariants(VARIANT_OPTIONS[prevIndex]);
      }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  const contrastColor = getContrastColor(color);

  const getPromptLabel = () => {
    if (referenceIcon?.mode === 'edit') {
      return isBatchMode ? 'List each edit instruction on a new line' : 'Edit Instruction';
    }
    return isBatchMode ? "Describe each icon you'd like to generate in a separate line." : "Describe the icon you'd like to generate.";
  };
  
  const newIdsArray = Array.from(newlyAddedIds);

  const singleSelectedIcon = selectedIds.size === 1 ? history.find(icon => icon.id === Array.from(selectedIds)[0]) : null;

  const handleEditSelected = () => {
      if (singleSelectedIcon) handleSetReference(singleSelectedIcon.id, 'edit');
  };
  const handleInspireSelected = () => {
      if (singleSelectedIcon) handleSetReference(singleSelectedIcon.id, 'inspire');
  };
  const handleCopySelected = () => {
      if (singleSelectedIcon) {
          copyPngToClipboard(singleSelectedIcon.pngSrc)
              .then(() => setToast({ message: 'Icon copied to clipboard!' }))
              .catch(() => setToast({ message: 'Failed to copy icon.' }));
      }
  };

  return (
    <div className="space-y-8" onMouseDown={handleMouseDown}>
      <ConfirmationDialog
        isOpen={!!confirmingDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete ${confirmingDelete?.count} icon${confirmingDelete?.count === 1 ? '' : 's'}?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDelete(null)}
      />
      {toast && <Toast message={toast.message} action={toast.action} onClose={() => setToast(null)} />}
      {selectionBox && <div className="fixed bg-teal-500/20 border-2 border-teal-500 rounded pointer-events-none z-50" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.width, height: selectionBox.height }} />}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        totalCount={history.length}
        onDelete={handleDeleteSelected}
        onDownload={handleDownloadSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onEdit={singleSelectedIcon ? handleEditSelected : undefined}
        onInspire={singleSelectedIcon ? handleInspireSelected : undefined}
        onCopy={singleSelectedIcon ? handleCopySelected : undefined}
        isSelectionMode={isSelectionMode}
        onExitSelectionMode={exitSelectionMode}
      />
      <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${referenceIcon ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
          {referenceIcon && (
            <div className="mb-4 p-3 bg-teal-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between border border-teal-200 dark:border-gray-600">
              <div className="flex items-center gap-3 overflow-hidden">
                <img src={referenceIcon.icon.pngSrc} className="w-12 h-12 rounded-md flex-shrink-0" alt="Reference Icon" />
                <div className="overflow-hidden">
                  <span className="text-lg font-bold text-teal-800 dark:text-teal-300">
                    {referenceIcon.mode === 'edit' ? 'Editing Icon' : 'Inspired by Icon'}
                  </span>
                  <p className="text-base text-gray-500 dark:text-gray-400 truncate">
                    {referenceIcon.icon.prompt}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setReferenceIcon(null)} className="p-1 rounded-full hover:bg-teal-200 dark:hover:bg-gray-600 flex-shrink-0 ml-2 transition-colors" title="Clear reference">
                <XCircleIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {getPromptLabel()}
              </label>
              <div className="flex items-center space-x-2" title="Toggle to generate icons for each line in the prompt text">
                <label htmlFor="batch-mode-toggle" className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                  Batch Generation
                </label>
                <Switch id="batch-mode-toggle" checked={isBatchMode} onChange={setIsBatchMode} />
              </div>
            </div>

            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              title={referenceIcon?.mode === 'edit' ? 'Describe the change you want to make' : 'Describe the icon you want to create'}
              placeholder={
                isBatchMode ? 'A blank sheet of paper\nA partially opened folder\nA floppy disk' :
                referenceIcon?.mode === 'edit' ? 'e.g., Add a party hat' :
                referenceIcon?.mode === 'inspire' ? 'e.g., A shield with a star' :
                'e.g., A smiling coffee cup'
              }
              className="w-full h-full min-h-[240px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-3 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
          </div>

          <div className="flex flex-col justify-between space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style</label>
              <StyleSelector selected={style} onSelect={setStyle} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="variants" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Variants</label>
                 <div className="flex items-center justify-between w-full h-12 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100">
                    <button type="button" onClick={() => handleVariantChange('dec')} disabled={numVariants === VARIANT_OPTIONS[0]} title="Decrease number of variants" className="px-4 py-2 text-2xl font-light text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors">-</button>
                    <span id="variants" className="text-xl font-semibold text-teal-600 dark:text-teal-400" title="Number of icons to generate at once">{numVariants}</span>
                    <button type="button" onClick={() => handleVariantChange('inc')} disabled={numVariants === VARIANT_OPTIONS[VARIANT_OPTIONS.length - 1]} title="Increase number of variants" className="px-4 py-2 text-2xl font-light text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed transition-colors">+</button>
                </div>
              </div>
              <div>
                <label htmlFor="padding" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Padding (px)</label>
                <input
                    id="padding"
                    type="number"
                    value={padding}
                    onChange={e => setPadding(Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)))}
                    title="Set transparent padding around the icon (0-255 pixels)"
                    className="w-full h-12 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                    min="0"
                    max="255"
                />
              </div>
               <div>
                <label htmlFor="ui-icon-toggle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Optimize for UI</label>
                <div className="flex items-center w-full h-12" title="Toggle to generate icons suitable for user interfaces (simpler, clearer designs)">
                  <Switch id="ui-icon-toggle" checked={isUiIcon} onChange={setIsUiIcon} />
                </div>
              </div>
              {isSingleColorStyle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                   <div onClick={() => { document.getElementById('native-color-picker')?.click(); }} title="Select icon color" className="relative w-full h-12 border border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-center text-center cursor-pointer focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all" style={{ backgroundColor: color }}>
                      <span className="font-mono font-semibold text-base tracking-wider" style={{ color: contrastColor, mixBlendMode: 'difference' }}>{color.toUpperCase()}</span>
                      <input id="native-color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute w-full h-full opacity-0 pointer-events-auto cursor-pointer" tabIndex={-1} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <label className="flex items-center space-x-2 cursor-pointer w-fit" title="Show advanced settings to edit the full generation prompt">
            <input
                type="checkbox"
                checked={isAdvancedOpen}
                onChange={e => setIsAdvancedOpen(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Advanced Options</span>
          </label>
        </div>
        
        <div className={`transition-[max-height,padding] duration-500 ease-in-out overflow-hidden ${isAdvancedOpen ? 'max-h-[500px] pt-4' : 'max-h-0 pt-0'}`}>
          <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/80">
              <div>
                  <label htmlFor="custom-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prompt to send to the image generation model</label>
                  <textarea
                      id="custom-prompt"
                      value={customPrompt}
                      onChange={e => setCustomPrompt(e.target.value)}
                      readOnly={isBatchMode}
                      title="This is the full prompt sent to the AI. Edit with caution."
                      className="w-full h-56 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-3 text-sm font-mono text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition disabled:bg-gray-100 dark:disabled:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This is the full prompt sent to the AI. It updates automatically when you change settings above. Read-only in Batch mode.</p>
              </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
            <button type="submit" disabled={isLoading} title="Generate icons (Ctrl+Enter)" className={`w-full md:w-1/3 flex justify-center items-center gap-2 font-bold py-3 px-4 rounded-md transition-all duration-300 ${isLoading ? 'btn-generating bg-gradient-to-r from-teal-500 via-cyan-600 to-fuchsia-500 text-white cursor-wait' : 'bg-teal-600 hover:bg-teal-700 text-white transform active:scale-95 hover:scale-[1.02]'}`}>
              {isLoading ? <><Spinner /> Generating...</> : (referenceIcon ? 'Generate New Icon' : 'Generate Icons')}
            </button>
        </div>
      </form>
      
      {error && <div className="text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-center">{error}</div>}
      
      {(isLoading || history.length > 0) && (
        <div ref={resultsSectionRef} className="space-y-4 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-center text-gray-600 dark:text-gray-300">Generated Icons</h2>
          <div className="p-8">
            <div ref={gridContainerRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 select-none">
              {isLoading &&
                Array.from({ length: skeletonsCount }).map((_, index) => (
                  <IconCardSkeleton key={`skeleton-${index}`} />
              ))}
              {history.map(icon => {
                const isNew = newlyAddedIds.has(icon.id);
                const isDeleting = deletingIds.has(icon.id);

                let animationClass = '';
                if (isDeleting) {
                    animationClass = 'animate-fade-out-scale';
                } else if (isNew) {
                    animationClass = 'animate-fade-in-scale';
                }
                
                const newIndex = isNew ? newIdsArray.findIndex(id => id === icon.id) : -1;

                return (
                    <div 
                      key={icon.id}
                      ref={(el) => { if (el) iconCardRefs.current.set(icon.id, el); else iconCardRefs.current.delete(icon.id); }}
                      className={animationClass}
                      style={isNew ? { animationDelay: `${newIndex * 60}ms` } : {}}
                    >
                      <IconCard
                        {...icon}
                        isSelected={selectedIds.has(icon.id)}
                        onSelect={handleIconClick}
                        onDelete={handleDelete}
                        onPromptCopy={() => setToast({ message: 'Prompt copied!'})}
                        onEditRequest={() => handleSetReference(icon.id, 'edit')}
                        onInspireRequest={() => handleSetReference(icon.id, 'inspire')}
                        onLongPress={handleLongPress}
                        isSelectionMode={isSelectionMode}
                      />
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