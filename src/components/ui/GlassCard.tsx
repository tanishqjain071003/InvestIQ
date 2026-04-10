'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', hover = false, onClick }: GlassCardProps) {
  return (
    <div
      className={`glass ${hover ? 'glass-hover cursor-pointer transition-all duration-200' : ''} p-6 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
