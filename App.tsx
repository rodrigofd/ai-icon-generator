import React, { useState, useEffect } from 'react';
import IconGenerator from './components/IconGenerator';
import ThemeSwitcher from './components/ThemeSwitcher';
import GitHubIcon from './components/icons/GitHubIcon';

const App: React.FC = () => {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch('./package.json')
      .then(res => res.ok ? res.json() : null)
      .then(data => data?.version && setVersion(data.version))
      .catch(error => console.error('Error fetching package.json:', error));
  }, []);

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8" style={{ color: 'var(--color-text)' }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              AI Icon Generator
            </h1>
            <p className="mt-2 text-base" style={{ color: 'var(--color-text-dim)' }}>
              Your AI-powered design companion. (v{version || '1.8.0'})
            </p>
          </div>
          <div className="flex items-center gap-2">
             <a
              href="https://github.com/rodrigofd/ai-icon-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-dim)'}}
              title="View on GitHub"
            >
              <GitHubIcon className="w-5 h-5" />
            </a>
            <ThemeSwitcher />
          </div>
        </header>
        
        <main className="gradient-border rounded-xl p-4 sm:p-6" style={{ backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
            <IconGenerator />
        </main>
        
        <footer className="mt-8 text-center text-sm" style={{ color: 'var(--color-text-dim)' }}>
           With ❤️ by{' '}
            <a
              href="https://github.com/rodrigofd"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              @rodrigofd
            </a>
        </footer>
      </div>
    </div>
  );
};

export default App;