
import React, { useState, useEffect } from 'react';
import IconGenerator from './components/IconGenerator';
import ThemeSwitcher from './components/ThemeSwitcher';
import GitHubIcon from './components/icons/GitHubIcon';

const App: React.FC = () => {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch('./package.json')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        console.error('Could not fetch package.json');
        return null;
      })
      .then(data => {
        if (data?.version) {
          setVersion(data.version);
        }
      })
      .catch(error => {
        console.error('Error parsing package.json:', error);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-4">
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-600">
              AI Icon Generator
            </h1>
            <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
              Your one-stop solution for AI-powered icon creation.
            </p>
          </div>
          <ThemeSwitcher />
        </header>

        <div className="mb-8 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-2">
          <a
            href="https://github.com/rodrigofd/ai-icon-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <GitHubIcon className="w-4 h-4 text-gray-800 dark:text-gray-200" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">Star on GitHub</span>
          </a>
          {version && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-mono">
              v{version}
            </span>
          )}
          <span>
            With ❤️ by{' '}
            <a
              href="https://github.com/rodrigofd"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              @rodrigofd
            </a>
          </span>
        </div>

        <main>
          <IconGenerator />
        </main>
      </div>
    </div>
  );
};

export default App;
