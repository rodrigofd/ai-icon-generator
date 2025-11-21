import React, { useState, useEffect } from 'react';
import IconGenerator from './components/IconGenerator';
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
    <div className="min-h-screen font-sans antialiased bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="flex justify-between items-center mb-10 animate-slide-up">
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-text)] to-[var(--color-text-dim)]">
                AI Icon Generator
              </span>
              {version && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text-dim)] tracking-wide shadow-sm">
                  v{version}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm sm:text-base text-[var(--color-text-dim)] max-w-md">
              Professional vector assets generated in seconds.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <a
              href="https://github.com/rodrigofd/ai-icon-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full transition-all hover:bg-[var(--color-surface-secondary)] border border-transparent hover:border-[var(--color-border)]"
              style={{ color: 'var(--color-text-dim)'}}
              title="View on GitHub"
            >
              <GitHubIcon className="w-5 h-5" />
            </a>
          </div>
        </header>
        
        <main className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <IconGenerator />
        </main>
        
        <footer className="mt-16 text-center text-xs sm:text-sm text-[var(--color-text-dim)] animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <p>
              Crafted with care by <a href="https://github.com/rodrigofd" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-[var(--color-accent)] transition-colors">@rodrigofd</a>
            </p>
        </footer>
      </div>
    </div>
  );
};

export default App;