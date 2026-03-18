import React from 'react'

const EmptyState: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-dim)] opacity-40 py-20 lg:py-0 border-2 border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/50 select-none h-full">
    <div className="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-surface-secondary)]" />
    <p className="text-lg font-medium">Your icons will appear here</p>
  </div>
)

export default EmptyState
