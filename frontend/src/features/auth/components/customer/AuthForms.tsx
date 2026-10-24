'use client';
import {PasswordField} from '@/components/shared/PasswordField';
import Link from 'next/link';
import {AuthCredentials} from "@/components/shared";
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {useAuth} from '@/contexts/AuthContext';
import {useToast} from '@/contexts/ToastContext';
import {Button, Field} from "@/components/customer/ui";
import {portalForRole, portalHome} from "@/features/auth/portal";
import {ApiError} from "@/lib/api";
import {useI18n} from '@/contexts/I18nContext';

// Known API failures carry a stable code; anything else keeps the server's message.
function authErrorMessage(err: unknown, t: (key: string) => string): string {
    if (err instanceof ApiError && err.code && ['INVALID_CREDENTIALS', 'ACCOUNT_INACTIVE', 'USER_NOT_FOUND', 'EMAIL_EXISTS', 'USERNAME_EXISTS', 'PHONE_EXISTS'].includes(err.code)) {
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
    return <form onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const {user} = await login(identity, password);
            const portal = portalForRole(user.role);
            success(portal === 'customer' ? t('customerAuth.loginSuccess') : t('customerAuth.loginSuccessPortal', {portal: t(`customerAuth.portal.${portal}`)}), t('customerAuth.welcomeBack'));
            router.replace(portalHome(portal));
        } catch (err) {
            const msg = authErrorMessage(err, t);
            setError(msg);
            showError(msg, t('customerAuth.loginFailed'));
        } finally {
            setBusy(false);
        }
    }}><AuthCredentials identity={identity} password={password} onIdentityChange={setIdentity}
                        onPasswordChange={setPassword} disabled={busy}/>{error &&
        <div className="error" role="alert">{error}</div>}<Button type="submit"
                                                                  disabled={busy}>{busy ? t('customerAuth.signingIn') : t('customerAuth.signIn')}</Button>
        <div className="auth-links"><span>{t('customerAuth.noAccount')}</span><Link href="/customer/register"
                                                                         className="button-link">{t('customerAuth.register')}</Link></div>
    </form>;
}

export function RegisterForm() {
    const {register} = useAuth();
    const {success, error: showError} = useToast();
    const {t} = useI18n();
    const router = useRouter();
    const [form, setForm] = useState({username: '', email: '', password: '', phoneNumber: ''});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({
        ...v,
        [key]: e.target.value
    }));
    return <form onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await register(form);
            success(t('customerAuth.registerSuccess'), t('customerAuth.registerSuccessTitle'));
            router.replace("/customer/login");
        } catch (err) {
            const msg = authErrorMessage(err, t);
            setError(msg);
            showError(msg, t('customerAuth.registerFailed'));
        } finally {
            setBusy(false);
        }
    }}><Field label={t('customerAuth.phone')} type="tel" value={form.phoneNumber} onChange={update('phoneNumber')}
              autoComplete="tel" required/><Field label={t('customerAuth.username')} value={form.username}
                                                  onChange={update('username')} autoComplete="username" minLength={3}
                                                  maxLength={50} required/><Field label="Email" type="email"
                                                                                  value={form.email}
                                                                                  onChange={update('email')}
                                                                                  autoComplete="email"
                                                                                  required/><PasswordField
        label={t('customerAuth.password')} value={form.password} onChange={update('password')} autoComplete="new-password" required
        minLength={8}/>{error && <div className="error" role="alert">{error}</div>}<Button type="submit"
                                                                                           disabled={busy}>{busy ? t('customerAuth.creating') : t('customerAuth.createAccount')}</Button>
        <div className="auth-links"><Link href="/customer/login" className="button-link">{t('customerAuth.backToLogin')}</Link></div>
    </form>;
}
