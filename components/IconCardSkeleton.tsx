import React from 'react';

const IconCardSkeleton: React.FC = () => {
  return (
    <div 
      className="border rounded-lg aspect-square animate-pulse animate-fade-in-scale relative overflow-hidden shimmer-overlay bg-black/10 dark:bg-white/5"
      style={{
        borderColor: 'var(--color-border)'
      }}
    />
  );
};

export default IconCardSkeleton;