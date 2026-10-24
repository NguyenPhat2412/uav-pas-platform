'use client';
import {PortalAuthLayout} from "@/components/shared";
import {RegisterForm} from "@/features/auth/components/customer/AuthForms";
import {useI18n} from '@/contexts/I18nContext';

export default function RegisterPage() {
    const {t} = useI18n();
    return <PortalAuthLayout title={t('customerAuth.registerTitle')}
                             description={t('customerAuth.registerDescription')}
                             homeUrl={"/"}>
        <h2>{t('customerAuth.registerHeading')}</h2>
        <p>{t('customerAuth.registerIntro')}</p>
        <RegisterForm/>
    </PortalAuthLayout>;
}
