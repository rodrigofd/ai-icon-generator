import React from 'react'
import Spinner from './common/Spinner'

interface IconCardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const IconCardSkeleton: React.FC<IconCardSkeletonProps> = ({ className, style, ...props }) => (
  <div
    className={`border rounded-lg aspect-square animate-fade-in-scale relative overflow-hidden flex items-center justify-center ${className || ''}`}
    style={{
      borderColor: 'var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      ...style,
    }}
    {...props}
  >
    <div className="absolute inset-0 opacity-[0.03] bg-current shimmer-overlay pointer-events-none" />
    <div className="opacity-50 scale-110 text-[var(--color-accent)]">
      <Spinner />
    </div>
  </div>
)

export default IconCardSkeleton
