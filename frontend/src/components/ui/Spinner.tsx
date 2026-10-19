import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label }) => {
  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <div
      role="status"
      aria-label={label || 'Đang tải...'}
      className={cn('inline-flex items-center justify-center gap-2', className)}
    >
      <Loader2 size={pixelSize} className="animate-spin text-current" />
      {label && <span className="font-body-sm text-body-sm">{label}</span>}
    </div>
  );
};
