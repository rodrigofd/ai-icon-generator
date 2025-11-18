import React, { useState, useCallback, ChangeEvent } from 'react';
import { editImage } from '../services/geminiService';
import Spinner from './Spinner';

const ImageEditor: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('Add a retro, vintage filter.');
  const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage({ file, url: URL.createObjectURL(file) });
      setEditedImage(null);
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalImage) { setError("Please upload an image first."); return; }
    if (!prompt.trim()) { setError("Edit instruction prompt cannot be empty."); return; }
    
    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
        const base64Image = await fileToBase64(originalImage.file);
        const editedImageB64 = await editImage(base64Image, originalImage.file.type, prompt);
        setEditedImage(`data:${originalImage.file.type};base64,${editedImageB64}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, originalImage]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="image-upload" className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>1. Upload Image</label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:text-sm file:font-semibold file:bg-transparent hover:file:opacity-80"
            style={{ 
              color: 'var(--color-text-dim)', 
              '--file-border-color': 'var(--color-border)', 
              '--file-text-color': 'var(--color-text)' 
            } as any}
          />
        </div>

        <div>
          <label htmlFor="prompt-edit" className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>2. Describe Your Edit</label>
          <input
            id="prompt-edit"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Remove the person in the background"
            className="w-full bg-transparent border rounded-lg p-3 focus:outline-none focus:ring-2 focus:shadow-[var(--shadow-inner-sm)]"
            // FIX: Replaced invalid `ringColor` property with the correct CSS custom property `--tw-ring-color`
            // to align with Tailwind's ring utilities and resolve the TypeScript error.
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-accent)' } as React.CSSProperties}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !originalImage}
          className="w-full flex justify-center items-center gap-2 font-bold py-3 px-4 border rounded-lg text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5"
          style={{
            background: `linear-gradient(45deg, var(--color-accent), var(--color-accent-dark))`,
            color: '#FFFFFF',
            borderColor: 'transparent',
            opacity: (isLoading || !originalImage) ? 0.7 : 1,
          }}
        >
          {isLoading ? <><Spinner /> Applying Edit...</> : 'Apply Edit'}
        </button>
      </form>

      {error && <div className="text-red-500 border border-red-500 bg-red-500/10 p-3 text-center rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col items-center">
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Original</h3>
            <div className="w-full aspect-square border rounded-lg flex items-center justify-center p-2" style={{ borderColor: 'var(--color-border)' }}>
                {originalImage ? (
                    <img src={originalImage.url} alt="Original" className="max-w-full max-h-full object-contain rounded-md"/>
                ) : (
                    <span style={{ color: 'var(--color-text-dim)' }}>Upload an image to start</span>
                )}
            </div>
        </div>
        <div className="flex flex-col items-center">
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-dim)' }}>Edited</h3>
            <div className="w-full aspect-square border rounded-lg flex items-center justify-center p-2" style={{ borderColor: 'var(--color-border)' }}>
                {isLoading && <div className="text-center flex flex-col items-center gap-4" style={{ color: 'var(--color-text-dim)' }}><Spinner /><span>Editing in progress...</span></div>}
                {!isLoading && editedImage && (
                    <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-md"/>
                )}
                {!isLoading && !editedImage && <span style={{ color: 'var(--color-text-dim)' }}>Your edited image will appear here</span>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
