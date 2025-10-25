import React from 'react';
import IconGenerator from './components/IconGenerator';
import ThemeSwitcher from './components/ThemeSwitcher';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex-1">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
              AI Icon Generator
            </h1>
            <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
              Your one-stop solution for AI-powered icon creation.
            </p>
          </div>
          <ThemeSwitcher />
        </header>

        <main>
          <IconGenerator />
        </main>
      </div>
    </div>
  );
};

export default App;