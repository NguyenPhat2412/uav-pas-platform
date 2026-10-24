import React, {forwardRef, InputHTMLAttributes, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {cn} from '@/lib/utils';
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({className, label, error, helperText, id, leftIcon, ...props}, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const {t} = useI18n();

        return (
            <div className="flex flex-col w-full">
                {label && (
                    <div className="flex items-center justify-between mb-2">
                        <label
                            htmlFor={id}
                            className="block font-label-lg text-label-lg font-medium text-on-surface"
                        >
                            {label}{props.required && <RequiredMark/>}
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
                        className={cn(
                            'w-full h-12 pl-4 pr-12 rounded-control bg-card text-body-lg font-body-lg text-on-surface placeholder:text-outline transition-colors duration-150 outline-none focus:outline-2 focus:outline-ring border border-border-input',
                            leftIcon && 'pl-11',
                            error && 'border-danger focus:outline-danger',
                            className
                        )}
                        {...props}
                    />
                    <button
                        type="button"
                        aria-label={showPassword ? t('authShared.hidePassword') : t('authShared.showPassword')}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-0 top-0 w-12 h-12 flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer rounded-r-none select-none focus:outline-none"
                    >
                        {showPassword ? (
                            <EyeOff size={18} className="select-none"/>
                        ) : (
                            <Eye size={18} className="select-none"/>
                        )}
                    </button>
                </div>
                {error ? (
                    <p className="font-body-sm text-body-sm text-error mt-1.5">{error}</p>
                ) : helperText ? (
                    <p className="font-body-md text-body-md text-secondary mt-1.5">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';
