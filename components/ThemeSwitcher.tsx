import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../hooks/context/ThemeContext';
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'light', label: 'Light', icon: <SunIcon className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <MoonIcon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <SystemIcon className="w-4 h-4" /> },
  ];

  const currentOption = options.find(opt => opt.value === theme) || options[2];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] transition-all"
        aria-label="Toggle theme"
        style={{ color: 'var(--color-text-dim)'}}
      >
        {currentOption.icon}
      </button>
      <div 
        className={`absolute top-full right-0 mt-2 w-40 p-1 rounded-xl z-50 transition-all duration-200 ease-out origin-top-right border backdrop-blur-md
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
        style={{ 
            backgroundColor: 'var(--color-surface-blur)', 
            borderColor: 'var(--color-border)', 
            boxShadow: 'var(--shadow-lg)' 
        }}
      >
        <ul>
          {options.map(option => (
            <li key={option.value}>
              <button
                onClick={() => { setTheme(option.value as any); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-lg transition-colors`}
                style={{
                  backgroundColor: theme === option.value ? 'var(--color-bg)' : 'transparent',
                  color: theme === option.value ? 'var(--color-text)' : 'var(--color-text-dim)',
                  fontWeight: theme === option.value ? '600' : '400',
                }}
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