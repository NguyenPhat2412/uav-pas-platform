'use client';

import React, {useId, useRef, useState} from 'react';
import {AlertTriangle, HelpCircle, X} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {cn} from '@/lib/utils';

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel: string;
    closeLabel?: string;
    variant?: 'primary' | 'danger';
    checkboxLabel?: string;
    defaultChecked?: boolean;
    promptMode?: boolean;
    inputLabel?: string;
    inputPlaceholder?: string;
    defaultValue?: string;
    inputRequired?: boolean;
    onConfirm: (payload: { checked: boolean; value: string }) => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    cancelLabel,
    closeLabel,
    variant = 'primary',
    checkboxLabel,
    defaultChecked = false,
    promptMode = false,
    inputLabel,
    inputPlaceholder,
    defaultValue = '',
    inputRequired = true,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLElement>(null);
    const titleId = useId();
    const descId = useId();
    const inputId = useId();
    const [checked, setChecked] = useState(defaultChecked);
    const [value, setValue] = useState(defaultValue);

    useDialogFocusTrap(dialogRef, open, onCancel);

    if (!open) return null;

    const canSubmit = !promptMode || !inputRequired || value.trim().length > 0;
    const isDanger = variant === 'danger';

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        onConfirm({checked, value: value.trim()});
    };

    return (
        <div
            role="presentation"
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[1px]"
            onMouseDown={event => {
                if (event.target === event.currentTarget) onCancel();
            }}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                tabIndex={-1}
                className="w-full max-w-md rounded-overlay border border-border bg-card text-card-foreground shadow-2xl focus:outline-none"
            >
                <form onSubmit={handleSubmit}>
                    <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control border',
                                    isDanger
                                        ? 'border-rose-200 bg-uav-red-light text-primary'
                                        : 'border-slate-200 bg-slate-100 text-slate-700',
                                )}
                            >
                                {isDanger ? <AlertTriangle size={16}/> : <HelpCircle size={16}/>}
                            </span>
                            <h2 id={titleId} className="m-0 truncate text-base font-bold text-slate-900">
                                {title}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            aria-label={closeLabel ?? cancelLabel}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                        >
                            <X size={16}/>
                        </button>
                    </div>

                    <div className="space-y-4 px-5 py-4">
                        <p id={descId} className="m-0 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                            {description}
                        </p>

                        {promptMode && (
                            <div className="space-y-1.5">
                                {inputLabel && (
                                    <label htmlFor={inputId} className="block text-xs font-bold text-slate-800">
                                        {inputLabel}
                                    </label>
                                )}
                                <input
                                    id={inputId}
                                    data-autofocus="true"
                                    type="text"
                                    value={value}
                                    placeholder={inputPlaceholder}
                                    onChange={event => setValue(event.target.value)}
                                    className="min-h-10 w-full rounded-control border border-border-input bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                                />
                            </div>
                        )}

                        {checkboxLabel && (
                            <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={event => setChecked(event.target.checked)}
                                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                                />
                                <span>{checkboxLabel}</span>
                            </label>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-5 py-3.5">
                        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                            {cancelLabel}
                        </Button>
                        <Button
                            type="submit"
                            variant={isDanger ? 'danger' : 'primary'}
                            size="sm"
                            disabled={!canSubmit}
                            data-autofocus={promptMode ? undefined : 'true'}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </form>
            </section>
        </div>
    );
}
