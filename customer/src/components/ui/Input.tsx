import React, {forwardRef} from 'react';
import {cn} from '@/lib/utils';
import {FieldLabelMark, stripFieldLabelMarker} from "@/components/shared/RequiredMark";
import type {InputProps} from '@/types/ui';

export type {InputProps};

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({className, label, error, helperText, id, leftIcon, rightIcon, optional, optionalLabel, ...props}, ref) => {
        const describedBy = error && id ? `${id}-error` : helperText && id ? `${id}-helper` : undefined;
        return (
            <div className="flex min-w-0 flex-col w-full">
                {label && (
                    <label
                        htmlFor={id}
                        className="block text-xs font-semibold text-on-surface mb-1.5"
                    >
                        {stripFieldLabelMarker(label)}
                        <FieldLabelMark
                            required={props.required}
                            optional={optional ?? !props.required}
                            optionalLabel={optionalLabel}
                        />
                    </label>
                )}
                <div className="relative min-w-0 w-full flex items-center">
                    {leftIcon && (
                        <div
                            className="absolute left-3.5 flex items-center pointer-events-none text-outline select-none">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        id={id}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={describedBy}
                        ref={ref}
                        className={cn(
                            'min-w-0 w-full h-11 px-3.5 rounded-control bg-card text-sm text-on-surface placeholder:text-outline transition-colors duration-150 outline-none focus:outline-2 focus:outline-ring border border-border-input',
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',
                            error && 'border-danger focus:outline-danger',
                            className
                        )}
                        {...props}
                    />
                    {rightIcon && (
                        <div
                            className="absolute right-3.5 flex items-center pointer-events-none text-outline select-none">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error ? (
                    <p className="text-xs font-normal text-danger mt-1.5" id={id ? `${id}-error` : undefined}>{error}</p>
                ) : helperText ? (
                    <p className="text-xs font-normal text-muted mt-1.5" id={id ? `${id}-helper` : undefined}>{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = 'Input';
