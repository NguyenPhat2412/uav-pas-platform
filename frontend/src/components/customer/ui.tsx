'use client';
import {keepVietnamesePhrases} from "@/lib/typography";
import {displayLabel} from "@/components/shared/presentation";
import {Button as SharedButton} from "@/components/shared";
import type {ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes} from 'react';
import {FieldLabelMark} from "@/components/shared/RequiredMark";
import {cn} from "@/lib/utils";

const buttonVariants: Record<'primary' | 'secondary' | 'danger', string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
    secondary: 'bg-card text-foreground border border-border-input hover:bg-slate-50',
    danger: 'bg-danger text-danger-foreground hover:bg-danger-hover',
};

export function Button({variant = 'primary', className = '', ...props}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger'
}) {
    return (
        <SharedButton
            className={cn(
                'inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-bold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
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
            <span>{label}<FieldLabelMark required={props.required} optional={!props.required}/></span>
            <input
                className={cn(
                    'w-full min-h-10 rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-100 disabled:text-slate-500',
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
            <span>{label}<FieldLabelMark required={props.required} optional={!props.required}/></span>
            <textarea
                className={cn(
                    'w-full min-h-24 rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-100 disabled:text-slate-500',
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
        <section className={cn('flex flex-col rounded-panel border border-slate-200 bg-white', className)}>
            {title && (
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-800">{keepVietnamesePhrases(title)}</h2>
                    {action}
                </header>
            )}
            <div className="flex-1 space-y-4 p-4">{children}</div>
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
    CANCELLED: 'bg-slate-50 text-slate-500 border-slate-200',
    FAILED: 'bg-red-50 text-danger border-red-200',
};

export function Status({value}: { value: string }) {
    const normalized = (value || '').toUpperCase();
    return (
        <span
            data-status={value}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-badge border px-2 py-0.5 text-[11px] font-bold uppercase leading-4 tracking-wider',
                statusStyles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200'
            )}
        >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true"/>
            {displayLabel(value)}
        </span>
    );
}
