'use client';

import React, {useState} from 'react';
import {AuthCredentials} from "@/components/shared";
import {useRouter} from 'next/navigation';
import {ArrowRight, CheckCircle2,} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {useToast} from '@/contexts/ToastContext';
import {AuthResponse} from "@/features/auth/types/auth.types";
import {Alert, Button} from '@/components/ui';
import {canUsePortal, portalForRole, portalHome, portalName} from '@/features/auth/portal';

export interface LoginFormProps {
    onSuccess?: (response: AuthResponse) => void;
    redirectTo?: string;
}

export function LoginForm({onSuccess, redirectTo = "/operations"}: LoginFormProps) {
    const router = useRouter();
    const {login} = useAuth();
    const {t} = useI18n();
    const {success, error: showError} = useToast();

    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usernameOrEmail || !password) return;

        setStatus('loading');
        setErrorMessage(null);

        try {
            const response = await login(usernameOrEmail, password);
            setStatus('success');
            if (!canUsePortal(response.user.role, 'operations')) {
                const portal = portalForRole(response.user.role);
                success(t('opsShared.auth.redirectingPortal', {portal: portalName(portal)}), t('opsShared.auth.toastTitle'));
                router.replace(portalHome(portal));
                return;
            }
            success(t('opsShared.auth.welcome'), t('opsShared.auth.toastTitle'));

            if (onSuccess) {
                onSuccess(response);
            }

            setTimeout(() => {
                router.push(redirectTo);
            }, 800);
        } catch (err: unknown) {
            setStatus('error');
            const msg = err instanceof Error ? err.message : t('auth.loginFailed');
            setErrorMessage(msg);
            showError(msg, t('opsShared.auth.loginFailedTitle'));
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8">
                <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface leading-tight tracking-tight mb-2">
                    {t('auth.loginTitle')}
                </h2>
                <p className="font-body-lg text-body-lg text-secondary leading-relaxed">
                    {t('auth.loginSubtitle')}
                </p>
            </div>

            {/* Error alert */}
            {errorMessage && (
                <div className="mb-6">
                    <Alert variant="error">{errorMessage}</Alert>
                </div>
            )}

            {/* Login Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
                <AuthCredentials identity={usernameOrEmail} password={password} onIdentityChange={setUsernameOrEmail}
                                 onPasswordChange={setPassword}
                                 disabled={status === 'loading' || status === 'success'}/>

                <div className="pt-2">
                    <Button
                        type="submit"
                        isLoading={status === 'loading'}
                        loadingText={t('auth.authenticating')}
                        disabled={status === 'success'}
                        className={`w-full ${status === 'success' ? 'bg-primary' : ''}`}
                        rightIcon={
                            status === 'success' ? (
                                <CheckCircle2 size={18}/>
                            ) : (
                                <ArrowRight size={18}/>
                            )
                        }
                    >
                        {status === 'success' ? t('auth.authSuccess') : t('auth.loginBtn')}
                    </Button>
                </div>
            </form>

            <p className="mt-8 text-center text-sm text-secondary">{t('opsShared.auth.noAccount')}</p>


        </div>
    );
}
