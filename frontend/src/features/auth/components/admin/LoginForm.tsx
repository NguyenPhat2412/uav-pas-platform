"use client";
import {useState} from 'react';
import {AuthCredentials} from "@/components/shared";
import {useRouter} from 'next/navigation';
import {useAuth} from '@/contexts/AuthContext';
import {useToast} from '@/contexts/ToastContext';
import {Alert, Button} from "@/components/ui";
import {canUsePortal, portalForRole, portalHome, portalName} from "@/features/auth/utils/portal";
import {useI18n} from '@/contexts/I18nContext';

export function LoginForm() {
    const {login} = useAuth();
    const {success, warning, error: showError} = useToast();
    const router = useRouter();
    const {t} = useI18n();
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    return <form className="space-y-6" onSubmit={async event => {
        event.preventDefault();
        setPending(true);
        setError('');
        try {
            const {user} = await login(identity, password);
            if (!canUsePortal(user.role, 'admin')) {
                const portal = portalForRole(user.role);
                warning(t('admin.login.notAdmin', {portal: portalName(portal)}), t('admin.login.notAdminTitle'));
                router.replace(portalHome(portal));
                return;
            }
            success(t('admin.login.success'), t('admin.login.successTitle'));
            router.replace("/admin/dashboard");
        } catch (e) {
            const msg = e instanceof Error ? e.message : t('admin.login.failed');
            setError(msg);
            showError(msg, t('admin.login.failedTitle'));
        } finally {
            setPending(false);
        }
    }}>
        <div><h2 className="text-2xl font-bold">{t('admin.login.heading')}</h2><p className="mt-2 text-slate-500">{t('admin.login.subheading')}</p></div>
        {error && <Alert variant="error">{error}</Alert>}
        <AuthCredentials identity={identity} password={password} onIdentityChange={setIdentity}
                         onPasswordChange={setPassword} disabled={pending}/>
        <Button type="submit" isLoading={pending} className="w-full">{t('admin.login.submit')}</Button>
    </form>;
}
