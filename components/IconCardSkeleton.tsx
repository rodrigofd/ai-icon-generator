import React from 'react';
import Spinner from './Spinner';

const IconCardSkeleton: React.FC = () => {
  return (
    <div 
      className="border rounded-lg aspect-square animate-fade-in-scale relative overflow-hidden flex items-center justify-center"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <div className="absolute inset-0 opacity-[0.03] bg-current shimmer-overlay pointer-events-none" />
      <div className="opacity-50 scale-110 text-[var(--color-accent)]">
        <Spinner />
      </div>
    </div>
  );
};

export default IconCardSkeleton;