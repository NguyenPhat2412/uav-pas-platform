import React, {HTMLAttributes} from 'react';
import {cn} from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?:
        | 'default'
        | 'primary'
        | 'secondary'
        | 'success'
        | 'warning'
        | 'error'
        | 'outline'
        | 'telemetry';
    size?: 'sm' | 'md';
    icon?: React.ReactNode;
    pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
                                                className,
                                                variant = 'default',
                                                size = 'md',
                                                icon,
                                                pulse = false,
                                                children,
                                                ...props
                                            }) => {
    const baseStyles =
        'inline-flex items-center font-medium rounded-full select-none transition-colors';

    const sizes = {
        sm: 'text-label-caps px-2 py-0.5 gap-1',
        md: 'text-label-md px-2.5 py-1 gap-1.5',
    };

    const variants = {
        default: 'bg-surface-container text-on-surface-variant',
        primary: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-secondary-container text-on-secondary-container',
        success: 'bg-success/10 text-success border border-success/20',
        warning: 'bg-warning/10 text-warning border border-warning/20',
        error: 'bg-danger/10 text-danger border border-danger/20',
        outline: 'bg-transparent border border-border text-on-surface-variant',
        telemetry:
            'bg-inverse-surface/60 backdrop-blur-xl text-inverse-primary border border-surface-variant/20 shadow-[0_1px_8px_rgba(0,0,0,0.04)]',
    };

    return (
        <div className={cn(baseStyles, sizes[size], variants[variant], className)} {...props}>
            {pulse && (
                <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"/>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"/>
        </span>
            )}
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            <span>{children}</span>
        </div>
    );
};

Badge.displayName = 'Badge';
