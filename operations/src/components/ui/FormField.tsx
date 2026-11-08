import React, {forwardRef} from 'react';
import {cn} from '@/lib/utils';
import {FieldLabelMark, OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import type {FormFieldProps, SelectProps, TextareaProps} from '@/types/ui';

export {FieldLabelMark, OptionalMark, RequiredMark};
export type {FormFieldProps, SelectProps, TextareaProps};

export function FormField({
    id,
    label,
    required,
    optional,
    optionalLabel,
    error,
    helperText,
    className,
    labelClassName,
    children,
}: FormFieldProps) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5 w-full', className)}>
            {label && (
                <label
                    htmlFor={id}
                    className={cn('block text-xs font-semibold text-slate-700', labelClassName)}
                >
                    <span>
                        {label}
                        <FieldLabelMark
                            required={required}
                            optional={optional ?? !required}
                            optionalLabel={optionalLabel}
                        />
                    </span>
                </label>
            )}
            {children}
            {error ? (
                <p className="text-xs font-normal text-danger mt-0.5" id={id ? `${id}-error` : undefined}>
                    {error}
                </p>
            ) : helperText ? (
                <p className="text-xs font-normal text-slate-500 mt-0.5">{helperText}</p>
            ) : null}
        </div>
    );
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({className, label, error, helperText, id, required, optional, optionalLabel, children, ...props}, ref) => {
        return (
            <div className="flex min-w-0 flex-col w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="block font-label-lg text-label-lg font-medium text-on-surface mb-2"
                    >
                        {label}
                        <FieldLabelMark
                            required={required}
                            optional={optional ?? !required}
                            optionalLabel={optionalLabel}
                        />
                    </label>
                )}
                <select
                    id={id}
                    ref={ref}
                    aria-required={required}
                    aria-invalid={error ? true : undefined}
                    className={cn(
                        'min-w-0 w-full h-11 px-3 rounded-control bg-card text-sm text-on-surface transition-colors duration-150 outline-none focus:outline-2 focus:outline-ring border border-border-input disabled:bg-slate-100 disabled:text-slate-500',
                        error && 'border-danger focus:outline-danger',
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                {error ? (
                    <p className="font-body-sm text-body-sm text-error mt-1.5">{error}</p>
                ) : helperText ? (
                    <p className="font-body-md text-body-md text-secondary mt-1.5">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Select.displayName = 'Select';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({className, label, error, helperText, id, required, optional, optionalLabel, rows = 3, ...props}, ref) => {
        return (
            <div className="flex min-w-0 flex-col w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="block font-label-lg text-label-lg font-medium text-on-surface mb-2"
                    >
                        {label}
                        <FieldLabelMark
                            required={required}
                            optional={optional ?? !required}
                            optionalLabel={optionalLabel}
                        />
                    </label>
                )}
                <textarea
                    id={id}
                    ref={ref}
                    rows={rows}
                    aria-required={required}
                    aria-invalid={error ? true : undefined}
                    className={cn(
                        'min-w-0 w-full px-3.5 py-2.5 rounded-control bg-card text-sm text-on-surface placeholder:text-outline transition-colors duration-150 outline-none focus:outline-2 focus:outline-ring border border-border-input disabled:bg-slate-100 disabled:text-slate-500',
                        error && 'border-danger focus:outline-danger',
                        className
                    )}
                    {...props}
                />
                {error ? (
                    <p className="font-body-sm text-body-sm text-error mt-1.5">{error}</p>
                ) : helperText ? (
                    <p className="font-body-md text-body-md text-secondary mt-1.5">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Textarea.displayName = 'Textarea';
