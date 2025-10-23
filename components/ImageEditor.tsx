
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
      setEditedImage(null); // Reset edited image on new file upload
    }
  };
  
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = (reader.result as string).split(',')[1];
            resolve(result);
        };
        reader.onerror = error => reject(error);
    });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalImage) {
      setError("Please upload an image first.");
      return;
    }
    if (!prompt.trim()) {
      setError("Edit instruction prompt cannot be empty.");
      return;
    }
    
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
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
        <div>
          <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">1. Upload Image</label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
        </div>

        <div>
          <label htmlFor="prompt-edit" className="block text-sm font-medium text-gray-300 mb-2">2. Describe Your Edit</label>
          <input
            id="prompt-edit"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Remove the person in the background"
            className="w-full bg-gray-900 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !originalImage}
          className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-colors duration-300"
        >
          {isLoading ? <><Spinner /> Applying Edit...</> : 'Apply Edit'}
        </button>
      </form>

      {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md text-center">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2 text-gray-400">Original</h3>
            <div className="w-full aspect-square bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-center">
                {originalImage ? (
                    <img src={originalImage.url} alt="Original" className="max-w-full max-h-full object-contain rounded-lg"/>
                ) : (
                    <span className="text-gray-500">Upload an image to start</span>
                )}
            </div>
        </div>
        <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2 text-gray-400">Edited</h3>
            <div className="w-full aspect-square bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-center">
                {isLoading && <div className="text-center text-gray-400 flex flex-col items-center gap-4"><Spinner /><span>Editing in progress...</span></div>}
                {!isLoading && editedImage && (
                    <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-lg"/>
                )}
                {!isLoading && !editedImage && <span className="text-gray-500">Your edited image will appear here</span>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
