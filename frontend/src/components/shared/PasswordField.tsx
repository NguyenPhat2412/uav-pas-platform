'use client';

import {type InputHTMLAttributes, useId, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

export function PasswordField({
                                  label,
                                  id,
                                  disabled,
                                  ...props
                              }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: string }) {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [visible, setVisible] = useState(false);
    const {t} = useI18n();

    return (
        <div className="grid gap-1.5">
            <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
                {label ?? t('authShared.password')}{props.required && <RequiredMark/>}
            </label>
            <div className="portal-password relative flex items-center">
                <input
                    {...props}
                    id={inputId}
                    type={visible ? 'text' : 'password'}
                    disabled={disabled}
                    className="w-full min-h-11 rounded-none border border-border-input bg-card pl-3.5 pr-11 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <button
                    type="button"
                    disabled={disabled}
                    aria-label={visible ? t('authShared.hidePassword') : t('authShared.showPassword')}
                    aria-pressed={visible}
                    aria-controls={inputId}
                    onClick={() => setVisible(value => !value)}
                    className="absolute right-1 inline-flex h-9 w-9 items-center justify-center rounded-none text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
                >
                    {visible ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
                </button>
            </div>
        </div>
    );
}
