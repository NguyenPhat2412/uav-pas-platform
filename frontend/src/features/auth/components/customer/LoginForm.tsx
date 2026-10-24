'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AuthCredentials} from '@/components/shared';
import {Button} from '@/components/customer/ui';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {useToast} from '@/contexts/ToastContext';
import {portalForRole, portalHome} from '@/features/auth/utils/portal';
import {ApiError} from '@/lib/api';

export function authErrorMessage(err: unknown, t: (key: string) => string): string {
    if (
        err instanceof ApiError &&
        err.code &&
        ['INVALID_CREDENTIALS', 'ACCOUNT_INACTIVE', 'USER_NOT_FOUND', 'EMAIL_EXISTS', 'USERNAME_EXISTS', 'PHONE_EXISTS'].includes(err.code)
    ) {
        return t(`customerAuth.errors.${err.code}`);
    }
    return err instanceof Error && err.message ? err.message : t('customerAuth.errors.default');
}

export function LoginForm() {
    const {login} = useAuth();
    const {success, error: showError} = useToast();
    const {t} = useI18n();
    const router = useRouter();
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    return (
        <form
            className="space-y-5"
            onSubmit={async e => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                    const {user} = await login(identity, password);
                    const portal = portalForRole(user.role);
                    success(
                        portal === 'customer'
                            ? t('customerAuth.loginSuccess')
                            : t('customerAuth.loginSuccessPortal', {portal: t(`customerAuth.portal.${portal}`)}),
                        t('customerAuth.welcomeBack')
                    );
                    router.replace(portalHome(portal));
                } catch (err) {
                    const msg = authErrorMessage(err, t);
                    setError(msg);
                    showError(msg, t('customerAuth.loginFailed'));
                } finally {
                    setBusy(false);
                }
            }}
        >
            <AuthCredentials
                identity={identity}
                password={password}
                onIdentityChange={setIdentity}
                onPasswordChange={setPassword}
                disabled={busy}
            />
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-danger" role="alert">
                    {error}
                </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
                {busy ? t('customerAuth.signingIn') : t('customerAuth.signIn')}
            </Button>
            <div className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-600">
                <span>{t('customerAuth.noAccount')}</span>
                <Link href="/customer/register" className="font-bold text-primary hover:underline">
                    {t('customerAuth.register')}
                </Link>
            </div>
        </form>
    );
}
