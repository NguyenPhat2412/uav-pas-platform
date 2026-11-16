'use client';

import React, {forwardRef, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {cn} from '@/lib/utils';
import {FieldLabelMark, stripFieldLabelMarker} from "@/components/shared/RequiredMark";
import {useI18n} from '@/providers/I18nContext';
import type {PasswordInputProps} from '@/types/ui';

export type {PasswordInputProps};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({className, label, error, helperText, id, leftIcon, optional, optionalLabel, ...props}, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const {t} = useI18n();
        const describedBy = error && id ? `${id}-error` : helperText && id ? `${id}-helper` : undefined;

        return (
            <div className="flex flex-col w-full">
                {label && (
                    <div className="flex items-center justify-between mb-1.5">
                        <label
                            htmlFor={id}
                            className="block text-xs font-semibold text-on-surface"
                        >
                            {stripFieldLabelMarker(label)}
                            <FieldLabelMark
                                required={props.required}
                                optional={optional ?? !props.required}
                                optionalLabel={optionalLabel}
                            />
                        </label>
                    </div>
                )}
                <div className="relative w-full flex items-center">
                    {leftIcon && (
                        <div
                            className="absolute left-3.5 flex items-center pointer-events-none text-outline select-none">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        id={id}
                        ref={ref}
                        type={showPassword ? 'text' : 'password'}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={describedBy}
                        className={cn(
                            'w-full h-11 pl-3.5 pr-11 rounded-control bg-card text-sm text-on-surface placeholder:text-outline transition-colors duration-150 outline-none focus:outline-2 focus:outline-ring border border-border-input',
                            leftIcon && 'pl-10',
                            error && 'border-danger focus:outline-danger',
                            className
                        )}
                        {...props}
                    />
                    <button
                        type="button"
                        aria-label={showPassword ? t('authShared.hidePassword') : t('authShared.showPassword')}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer rounded-r-none select-none focus:outline-none"
                    >
                        {showPassword ? (
                            <EyeOff size={18} className="select-none"/>
                        ) : (
                            <Eye size={18} className="select-none"/>
                        )}
                    </button>
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

PasswordInput.displayName = 'PasswordInput';
