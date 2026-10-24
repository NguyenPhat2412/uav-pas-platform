'use client';
import {PortalAuthLayout} from "@/components/shared";
import {LoginForm} from "@/features/auth/components/admin/LoginForm";
import {useI18n} from '@/contexts/I18nContext';

export default function Page() {
    const {t} = useI18n();
    return <PortalAuthLayout title={t('admin.login.layoutTitle')}
                             description={t('admin.login.layoutDescription')}
                             homeUrl={"/"}>
        <LoginForm/>
    </PortalAuthLayout>;
}
