import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateIcons } from '../services/geminiService';
import { IconStyle, GeneratedIcon } from '../types';
import { removeGreenScreen } from '../utils/imageUtils';
import { downloadPng } from '../utils/fileUtils';
import IconCard from './IconCard';
import Spinner from './Spinner';
import Toast from './Toast';
import SelectionToolbar from './SelectionToolbar';

const palettes = {
  "UI Tones": ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#64748B"],
  "Vibrant": ["#FF4136", "#FF851B", "#2ECC40", "#0074D9", "#B10DC9", "#F012BE"],
  "Pastel": ["#FFDDC1", "#C1FFD7", "#A2D2FF", "#FFC1E3", "#E3C1FF", "#F6EAC2"],
};

const allPaletteColors = Object.values(palettes).flat();
const getRandomPaletteColor = () => allPaletteColors[Math.floor(Math.random() * allPaletteColors.length)];

const STYLE_OPTIONS = [
  { id: IconStyle.FLAT_SINGLE_COLOR, label: 'Flat', imageUrl: '/assets/style-flat.png' },
  { id: IconStyle.FLAT_COLORED, label: 'Colored', imageUrl: '/assets/style-colored.png' },
  { id: IconStyle.OUTLINE, label: 'Outline', imageUrl: '/assets/style-outline.png' },
  { id: IconStyle.GRADIENT, label: 'Gradient', imageUrl: '/assets/style-gradient.png' },
  { id: IconStyle.ISOMETRIC, label: 'Isometric', imageUrl: '/assets/style-isometric.png' },
  { id: IconStyle.THREE_D, label: '3D Render', imageUrl: '/assets/style-3d-render.png' },
];

const ColorPicker: React.FC<{ color: string; onChange: (c: string) => void; }> = ({ color, onChange }) => {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
       <div 
        onClick={() => colorInputRef.current?.click()}
        className="w-full h-12 bg-gray-900 border border-gray-600 rounded-md p-2 flex items-center gap-3 cursor-pointer focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition"
      >
        <div 
          className="w-8 h-8 rounded-md border border-gray-500"
          style={{ backgroundColor: color }}
        />
        <span className="font-mono text-sm text-gray-300">{color.toUpperCase()}</span>
      </div>
      <input
        ref={colorInputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0 pointer-events-none"
        tabIndex={-1}
      />

      <div className="space-y-2 pt-1">
        {Object.entries(palettes).map(([name, colors]) => (
          <div key={name}>
            <p className="text-xs font-medium text-gray-400 mb-1.5">{name}</p>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange(c)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 ${color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-white shadow-lg' : 'ring-1 ring-gray-700/50'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                  title={c}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StyleSelector: React.FC<{ selected: IconStyle, onSelect: (style: IconStyle) => void }> = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STYLE_OPTIONS.map((style) => (
        <button
          key={style.id}
          type="button"
          onClick={() => onSelect(style.id)}
          className={`
            flex flex-col items-center justify-center p-2 rounded-md border-2 transition-all duration-200
            ${selected === style.id 
              ? 'bg-purple-500/20 border-purple-500' 
              : 'bg-gray-900/50 border-gray-700 hover:border-gray-500'
            }
          `}
        >
          <img src={style.imageUrl} alt={style.label} className="w-10 h-10 mb-1" />
          <span className="text-xs font-medium text-gray-300">{style.label}</span>
        </button>
      ))}
    </div>
  );
}

const IconGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('A rocket ship launching');
  const [style, setStyle] = useState<IconStyle>(IconStyle.FLAT_SINGLE_COLOR);
  const [color, setColor] = useState<string>('#000000');
  const [numVariants, setNumVariants] = useState<number>(4);
  const [isUiIcon, setIsUiIcon] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedIcon[]>([]);
  const [toastMessage, setToastMessage] = useState<string>('');
  
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const iconCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const dragStartPoint = useRef<{x: number, y: number} | null>(null);
  const dragInitialState = useRef<{ initialIds: Set<string>, isAdditive: boolean } | null>(null);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('iconHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem('iconHistory');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('iconHistory', JSON.stringify(history));
    } catch(e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [history]);

  useEffect(() => {
    if (style === IconStyle.FLAT_SINGLE_COLOR) {
      setColor('#000000');
    } else {
      if (color === '#000000') {
        setColor(getRandomPaletteColor());
      }
    }
  }, [style, color]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const pngB64StringsWithGreen = await generateIcons(prompt, style, numVariants, isUiIcon, color);
      
      const tolerance = style === IconStyle.FLAT_SINGLE_COLOR ? 50 : 25;
      const transparentPngPromises = pngB64StringsWithGreen.map(b64 => removeGreenScreen(b64, tolerance));
      const transparentPngDataUrls = await Promise.all(transparentPngPromises);

      const newIcons = transparentPngDataUrls.map((dataUrl, index) => ({
        id: `icon-${Date.now()}-${index}`,
        pngSrc: dataUrl,
        prompt: prompt,
      }));
      
      setHistory(prevHistory => [...newIcons, ...prevHistory]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, style, numVariants, isUiIcon, color]);

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(icon => icon.id !== id));
    setSelectedIds(current => {
      const newSet = new Set(current);
      newSet.delete(id);
      return newSet;
    });
    showToast("Icon removed.");
  };

  const handleIconClick = useCallback((e: React.MouseEvent, clickedId: string) => {
    e.preventDefault();
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
      setSelectedIds(new Set([clickedId]));
      setLastSelectedId(clickedId);
      return;
    }
    
    setSelectedIds(newSelectedIds);
    setLastSelectedId(clickedId);
  }, [selectedIds, lastSelectedId, history]);


  const handleDeleteSelected = () => {
    setHistory(prev => prev.filter(icon => !selectedIds.has(icon.id)));
    showToast(`${selectedIds.size} icons deleted.`);
    setSelectedIds(new Set());
  };

  const handleDownloadSelected = () => {
    const selectedIcons = history.filter(icon => selectedIds.has(icon.id));
     selectedIcons.forEach((icon, index) => {
        setTimeout(() => {
          const iconName = icon.prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 20) || "generated-icon";
          downloadPng(icon.pngSrc, `${iconName}-${index}`);
        }, index * 250);
      });
    showToast(`Started downloading ${selectedIcons.length} icons.`);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(icon => icon.id)));
    }
  };

  // --- Marquee Selection Handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't start marquee or deselect if clicking inside the form or the toolbar
    if (target.closest('form') || target.closest('[data-selection-toolbar="true"]')) {
        return;
    }

    const cardElement = (e.target as HTMLElement).closest('[data-icon-card="true"]');
    if (cardElement) {
        return; // Let card's own click handler manage selection
    }
    
    e.preventDefault();
    setIsDragging(true);
    dragStartPoint.current = { x: e.clientX, y: e.clientY };
    setSelectionBox({ x: e.clientX, y: e.clientY, width: 0, height: 0 });

    const isAdditive = e.ctrlKey || e.metaKey || e.shiftKey;
    dragInitialState.current = {
        initialIds: new Set(selectedIds),
        isAdditive: isAdditive
    };

    if (!isAdditive) {
        setSelectedIds(new Set());
    }
  }, [selectedIds]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartPoint.current || !dragInitialState.current) return;
    e.preventDefault();

    const currentX = e.clientX;
    const currentY = e.clientY;
    const startX = dragStartPoint.current.x;
    const startY = dragStartPoint.current.y;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(startX - currentX);
    const height = Math.abs(startY - currentY);
    
    setSelectionBox({ x, y, width, height });
    
    const selectionRect = {
        left: x,
        top: y,
        right: x + width,
        bottom: y + height,
    };

    const currentlyIntersecting = new Set<string>();
    iconCardRefs.current.forEach((el, id) => {
      if (el) {
        const elRect = el.getBoundingClientRect();

        const isIntersecting = !(selectionRect.right < elRect.left ||
                                selectionRect.left > elRect.right ||
                                selectionRect.bottom < elRect.top ||
                                selectionRect.top > elRect.bottom);
        
        if (isIntersecting) {
            currentlyIntersecting.add(id);
        }
      }
    });
    
    if (dragInitialState.current.isAdditive) {
        const newSelectedIds = new Set(dragInitialState.current.initialIds);
        for (const id of currentlyIntersecting) {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
    } else {
        setSelectedIds(currentlyIntersecting);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    setIsDragging(false);
    dragStartPoint.current = null;
    setSelectionBox(null);
    dragInitialState.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  return (
    <div className="space-y-8" onMouseDown={handleMouseDown}>
      <Toast message={toastMessage} />
      {selectionBox && (
        <div
          className="fixed bg-purple-500/20 border-2 border-purple-500 rounded pointer-events-none z-50"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height
          }}
        />
      )}
      <SelectionToolbar
        selectedCount={selectedIds.size}
        totalCount={history.length}
        onDelete={handleDeleteSelected}
        onDownload={handleDownloadSelected}
        onToggleSelectAll={handleToggleSelectAll}
      />
      <form onSubmit={handleSubmit} className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          <div className="md:col-span-2">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Icon Description</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A smiling coffee cup"
              className="w-full h-full min-h-[240px] bg-gray-900 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            />
          </div>

          <div className="flex flex-col justify-between space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
              <StyleSelector selected={style} onSelect={setStyle} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                 <div 
                    onClick={() => {
                        const picker = document.getElementById('native-color-picker');
                        picker?.click();
                    }}
                    className="w-full h-12 bg-gray-900 border border-gray-600 rounded-md px-2 flex items-center gap-2 cursor-pointer focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition"
                  >
                    <div className="w-6 h-6 rounded border border-gray-500 flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-mono text-xs text-gray-400 truncate">{color.toUpperCase()}</span>
                    <input id="native-color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute opacity-0 pointer-events-none" tabIndex={-1} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Variants</label>
                <select
                  value={numVariants}
                  onChange={(e) => setNumVariants(Number(e.target.value))}
                  className="w-full h-12 bg-gray-900 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={4}>4</option>
                </select>
              </div>
            </div>

            <div className="flex items-center pt-2">
              <input
                id="ui-icon"
                type="checkbox"
                checked={isUiIcon}
                onChange={(e) => setIsUiIcon(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="ui-icon" className="ml-3 text-sm text-gray-300">Optimize for UI</label>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
            <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-1/3 flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-gray-400 text-white font-bold py-3 px-4 rounded-md transition-colors duration-300"
            >
            {isLoading ? <><Spinner /> Generating...</> : 'Generate Icons'}
            </button>
        </div>
      </form>
      
      {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md text-center">{error}</div>}
      
      {isLoading && (
        <div className="text-center text-gray-400">Generating your icons, please wait...</div>
      )}

      {history.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-gray-700">
          <h2 className="text-2xl font-bold text-center text-gray-300">
            Generated Icons
          </h2>
          <div
            className="p-16 -m-16"
          >
            <div
              ref={gridContainerRef}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none"
            >
              {history.map(icon => (
                <div
                  key={icon.id}
                  ref={(el) => {
                    if (el) iconCardRefs.current.set(icon.id, el);
                    else iconCardRefs.current.delete(icon.id);
                  }}
                >
                  <IconCard
                    {...icon}
                    isSelected={selectedIds.has(icon.id)}
                    onSelect={handleIconClick}
                    onDelete={handleDelete}
                    onPromptCopy={() => showToast('Prompt copied to clipboard!')}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconGenerator;