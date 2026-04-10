'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'red' | 'accent';
  className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-white/5 text-muted border-white/10',
    green: 'bg-green/10 text-green border-green/20',
    red: 'bg-red/10 text-red border-red/20',
    accent: 'bg-accent/10 text-accent-light border-accent/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
