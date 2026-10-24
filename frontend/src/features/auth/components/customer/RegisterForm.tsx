'use client';

import React, {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {PasswordField} from '@/components/shared/PasswordField';
import {Button, Field} from '@/components/customer/ui';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {useToast} from '@/contexts/ToastContext';
import {authErrorMessage} from './LoginForm';

export function RegisterForm() {
    const {register} = useAuth();
    const {success, error: showError} = useToast();
    const {t} = useI18n();
    const router = useRouter();
    const [form, setForm] = useState({username: '', email: '', password: '', phoneNumber: ''});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(v => ({
            ...v,
            [key]: e.target.value,
        }));

    return (
        <form
            className="space-y-4"
            onSubmit={async e => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                    await register(form);
                    success(t('customerAuth.registerSuccess'), t('customerAuth.registerSuccessTitle'));
                    router.replace('/customer/login');
                } catch (err) {
                    const msg = authErrorMessage(err, t);
                    setError(msg);
                    showError(msg, t('customerAuth.registerFailed'));
                } finally {
                    setBusy(false);
                }
            }}
        >
            <Field label={t('customerAuth.phone')} type="tel" value={form.phoneNumber} onChange={update('phoneNumber')} autoComplete="tel" required/>
            <Field label={t('customerAuth.username')} value={form.username} onChange={update('username')} autoComplete="username" minLength={3} maxLength={50} required/>
            <Field label="Email" type="email" value={form.email} onChange={update('email')} autoComplete="email" required/>
            <PasswordField label={t('customerAuth.password')} value={form.password} onChange={update('password')} autoComplete="new-password" required minLength={8}/>
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-danger" role="alert">
                    {error}
                </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
                {busy ? t('customerAuth.creating') : t('customerAuth.createAccount')}
            </Button>
            <div className="flex items-center justify-center pt-2 text-sm">
                <Link href="/customer/login" className="font-bold text-primary hover:underline">
                    {t('customerAuth.backToLogin')}
                </Link>
            </div>
        </form>
    );
}
