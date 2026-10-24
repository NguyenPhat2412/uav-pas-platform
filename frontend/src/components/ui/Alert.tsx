import React, {HTMLAttributes} from 'react';
import {AlertCircle, AlertTriangle, CheckCircle2, Info} from 'lucide-react';
import {cn} from '@/lib/utils';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'info' | 'success' | 'warning' | 'error';
    icon?: React.ReactNode;
    title?: string;
}

export const Alert: React.FC<AlertProps> = ({
                                                className,
                                                variant = 'info',
                                                icon,
                                                title,
                                                children,
                                                ...props
                                            }) => {
    const defaultIcons = {
        info: <Info size={18} className="shrink-0 text-primary-container"/>,
        success: <CheckCircle2 size={18} className="shrink-0 text-uav-blue"/>,
        warning: <AlertTriangle size={18} className="shrink-0 text-amber-600"/>,
        error: <AlertCircle size={18} className="shrink-0 text-error"/>,
    };

    const variants = {
        info: 'bg-primary-fixed/30 border-primary/20 text-on-surface',
        success: 'bg-uav-blue-light border-blue-200 text-slate-900',
        warning: 'bg-amber-50 border-amber-200 text-amber-950',
        error: 'bg-error-container/40 border-error/30 text-on-error-container',
    };

    return (
        <div
            role="alert"
            className={cn(
                'w-full p-4 rounded-none border border-l-4 flex items-start gap-3 transition-all',
                variants[variant],
                className
            )}
            {...props}
        >
            <div className="mt-0.5">{icon !== undefined ? icon : defaultIcons[variant]}</div>
            <div className="flex-1 min-w-0">
                {title && <h5 className="font-title-sm text-title-sm font-semibold mb-1">{title}</h5>}
                <div className="font-body-md text-body-md leading-relaxed">{children}</div>
            </div>
        </div>
    );
};

Alert.displayName = 'Alert';
