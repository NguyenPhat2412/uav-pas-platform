'use client';

import React from 'react';
import {cn} from '@/lib/utils';

export interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: React.ReactNode;
    title?: string;
    'aria-label'?: string;
    className?: string;
}

export function Switch({
    checked,
    onCheckedChange,
    disabled = false,
    label,
    title,
    'aria-label': ariaLabel,
    className,
}: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            title={title}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                'inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
        >
            <span className={cn('relative h-5 w-9 transition-colors', checked ? 'bg-primary' : 'bg-slate-300')}>
                <span className={cn('absolute top-0.5 h-4 w-4 bg-white transition-all', checked ? 'left-[18px]' : 'left-0.5')}/>
            </span>
            {label != null && (
                <span className={cn('text-xs font-semibold', checked ? 'text-primary' : 'text-slate-500')}>
                    {label}
                </span>
            )}
        </button>
    );
}
