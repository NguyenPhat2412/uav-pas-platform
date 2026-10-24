import React from 'react';
import {Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {getPresentationLocale} from '@/components/shared/presentation';

// Plain component (no hooks) so it also works in server-rendered loading states.
const defaultLabels = {vi: 'Đang tải...', en: 'Loading…', ja: '読み込み中…'} as const;

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | number;
    className?: string;
    label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({size = 'md', className, label}) => {
    const sizeMap = {
        sm: 16,
        md: 20,
        lg: 28,
    };

    const pixelSize = typeof size === 'number' ? size : sizeMap[size];

    return (
        <div
            role="status"
            aria-label={label || defaultLabels[getPresentationLocale()]}
            className={cn('inline-flex items-center justify-center gap-2', className)}
        >
            <Loader2 size={pixelSize} className="animate-spin text-current"/>
            {label && <span className="font-body-sm text-body-sm">{label}</span>}
        </div>
    );
};
