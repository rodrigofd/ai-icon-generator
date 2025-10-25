
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import SystemIcon from './icons/SystemIcon';

const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const options = [
    { value: 'light', label: 'Light', icon: <SunIcon className="w-5 h-5" /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon className="w-5 h-5" /> },
    { value: 'system', label: 'System', icon: <SystemIcon className="w-5 h-5" /> },
  ];

  const currentIcon = options.find(opt => opt.value === theme)?.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Toggle theme"
      >
        {currentIcon}
      </button>
      <div 
        className={`absolute top-full right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 transition-all duration-150 ease-out origin-top-right
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
      >
        <ul className="p-1">
          {options.map(option => (
            <li key={option.value}>
              <button
                onClick={() => {
                  setTheme(option.value as any);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md text-left transition-colors
                  ${theme === option.value
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {option.icon}
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ThemeSwitcher;
