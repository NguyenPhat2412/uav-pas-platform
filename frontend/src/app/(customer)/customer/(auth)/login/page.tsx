'use client';
import {PortalAuthLayout} from "@/components/shared";
import {LoginForm} from "@/features/auth/components/customer/AuthForms";
import {useI18n} from '@/contexts/I18nContext';

export default function LoginPage() {
    const {t} = useI18n();
    return <PortalAuthLayout title={t('customerAuth.loginTitle')}
                             description={t('customerAuth.loginDescription')}
                             homeUrl={"/"}>
        <h2>{t('customerAuth.loginHeading')}</h2>
        <p>{t('customerAuth.loginIntro')}</p>
        <LoginForm/>
    </PortalAuthLayout>;
}
