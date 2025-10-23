import React from 'react';
import { downloadPng, copyPngToClipboard } from '../utils/fileUtils';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';

interface IconCardProps {
  pngSrc: string;
}

const IconCard: React.FC<IconCardProps> = ({ pngSrc }) => {
  const iconName = "generated-icon";

  return (
    <div className="relative group bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center aspect-square transition-all duration-300 hover:bg-gray-700 hover:shadow-lg hover:shadow-purple-500/10">
      <img 
        src={pngSrc} 
        alt={iconName}
        className="w-full h-full object-contain"
      />
      <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
      </div>
    </div>
  );
};

export default IconCard;
