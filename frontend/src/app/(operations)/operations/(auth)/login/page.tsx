'use client';
import {PortalAuthLayout} from "@/components/shared";
import {LoginForm} from "@/features/auth/components/operations/LoginForm";
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {useI18n} from '@/contexts/I18nContext';

export default function LoginPage() {
    const {t} = useI18n();
    return <PortalAuthLayout title={t('opsShared.auth.loginHeroTitle')}
                             description={t('opsShared.auth.loginHeroDescription')}
                             homeUrl={"/"} tools={<LanguageSwitcher variant="compact"/>}>
        <LoginForm redirectTo="/operations/overview"/>
    </PortalAuthLayout>;
}
