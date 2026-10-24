import React, {ButtonHTMLAttributes, forwardRef} from 'react';
import {Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    loadingText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

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
            'rounded-lg font-title-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

        const sizes = {
            sm: 'h-9 px-3 text-sm gap-1.5',
            md: 'h-10 px-4 text-sm gap-2',
            lg: 'h-14 px-6 text-body-lg gap-2.5',
        };

        const variants = {
            primary:
                'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow active:scale-[0.99]',
            secondary:
                'bg-secondary-container text-on-surface hover:bg-secondary-fixed-dim shadow-sm',
            outline:
                'bg-transparent border border-outline text-on-surface hover:bg-surface-container-low active:bg-surface-container',
            ghost:
                'bg-transparent text-primary hover:bg-surface-container-low',
            danger:
                'bg-danger text-danger-foreground hover:bg-danger-hover shadow-sm',
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
