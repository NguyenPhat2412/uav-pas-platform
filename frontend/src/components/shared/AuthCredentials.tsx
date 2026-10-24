'use client';
import React, {useId} from 'react';
import {PasswordField} from '@/components/shared/PasswordField';
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

/** Credentials UI only; callers retain their existing login and session behavior. */
export function AuthCredentials({identity, password, onIdentityChange, onPasswordChange, disabled = false}: {
    identity: string;
    password: string;
    onIdentityChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    disabled?: boolean;
}) {
    const id = useId();
    const {t} = useI18n();
    return (
        <div className="space-y-4">
            <div className="grid gap-1.5">
                <label htmlFor={`${id}-identity`} className="text-sm font-semibold text-slate-700">
                    {t('authShared.identity')}<RequiredMark/>
                </label>
                <input
                    id={`${id}-identity`}
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    disabled={disabled}
                    value={identity}
                    onChange={event => onIdentityChange(event.target.value)}
                    className="w-full min-h-11 rounded-control border border-border-input bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:bg-slate-100 disabled:text-slate-500"
                />
            </div>
            <PasswordField
                id={`${id}-password`}
                name="password"
                autoComplete="current-password"
                required
                disabled={disabled}
                value={password}
                onChange={event => onPasswordChange(event.target.value)}
            />
        </div>
    );
}
