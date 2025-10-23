
import React, { useState } from 'react';
import IconGenerator from './components/IconGenerator';
import ImageEditor from './components/ImageEditor';
import ImageGenerator from './components/ImageGenerator';
import Tabs from './components/Tabs';

type Tab = 'IconGenerator' | 'ImageEditor' | 'ImageGenerator';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('IconGenerator');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'IconGenerator', label: 'Icon Generator' },
    { id: 'ImageGenerator', label: 'Image Generator' },
    { id: 'ImageEditor', label: 'Image Editor' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'IconGenerator':
        return <IconGenerator />;
      case 'ImageEditor':
        return <ImageEditor />;
      case 'ImageGenerator':
        return <ImageGenerator />;
      default:
        return <IconGenerator />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Creative Suite AI
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Your one-stop solution for AI-powered image and icon creation.
          </p>
        </header>
        
        <main>
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="mt-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
