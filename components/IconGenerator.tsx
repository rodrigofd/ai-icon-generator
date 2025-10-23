import React, { useState, useCallback, useEffect } from 'react';
import { generateIcons } from '../services/geminiService';
import { IconStyle, GeneratedIcon } from '../types';
import IconCard from './IconCard';
import Spinner from './Spinner';

const getRandomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

const ColorPicker: React.FC<{ color: string; onChange: (c: string) => void; }> = ({ color, onChange }) => (
    <div className="relative w-full h-12 cursor-pointer">
      <div
        className="w-full h-full rounded-md border-2 border-gray-600"
        style={{ backgroundColor: color }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-mono pointer-events-none mix-blend-difference">
        {color.toUpperCase()}
      </div>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );


const IconGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('A rocket ship launching');
  const [style, setStyle] = useState<IconStyle>(IconStyle.FLAT_SINGLE_COLOR);
  const [color, setColor] = useState<string>('#000000');
  const [numVariants, setNumVariants] = useState<number>(4);
  const [isUiIcon, setIsUiIcon] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedIcons, setGeneratedIcons] = useState<GeneratedIcon[]>([]);
  
  useEffect(() => {
    if (style === IconStyle.FLAT_SINGLE_COLOR) {
      setColor('#000000');
    } else {
      setColor(getRandomColor());
    }
  }, [style]);


  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedIcons([]);

    try {
      const pngB64Strings = await generateIcons(prompt, style, numVariants, isUiIcon, color);
      const icons = pngB64Strings.map((b64, index) => ({
        id: `icon-${Date.now()}-${index}`,
        pngSrc: `data:image/png;base64,${b64}`,
      }));
      setGeneratedIcons(icons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, style, numVariants, isUiIcon, color]);

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 space-y-6">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">Icon Description</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A smiling coffee cup"
            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as IconStyle)}
              className="w-full h-12 bg-gray-900 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
            >
              {Object.values(IconStyle).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <ColorPicker color={color} onChange={setColor} />
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
          <div className="flex items-end">
            <div className="flex items-center h-12">
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
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-gray-400 text-white font-bold py-3 px-4 rounded-md transition-colors duration-300"
        >
          {isLoading ? <><Spinner /> Generating...</> : 'Generate Icons'}
        </button>
      </form>

      {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md text-center">{error}</div>}
      
      {isLoading && (
        <div className="text-center text-gray-400">Generating your icons, please wait...</div>
      )}

      {generatedIcons.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {generatedIcons.map(icon => <IconCard key={icon.id} pngSrc={icon.pngSrc} />)}
        </div>
      )}
    </div>
  );
};

export default IconGenerator;
