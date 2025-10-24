import React from 'react';
import { downloadPng, copyPngToClipboard } from '../utils/fileUtils';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';

interface IconCardProps {
  id: string;
  pngSrc: string;
  prompt: string;
  isSelected: boolean;
  onDelete: (id: string) => void;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onPromptCopy: () => void;
}

const IconCard: React.FC<IconCardProps> = ({ id, pngSrc, prompt, isSelected, onDelete, onSelect, onPromptCopy }) => {
  const iconName = prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 20) || "generated-icon";

  const handlePromptClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    onPromptCopy();
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when clicking an action button
  };

  return (
    <div
      data-icon-card="true"
      onClick={(e) => onSelect(e, id)}
      className={`relative group bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center aspect-square transition-all duration-200 hover:bg-gray-700 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer
        ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''}
      `}
    >
      {isSelected && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center z-10 pointer-events-none">
          <CheckIcon className="w-4 h-4 text-white" />
        </div>
      )}
      <img
        src={pngSrc}
        alt={prompt}
        className="w-full h-full object-contain"
      />
      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={handleActionClick}>
        <button
          onClick={() => copyPngToClipboard(pngSrc)}
          className="p-2 bg-gray-900/50 rounded-full text-gray-300 hover:bg-purple-600 hover:text-white transition-colors"
          title="Copy as PNG"
        >
          <ClipboardIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => downloadPng(pngSrc, iconName)}
          className="p-2 bg-gray-900/50 rounded-full text-gray-300 hover:bg-purple-600 hover:text-white transition-colors"
          title="Download PNG"
        >
          <DownloadIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => onDelete(id)}
          className="p-2 bg-gray-900/50 rounded-full text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
          title="Delete Icon"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      <div
        onClick={handlePromptClick}
        title="Click to copy prompt"
        className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <p className="text-xs text-gray-200 text-center line-clamp-2">
          {prompt}
        </p>
      </div>
    </div>
  );
};

export default IconCard;