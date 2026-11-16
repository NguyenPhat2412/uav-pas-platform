import React, {forwardRef} from 'react';
import {Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {ButtonProps} from '@/types/ui';

export type {ButtonProps};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            loadingText,
            disabled,
            leftIcon,
            rightIcon,
            children,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            'rounded-control font-title-sm font-semibold inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap leading-tight transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985] disabled:active:scale-100 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

        const hasExplicitHeight = /(?:^|\s)(?:min-)?h-\S+/.test(className ?? '');
        const sizes = {
            sm: cn(!hasExplicitHeight && 'min-h-9 py-1.5', 'px-3 text-sm gap-1.5'),
            md: cn(!hasExplicitHeight && 'min-h-10 py-2', 'px-4 text-sm gap-2'),
            lg: cn(!hasExplicitHeight && 'min-h-14 py-3', 'px-6 text-body-lg gap-2.5'),
        };

        const variants = {
            primary:
                'bg-primary text-primary-foreground hover:bg-primary-hover',
            secondary:
                'bg-secondary-container text-on-surface hover:bg-secondary-fixed-dim',
            outline:
                'bg-transparent border border-outline text-on-surface hover:bg-surface-container-low active:bg-surface-container',
            ghost:
                'bg-transparent text-primary hover:bg-surface-container-low',
            danger:
                'bg-danger text-danger-foreground hover:bg-danger-hover',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(baseStyles, sizes[size], variants[variant], className)}
                {...props}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin text-current shrink-0" size={size === 'sm' ? 16 : 20}/>
                        <span>{loadingText || children}</span>
                    </>
                ) : (
                    <>
                        {leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>}
                        {children}
                        {rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
