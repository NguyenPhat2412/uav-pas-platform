'use client';
import {keepVietnamesePhrases} from "@/lib/typography";
import {displayLabel} from "@/components/shared/presentation";
import {Button as SharedButton} from "@/components/shared";
import type {ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes} from 'react';
import {RequiredMark} from "@/components/shared/RequiredMark";
import {cn} from "@/lib/utils";

const buttonVariants: Record<'primary' | 'secondary' | 'danger', string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
    secondary: 'bg-card text-foreground border border-border-input hover:bg-slate-50',
    danger: 'bg-danger text-danger-foreground hover:bg-danger-hover shadow-sm',
};

export function Button({variant = 'primary', className = '', ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger'
}) {
    return (
        <SharedButton
            className={cn(
                'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                buttonVariants[variant],
                className
            )}
            {...props}
        />
    );
}

export function Field({label, className = '', ...props}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            <span>{label}{props.required && <RequiredMark/>}</span>
            <input
                className={cn(
                    'w-full min-h-11 rounded-xl border border-border-input bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:bg-slate-100 disabled:text-slate-500',
                    className
                )}
                {...props}
            />
        </label>
    );
}

export function TextField({label, className = '', ...props}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
    return (
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            <span>{label}{props.required && <RequiredMark/>}</span>
            <textarea
                className={cn(
                    'w-full min-h-24 rounded-xl border border-border-input bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:bg-slate-100 disabled:text-slate-500',
                    className
                )}
                {...props}
            />
        </label>
    );
}

export function Panel({title, children, action, className = ''}: {
    title?: string;
    children: ReactNode;
    action?: ReactNode;
    className?: string
}) {
    return (
        <section className={cn('rounded-2xl border border-border bg-card p-5 shadow-xs', className)}>
            {title && (
                <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <h2 className="text-base font-bold tracking-tight text-foreground">{keepVietnamesePhrases(title)}</h2>
                    {action}
                </header>
            )}
            <div className="space-y-4">{children}</div>
        </section>
    );
}

const statusStyles: Record<string, string> = {
    COMPLETED: 'bg-uav-blue-light text-uav-blue border-blue-200',
    READY: 'bg-uav-blue-light text-uav-blue border-blue-200',
    AVAILABLE: 'bg-uav-blue-light text-uav-blue border-blue-200',
    ACTIVE: 'bg-uav-blue-light text-uav-blue border-blue-200',
    IN_PROGRESS: 'bg-sky-50 text-sky-700 border-sky-200',
    PENDING_CONFIRMATION: 'bg-amber-50 text-warning border-amber-200',
    RESERVED: 'bg-amber-50 text-warning border-amber-200',
    CANCELLED: 'bg-red-50 text-danger border-red-200',
    FAILED: 'bg-red-50 text-danger border-red-200',
};

export function Status({value}: { value: string }) {
    const normalized = (value || '').toUpperCase();
    return (
        <span
            data-status={value}
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none',
                statusStyles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200'
            )}
        >
            {displayLabel(value)}
        </span>
    );
}
