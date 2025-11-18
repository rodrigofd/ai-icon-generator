import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="border-b px-4 sm:px-6" style={{ borderColor: 'var(--color-border)'}}>
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 focus:outline-none`}
            style={{
              borderColor: 'transparent',
              color: activeTab === tab.id ? 'var(--color-text)' : 'var(--color-text-dim)',
            }}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span 
                className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, var(--color-accent), var(--color-accent-dark))`}}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;