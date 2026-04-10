'use client';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export default function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-white/5 shimmer"
          style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass p-6 space-y-3 animate-pulse">
      <div className="h-3 w-24 rounded bg-white/5" />
      <div className="h-8 w-32 rounded bg-white/5" />
      <div className="h-3 w-20 rounded bg-white/5" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass p-4 flex gap-4 animate-pulse">
          <div className="h-4 flex-1 rounded bg-white/5" />
          <div className="h-4 w-20 rounded bg-white/5" />
          <div className="h-4 w-20 rounded bg-white/5" />
          <div className="h-4 w-16 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}
